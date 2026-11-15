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

**Perbaikan (tidak menghapus data):**
1. ✅ Layar **login admin** (email + password Supabase Auth): `js/admin-auth.js`. Aktif bila
   `ADMIN_LOGIN_WAJIB = true` di `config.js`. Juga ada tombol Keluar dan auto-logout setelah 120 menit tanpa aktivitas.
2. 🟡 `sql/keamanan/K2-login-admin-kunci-tabel.sql` mengganti policy publik dengan policy **khusus admin**
   (tabel `app_admins` + fungsi `is_app_admin()`). Portal pelanggan tidak terpengaruh karena hanya memakai
   fungsi RPC `security definer`. Saya sudah memeriksa: tidak ada fungsi SQL non-definer yang membaca tabel inti.
3. Bisa dibatalkan kapan saja dengan `sql/keamanan/K2-ROLLBACK.sql`.

**Urutan aktivasi (ikuti persis supaya Anda tidak terkunci):**

| # | Langkah | Di mana |
|---|---|---|
| 1 | Deploy kode terbaru ini (login masih nonaktif, tampilan tetap jalan) | Vercel |
| 2 | Authentication → Users → **Add user** → email + password admin → centang *Auto Confirm* | Supabase |
| 3 | Authentication → Sign In / Providers → **matikan "Allow new users to sign up"** | Supabase |
| 4 | `config.js` → `const ADMIN_LOGIN_WAJIB = true;` → deploy → coba login | Kode |
| 5 | Ganti `GANTI_EMAIL_ADMIN@contoh.com` di file K2 → jalankan seluruh file di SQL Editor | Supabase |
| 6 | Uji: buka website di jendela penyamaran **tanpa login** → data tidak boleh muncul | Browser |

> Langkah 5 otomatis **dibatalkan** (tidak mengubah apa pun) bila belum ada admin yang terdaftar.

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

## 🟡 5. PIN admin disimpan polos di `sessionStorage` — 💡 saran

`sessionStorage["akun_admin_pin"]` bisa dibaca script mana pun yang berjalan di halaman (risiko bila ada XSS).
Setelah K2 aktif, **saran**: ganti pemeriksaan PIN di setiap fungsi dengan `is_app_admin()`
(berdasarkan login Supabase). Dengan begitu PIN tidak perlu dikirim ulang dan tidak perlu disimpan.
Ini perubahan besar (sekitar 200 fungsi), jadi sebaiknya dikerjakan bertahap per modul.

## 🟡 6. XSS (sisipan HTML/script) — sudah relatif aman

Saya memeriksa 43 file yang memakai `innerHTML`. Data dari pelanggan (tagar, catatan, nama) sudah melewati
`escapeHtml()` / `linkify()`. Sisa `${...}` yang tidak di-escape hanya berupa angka atau teks internal.
💡 Saran: atribut `src="data:${mime};base64,..."` pada QRIS sebaiknya divalidasi (`image/png|jpeg|webp`) di SQL.

## 🟡 7. Data pribadi pelanggan — 💡 saran

- Nomor WhatsApp terbuka untuk publik sampai K2 dijalankan (lihat poin 1).
- Sesi pelanggan tersimpan di `localStorage` selama 7 hari. 💡 Pertimbangkan 1–3 hari dan tombol "Keluar dari semua perangkat".
- Link "lihat sebagai pelanggan" (`#av=<token>`) saat ini berlaku **8 jam** (`sql/admin-view.sql` baris 27). 💡 Cukup 30–60 menit: ganti `interval '8 hours'` menjadi `interval '1 hour'`.

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
| `js/admin-auth.js` (baru) | Login admin, logout, auto-logout, peringatan PIN default |
| `config.js` | `ADMIN_LOGIN_WAJIB`, `ADMIN_AUTO_LOGOUT_MENIT` |
| `js/init.js`, `js/autorefresh.js` | Tidak memuat data sebelum admin login |
| `js/akun-pelanggan.js` | PIN baru minimal 8 karakter |
| `vendor/*`, `pelanggan/vendor/*` (baru) | Library terkunci versi, tanpa CDN |
| `index.html`, `pelanggan/*.html` | Memakai library lokal |
| `vercel.json`, `pelanggan/vercel.json` | Header keamanan lengkap |
| `sql/keamanan/K1…`, `K2…`, `K2-ROLLBACK` (baru) | SQL opsional, **tidak menghapus data** |
