document.addEventListener("DOMContentLoaded", async () => {
    if (window.ADMIN_LOCKED) return;   // PIN perangkat belum dimasukkan (js/keamanan.js)
    try {
        await resetDailyUTC();
        await loadData();
    } catch (err) {
        console.error(err);
        showToast("Gagal memuat dashboard", "danger");
    }
});
