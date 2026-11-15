# 03 — Perbaikan Proses Pemesanan

## Alur sekarang (portal pelanggan → admin)

```
Pelanggan: Pesan Langganan Baru → pilih paket → hari → tagar → (kode referal) → bayar koin / transfer + kirim bukti ke WA
        → status "Menunggu Konfirmasi"
Admin:   PIN → tab paket → Setujui → langganan masuk Dashboard Aktif → ceklis harian → limit → arsip
```

Masalah utama yang ditemukan:
1. Pelanggan baru tahu ada kesalahan (tagar kembar, lebih dari 20 tagar) **setelah** menekan Kirim.
2. Setiap kali memesan, harus memilih ulang paket dan durasi dari awal.
3. Jika dialog tertutup tidak sengaja, semua tagar yang sudah diketik **hilang**.
4. Pembayaran manual (transfer + kirim bukti ke WA + tekan "OK sudah bayar") mengandalkan kejujuran dan
   membuat admin harus mencocokkan bukti satu per satu.
5. Tiga jenis pesanan (Langganan, Bot, Bulk) memakai tiga tombol dan tiga form yang berbeda.
6. Admin harus memasukkan PIN sebelum bisa melihat pesanan masuk.

## Yang sudah diterapkan ✅ (`pelanggan/js/new-order.js`, `pelanggan/js/dashboard.js`)

| Perbaikan | Manfaat |
|---|---|
| **Umpan balik tagar langsung** saat mengetik: "1 tagar kembar dihapus otomatis", "Kelebihan 3 tagar (maks. 20)", "Siap dikirim: 3 tagar × 30 hari" | Kesalahan terlihat sebelum Kirim, tidak ada kejutan |
| **Tombol Kirim tampak redup** selama isian belum valid | Jelas kapan pesanan sudah siap |
| **Ingat pilihan terakhir** (paket + durasi) setelah pesanan berhasil | Pesan ulang jadi 2 langkah: tempel tagar → Kirim |
| **Draf tagar otomatis tersimpan** (per tab browser) dan dipulihkan bila dialog tertutup | Tidak perlu mengetik ulang |
| **Tombol Esc** menutup dialog (tidak berlaku saat langkah pembayaran, agar tidak batal tak sengaja) | Lebih cepat di PC |

Tidak ada perubahan pada fungsi SQL atau data. Validasi akhir tetap dilakukan server (`cu_request_new_order`).

## Saran lanjutan 💡

### Untuk pelanggan
1. **Satu form "Pesan"** dengan pilihan jenis di atas (Langganan / Bot / Bulk / Catalog). Kolom yang sama
   (tagar, catatan, kode referal) cukup ditulis sekali.
2. **Wizard 3 langkah** dengan indikator progres: ① Paket & durasi → ② Tagar → ③ Ringkasan & bayar.
   Total harga selalu terlihat (sticky) di bawah layar HP.
3. **Tombol "Pesan lagi" / "Perpanjang semua yang limit"** di Beranda, dengan satu klik untuk mengisi ulang
   tagar dari pesanan sebelumnya.
4. **Status pesanan yang jelas**: Menunggu bayar → Menunggu konfirmasi → Diproses → Aktif, ditampilkan sebagai
   garis waktu kecil di setiap pesanan, beserta perkiraan kapan diproses.
5. **Notifikasi** saat pesanan disetujui atau ditolak (Telegram/WA bot sudah ada di admin, bisa diperluas ke pelanggan).
6. **Validasi format tagar** (mis. tanpa spasi, otomatis menambahkan `#`). Perlu disepakati dulu format resminya agar
   tidak bentrok dengan data lama.

### Untuk pembayaran
7. **Utamakan bayar dengan koin** (sudah ada dan otomatis): top up sekali, lalu setiap pesanan langsung terpotong
   tanpa perlu kirim bukti.
8. **Kode unik nominal** (mis. Rp 150.000 → Rp 150.037) untuk transfer manual, sehingga admin cukup mencocokkan nominal.
9. **Unggah foto bukti bayar langsung di portal** (Supabase Storage, bucket privat) sebagai pengganti kirim lewat WA.
   Bukti langsung menempel pada pesanan di dashboard admin.
10. Jangka panjang: **payment gateway QRIS dinamis** (Midtrans/Xendit/Tripay) + webhook untuk konfirmasi otomatis.

### Untuk admin
11. Setelah login admin (K2) aktif, **hapus kewajiban PIN** untuk melihat pesanan masuk. PIN cukup untuk aksi sensitif
    (hapus, ubah harga).
12. **Tombol "Setujui semua yang sudah dibayar koin"** (pembayaran koin sudah pasti lunas).
13. **Antrean terpadu**: satu daftar untuk semua pesanan masuk (Baru, Perpanjang, Bot, Bulk, Catalog, Supply,
    Preorder), diurutkan berdasarkan waktu, dengan filter jenis. Saat ini tersebar di beberapa menu dan lencana.
14. **Riwayat audit**: catat siapa menyetujui/menolak dan kapan (`order_audit_log`), penting jika admin lebih dari satu.
