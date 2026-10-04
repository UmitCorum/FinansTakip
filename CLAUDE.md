# Kumbara — Claude için proje notları

Kişisel finans paneli: Vite + React 18 + TypeScript + Tailwind 3 + shadcn/ui + Recharts 2. Proje tanımı: `PROJECT_BRIEF.md`.

## Kurallar

- GitHub kuralları: `docs/KURALLAR-GITHUB.md` (G-xx). Uyumluluk sorunları ve çözümleri: `docs/KURALLAR-UYUMLULUK.md` (U-xx).
- Gizli bilgi (API anahtarı, token) asla dosyaya yazılmaz; ortam değişkeni kullanılır (G-01).
- `git commit/push --no-verify` kullanma (G-12). Commit mesajları Conventional Commits (G-10).
- Kütüphane ana sürümünü yükseltmeden önce U-06'yı oku.

## Komutlar

```bash
npm run dev       # http://localhost:5173
npm run check     # tam kontrol (pre-push ile aynı)
npm run doctor    # ortam / bağımlılık teşhisi
npm run test · npm run lint · npm run build · npm run format
```

Windows PowerShell 5.1: `&&` yok (U-09). Yeni kurulan araçlar PATH'te yoksa U-01.

## Otomatik kontroller

- Her dosya düzenlemesinden sonra (`.claude/settings.json` PostToolUse): Prettier ile biçimlenir, ESLint ve gizli bilgi taraması çalışır. Hata çıkarsa düzelt.
- Her yanıt sonunda (Stop): proje değiştiyse tip + lint + test + gizli bilgi taraması. Başarısızsa bitirmeden düzelt.
- Git: `pre-commit`, `commit-msg`, `pre-push` → `hooks/scripts/check.mjs`.

## Skill'ler

`.claude/settings.json` [anthropics/skills](https://github.com/anthropics/skills) marketplace'ini (`anthropic-agent-skills`) tanımlar ve `example-skills` plugin'ini etkinleştirir. Arayüz işlerinde `frontend-design`, tarayıcı testlerinde `webapp-testing` skill'ini kullan.

## Tasarım dili ("Banknot")

- Yön: Türk lirası banknotu. Tek akılda kalan öğe, net bakiyenin basıldığı guilloche desenli banknot paneli (`BalanceNote`, `Guilloche`). Geri kalan her şey sade.
- Renk token'ları `src/index.css`'te (koyu: gece mürekkebi, açık: güvenlik kâğıdı). Kategori renkleri banknot mürekkeplerinden (`data/categories.ts`).
- Tipografi: Fraunces yalnızca büyük tutarlar ve bölüm başlıkları (`font-display`); arayüz Manrope.
- Köşe yarıçapı hiyerarşiye göre: `rounded-note` 20 · `rounded-panel` 14 · kontroller 10. Gölge yalnızca yüzen katmanlarda (`shadow-lift`).
- Kaçınılanlar: BÜYÜK HARF etiketler, "A · B" meta metinleri, bölüm başına giriş animasyonu, kart hover-lift, gradient yıkama, aynı kartlardan grid. Tek yükleme anı: guilloche çizimi + bakiye sayımı.
- Metin: sentence case, kullanıcıya "sen" diye hitap; buton ile toast aynı fiili kullanır ("Gider ekle" → "Gider eklendi").

## Kod düzeni

- Hesaplamalar saf fonksiyon olarak `src/lib/calculations.ts`'de; yeni fonksiyona `calculations.test.ts`'de test ekle.
- Kalıcılık yalnızca `src/lib/storage.ts` (`TransactionRepository`) üzerinden.
- Arayüz metinleri Türkçe; para `formatCurrency`, tarih `formatDate` ile.
- `dist/` build çıktısıdır, içine dosya koyma (U-10).
