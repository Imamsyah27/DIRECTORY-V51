// Ganti dengan data project Supabase Anda

const SUPABASE_URL = "https://drryamosodluupxbbtee.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycnlhbW9zb2RsdXVweGJidGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzEwMTgsImV4cCI6MjA5ODgwNzAxOH0.q_Dq4w3Ugv7rCq3NeEXSIYEuNCbsG19Ghsj2vo0_TOc";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// Dashboard aktif default
let currentDashboard = "BEM";

// Waktu UTC
function getUTCDate() {
    return new Date().toISOString().split("T")[0];
}

// Alamat website pelanggan (halaman dashboard.html / folder pelanggan).
// Default "pelanggan/" = folder pelanggan di domain yang sama dengan admin.
// Jika portal pelanggan ada di domain lain, isi mis. "https://pelanggan.domainanda.com/"
// (atau biarkan kosong, lalu isi lewat tombol "Alamat Portal" saat memilih pelanggan).
const PORTAL_PELANGGAN_URL = "pelanggan/";

// ---------------------------------------------------------------------
// KEAMANAN: login admin (Supabase Auth). Lihat docs/01-KEAMANAN.md.
// false = seperti sebelumnya (tanpa login).
// true  = dashboard admin wajib login email + password.
// Ubah ke true SETELAH membuat user admin di Supabase -> Authentication,
// lalu jalankan sql/keamanan/K2-login-admin-kunci-tabel.sql.
const ADMIN_LOGIN_WAJIB = false;
// Otomatis keluar bila tidak ada aktivitas (menit). 0 = nonaktif.
const ADMIN_AUTO_LOGOUT_MENIT = 120;
