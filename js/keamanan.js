/**
 * KEAMANAN dashboard admin — tanpa login email.
 * - PIN admin dimasukkan SEKALI per perangkat, disimpan di perangkat ini, lalu ikut dikirim
 *   ke Supabase (header x-admin-pin, lihat config.js). Setelah sql/keamanan/K2-kunci-tabel-pin.sql
 *   dijalankan, tabel orders/products/archives/tagar_batches hanya bisa dibuka dengan PIN ini,
 *   jadi pengunjung portal pelanggan tidak bisa lagi membaca/menghapus data.
 * - Menu yang meminta PIN otomatis terbuka (PIN perangkat dipakai ulang).
 * - Tombol "Kunci" di header menghapus PIN dari perangkat ini.
 * - Peringatan bila PIN masih default.
 */
(function () {
    const KEY = "admin_device_pin";
    const DEFAULT_PINS = ["123456", "1234", "0000", "000000", "111111", "12345678"];
    const ls = {
        get: () => { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } },
        set: v => { try { localStorage.setItem(KEY, v); } catch (e) {} },
        del: () => { try { localStorage.removeItem(KEY); } catch (e) {} }
    };

    const pin = ls.get();
    window.ADMIN_LOCKED = !pin;
    if (!pin) document.documentElement.classList.add("admin-locked");
    // menu ber-PIN (Akun Pelanggan, Harga, Koin, dll.) langsung terbuka
    try { if (pin && !sessionStorage.getItem("akun_admin_pin")) sessionStorage.setItem("akun_admin_pin", pin); } catch (e) {}

    function warnDefaultPin() {
        if (document.getElementById("pinWarnBar")) return;
        const bar = document.createElement("div");
        bar.id = "pinWarnBar";
        bar.className = "sec-warn-bar";
        bar.setAttribute("role", "alert");
        bar.innerHTML = `<span><b>PIN admin masih default.</b> Mudah ditebak orang lain. Ganti di menu Akun Pelanggan &rarr; Ganti PIN Admin (minimal 8 karakter).</span>
            <button type="button" aria-label="Tutup">&times;</button>`;
        bar.querySelector("button").addEventListener("click", () => bar.remove());
        document.body.prepend(bar);
    }

    function showGate(msg) {
        document.documentElement.classList.add("admin-locked");
        window.ADMIN_LOCKED = true;
        let box = document.getElementById("adminLogin");
        if (!box) {
            box = document.createElement("div");
            box.id = "adminLogin";
            box.className = "admin-login";
            box.innerHTML = `
                <form class="admin-login-card" novalidate>
                    <div class="admin-login-mark" aria-hidden="true">LS</div>
                    <h1>Buka Dashboard</h1>
                    <p class="admin-login-sub">Masukkan PIN admin. Cukup sekali di perangkat ini.</p>
                    <div class="admin-login-msg" id="adminLoginMsg" role="alert" aria-live="polite"></div>
                    <label for="adminPinGate">PIN admin</label>
                    <input type="password" id="adminPinGate" autocomplete="current-password" inputmode="text" required>
                    <button type="submit" class="btn btn-primary" id="adminGateBtn">Buka</button>
                </form>`;
            document.body.appendChild(box);
            box.querySelector("form").addEventListener("submit", onSubmit);
        }
        const m = document.getElementById("adminLoginMsg");
        m.textContent = msg || "";
        m.classList.toggle("show", !!msg);
        setTimeout(() => { const e = document.getElementById("adminPinGate"); if (e) e.focus(); }, 30);
    }

    async function onSubmit(ev) {
        ev.preventDefault();
        const v = document.getElementById("adminPinGate").value;
        if (!v) { showGate("Isi PIN admin."); return; }
        if (!/^[\x20-\x7E]+$/.test(v)) { showGate("PIN hanya boleh huruf, angka, dan simbol biasa (tanpa emoji/huruf khusus)."); return; }
        const btn = document.getElementById("adminGateBtn");
        btn.disabled = true; btn.textContent = "Memeriksa…";
        const { data, error } = await supabaseClient.rpc("admin_verify_pin", { p_pin: v });
        btn.disabled = false; btn.textContent = "Buka";
        if (error) { showGate("Gagal memeriksa PIN: " + (error.message || "koneksi bermasalah")); return; }
        if (data !== true) { showGate("PIN salah."); return; }
        ls.set(v);
        try { sessionStorage.setItem("akun_admin_pin", v); } catch (e) {}
        location.reload();
    }

    function lockDevice() {
        ls.del();
        try { sessionStorage.removeItem("akun_admin_pin"); } catch (e) {}
        location.reload();
    }
    window.adminLockDevice = lockDevice;

    function addLockButton() {
        const h = document.querySelector("header.app-header");
        if (!h || document.getElementById("adminLockBtn")) return;
        const b = document.createElement("button");
        b.type = "button"; b.id = "adminLockBtn"; b.className = "btn-logout";
        b.title = "Hapus PIN dari perangkat ini (pakai di perangkat umum/pinjaman)";
        b.textContent = "Kunci";
        b.addEventListener("click", lockDevice);
        h.appendChild(b);
    }

    document.addEventListener("DOMContentLoaded", async () => {
        if (!pin) { showGate(); return; }
        if (DEFAULT_PINS.includes(pin)) warnDefaultPin();
        addLockButton();
        // Cek PIN perangkat masih berlaku & catat bahwa header PIN sampai ke server
        // (syarat sebelum K2 boleh mengunci tabel). Bila fungsi belum ada (K2 belum dijalankan) -> abaikan.
        const { data, error } = await supabaseClient.rpc("admin_pin_header_check");
        if (!error && data === false) { ls.del(); try { sessionStorage.removeItem("akun_admin_pin"); } catch (e) {} showGate("PIN sudah diganti. Masukkan PIN yang baru."); }
    });
})();
