// Ganti dengan data project Supabase Anda

const SUPABASE_URL = "https://drryamosodluupxbbtee.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycnlhbW9zb2RsdXVweGJidGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzEwMTgsImV4cCI6MjA5ODgwNzAxOH0.q_Dq4w3Ugv7rCq3NeEXSIYEuNCbsG19Ghsj2vo0_TOc";

// KEAMANAN: PIN admin yang tersimpan di perangkat ini ikut dikirim (header x-admin-pin)
// supaya tabel inti hanya bisa dibuka dari dashboard admin. Lihat docs/01-KEAMANAN.md.
function adminDevicePin() { try { return localStorage.getItem("admin_device_pin") || ""; } catch (e) { return ""; } }
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        global: {
            fetch: (url, opts = {}) => {
                const pin = adminDevicePin();
                if (pin && /^[\x20-\x7E]+$/.test(pin)) {
                    const h = new Headers(opts.headers || {});
                    h.set("x-admin-pin", pin);
                    opts = { ...opts, headers: h };
                }
                return fetch(url, opts);
            }
        }
    }
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

