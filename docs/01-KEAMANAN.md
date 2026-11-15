# 01 — Audit & Perbaikan Keamanan

Status: ✅ = sudah diperbaiki di kode ini · 🟡 = disiapkan, perlu langkah Anda · 💡 = saran untuk nanti

Tingkat risiko: 🔴 Kritis · 🟠 Tinggi · 🟡 Sedang · ⚪ Rendah

---

## 🔴 1. Tabel inti bisa dibaca, diubah & DIHAPUS oleh siapa saja — 🟡 disiapkan

**Temuan.** `js/database.sql` membuat policy `public_select / public_insert / public_update / public_delete`
dengan `using (true)` pada tabel **orders, products, tagar_batches** (dan *archives* dipakai dengan cara yang sama).
Anon key Supabase ada di `config.js` dan terlihat oleh siapa pun yang membuka website (memang dirancang publik).
Akibatnya siapa pun bisa membuka console browser lalu menjalankan:

```js
supabaseClient.from("orders").delete().neq("id", 0)   // menghapus SEMUA pesanan
supabaseClient.from("orders").select("*")             // membaca semua nama + nomor WhatsApp pelanggan
```

PIN admin **tidak** melindungi tabel ini. PIN hanya dipakai oleh fungsi RPC.

> **Walau website admin tidak dipublikasikan, celah ini tetap terbuka**, karena anon key yang sama juga ada di
> **portal pelanggan** (`pelanggan/config.js`). Setiap pelanggan yang membuka portal bisa menjalankan perintah di atas.
> Repo GitHub ini juga **publik**, jadi isi `config.js` bisa dibaca siapa saja.

**Perbaikan tanpa login email (tidak menghapus data):**
1. ✅ Dashboard admin meminta **PIN admin sekali per perangkat** (layar "Buka Dashboard", `js/keamanan.js`).
   PIN disimpan di perangkat itu dan otomatis ikut di setiap permintaan ke Supabase (header `x-admin-pin`, `config.js`).
   Menu yang meminta PIN (Akun Pelanggan, Harga, Koin, dan lainnya) otomatis terbuka.
   Tombol **Kunci** di header menghapus PIN dari perangkat, cocok dipakai di HP/PC pinjaman.
2. 🟡 `sql/keamanan/K2-kunci-tabel-pin.sql` mengganti policy publik: tabel inti hanya bisa dibuka oleh permintaan yang
   membawa PIN admin yang benar. Portal pelanggan tetap jalan karena hanya memakai fungsi RPC `security definer`.
3. Bisa dibatalkan kapan saja dengan `sql/keamanan/K2-ROLLBACK.sql`.

**Sudah diuji** di PostgreSQL 16 dengan skema dari `js/database.sql` + `customer_portal_fixed.sql` + `admin-view.sql`:

| Uji | Hasil |
|---|---|
| Pengunjung portal (tanpa PIN) membaca `orders` | 0 baris ✅ |
| Pengunjung portal menghapus semua `orders` | Tidak ada yang terhapus ✅ |
| PIN salah | 0 baris, ditahan 0,8 detik ✅ |
| Dashboard admin (PIN benar): baca, ubah, tambah | Berhasil ✅ |
| Pelanggan login + lihat pesanan sendiri (RPC) | Berhasil ✅ |
| K2 dijalankan sebelum K1 | Ditolak, tidak ada yang berubah ✅ |
| Rollback | Akses kembali seperti semula ✅ |

**Urutan aktivasi:**

| # | Langkah | Di mana |
|---|---|---|
| 1 | Jalankan `K1-pin-admin-anti-bruteforce.sql` | Supabase SQL Editor |
| 2 | Deploy kode terbaru, buka dashboard admin, masukkan PIN di layar "Buka Dashboard" | Browser |
| 3 | Jalankan `K2-kunci-tabel-pin.sql`. Jika muncul *"BELUM DIKUNCI"*: refresh dashboard admin sekali, lalu jalankan K2 lagi | Supabase SQL Editor |
| 4 | Refresh dashboard admin → data harus muncul. Buka portal pelanggan → harus normal | Browser |

> K2 **menolak mengunci** sebelum terbukti dashboard admin Anda berhasil mengirim PIN ke server,
> jadi Anda tidak mungkin terkunci di luar.
> Jika nanti PIN diganti lewat menu Ganti PIN Admin, perangkat yang dipakai untuk mengganti ikut diperbarui otomatis.
> Perangkat lain akan diminta memasukkan PIN baru.

## 🟠 2. PIN admin bisa ditebak otomatis (brute force) — 🟡 disiapkan

**Temuan.** `admin_verify_pin()` bisa dipanggil tanpa batas. PIN default `123456`, panjang minimal hanya 4.
PIN ini membuka banyak fitur: akun pelanggan, harga, koin, Telegram, cashflow, BSL, modal, dan lainnya
(dipakai di 219 tempat di SQL).

**Perbaikan:**
- 🟡 `sql/keamanan/K1-pin-admin-anti-bruteforce.sql`: setiap PIN **salah** ditahan sekitar 0,8 detik dan diantrikan
  secara global. Hasilnya penebak otomatis maksimal sekitar 1 tebakan per detik. PIN benar tidak diperlambat.
  Hash PIN tidak disentuh, jadi PIN Anda sekarang tetap berlaku.
- ✅ PIN baru wajib **minimal 8 karakter** (di kode dan di SQL K1) dan PIN yang terlalu mudah ditolak.
- ✅ Bila PIN default (`123456` dan sejenisnya) dipakai, muncul **bar peringatan** di atas dashboard admin.

## 🟠 3. Library diambil dari CDN tanpa versi pasti — ✅ diperbaiki

**Temuan.** `supabase-js@2` (versi "terbaru 2.x", bisa berubah sendiri) dari jsDelivr. Jika CDN atau paketnya
disusupi, kode jahat langsung berjalan di dashboard admin, yang memegang PIN dan akses data.

**Perbaikan.** Library disimpan di project dengan versi terkunci: `vendor/supabase-2.118.0.js` dan
`vendor/chart-4.4.1.umd.js` (salinannya juga ada di `pelanggan/vendor/`). Website tidak lagi bergantung pada CDN.

## 🟠 4. Header keamanan HTTP kurang — ✅ diperbaiki (`vercel.json`, `pelanggan/vercel.json`)

Ditambahkan:
- **Content-Security-Policy**: script hanya dari domain sendiri; koneksi hanya ke `*.supabase.co`
  (dan `api.telegram.org` untuk admin); `object-src 'none'`; `frame-ancestors`; `base-uri`; `form-action`.
- **Strict-Transport-Security** (HTTPS wajib), **Permissions-Policy** (kamera, mikrofon, dan lokasi diblokir),
  **Cross-Origin-Opener-Policy**, `X-Frame-Options: DENY` untuk admin.
- `Cache-Control: no-store` untuk halaman admin.
- Folder `docs/`, `js/database.sql`, dan `README.md` tidak bisa diakses lewat URL.

> Catatan: CSP masih mengizinkan `'unsafe-inline'` karena HTML memakai `onclick="..."` dan `style="..."`.
> 💡 Langkah berikutnya: pindahkan handler inline ke file JS, lalu hapus `'unsafe-inline'` dari `script-src`.

## 🟡 5. PIN admin tersimpan di perangkat admin — 💡 saran

PIN tersimpan di `localStorage` perangkat admin dan bisa dibaca script yang berjalan di halaman admin (risiko bila ada XSS).
Itu sebabnya CSP diperketat dan library tidak lagi diambil dari CDN. Jangan memasukkan PIN di perangkat orang lain,
atau tekan **Kunci** setelah selesai.
💡 Jangka panjang: login Supabase Auth untuk admin (lebih kuat daripada PIN bersama).

## 🟡 6. XSS (sisipan HTML/script) — sudah relatif aman

Saya memeriksa 43 file yang memakai `innerHTML`. Data dari pelanggan (tagar, catatan, nama) sudah melewati
`escapeHtml()` / `linkify()`. Sisa `${...}` yang tidak di-escape hanya berupa angka atau teks internal.
💡 Saran: atribut `src="data:${mime};base64,..."` pada QRIS sebaiknya divalidasi (`image/png|jpeg|webp`) di SQL.

## 🟠 7. Keamanan akun pelanggan — ✅ / 🟡 `sql/keamanan/K3-keamanan-pelanggan.sql`

| Temuan | Perbaikan |
|---|---|
| Fungsi lama `customer_reset_password` bisa mereset password **hanya dengan username + nomor WA**. Nomor WA sendiri terbuka dari tabel `orders`, jadi akun bisa diambil alih | 🟡 K3 memastikan akses publiknya dicabut. `customer_portal_fixed.sql` sebenarnya sudah mencabutnya, tapi belum tentu bila dulu yang dijalankan versi lama |
| Link "lihat sebagai pelanggan" berlaku **8 jam** | 🟡 K3: menjadi **1 jam** |
| Password pelanggan minimal 6 karakter, boleh sama dengan username | ✅ portal + 🟡 K3: minimal **8**, tidak boleh sama dengan password lama atau username |
| Salah password lama saat ganti password tidak diperlambat | 🟡 K3: ditahan 0,5 detik |
| Draf tagar dan pilihan terakhir tertinggal di perangkat setelah keluar | ✅ dihapus otomatis saat pelanggan menekan Keluar |
| Sesi login 7 hari | 💡 pertimbangkan 1–3 hari (ubah di `customer_login`) |

K3 sudah diuji di PostgreSQL 16 (bisa dijalankan berulang, password yang sudah ada tetap berlaku).

## ⚪ 8. Lain-lain — 💡 saran

- **Backup**: aktifkan *Point in Time Recovery*, atau minimal ekspor rutin (Supabase → Database → Backups).
- **Pisahkan domain admin**: sebaiknya admin tidak berada di domain yang sama dengan portal pelanggan,
  misalnya `admin.domain.com` dan `domain.com`.
- **Token bot Telegram** sudah aman (tidak dikirim ke browser, hanya 4 digit terakhir).
- **Rate limit login pelanggan** sudah ada (terkunci 15 menit setelah 5 kali salah).
- Jangan menyimpan **service_role key** di kode frontend (saat ini tidak ada, bagus).

---

### Ringkasan file yang berubah karena keamanan

| File | Perubahan |
|---|---|
| `js/keamanan.js` (baru) | PIN sekali per perangkat, tombol Kunci, peringatan PIN default |
| `config.js` | Mengirim PIN perangkat (header `x-admin-pin`) |
| `js/init.js`, `js/autorefresh.js` | Tidak memuat data sebelum PIN dimasukkan |
| `js/akun-pelanggan.js` | PIN baru minimal 8 karakter, PIN perangkat ikut diperbarui |
| `pelanggan/js/*` | Password minimal 8, data lokal dihapus saat keluar |
| `vendor/*`, `pelanggan/vendor/*` (baru) | Library terkunci versi, tanpa CDN |
| `index.html`, `pelanggan/*.html` | Memakai library lokal |
| `vercel.json`, `pelanggan/vercel.json` | Header keamanan lengkap |
| `sql/keamanan/K1`, `K2`, `K2-ROLLBACK`, `K3` (baru) | SQL opsional, **tidak menghapus data**, sudah diuji |
