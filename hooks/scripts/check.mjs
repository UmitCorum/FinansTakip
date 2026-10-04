#!/usr/bin/env node
/**
 * Kumbara proje kontrolleri.
 *
 * Git hook'ları (hooks/pre-commit, hooks/commit-msg, hooks/pre-push) ve
 * Claude Code hook'ları (.claude/settings.json) bu scripti çağırır.
 * Kurallar: docs/KURALLAR-GITHUB.md (G-xx) ve docs/KURALLAR-UYUMLULUK.md (U-xx).
 *
 * Kullanım:
 *   node hooks/scripts/check.mjs <mod>
 *
 * Modlar:
 *   pre-commit   Commit'lenecek dosyalar: gizli bilgi, yasaklı dosya, boyut, biçim, lint, tip
 *   commit-msg   Commit mesajı formatı (argüman: mesaj dosyası)
 *   pre-push     Tam kontrol: tüm takip edilen dosyalar + biçim + lint + tip + test + build
 *   full         pre-push ile aynı, git gerektirmez (npm run check)
 *   doctor       Ortam ve bağımlılık uyumluluğu (npm run doctor)
 *   claude-edit  Claude Code PostToolUse: düzenlenen dosyayı biçimle + lint + gizli bilgi taraması
 *   claude-stop  Claude Code Stop: değişiklik varsa tip + lint + test
 *   install      git core.hooksPath ayarını yapar (npm install sırasında otomatik)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
process.chdir(ROOT);

const MODE = process.argv[2] ?? "full";
const IS_WIN = process.platform === "win32";
const MAX_FILE_BYTES = Number(process.env.KUMBARA_MAX_FILE_BYTES ?? 1024 * 1024);
const MIN_NODE_MAJOR = 20;

// ---------------------------------------------------------------------------
// Çıktı
// ---------------------------------------------------------------------------

const useColor = process.stderr.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const c = { red: paint(31), green: paint(32), yellow: paint(33), dim: paint(2), bold: paint(1) };
const log = (...a) => console.error(...a);

const failures = [];
const warnings = [];

/** Bir kontrol adımı çalıştırır; sonucu { ok, detail, rule, warn } döner */
function step(name, fn) {
  const start = Date.now();
  let res;
  try {
    res = fn() ?? { ok: true };
  } catch (e) {
    res = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
  const ms = `${Date.now() - start}ms`;
  if (res.skip) {
    log(`  ${c.dim("○")} ${name} ${c.dim(`(${res.skip})`)}`);
  } else if (res.ok) {
    log(`  ${c.green("✓")} ${name} ${c.dim(ms)}`);
  } else if (res.warn) {
    log(`  ${c.yellow("!")} ${name} ${c.dim(ms)}`);
    warnings.push({ name, ...res });
  } else {
    log(`  ${c.red("✗")} ${name} ${c.dim(ms)}`);
    failures.push({ name, ...res });
  }
  return res;
}

function report(title) {
  for (const w of warnings) {
    log(`\n${c.yellow("UYARI")} ${w.name}${w.rule ? c.dim(` [${w.rule}]`) : ""}`);
    if (w.detail) log(indent(w.detail));
  }
  for (const f of failures) {
    log(`\n${c.red("HATA")} ${f.name}${f.rule ? c.dim(` [${f.rule}]`) : ""}`);
    if (f.detail) log(indent(f.detail));
  }
  if (failures.length) {
    log(
      `\n${c.red(c.bold(`${title}: ${failures.length} kontrol başarısız.`))} ` +
        `Kurallar: docs/KURALLAR-GITHUB.md, çözümler: docs/KURALLAR-UYUMLULUK.md`,
    );
    return 1;
  }
  log(`\n${c.green(c.bold(`${title}: tüm kontroller geçti.`))}`);
  return 0;
}

const indent = (s, max = 40) => {
  const lines = String(s).trim().split(/\r?\n/);
  const shown = lines.slice(0, max).map((l) => `    ${l}`);
  if (lines.length > max) shown.push(c.dim(`    … ${lines.length - max} satır daha`));
  return shown.join("\n");
};

// ---------------------------------------------------------------------------
// Komut çalıştırma
// ---------------------------------------------------------------------------

const BIN = {
  tsc: "node_modules/typescript/bin/tsc",
  eslint: "node_modules/eslint/bin/eslint.js",
  prettier: "node_modules/prettier/bin/prettier.cjs",
  vitest: "node_modules/vitest/vitest.mjs",
  vite: "node_modules/vite/bin/vite.js",
};

/** Yerel bir geliştirme aracını shell kullanmadan çalıştırır */
function tool(name, args) {
  if (!existsSync(join(ROOT, BIN[name]))) {
    return { ok: false, out: `${name} bulunamadı. Önce "npm install" çalıştırın. [U-03]` };
  }
  const r = spawnSync(process.execPath, [BIN[name], ...args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

function npm(args) {
  const r = spawnSync(IS_WIN ? "npm.cmd" : "npm", args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: IS_WIN,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) return { ok: false, missing: true, out: String(r.error.message) };
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim(), stdout: r.stdout };
}

let gitAvailable;
function git(args, opts = {}) {
  const r = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
  if (r.error) {
    gitAvailable = false;
    return null;
  }
  gitAvailable = true;
  return r;
}

const isGitRepo = () => {
  const r = git(["rev-parse", "--is-inside-work-tree"]);
  return Boolean(r && r.status === 0 && r.stdout.trim() === "true");
};

// ---------------------------------------------------------------------------
// Dosya kuralları
// ---------------------------------------------------------------------------

/** [G-02] Repoya girmemesi gereken dosyalar */
const FORBIDDEN = [
  { re: /(^|\/)\.env(\.(?!example$)[^/]+)?$/, why: "ortam değişkeni dosyası (.env*)" },
  { re: /(^|\/)\.mcp\.json$/, why: "MCP ayarı; API anahtarı içerebilir" },
  { re: /(^|\/)\.claude\/settings\.local\.json$/, why: "kişisel Claude ayarları" },
  { re: /\.(pem|key|p12|pfx|keystore|jks)$/i, why: "özel anahtar / sertifika dosyası" },
  { re: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/, why: "SSH anahtarı" },
  { re: /(^|\/)node_modules\//, why: "bağımlılık klasörü" },
  { re: /^dist\//, why: "build çıktısı" },
  { re: /\.log$/i, why: "log dosyası" },
];

/** [G-01] Gizli bilgi kalıpları */
const SECRET_PATTERNS = [
  { name: "21st.dev API anahtarı", re: /21st_sk_[A-Za-z0-9]{20,}/ },
  { name: "Anthropic API anahtarı", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "OpenAI API anahtarı", re: /\bsk-(proj-)?[A-Za-z0-9]{32,}/ },
  { name: "GitHub token", re: /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/ },
  { name: "AWS erişim anahtarı", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Google API anahtarı", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Özel anahtar bloğu", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: "Kodda sabit gizli değer",
    re: /\b(api[_-]?key|secret|access[_-]?token|auth[_-]?token|password|passwd)\b["']?\s*[:=]\s*["'][^"'\s]{16,}["']/i,
  },
];
const ALLOW_MARK = "secret-scan:allow";

const BINARY_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".avif",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".pdf",
  ".zip",
  ".gz",
  ".mp4",
  ".mp3",
]);
const SCAN_SKIP = new Set(["package-lock.json"]);

const toPosix = (p) => p.split(sep).join("/");

function scanSecrets(text, file) {
  const found = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes(ALLOW_MARK)) return;
    for (const p of SECRET_PATTERNS) {
      const m = line.match(p.re);
      if (m) {
        const v = m[0];
        const masked = v.length > 12 ? `${v.slice(0, 6)}…${v.slice(-2)}` : "…";
        found.push(`${file}:${i + 1}  ${p.name}  (${masked})`);
      }
    }
  });
  return found;
}

const isScannable = (file) =>
  !BINARY_EXT.has(extname(file).toLowerCase()) && !SCAN_SKIP.has(file.split("/").pop());

function checkForbidden(files) {
  const hits = [];
  for (const f of files) {
    const rule = FORBIDDEN.find((r) => r.re.test(f));
    if (rule) hits.push(`${f}  →  ${rule.why}`);
  }
  return hits.length
    ? {
        ok: false,
        rule: "G-02",
        detail:
          `${hits.join("\n")}\n\nDosyayı commit'ten çıkarın: git rm --cached <dosya>` +
          `\nve .gitignore'a eklendiğinden emin olun.`,
      }
    : { ok: true };
}

function checkSecrets(entries) {
  const found = entries.flatMap(({ file, text }) => scanSecrets(text, file));
  return found.length
    ? {
        ok: false,
        rule: "G-01",
        detail:
          `${found.join("\n")}\n\nGizli değeri koddan kaldırıp ortam değişkenine taşıyın. ` +
          `Değer daha önce paylaşıldıysa anahtarı servis sağlayıcıda YENİLEYİN.\n` +
          `Yanlış alarmsa satıra "${ALLOW_MARK}" yorumu ekleyin.`,
      }
    : { ok: true };
}

const CONFLICT_RE = /^(<{7}|>{7}|={7})(\s|$)/m;
function checkConflicts(entries) {
  const hits = entries.filter(({ text }) => CONFLICT_RE.test(text)).map(({ file }) => file);
  return hits.length
    ? { ok: false, rule: "G-04", detail: `Çözülmemiş merge çakışması:\n${hits.join("\n")}` }
    : { ok: true };
}

function checkSizes(sizes) {
  const big = sizes.filter((s) => s.bytes > MAX_FILE_BYTES);
  return big.length
    ? {
        ok: false,
        rule: "G-03",
        detail: big
          .map((s) => `${s.file}  ${(s.bytes / 1024 / 1024).toFixed(2)} MB`)
          .join("\n")
          .concat(
            `\n\nSınır ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB. Büyük varlıkları repoya koymayın.`,
          ),
      }
    : { ok: true };
}

// ---------------------------------------------------------------------------
// Proje kontrolleri
// ---------------------------------------------------------------------------

const PRETTIER_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".json",
  ".css",
  ".md",
  ".html",
  ".yml",
  ".yaml",
]);
const LINT_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx"]);

const fromTool = (res, rule, hint) =>
  res.ok ? { ok: true } : { ok: false, rule, detail: `${res.out}${hint ? `\n\n${hint}` : ""}` };

const checks = {
  typecheck: () => fromTool(tool("tsc", ["--noEmit", "--pretty", "false"]), "G-07"),
  lintAll: () =>
    fromTool(
      tool("eslint", [".", "--max-warnings", "0"]),
      "G-06",
      "Otomatik düzeltme: npx eslint . --fix",
    ),
  lintFiles: (files) =>
    files.length
      ? fromTool(
          tool("eslint", ["--max-warnings", "0", "--no-warn-ignored", ...files]),
          "G-06",
          "Otomatik düzeltme: npx eslint --fix <dosya>",
        )
      : { skip: "lint edilecek dosya yok" },
  formatAll: () => fromTool(tool("prettier", ["--check", "."]), "G-05", "Düzeltme: npm run format"),
  formatFiles: (files) =>
    files.length
      ? fromTool(
          tool("prettier", ["--check", "--ignore-unknown", ...files]),
          "G-05",
          "Düzeltme: npm run format",
        )
      : { skip: "biçimlenecek dosya yok" },
  tests: () => fromTool(tool("vitest", ["run", "--reporter=dot"]), "G-08"),
  build: () => fromTool(tool("vite", ["build", "--logLevel", "warn"]), "G-09"),
};

// ---------------------------------------------------------------------------
// Ortam / uyumluluk (doctor)
// ---------------------------------------------------------------------------

function readJson(path) {
  try {
    return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
  } catch {
    return null;
  }
}

const major = (v) =>
  Number(
    String(v ?? "")
      .replace(/^[^\d]*/, "")
      .split(".")[0],
  );

const doctor = {
  node: () => {
    const m = major(process.versions.node);
    return m >= MIN_NODE_MAJOR
      ? { ok: true }
      : {
          ok: false,
          rule: "U-02",
          detail: `Node ${process.versions.node} kurulu; en az ${MIN_NODE_MAJOR} gerekli.`,
        };
  },
  modules: () =>
    existsSync(join(ROOT, "node_modules"))
      ? { ok: true }
      : { ok: false, rule: "U-03", detail: "node_modules yok. Çalıştırın: npm install" },
  lockfile: () =>
    existsSync(join(ROOT, "package-lock.json"))
      ? { ok: true }
      : {
          ok: false,
          rule: "G-13",
          detail: "package-lock.json yok. npm install ile oluşturup commit'leyin.",
        },
  deps: () => {
    const r = npm(["ls", "--depth=0", "--json"]);
    if (r.missing) return { warn: true, rule: "U-01", detail: "npm komutu bulunamadı." };
    let problems = [];
    try {
      problems = JSON.parse(r.stdout || "{}").problems ?? [];
    } catch {
      /* npm ls çıktısı okunamadı */
    }
    return problems.length
      ? {
          ok: false,
          rule: "U-04",
          detail: `${problems.join("\n")}\n\nÇözüm: npm install (lockfile'ı bozmadan: npm ci)`,
        }
      : { ok: true };
  },
  react: () => {
    const v = (p) => readJson(`node_modules/${p}/package.json`)?.version;
    const versions = {
      react: v("react"),
      "react-dom": v("react-dom"),
      "@types/react": v("@types/react"),
      "@types/react-dom": v("@types/react-dom"),
    };
    const majors = new Set(Object.values(versions).filter(Boolean).map(major));
    return majors.size <= 1
      ? { ok: true }
      : {
          ok: false,
          rule: "U-05",
          detail: `React paketlerinin ana sürümleri farklı:\n${Object.entries(versions)
            .map(([k, val]) => `${k}@${val ?? "yok"}`)
            .join("\n")}`,
        };
  },
  majors: () => {
    // Kod bu ana sürümlerin API'sine göre yazıldı [U-06]
    const expected = {
      recharts: 2,
      "react-day-picker": 9,
      "date-fns": 4,
      zod: 3,
      tailwindcss: 3,
      "framer-motion": 11,
      vite: 6,
    };
    const off = Object.entries(expected)
      .map(([name, want]) => [name, want, readJson(`node_modules/${name}/package.json`)?.version])
      .filter(([, want, got]) => got && major(got) !== want);
    return off.length
      ? {
          warn: true,
          rule: "U-06",
          detail: off
            .map(([n, want, got]) => `${n}: beklenen v${want}.x, kurulu v${got}`)
            .join("\n")
            .concat(
              "\n\nAna sürüm yükseltmesi API değişikliği getirir; docs/KURALLAR-UYUMLULUK.md U-06'ya bakın.",
            ),
        }
      : { ok: true };
  },
  lineEndings: () => {
    const crlf = walk("src").filter((f) => readFileSync(join(ROOT, f), "utf8").includes("\r\n"));
    return crlf.length
      ? {
          ok: false,
          rule: "U-08",
          detail: `CRLF satır sonu bulunan dosyalar:\n${crlf.slice(0, 20).join("\n")}\n\nDüzeltme: npm run format`,
        }
      : { ok: true };
  },
  gitignore: () => {
    const text = existsSync(join(ROOT, ".gitignore"))
      ? readFileSync(join(ROOT, ".gitignore"), "utf8")
      : "";
    const required = ["node_modules", "dist", ".env", ".mcp.json"];
    const missing = required.filter(
      (r) => !text.split(/\r?\n/).some((l) => l.trim().startsWith(r)),
    );
    return missing.length
      ? { ok: false, rule: "G-02", detail: `.gitignore'da eksik: ${missing.join(", ")}` }
      : { ok: true };
  },
  hooks: () => {
    if (!git(["--version"])) {
      return { warn: true, rule: "U-12", detail: "git kurulu değil; git hook'ları çalışmaz." };
    }
    if (!isGitRepo())
      return { warn: true, rule: "U-12", detail: "Bu klasör bir git deposu değil (git init)." };
    const r = git(["config", "core.hooksPath"]);
    return r?.stdout.trim() === "hooks"
      ? { ok: true }
      : {
          warn: true,
          rule: "U-12",
          detail: "core.hooksPath ayarlı değil. Çalıştırın: npm run hooks:install",
        };
  },
};

function runDoctor() {
  step("Node sürümü", doctor.node);
  step("node_modules", doctor.modules);
  step("package-lock.json", doctor.lockfile);
  step("Bağımlılık ağacı (npm ls)", doctor.deps);
  step("React sürüm uyumu", doctor.react);
  step("Kütüphane ana sürümleri", doctor.majors);
  step("Satır sonları (LF)", doctor.lineEndings);
  step(".gitignore", doctor.gitignore);
  step("Git hook kurulumu", doctor.hooks);
}

// ---------------------------------------------------------------------------
// Dosya listeleri
// ---------------------------------------------------------------------------

const WALK_SKIP = new Set(["node_modules", "dist", ".git", ".vite", "coverage"]);

/** Git olmadan proje dosyalarını listeler (gitignore'daki büyük klasörler hariç) */
function walk(dir = ".") {
  const out = [];
  const visit = (d) => {
    for (const entry of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      if (WALK_SKIP.has(entry.name)) continue;
      const rel = d === "." ? entry.name : `${d}/${entry.name}`;
      if (entry.isDirectory()) visit(rel);
      else out.push(rel);
    }
  };
  if (existsSync(join(ROOT, dir))) visit(dir);
  return out;
}

/** Repoya girecek dosyalar: git varsa takip edilenler, yoksa yasaklı (gitignore'daki) dosyalar hariç tümü */
function projectFiles() {
  if (isGitRepo()) {
    const r = git(["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
    if (r?.status === 0) return r.stdout.split("\0").filter(Boolean);
  }
  return walk().filter((f) => !FORBIDDEN.some((rule) => rule.re.test(f)));
}

function stagedFiles() {
  const r = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]);
  return r ? r.stdout.split("\0").filter(Boolean) : [];
}

function trackedFiles() {
  const r = git(["ls-files", "-z"]);
  return r ? r.stdout.split("\0").filter(Boolean) : [];
}

const stagedEntry = (file) => {
  const r = git(["show", `:${file}`], { maxBuffer: 64 * 1024 * 1024 });
  return { file, text: r?.status === 0 ? r.stdout : "" };
};
const diskEntry = (file) => {
  try {
    return { file, text: readFileSync(join(ROOT, file), "utf8") };
  } catch {
    return { file, text: "" };
  }
};

// ---------------------------------------------------------------------------
// Modlar
// ---------------------------------------------------------------------------

function modePreCommit() {
  log(c.bold("\n▶ pre-commit kontrolleri"));
  const files = stagedFiles();
  if (!files.length) {
    log(c.dim("  Commit'lenecek dosya yok."));
    return 0;
  }
  const scannable = files.filter(isScannable);
  const entries = scannable.map(stagedEntry);

  step("Yasaklı dosyalar", () => checkForbidden(files));
  step("Gizli bilgi taraması", () => checkSecrets(entries));
  step("Dosya boyutu", () =>
    checkSizes(
      files.map((file) => {
        const r = git(["cat-file", "-s", `:${file}`]);
        return { file, bytes: Number(r?.stdout.trim() ?? 0) };
      }),
    ),
  );
  step("Merge çakışma işaretleri", () => checkConflicts(entries));

  const existing = files.filter((f) => existsSync(join(ROOT, f)));
  step("Biçim (Prettier)", () =>
    checks.formatFiles(existing.filter((f) => PRETTIER_EXT.has(extname(f)))),
  );
  step("Lint (ESLint)", () => checks.lintFiles(existing.filter((f) => LINT_EXT.has(extname(f)))));
  if (existing.some((f) => /\.(ts|tsx)$/.test(f) || f === "package.json")) {
    step("Tip kontrolü (tsc)", checks.typecheck);
  }
  return report("pre-commit");
}

const COMMIT_RE =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: .{3,}/;

function modeCommitMsg(file) {
  log(c.bold("\n▶ commit mesajı kontrolü"));
  const raw = existsSync(file) ? readFileSync(file, "utf8") : "";
  const subject = raw.split(/\r?\n/).find((l) => l.trim() && !l.startsWith("#")) ?? "";
  if (/^(Merge|Revert|fixup!|squash!)/.test(subject)) return 0;
  step("Commit mesajı formatı", () => {
    const problems = [];
    if (!COMMIT_RE.test(subject)) {
      problems.push(
        'Format "<tür>(<kapsam>): <açıklama>" olmalı.\n' +
          "Türler: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert\n" +
          'Örnek: "feat(grafik): nakit akışı grafiği eklendi"',
      );
    }
    if (subject.length > 72) problems.push(`İlk satır ${subject.length} karakter; en fazla 72.`);
    return problems.length
      ? { ok: false, rule: "G-10", detail: `Mesaj: "${subject}"\n\n${problems.join("\n")}` }
      : { ok: true };
  });
  return report("commit-msg");
}

const ZERO_SHA = /^0+$/;
const PROTECTED = ["refs/heads/main", "refs/heads/master"];

function readStdin() {
  try {
    // PowerShell 5.1 boruya BOM ekleyebilir; JSON.parse'ı bozmasın
    return readFileSync(0, "utf8").replace(/^﻿/, "");
  } catch {
    return "";
  }
}

function modeFull({ withGit }) {
  log(c.bold(`\n▶ ${withGit ? "pre-push" : "tam proje"} kontrolleri`));

  if (withGit) {
    // [G-11] Korunan dalın uzak depodan silinmesini engelle
    const updates = readStdin()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => l.split(" "));
    step("Korunan dal", () => {
      const deleting = updates.filter(
        ([, localSha, remoteRef]) => ZERO_SHA.test(localSha) && PROTECTED.includes(remoteRef),
      );
      return deleting.length
        ? {
            ok: false,
            rule: "G-11",
            detail: `Korunan dal silinmek isteniyor: ${deleting.map((u) => u[2]).join(", ")}`,
          }
        : { ok: true };
    });
    step("Commit'lenmemiş değişiklik", () => {
      const r = git(["status", "--porcelain"]);
      const dirty = r?.stdout.trim();
      return dirty
        ? {
            warn: true,
            rule: "G-12",
            detail:
              "Çalışma alanında commit'lenmemiş değişiklik var. Kontroller çalışma alanı üzerinde " +
              "çalışır; push edilen commit'ler ile aynı olmayabilir.\n" +
              dirty,
          }
        : { ok: true };
    });
  }

  const files = withGit ? trackedFiles() : projectFiles();
  const scannable = files.filter(isScannable);
  const entries = scannable.map(diskEntry);

  step("Ortam (Node / bağımlılıklar)", () => {
    for (const fn of [doctor.node, doctor.modules, doctor.lockfile, doctor.react]) {
      const r = fn();
      if (!r.ok) return r;
    }
    return { ok: true };
  });
  step("Bağımlılık ağacı (npm ls)", doctor.deps);
  if (withGit) step("Yasaklı dosyalar", () => checkForbidden(files));
  step("Gizli bilgi taraması", () => checkSecrets(entries));
  step("Dosya boyutu", () =>
    checkSizes(
      files
        .filter((f) => existsSync(join(ROOT, f)))
        .map((file) => ({ file, bytes: statSync(join(ROOT, file)).size })),
    ),
  );
  step("Merge çakışma işaretleri", () => checkConflicts(entries));
  step("Biçim (Prettier)", checks.formatAll);
  step("Lint (ESLint)", checks.lintAll);
  step("Tip kontrolü (tsc)", checks.typecheck);
  step("Birim testleri (Vitest)", checks.tests);
  step("Production build (Vite)", checks.build);
  step("Güvenlik açıkları (npm audit)", () => {
    const r = npm(["audit", "--omit=dev", "--audit-level=high"]);
    if (r.ok) return { ok: true };
    return {
      warn: true,
      rule: "G-14",
      detail: /ENOTFOUND|EAI_AGAIN|network/i.test(r.out)
        ? "Ağ yok; denetim atlandı."
        : r.out.split("\n").slice(-15).join("\n"),
    };
  });
  return report(withGit ? "pre-push" : "check");
}

// --- Claude Code ------------------------------------------------------------

function readHookInput() {
  try {
    return JSON.parse(readStdin() || "{}");
  } catch {
    return {};
  }
}

const CACHE_DIR = join(ROOT, "node_modules", ".cache", "kumbara-check");
const STAMP = join(CACHE_DIR, "last-ok");
const WATCHED = [
  "src",
  "index.html",
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "tailwind.config.ts",
  "eslint.config.js",
];

function newestMtime() {
  let newest = 0;
  for (const p of WATCHED) {
    const files =
      existsSync(join(ROOT, p)) && statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
    for (const f of files) {
      if (!existsSync(join(ROOT, f))) continue;
      newest = Math.max(newest, statSync(join(ROOT, f)).mtimeMs);
    }
  }
  return newest;
}

/** PostToolUse: düzenlenen dosyayı biçimler, lint'ler ve gizli bilgi tarar */
function modeClaudeEdit() {
  const input = readHookInput();
  const raw = input.tool_input?.file_path ?? input.tool_response?.filePath;
  if (!raw) return 0;
  const abs = isAbsolute(raw) ? raw : resolve(ROOT, raw);
  const rel = toPosix(relative(ROOT, abs));
  if (rel.startsWith("..") || /^(node_modules|dist)\//.test(rel) || !existsSync(abs)) return 0;

  const problems = [];

  if (isScannable(rel)) {
    const secrets = scanSecrets(readFileSync(abs, "utf8"), rel);
    if (secrets.length) {
      problems.push(
        `[G-01] Dosyada gizli bilgi var, kaldırıp ortam değişkenine taşı:\n${secrets.join("\n")}`,
      );
    }
  }
  const forbidden = FORBIDDEN.find((r) => r.re.test(rel));
  if (forbidden && !/\.mcp\.json$|settings\.local\.json$/.test(rel)) {
    problems.push(
      `[G-02] ${rel} repoya girmemeli (${forbidden.why}); .gitignore'da olduğundan emin ol.`,
    );
  }

  const ext = extname(rel);
  if (PRETTIER_EXT.has(ext))
    tool("prettier", ["--write", "--log-level", "warn", "--ignore-unknown", rel]);
  if (LINT_EXT.has(ext)) {
    const r = tool("eslint", ["--max-warnings", "0", "--no-warn-ignored", rel]);
    if (!r.ok) problems.push(`[G-06] ESLint sorunları (${rel}):\n${r.out}`);
  }

  if (problems.length) {
    // exit 2: stderr Claude'a geri bildirim olarak iletilir
    console.error(problems.join("\n\n"));
    return 2;
  }
  return 0;
}

/** Stop: proje değiştiyse tip + lint + test; hata varsa Claude'u durdurmaz, düzeltmeye yönlendirir */
function modeClaudeStop() {
  const input = readHookInput();
  if (input.stop_hook_active) return 0; // sonsuz döngüyü önle

  const newest = newestMtime();
  const last = existsSync(STAMP) ? Number(readFileSync(STAMP, "utf8")) : 0;
  if (newest <= last) return 0; // son başarılı kontrolden beri değişiklik yok

  const problems = [];
  const secrets = projectFiles()
    .filter(isScannable)
    .flatMap((f) => scanSecrets(diskEntry(f).text, f));
  if (secrets.length) problems.push(`[G-01] Gizli bilgi bulundu, kaldır:\n${secrets.join("\n")}`);
  const tc = tool("tsc", ["--noEmit", "--pretty", "false"]);
  if (!tc.ok) problems.push(`[G-07] TypeScript hataları:\n${tc.out}`);
  const lint = tool("eslint", [".", "--max-warnings", "0"]);
  if (!lint.ok) problems.push(`[G-06] ESLint sorunları:\n${lint.out}`);
  const tests = tool("vitest", ["run", "--reporter=dot"]);
  if (!tests.ok)
    problems.push(`[G-08] Testler başarısız:\n${tests.out.split("\n").slice(-40).join("\n")}`);

  if (problems.length) {
    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason:
          "Proje kontrolleri başarısız. Bitirmeden önce düzelt (kurallar: docs/KURALLAR-GITHUB.md, " +
          `docs/KURALLAR-UYUMLULUK.md):\n\n${problems.join("\n\n")}`.slice(0, 12000),
      }),
    );
    return 0;
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(STAMP, String(newest));
  return 0;
}

function modeInstall() {
  if (!git(["--version"])) {
    log("git bulunamadı; git hook kurulumu atlandı. [U-12]");
    return 0;
  }
  if (!isGitRepo()) {
    log("git deposu değil; hook kurulumu atlandı. Önce: git init [U-12]");
    return 0;
  }
  const r = git(["config", "core.hooksPath", "hooks"]);
  log(
    r?.status === 0
      ? "✓ git hook'ları etkin (core.hooksPath = hooks)"
      : "core.hooksPath ayarlanamadı.",
  );
  return 0;
}

// ---------------------------------------------------------------------------

const modes = {
  "pre-commit": modePreCommit,
  "commit-msg": () => modeCommitMsg(process.argv[3] ?? ".git/COMMIT_EDITMSG"),
  "pre-push": () => modeFull({ withGit: true }),
  full: () => modeFull({ withGit: false }),
  doctor: () => {
    log(c.bold("\n▶ ortam ve uyumluluk kontrolü"));
    runDoctor();
    return report("doctor");
  },
  "claude-edit": modeClaudeEdit,
  "claude-stop": modeClaudeStop,
  install: modeInstall,
};

const run = modes[MODE];
if (!run) {
  log(`Bilinmeyen mod: ${MODE}\nModlar: ${Object.keys(modes).join(", ")}`);
  process.exit(1);
}
process.exit(run());
