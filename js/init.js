document.addEventListener("DOMContentLoaded", async () => {
    if (window.ADMIN_LOCKED) return;   // belum login admin (js/admin-auth.js)
    try {
        await resetDailyUTC();
        await loadData();
    } catch (err) {
        console.error(err);
        showToast("Gagal memuat dashboard", "danger");
    }
});
