# Kişisel Finans Takip Paneli — Proje Brief'i

> Bu dosya Claude Code için hazırlanmıştır. Projeyi baştan sona bu dokümana göre kur, çalıştır ve lokalde test edilebilir halde teslim et.

---

## 1. Amaç

Kullanıcının **gelir** ve **giderlerini** girebildiği, bunları **pasta grafik (pie / donut chart)** ile kategori bazında görebildiği, tek sayfalık bir kişisel finans paneli.

Bu aşamada:
- **Backend yok**, harici bir servise / veritabanına **bağlanılmayacak**.
- Panel ilk açılışta **dummy (örnek) veri** ile dolu gelecek.
- Kullanıcının eklediği kayıtlar tarayıcıda (`localStorage`) tutulacak; sayfa yenilenince kaybolmayacak.
- Proje **lokalde** çalışacak (`npm run dev`).
- Öncelik: **çok kaliteli, modern ve şık bir arayüz.**

---

## 2. Teknoloji Yığını

| Katman | Seçim |
|---|---|
| Build / Dev | **Vite** |
| Framework | **React 18 + TypeScript** |
| Stil | **Tailwind CSS** |
| UI bileşenleri | **shadcn/ui** (Radix tabanlı) |
| Grafik | **Recharts** (PieChart / donut) |
| İkonlar | **lucide-react** |
| Animasyon | **framer-motion** (hafif geçişler için) |
| Form | **react-hook-form + zod** |
| Tarih | **date-fns** (`tr` locale) |
| State | React state + küçük bir custom hook (`useTransactions`) — ek kütüphane gerekmez |
| Kalıcılık | `localStorage` |

Paket yöneticisi: `npm`.

---

## 3. MCP Kurulumu (UI için)

Arayüzü oluştururken aşağıdaki MCP sunucusunu kullan. Proje kökünde `.mcp.json` dosyası oluştur:

```json
{
  "mcpServers": {
    "<MCP_ADI>": {
      "command": "<KOMUT>",
      "args": ["<ARGÜMANLAR>"],
      "env": {
        "<ANAHTAR>": "<DEĞER>"
      }
    }
  }
}
```

> ⚠️ **TODO (kullanıcı dolduracak):** MCP adı, komutu, argümanları ve varsa API anahtarı bu bölüme eklenecek. Bilgiler eklenmeden MCP kurulumunu atla; bileşenleri shadcn/ui ile elle oluştur.
>
> API anahtarı gibi gizli değerleri `.mcp.json` içine düz yazma; `.env` / ortam değişkeni kullan ve `.mcp.json`'u gerekiyorsa `.gitignore`'a ekle.

MCP aktifse: kart, form, dialog, tablo gibi UI bileşenlerini üretirken önce MCP'den yararlan, sonra projedeki tasarım token'larına (bkz. Bölüm 6) uyacak şekilde düzenle.

---

## 4. Veri Modeli

```ts
// src/types/finance.ts
export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;            // crypto.randomUUID()
  type: TransactionType;
  amount: number;        // her zaman pozitif, TL
  category: string;      // kategori id'si
  description?: string;
  date: string;          // ISO "2026-10-04"
  createdAt: string;     // ISO timestamp
}

export interface Category {
  id: string;
  name: string;          // Türkçe görünen ad
  type: TransactionType;
  color: string;         // grafikte kullanılacak renk (hex)
  icon: string;          // lucide ikon adı
}
```

### Varsayılan kategoriler

**Gelir:** Maaş, Serbest Çalışma, Yatırım, Kira Geliri, Diğer Gelir
**Gider:** Market, Kira, Faturalar, Ulaşım, Yeme-İçme, Eğlence, Sağlık, Alışveriş, Eğitim, Diğer Gider

Her kategoriye birbirinden net ayrışan, palete uyumlu bir renk ata.

---

## 5. Dummy Veri

`src/data/seed.ts` içinde **son 3 aya yayılmış ~40 işlem** üret:
- Her ay 1 maaş geliri (ör. 45.000 ₺), ara sıra serbest çalışma / yatırım geliri.
- Giderler gerçekçi dağılsın (kira en büyük kalem, market sık ve küçük tutarlar vb.).
- `localStorage` boşsa seed verisini yükle.
- Ayarlarda / üst menüde **"Örnek verilere sıfırla"** ve **"Tüm verileri temizle"** aksiyonları olsun (onay dialog'u ile).

---

## 6. Tasarım Sistemi

Tasarım kararları sana bırakıldı; aşağıdaki yön tavsiyedir, daha iyisini bulursan uygula.

### Tema
- **Koyu tema varsayılan**, açık tema da desteklensin (sağ üstte toggle).
- Yön: sakin, premium, "fintech" hissi. Göz yormayan derin lacivert/antrasit zemin, kartlarda hafif yükseltilmiş yüzeyler, ince kenarlıklar.

### Önerilen palet (CSS değişkeni olarak tanımla)
| Token | Koyu | Açık |
|---|---|---|
| `--background` | `#0B0F17` | `#F7F8FA` |
| `--surface` | `#121826` | `#FFFFFF` |
| `--border` | `#1F2937` | `#E5E7EB` |
| `--text` | `#E6EAF2` | `#0F172A` |
| `--muted` | `#8A94A7` | `#64748B` |
| `--primary` (vurgu) | `#7C5CFF` | `#6D4AFF` |
| `--income` | `#22C55E` | `#16A34A` |
| `--expense` | `#F43F5E` | `#E11D48` |

### Tipografi
- Font: **Inter** (Google Fonts), rakamlar için `font-variant-numeric: tabular-nums`.
- Büyük tutarlar için belirgin, kalın başlıklar.

### Detaylar
- Köşe yarıçapı: `rounded-2xl` kartlar, `rounded-xl` input/buton.
- Yumuşak gölgeler, hover'da hafif yükselme.
- Mikro animasyonlar: kart girişleri (fade + slide), grafik dilimlerinin açılış animasyonu, sayıların yumuşak sayması (count-up).
- Para formatı: `Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" })`.
- Tarih formatı: `4 Eki 2026`.
- Tüm arayüz **Türkçe**.

---

## 7. Sayfa Düzeni

Tek sayfa (dashboard). Masaüstünde grid, mobilde tek kolon.

```
┌──────────────────────────────────────────────────────────┐
│ Header: Logo/başlık · Dönem seçici · Tema toggle · Menü   │
├──────────────────────────────────────────────────────────┤
│ [Toplam Gelir] [Toplam Gider] [Net Bakiye] [Tasarruf %]  │  ← Özet kartları
├───────────────────────────────┬──────────────────────────┤
│                               │                          │
│   Pasta Grafik (donut)        │   Yeni İşlem Formu       │
│   Gelir/Gider sekmesi         │   (Gelir | Gider toggle) │
│   + kategori legend'ı         │                          │
│                               │                          │
├───────────────────────────────┴──────────────────────────┤
│ İşlem Listesi (filtre, arama, sıralama, silme/düzenleme)  │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Bileşenler ve Özellikler

### 8.1 Header
- Uygulama adı (ör. "Cüzdanım" — istersen daha iyi bir isim bul).
- **Dönem seçici:** Bu ay / Geçen ay / Son 3 ay / Bu yıl / Tümü. Tüm kartlar, grafik ve liste bu filtreye göre güncellenir.
- Tema toggle, menü (sıfırla / temizle).

### 8.2 Özet kartları (4 adet)
- Toplam Gelir (yeşil vurgu, ikon)
- Toplam Gider (kırmızı vurgu, ikon)
- Net Bakiye (pozitifse yeşil, negatifse kırmızı)
- Tasarruf Oranı `(gelir - gider) / gelir` — yüzde + küçük progress bar

### 8.3 Pasta grafik (ana bileşen)
- **Donut** tarzı (ortası boş), ortada seçili sekmenin toplam tutarı yazsın.
- Üstte sekme: **Giderler | Gelirler | Genel** (Genel = gelir vs gider iki dilim).
- Dilimler kategori renkleriyle.
- Hover'da dilim hafifçe büyüsün, özel tooltip: kategori adı, tutar, yüzde.
- Yanında / altında **legend listesi**: renk noktası, ikon, kategori adı, tutar, yüzde; tutara göre azalan sırada.
- Legend öğesine tıklanınca işlem listesi o kategoriye filtrelensin.
- Veri yoksa şık bir boş durum (illüstrasyon/ikon + açıklama).

### 8.4 Yeni işlem formu
- Gelir / Gider segment toggle (seçime göre renk ve kategori listesi değişir).
- Alanlar: Tutar (zorunlu, > 0), Kategori (zorunlu, ikonlu select), Tarih (varsayılan bugün, date picker), Açıklama (opsiyonel, maks. 100 karakter).
- zod ile doğrulama, Türkçe hata mesajları.
- Kaydedince: toast bildirimi ("İşlem eklendi"), form sıfırlanır, grafik animasyonla güncellenir.
- Mobilde form, sağ altta sabit "+" butonu ile açılan bir **Sheet/Dialog** içinde olsun.

### 8.5 İşlem listesi
- Kolonlar: Tarih, Kategori (ikon + ad), Açıklama, Tür rozeti, Tutar (gelir `+` yeşil, gider `−` kırmızı).
- Arama (açıklama/kategori), tür filtresi, kategori filtresi, tarih/tutar sıralama.
- Her satırda düzenle (aynı formu dialog'da açar) ve sil (onay ile, toast'ta "Geri al" seçeneği).
- Tarihe göre gruplama (ör. "Bugün", "Dün", "28 Eyl 2026").
- Mobilde tablo yerine kart listesi.

---

## 9. Klasör Yapısı

```
src/
  components/
    ui/                  # shadcn bileşenleri
    layout/Header.tsx
    dashboard/
      SummaryCards.tsx
      CategoryPieChart.tsx
      ChartLegend.tsx
      TransactionForm.tsx
      TransactionList.tsx
      EmptyState.tsx
  data/
    categories.ts
    seed.ts
  hooks/
    useTransactions.ts   # CRUD + localStorage senkronu
    usePeriodFilter.ts
  lib/
    format.ts            # para / tarih formatlayıcılar
    calculations.ts      # toplamlar, kategori dağılımı
    storage.ts
  types/finance.ts
  App.tsx
  main.tsx
  index.css              # tema token'ları
```

`calculations.ts` içindeki fonksiyonlar saf (pure) olsun; grafik ve kartlar hep buradan beslensin.

---

## 10. Kalite Kriterleri

- TypeScript `strict` açık, `any` yok.
- ESLint + Prettier kurulu, uyarısız.
- Erişilebilirlik: klavye ile gezilebilir, form label'ları, yeterli kontrast, grafikte renk dışında da (legend metni/yüzde) bilgi var.
- Responsive: 375px, 768px, 1280px+ genişliklerde düzgün.
- `localStorage` erişimi `try/catch` içinde; bozuk veri gelirse seed'e dön.
- `calculations.ts` için **Vitest** ile birkaç birim testi (toplamlar, yüzdeler, dönem filtresi).

---

## 11. Çalıştırma

README.md'ye şunları yaz:

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run test
```

---

## 12. Kabul Kriterleri (Bitti Sayılması İçin)

- [ ] `npm run dev` ile hatasız açılıyor, ilk açılışta dummy verilerle dolu.
- [ ] Gelir ve gider eklenebiliyor, düzenlenebiliyor, silinebiliyor.
- [ ] Pasta grafik eklenen kayıtla anında ve animasyonlu güncelleniyor.
- [ ] Giderler / Gelirler / Genel sekmeleri çalışıyor.
- [ ] Dönem filtresi tüm paneli etkiliyor.
- [ ] Sayfa yenilenince veriler korunuyor.
- [ ] Koyu/açık tema çalışıyor.
- [ ] Mobilde düzgün görünüyor.
- [ ] Testler ve build geçiyor.

## 13. Kapsam Dışı (Şimdilik)

Kullanıcı girişi, backend/veritabanı, çoklu para birimi, bütçe hedefleri, CSV dışa aktarma, banka entegrasyonu. Kodu ileride bir API'ye bağlamayı kolaylaştıracak şekilde (`storage.ts` arkasında soyutlanmış) yaz.
