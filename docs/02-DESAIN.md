# 02 — Perbaikan Desain: tema "Neo"

Tujuan: tampil **futuristik** seperti panel instrumen, tetapi **tidak terasa seperti template AI**
(tanpa gradasi ungu, efek kaca buram, atau glow di mana-mana) dan tetap **mudah dipakai** di HP.

## Yang sudah diterapkan ✅

| Bagian | Sebelum | Sesudah (Neo) |
|---|---|---|
| Warna | Biru muda, banyak gradasi | Grafit gelap `#0B0E12` + **satu aksen** hijau-limau `#C8F04A` |
| Permukaan | Bayangan & gradasi kartu | Datar, garis tipis 1px, latar grid halus seperti layar instrumen |
| Tombol utama | Gradasi + glow | Solid, sudut tegas 8px, tinggi minimal 40px (44px di layar sentuh) |
| Tab/menu aktif | Blok berwarna menyala | Latar tipis + **garis aksen bawah**, lebih tenang dan jelas |
| Angka | Font biasa | **Monospace + tabular** (JetBrains Mono) untuk saldo, KPI, harga, tabel, sehingga angka rapi sejajar |
| Judul | Sora | Space Grotesk, lebih teknis dan tidak generik |
| Tabel | Hover blok | Hover + **garis aksen kiri**, header huruf kapital kecil |
| Toast | Blok warna | Kartu gelap + garis status di kiri |
| Logo "LS" | Kotak gradasi | Kotak garis aksen, gaya monospace |

**Aksesibilitas (berlaku di semua tema):**
- Kontras teks di atas WCAG AA (teks utama `#E8ECF1` di atas `#0B0E12` ≈ 15:1, teks redup ≈ 6:1).
- Ring fokus terlihat jelas saat memakai keyboard (`:focus-visible`).
- Animasi otomatis dimatikan bila HP/PC memakai pengaturan "kurangi gerakan".
- Target sentuh 44px di layar sentuh.

**Cara kerja:** file `neo.css` (admin) dan `pelanggan/neo.css` (portal) dimuat paling akhir.
Neo menjadi **tema default**. Pengguna lama otomatis dipindahkan **sekali** ke Neo, dan tetap bisa kembali ke
Putih, Hitam, Biru Muda, atau Pink lewat tombol tema. Tidak ada HTML lama yang dihapus.

## Saran lanjutan 💡 (belum dikerjakan agar tidak merusak alur yang sudah biasa dipakai)

1. **Kurangi emoji di menu dan judul.** Emoji di setiap tombol adalah salah satu ciri paling kuat
   tampilan "buatan AI". Ganti dengan set ikon garis yang konsisten (mis. Lucide/Tabler, SVG inline),
   atau cukup teks saja.
2. **Sederhanakan menu admin.** Saat ini ada 11 menu utama + Setting. Kelompokkan menjadi 4:
   *Pesanan* (Dashboard, Order, Arsip), *Stok* (List-Farm, Supply, Farm/HAV Sell),
   *Keuangan* (CashFlow, BSL, Modal), dan *Pengaturan*.
3. **Portal pelanggan: 7 tab → 4 tab.** Beranda (status + tombol Pesan), Pesanan (Bot/Bulk/Catalog digabung
   dengan filter), Riwayat (Arsip + Perpanjangan), Akun (password, bahasa, tema, kontak admin).
4. **Satu tombol "Pesan" utama.** Saat ini ada 3 tombol sejajar (Langganan / Bot / Bulk) yang muncul di 3 tempat.
   Jadikan satu tombol utama yang membuka pilihan jenis pesanan.
5. **Bar bawah (bottom nav) di HP** untuk portal pelanggan: Beranda · Pesan · Riwayat · Akun.
6. **Pindahkan pilihan tema dan bahasa** ke menu Akun / ikon ⚙ agar header tidak penuh.
7. **Rapikan 6 file CSS admin** (`style`, `theme-pro`, `themes`, `theme-dark`, `compact`, `tablet`) yang saling
   menimpa dengan banyak `!important`. Satukan menjadi `tokens.css` + `components.css`.
8. **Skeleton loading** (kotak abu-abu berdenyut) sebagai pengganti tulisan "Memuat…".
9. **Font lokal**: simpan Space Grotesk/Inter/JetBrains Mono di project (tanpa Google Fonts) supaya lebih cepat
   dan CSP bisa diperketat.
