# Lenstore Management — DIRECTORY

Dashboard admin (`/`) + portal pelanggan (`/pelanggan`), HTML/JS statis dengan database Supabase.

## Dokumen perbaikan

| Dokumen | Isi |
|---|---|
| [docs/01-KEAMANAN.md](docs/01-KEAMANAN.md) | Audit keamanan, perbaikan yang sudah diterapkan, dan **langkah aktivasi login admin** |
| [docs/02-DESAIN.md](docs/02-DESAIN.md) | Tema baru "Neo" + saran desain |
| [docs/03-PEMESANAN.md](docs/03-PEMESANAN.md) | Perbaikan alur pemesanan + saran |

## ⚠️ Prioritas no. 1

Tabel `orders`, `products`, `archives`, dan `tagar_batches` saat ini **bisa dihapus oleh siapa saja**.
Ikuti tabel "Urutan aktivasi" di [docs/01-KEAMANAN.md](docs/01-KEAMANAN.md#-1-tabel-inti-bisa-dibaca-diubah--dihapus-oleh-siapa-saja---disiapkan).

## Keamanan database

Semua perubahan di repo ini **tidak menyentuh data**. File SQL baru ada di `sql/keamanan/`, bersifat opsional,
hanya mengganti aturan akses atau isi fungsi, dan disertai file rollback.
