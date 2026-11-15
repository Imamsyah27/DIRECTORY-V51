# Lenstore Management — DIRECTORY

Dashboard admin (`/`) + portal pelanggan (`/pelanggan`), HTML/JS statis dengan database Supabase.

## Dokumen perbaikan

| Dokumen | Isi |
|---|---|
| [docs/01-KEAMANAN.md](docs/01-KEAMANAN.md) | Audit keamanan, perbaikan yang sudah diterapkan, dan **langkah mengunci tabel dengan PIN** |
| [docs/02-DESAIN.md](docs/02-DESAIN.md) | Tema baru "Neo" + saran desain |
| [docs/03-PEMESANAN.md](docs/03-PEMESANAN.md) | Perbaikan alur pemesanan + saran |

## ⚠️ Prioritas no. 1

Tabel `orders`, `products`, `archives`, dan `tagar_batches` saat ini **bisa dibaca dan dihapus oleh siapa saja yang
membuka portal pelanggan**. Jalankan file berikut di Supabase SQL Editor, berurutan:

1. `sql/keamanan/K1-pin-admin-anti-bruteforce.sql`
2. Deploy kode ini → buka dashboard admin → masukkan PIN admin
3. `sql/keamanan/K2-kunci-tabel-pin.sql` (jalankan 2x bila diminta)
4. `sql/keamanan/K3-keamanan-pelanggan.sql`

Detail: [docs/01-KEAMANAN.md](docs/01-KEAMANAN.md).

## Keamanan database

Semua perubahan di repo ini **tidak menyentuh data**. File SQL di `sql/keamanan/` hanya mengganti aturan akses atau isi fungsi,
sudah diuji di PostgreSQL 16, dan disertai file rollback.
