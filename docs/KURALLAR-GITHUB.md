# GitHub'a Yükleme Kuralları

Bu kurallar `hooks/` altındaki git hook'ları tarafından **otomatik** uygulanır. Hata mesajlarındaki `[G-xx]` kodu bu dosyadaki maddeyi gösterir.

| Ne zaman            | Hook         | Kontroller                                                                |
| ------------------- | ------------ | ------------------------------------------------------------------------- |
| `git commit` öncesi | `pre-commit` | G-01, G-02, G-03, G-04, G-05, G-06, G-07 (yalnızca commit'lenen dosyalar) |
| commit mesajı       | `commit-msg` | G-10                                                                      |
| `git push` öncesi   | `pre-push`   | Hepsi: G-01…G-09, G-11, G-13, G-14 (tüm proje)                            |
| İstediğin an        | —            | `npm run check` (pre-push ile aynı, git gerektirmez), `npm run doctor`    |

---

## Güvenlik

### G-01 — Gizli bilgi asla commit'lenmez

API anahtarı, token, şifre ve özel anahtar repoya girmez. Taranan kalıplar: 21st.dev, Anthropic, OpenAI, GitHub, AWS, Google, Slack anahtarları, `PRIVATE KEY` blokları ve koda sabit yazılmış `apiKey = "..."` benzeri değerler.

- Gizli değerler **ortam değişkeninde** durur. Örnek: 21st MCP anahtarı `TWENTYFIRST_API_KEY` değişkeninde; `.mcp.json` yalnızca `${TWENTYFIRST_API_KEY}` referansı içerir.
- Bir anahtar bir kez commit'lendiyse, sonraki commit'te silmek **yetmez**: git geçmişinde kalır. Anahtarı servis sağlayıcıda **hemen yenile**.
- Yanlış alarm varsa ilgili satıra `secret-scan:allow` yorumu ekle ve nedenini commit mesajında açıkla.

### G-02 — Yasaklı dosyalar

Repoya girmez (hepsi `.gitignore`'da):

| Dosya                                   | Neden                               |
| --------------------------------------- | ----------------------------------- |
| `.env`, `.env.*` (`.env.example` hariç) | Ortam değişkenleri / gizli bilgiler |
| `.mcp.json`                             | MCP ayarı; anahtar içerebilir       |
| `.claude/settings.local.json`           | Kişisel Claude ayarları             |
| `*.pem`, `*.key`, `*.p12`, `id_rsa`…    | Özel anahtar ve sertifikalar        |
| `node_modules/`                         | `npm install` ile yeniden oluşur    |
| `dist/`                                 | `npm run build` çıktısı             |
| `*.log`                                 | Geçici kayıtlar                     |

Yanlışlıkla eklendiyse: `git rm --cached <dosya>` ve `.gitignore`'u kontrol et.

### G-03 — Büyük dosya yok

Tek dosya **1 MB**'ı geçemez (GitHub 50 MB'da uyarır, 100 MB'da reddeder). Görsel/video gibi büyük varlıklar repoya değil bir CDN'e konur. Gerekirse sınır geçici olarak `KUMBARA_MAX_FILE_BYTES` ortam değişkeniyle değiştirilebilir.

## Kod kalitesi

### G-04 — Merge çakışma işaretleri kalmaz

`<<<<<<<`, `=======`, `>>>>>>>` satırları içeren dosya commit'lenemez.

### G-05 — Biçim: Prettier

Tüm dosyalar `.prettierrc`'ye uygun olmalı. Düzeltme: `npm run format`.

### G-06 — Lint: ESLint, sıfır uyarı

`npm run lint` uyarısız geçmeli (`--max-warnings 0`). `any` yasak. Otomatik düzeltme: `npx eslint . --fix`.

### G-07 — TypeScript temiz

`npx tsc --noEmit` hatasız olmalı (`strict` açık). `// @ts-ignore` yerine tipi düzelt.

### G-08 — Testler geçer

`npm run test` (Vitest). `src/lib/calculations.ts` içindeki her yeni saf fonksiyon için test yazılır.

### G-09 — Build geçer

`npm run build` hatasız tamamlanmalı.

## Git akışı

### G-10 — Commit mesajı formatı

[Conventional Commits](https://www.conventionalcommits.org/tr/):

```
<tür>(<kapsam>): <kısa açıklama>
```

- **Türler:** `feat` (özellik), `fix` (hata), `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- İlk satır en fazla **72** karakter. Açıklama Türkçe olabilir.
- Örnekler: `feat(grafik): nakit akışı grafiği eklendi` · `fix(form): tutar alanında virgül hatası`
- `Merge`, `Revert`, `fixup!` mesajları kontrolden muaftır.

### G-11 — Korunan dallar

- `main` dalı uzak depodan silinemez (hook engeller).
- `main`'e **force push yapılmaz** (`git push --force`). Gerekirse `--force-with-lease` ve yalnızca kendi dalında.
- Öneri: GitHub'da _Settings → Branches_ altında `main` için branch protection aç (force push ve silme kapalı).

### G-12 — Hook'lar atlanmaz

`git commit --no-verify` / `git push --no-verify` **kullanılmaz**. Bir kontrol hatalı alarm veriyorsa kuralı düzelt, atlama. Push öncesi çalışma alanını temiz tut; hook commit'lenmemiş değişiklikleri uyarı olarak gösterir.

### G-13 — Lockfile

`package-lock.json` her zaman commit'lenir ve `package.json` ile senkron olur. Bağımlılık eklerken `npm install <paket>` kullan; lockfile'ı elle düzenleme.

### G-14 — Güvenlik açıkları

Push öncesi `npm audit --omit=dev --audit-level=high` çalışır. Yüksek seviye açık **uyarı** verir (push'u durdurmaz); `npm audit fix` ile güncelle, ana sürüm atlıyorsa önce [KURALLAR-UYUMLULUK.md](KURALLAR-UYUMLULUK.md) U-06'ya bak.

### G-15 — Satır sonları LF

`.gitattributes` tüm metin dosyalarını LF'e zorlar. Windows'ta `git config core.autocrlf false` önerilir (bkz. U-08).

---

## Push öncesi kontrol listesi

1. `npm run check` yeşil mi?
2. Commit mesajları G-10'a uygun mu?
3. Yeni ortam değişkeni eklediysen `README.md`'de belgeledin mi (değerini değil, adını)?
4. Arayüz değiştiyse 375 px / 768 px / 1280 px genişliklerde baktın mı?
