# Kumbara — Kişisel Finans Takip Paneli

Gelir ve giderlerinizi girip kategori bazında donut grafikle izleyebileceğiniz, tek sayfalık bir finans paneli. Backend yoktur; veriler tarayıcının `localStorage` alanında tutulur ve ilk açılışta örnek verilerle gelir.

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run test
```

Diğer komutlar:

```bash
npm run lint          # ESLint (uyarı toleransı 0)
npm run format        # Prettier ile biçimlendir
npm run preview       # build çıktısını önizle
```

## Özellikler

- **Özet kartları:** toplam gelir, toplam gider, net bakiye ve tasarruf oranı (sayıların yumuşak sayma animasyonuyla)
- **Donut grafik:** Giderler / Gelirler / Genel sekmeleri, hover'da büyüyen dilimler, özel tooltip, sıralı legend. Legend'daki bir öğeye ya da dilime tıklayınca liste o kategoriye göre filtrelenir.
- **İşlem formu:** Gelir/Gider seçimi, zod ile Türkçe doğrulama, tarih seçici. Mobilde sağ alttaki "+" butonuyla alttan açılan bir panelde.
- **İşlem listesi:** arama, tür ve kategori filtresi, sıralama, tarihe göre gruplama, düzenleme ve silme (toast'ta "Geri al" seçeneğiyle). Mobilde kart görünümü.
- **Dönem filtresi:** Bu ay / Geçen ay / Son 3 ay / Bu yıl / Tümü. Paneldeki her şey bu seçime göre güncellenir.
- **Koyu/açık tema:** varsayılan koyu, tercih hatırlanır.
- **Veri yönetimi:** sağ üstteki menüden "Örnek verilere sıfırla" ve "Tüm verileri temizle".

## Kontroller ve hook'lar

| Komut                   | Ne yapar                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run check`         | Tam kontrol: gizli bilgi, biçim, lint, tip, test, build, npm audit |
| `npm run doctor`        | Ortam ve bağımlılık uyumluluğu teşhisi                             |
| `npm run hooks:install` | Git hook'larını etkinleştirir (`npm install` sırasında otomatik)   |

Git hook'ları (`hooks/`): `pre-commit` (commit'lenen dosyalar), `commit-msg` (mesaj formatı), `pre-push` (tam kontrol). Claude Code hook'ları (`.claude/settings.json`): her düzenlemeden sonra dosya kontrolü, her yanıt sonunda proje kontrolü.

Kurallar: [docs/KURALLAR-GITHUB.md](docs/KURALLAR-GITHUB.md) · Sorun çözümleri: [docs/KURALLAR-UYUMLULUK.md](docs/KURALLAR-UYUMLULUK.md)

## 21st.dev MCP

Arayüz bileşenleri için [21st.dev](https://21st.dev) MCP sunucusu `.mcp.json` içinde tanımlıdır. API anahtarı dosyaya yazılmaz; `TWENTYFIRST_API_KEY` ortam değişkeninden okunur:

```powershell
[Environment]::SetEnvironmentVariable('TWENTYFIRST_API_KEY', '<anahtar>', 'User')
```

`.mcp.json` `.gitignore` içindedir. 21st.dev'den uyarlanan parçalar:

- **Pie Chart** (arihantcodes): hover'da diğer dilimleri soldurma, parlama filtresi, aralıklı/yuvarlatılmış dilimler → `CategoryPieChart`, `ChartGlowFilter`, `lib/chart.ts`
- **Commerce Dashboard** (efferd): trend göstergeli KPI kartları + gelir alan grafiği düzeni → `SummaryCards`, `CashflowChart`

## Teknolojiler

Vite · React 18 · TypeScript (strict) · Tailwind CSS · shadcn/ui (Radix) · Recharts · framer-motion · react-hook-form + zod · date-fns (`tr`) · lucide-react · Vitest

## Proje yapısı

```
src/
  components/
    ui/          shadcn/ui bileşenleri
    layout/      Header
    dashboard/   SummaryCards, CategoryPieChart, ChartLegend, TransactionForm, TransactionList, EmptyState …
  data/          kategoriler ve örnek veri üretici
  hooks/         useTransactions (CRUD + kalıcılık), usePeriodFilter, useTheme, useMediaQuery
  lib/
    calculations.ts   saf hesap fonksiyonları (toplamlar, dağılım, dönem filtresi) + testleri
    format.ts         para / tarih / tutar ayrıştırma
    storage.ts        kalıcılık soyutlaması (TransactionRepository)
  types/finance.ts
```

### API'ye geçiş

Uygulama verilere yalnızca `src/lib/storage.ts` içindeki `TransactionRepository` arayüzü üzerinden erişir. Bir backend'e geçmek için bu arayüzü uygulayan yeni bir repository yazıp `useTransactions` hook'una vermek yeterlidir.

`localStorage` verisi okunurken zod ile doğrulanır; veri bozuksa veya okunamıyorsa uygulama örnek verilere döner.
