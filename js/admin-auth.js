/**
 * Login admin (Supabase Auth) + peringatan keamanan PIN.
 * Aktif hanya bila ADMIN_LOGIN_WAJIB = true di config.js.
 * Lihat docs/01-KEAMANAN.md dan sql/keamanan/K2-login-admin-kunci-tabel.sql.
 */
(function () {
    const WAJIB = typeof ADMIN_LOGIN_WAJIB !== "undefined" && ADMIN_LOGIN_WAJIB === true;
    const IDLE_MIN = typeof ADMIN_AUTO_LOGOUT_MENIT !== "undefined" ? Number(ADMIN_AUTO_LOGOUT_MENIT) || 0 : 0;
    const DEFAULT_PINS = ["123456", "1234", "0000", "000000", "111111"];

    /* ---------- Peringatan PIN default (berlaku walau login belum diwajibkan) ---------- */
    function warnDefaultPin() {
        if (document.getElementById("pinWarnBar")) return;
        const bar = document.createElement("div");
        bar.id = "pinWarnBar";
        bar.className = "sec-warn-bar";
        bar.setAttribute("role", "alert");
        bar.innerHTML = `<b>PIN admin masih default.</b> Siapa pun bisa menebaknya. Ganti di menu Akun Pelanggan &rarr; Ganti PIN Admin (minimal 8 karakter).
            <button type="button" aria-label="Tutup">&times;</button>`;
        bar.querySelector("button").addEventListener("click", () => bar.remove());
        document.body.prepend(bar);
    }
    try {
        const origSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
            if (this === window.sessionStorage && k === "akun_admin_pin" && DEFAULT_PINS.includes(String(v))) {
                if (document.body) warnDefaultPin(); else document.addEventListener("DOMContentLoaded", warnDefaultPin);
            }
            return origSet.apply(this, arguments);
        };
        if (DEFAULT_PINS.includes(sessionStorage.getItem("akun_admin_pin") || "")) document.addEventListener("DOMContentLoaded", warnDefaultPin);
    } catch (e) { /* storage diblokir: abaikan */ }

    if (!WAJIB) { window.ADMIN_LOCKED = false; return; }

    /* ---------- Cek sesi secara sinkron supaya dashboard tidak sempat memuat ---------- */
    let storageKey = "";
    try { storageKey = "sb-" + new URL(SUPABASE_URL).hostname.split(".")[0] + "-auth-token"; } catch (e) {}
    let hasSession = false;
    try { hasSession = !!(storageKey && localStorage.getItem(storageKey)); } catch (e) {}
    window.ADMIN_LOCKED = !hasSession;
    if (!hasSession) document.documentElement.classList.add("admin-locked");

    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

    function showLogin(msg) {
        document.documentElement.classList.add("admin-locked");
        window.ADMIN_LOCKED = true;
        let box = document.getElementById("adminLogin");
        if (!box) {
            box = document.createElement("div");
            box.id = "adminLogin";
            box.className = "admin-login";
            box.innerHTML = `
                <form class="admin-login-card" id="adminLoginForm" autocomplete="on" novalidate>
                    <div class="admin-login-mark" aria-hidden="true">LS</div>
                    <h1>Masuk Admin</h1>
                    <p class="admin-login-sub">Lenstore Management</p>
                    <div class="admin-login-msg" id="adminLoginMsg" role="alert" aria-live="polite"></div>
                    <label for="adminEmail">Email</label>
                    <input type="email" id="adminEmail" autocomplete="username" required inputmode="email">
                    <label for="adminPass">Password</label>
                    <input type="password" id="adminPass" autocomplete="current-password" required minlength="6">
                    <button type="submit" class="btn btn-primary" id="adminLoginBtn">Masuk</button>
                </form>`;
            document.body.appendChild(box);
            box.querySelector("form").addEventListener("submit", onSubmit);
        }
        const m = document.getElementById("adminLoginMsg");
        m.textContent = msg || "";
        m.classList.toggle("show", !!msg);
        setTimeout(() => { const e = document.getElementById("adminEmail"); if (e) e.focus(); }, 30);
    }

    let tries = 0, waitUntil = 0;
    async function onSubmit(ev) {
        ev.preventDefault();
        const now = Date.now();
        if (now < waitUntil) { showLogin(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((waitUntil - now) / 1000)} detik.`); return; }
        const email = document.getElementById("adminEmail").value.trim();
        const password = document.getElementById("adminPass").value;
        if (!email || !password) { showLogin("Isi email dan password."); return; }
        const btn = document.getElementById("adminLoginBtn");
        btn.disabled = true; btn.textContent = "Memeriksa…";
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        btn.disabled = false; btn.textContent = "Masuk";
        if (error) {
            tries++;
            if (tries >= 5) { waitUntil = Date.now() + 30000 * Math.pow(2, tries - 5); }
            showLogin("Email atau password salah.");
            return;
        }
        const okAdmin = await checkAdmin();
        if (!okAdmin) return;
        location.reload();
    }

    /** Pastikan user yang login memang terdaftar di app_admins (jika SQL K2 sudah dijalankan). */
    async function checkAdmin() {
        const { data, error } = await supabaseClient.rpc("is_app_admin");
        if (error) return true;                 // fungsi belum ada (K2 belum dijalankan) -> izinkan
        if (data === true) return true;
        await supabaseClient.auth.signOut();
        showLogin("Akun ini bukan admin. Hubungi pemilik sistem.");
        return false;
    }

    async function logout() {
        try { sessionStorage.removeItem("akun_admin_pin"); } catch (e) {}
        await supabaseClient.auth.signOut();
        location.reload();
    }
    window.adminLogout = logout;

    function addLogoutButton() {
        const h = document.querySelector("header.app-header");
        if (!h || document.getElementById("adminLogoutBtn")) return;
        const b = document.createElement("button");
        b.type = "button"; b.id = "adminLogoutBtn"; b.className = "btn-logout";
        b.title = "Keluar dari akun admin"; b.setAttribute("aria-label", "Keluar");
        b.textContent = "Keluar";
        b.addEventListener("click", logout);
        h.appendChild(b);
    }

    function startIdleTimer() {
        if (!IDLE_MIN) return;
        let last = Date.now();
        ["pointerdown", "keydown", "scroll", "touchstart"].forEach(ev => window.addEventListener(ev, () => { last = Date.now(); }, { passive: true }));
        setInterval(() => { if (Date.now() - last > IDLE_MIN * 60000) logout(); }, 30000);
    }

    document.addEventListener("DOMContentLoaded", async () => {
        if (window.ADMIN_LOCKED) { showLogin(); return; }
        const { data } = await supabaseClient.auth.getSession();
        if (!data || !data.session) { showLogin("Sesi berakhir, silakan masuk lagi."); return; }
        if (!(await checkAdmin())) return;
        addLogoutButton();
        startIdleTimer();
    });
    supabaseClient.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT" && !window.ADMIN_LOCKED) showLogin("Anda telah keluar.");
    });
})();
