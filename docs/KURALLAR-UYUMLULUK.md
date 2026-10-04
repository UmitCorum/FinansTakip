# Uyumluluk Sorunları ve Çözümleri

Proje içinde ortaya çıkabilecek ortam, bağımlılık ve platform sorunları. Hook mesajlarındaki `[U-xx]` kodu bu dosyadaki maddeyi gösterir. Hızlı teşhis için: **`npm run doctor`**.

Her madde: **Belirti → Neden → Çözüm**.

---

## Ortam

### U-01 — `node` / `npm` komutu bulunamıyor

- **Belirti:** `'node' is not recognized…`, hook'lar `node: command not found` hatası verir.
- **Neden:** Node.js yeni kurulduysa, açık olan terminal/VS Code eski `PATH`'i kullanır.
- **Çözüm:** VS Code'u (ve terminalleri) tamamen kapatıp aç. Geçici çözüm (PowerShell):
  ```powershell
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  ```
  Node kurulu değilse: `winget install OpenJS.NodeJS.LTS`.

### U-02 — Node sürümü eski

- **Belirti:** Vite/Vitest başlarken sözdizimi hatası, `engines` uyarısı.
- **Neden:** Proje Node **20+** ister (`package.json → engines`). Geliştirme Node 24 LTS ile yapıldı.
- **Çözüm:** `node -v` ile kontrol et, LTS sürümüne yükselt.

### U-03 — `node_modules` yok veya bozuk

- **Belirti:** `Cannot find module …`, hook'lar `npm install çalıştırın` der.
- **Çözüm:** `npm install`. Sorun sürerse `node_modules` klasörünü silip `npm ci` (lockfile'a sadık temiz kurulum).

### U-04 — Bağımlılık ağacı uyumsuz (`npm ls` hatası)

- **Belirti:** `invalid`, `missing`, `ERESOLVE`, `unmet peer dependency`.
- **Neden:** `package.json` ve `package-lock.json` farklılaştı ya da bir paket diğerinin desteklemediği sürümü istiyor.
- **Çözüm:** `npm install`; çakışma sürerse hangi paketin hangi sürümü istediğini `npm explain <paket>` ile bul. `--force` / `--legacy-peer-deps` **son çare**; kullanırsan nedenini commit mesajına yaz.

### U-05 — React paket sürümleri farklı

- **Belirti:** `Invalid hook call`, JSX tip hataları (`'X' cannot be used as a JSX component`).
- **Neden:** `react`, `react-dom`, `@types/react`, `@types/react-dom` ana sürümleri eşleşmiyor. Proje **React 18**'dir.
- **Çözüm:** Dördünü aynı ana sürümde tut: `npm install react@18 react-dom@18 @types/react@18 @types/react-dom@18`.

## Kütüphane sürümleri

### U-06 — Ana sürüm yükseltmesi API'yi bozar

Kod aşağıdaki ana sürümlere göre yazıldı. `npm run doctor` farklı bir ana sürüm görürse uyarır. **Ana sürüm yükseltmesi ayrı bir commit'te, testlerle yapılır.**

| Paket              | Sürüm | Yükseltirken dikkat                                                                                                                                  |
| ------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recharts`         | 2.x   | v3'te `activeIndex`/`activeShape` ve Tooltip tipleri değişti; `CategoryPieChart` ve `CashflowChart` güncellenmeli.                                   |
| `react-day-picker` | 9.x   | v8 → v9'da `classNames` anahtarları değişti (`day_selected` → `selected`, `caption` → `month_caption`). `calendar.tsx`.                              |
| `date-fns`         | 4.x   | Locale importu: `import { tr } from "date-fns/locale"`.                                                                                              |
| `zod`              | 3.x   | v4'te hata mesajı API'si (`required_error`) değişti; `TransactionForm` ve `storage.ts` şemaları güncellenmeli.                                       |
| `tailwindcss`      | 3.x   | v4 CSS-first yapılandırma kullanır; `tailwind.config.ts`, `postcss.config.js` ve `tailwindcss-animate` değişir.                                      |
| `framer-motion`    | 11.x  | v12'de paket adı `motion` olarak da yayımlanıyor; importlar `framer-motion`'da kalabilir.                                                            |
| `vite`             | 6.x   | v7 Node 20.19+ ister; `vitest` sürümü de uyumlu seçilmeli.                                                                                           |
| `lucide-react`     | 1.x   | Bazı ikon adları değişti (`Home` → `House` takma adı). Yeni ikon eklerken `node -e "console.log(!!require('lucide-react').IkonAdi)"` ile kontrol et. |

### U-07 — Tailwind sınıfı etkisiz

- **Belirti:** Sınıf yazılı ama stil uygulanmıyor.
- **Neden:** Tailwind 3 yalnızca ölçekteki değerleri üretir; örneğin opaklık `/12` ölçekte yok (`/10`, `/15` var). Dinamik birleştirilen sınıf adları (`` `bg-${renk}` ``) da üretilmez.
- **Çözüm:** Ölçek değeri ya da keyfi değer kullan (`bg-income/[0.12]`). Sınıf adlarını tam yaz. Kategori renkleri gibi dinamik renkler için `style` kullan.

## Platform (Windows)

### U-08 — Satır sonu (CRLF/LF) sorunları

- **Belirti:** `prettier --check` her dosyada hata verir; hook scripti `bad interpreter` / `/bin/sh^M` hatası verir.
- **Neden:** Git, Windows'ta dosyaları CRLF'e çevirmiş.
- **Çözüm:** `.gitattributes` LF'i zorlar. Mevcut dosyalar için:
  ```powershell
  git config core.autocrlf false
  git add --renormalize .
  npm run format
  ```

### U-09 — PowerShell sözdizimi

- **Belirti:** `The token '&&' is not a valid statement separator`.
- **Neden:** Windows PowerShell 5.1 `&&` / `||` desteklemez.
- **Çözüm:** `komut1; if ($?) { komut2 }` kullan ya da `npm run` script'lerini tercih et.

### U-10 — `dist/` klasörüne konan dosyalar kayboluyor

- **Neden:** `vite build` her çalışmada `dist/`'i silip yeniden oluşturur ve `dist/` gitignore'dadır.
- **Çözüm:** `dist/` içine elle dosya koyma. Statik dosyalar `public/`'e, script/araçlar `hooks/` veya proje köküne.

### U-11 — Port 5173 dolu

- **Belirti:** `Port 5173 is in use`.
- **Çözüm:** Eski dev sunucusunu kapat ya da `npm run dev -- --port 5174`. Hangi süreç kullanıyor: `Get-NetTCPConnection -LocalPort 5173 | Select OwningProcess`.

## Hook'lar ve araçlar

### U-12 — Git hook'ları çalışmıyor

- **Belirti:** Commit/push'ta kontrol çıktısı görünmüyor.
- **Kontrol sırası:**
  1. Git kurulu mu? `git --version` (yoksa `winget install Git.Git`, sonra VS Code'u yeniden başlat)
  2. Depo var mı? `git rev-parse --is-inside-work-tree`
  3. Hook yolu ayarlı mı? `git config core.hooksPath` → `hooks` olmalı. Değilse: `npm run hooks:install`
  4. Hook dosyaları LF mi? (bkz. U-08)
- `npm install`, `prepare` script'i sayesinde hook yolunu otomatik ayarlar.

### U-13 — Claude Code hook'ları / MCP araçları görünmüyor

- **Neden:** `.claude/settings.json` ve MCP sunucuları oturum başında yüklenir.
- **Çözüm:** VS Code'da Claude Code oturumunu yeniden başlat ya da `/hooks` menüsünü bir kez aç. Hook'u elle test etmek için:
  ```powershell
  '{"tool_input":{"file_path":"src/App.tsx"}}' | node hooks/scripts/check.mjs claude-edit
  ```

### U-14 — Uygulama açılıyor ama veriler garip / boş

- **Neden:** `localStorage` içindeki veri bozuk ya da eski formatta. `storage.ts` bunu zod ile doğrular ve örnek verilere döner.
- **Çözüm:** Sağ üst menü → _Örnek verilere sıfırla_. Ya da tarayıcı konsolunda: `localStorage.removeItem("kumbara:transactions")`.

### U-15 — Recharts `Cell`'e verilen `style` uygulanmıyor

- **Neden:** Recharts 2, `Cell`'in `style` prop'unu sektöre aktarmıyor.
- **Çözüm:** `opacity`, `filter`, `fill` gibi değerleri SVG attribute olarak ver (`<Cell opacity={…} />`).

### U-16 — 21st.dev bileşen kodu alınamıyor

- **Belirti:** `get_component` paywall döndürür, registry `403` verir.
- **Neden:** Ücretsiz planda günde 2 bileşen kodu; kota UTC gece yarısı sıfırlanır.
- **Çözüm:** Kalan hak: MCP `get_usage`. Önizlemeye bakıp seçim yap, yanıtın tamamını (`structuredContent` dahil) dosyaya kaydet.

### U-17 — Build "chunk 500 kB'den büyük" uyarısı

- **Çözüm:** `vite.config.ts → build.rollupOptions.output.manualChunks` içinde büyük kütüphaneleri (recharts, framer-motion, radix) ayrı parçalara böl. Zaten yapılandırılmış; yeni büyük bağımlılık eklersen listeye ekle.
