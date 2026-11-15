/**
 * Pesan LANGGANAN BARU (BEM / SEM / LEM) — pelanggan. Butuh sql/katalog-pesan-baru.sql.
 * Alurnya sama dengan Perpanjang: pelanggan kirim permintaan -> Menunggu Konfirmasi ->
 * admin setujui di dashboard (tab paket yang dipesan) -> langganan baru masuk Dashboard Aktif.
 */
Object.assign(TRANSLATIONS.id, {
    no_btn: "Pesan Langganan Baru", no_modal_title: "Pesan Langganan Baru",
    no_sub: "Pilih paket, durasi, dan tagar untuk langganan baru Anda.",
    no_tag_ph: "Satu tagar per baris, contoh:\n#tagar1\n#tagar2", no_tags_label: "Tagar (boleh lebih dari 1)", no_tags_hint: "Tulis satu tagar per baris atau pisahkan dengan koma. Jumlah hari berlaku sama untuk setiap tagar.", no_tags_count: "{n} tagar", no_note_label: "Catatan untuk admin (opsional)", no_note_ph: "mis. tolong prioritaskan, atau info tambahan lain", no_err_max: "Maksimal 20 tagar per pesanan", no_info: "Setelah dikirim, pesanan Anda berstatus Menunggu Konfirmasi sampai admin memprosesnya.",
    no_send: "Kirim Pesanan", no_sent_title: "Pesanan Terkirim", no_pill: "Pesanan baru",
    no_err_dup: "Pesanan dengan tagar ini masih menunggu konfirmasi",
    no_wa_text: "Halo admin, saya {u} ingin memesan langganan baru.\nTagar ({n}): {tag}\nPaket: {pkg}\nDurasi: {d} hari (tiap tagar)\nCatatan: {note}\nMohon dikonfirmasi. (ID #{id})",
    rn_tab: "Pesan & Perpanjang", rn_list_title: "Permintaan Saya", rn_list_empty: "Belum ada permintaan.",
    rn_list_empty_sub: "Tekan Pesan Langganan Baru, atau Perpanjang pada langganan yang sudah limit."
});
Object.assign(TRANSLATIONS.en, {
    no_btn: "Order New Subscription", no_modal_title: "Order New Subscription",
    no_sub: "Choose the package, duration and tag for your new subscription.",
    no_tag_ph: "One tag per line, e.g.:\n#tag1\n#tag2", no_tags_label: "Tags (more than 1 allowed)", no_tags_hint: "Write one tag per line or separate with commas. The same number of days applies to every tag.", no_tags_count: "{n} tags", no_note_label: "Note for admin (optional)", no_note_ph: "e.g. please prioritize, or any other info", no_err_max: "Maximum 20 tags per order", no_info: "After sending, your order is marked Awaiting Confirmation until the admin processes it.",
    no_send: "Send Order", no_sent_title: "Order Sent", no_pill: "New order",
    no_err_dup: "An order with this tag is still awaiting confirmation",
    no_wa_text: "Hello admin, I'm {u} and I'd like to order a new subscription.\nTags ({n}): {tag}\nPackage: {pkg}\nDuration: {d} days (each tag)\nNote: {note}\nPlease confirm. (ID #{id})",
    rn_tab: "Order & Renew", rn_list_title: "My Requests", rn_list_empty: "No requests yet.",
    rn_list_empty_sub: "Tap Order New Subscription, or Renew on a subscription that reached the limit."
});
Object.assign(TRANSLATIONS.id, {
    kt_label: "⚡ Kirim hari ini", kt_on: "Pesanan ini diprioritaskan untuk dikirim HARI INI.", kt_off: "Tidak dicentang: pesanan dikirim BESOK.", kt_today: "Dikirim hari ini", kt_tomorrow: "Dikirim besok"
});
Object.assign(TRANSLATIONS.en, {
    kt_label: "⚡ Send today", kt_on: "This order is prioritized to be delivered TODAY.", kt_off: "Unchecked: the order is delivered TOMORROW.", kt_today: "Delivered today", kt_tomorrow: "Delivered tomorrow"
});
/** Pilihan kirim hari ini / besok (centang = hari ini). Dipakai oleh Pesan Baru & Perpanjang. */
function kirimBlockHtml(pfx) {
    return `<div class="rn-block kt-block"><label class="kt-check"><input type="checkbox" id="${pfx}Kirim"> <b>${escapeHtml(t("kt_label"))}</b></label>
        <div class="rn-hint" id="${pfx}KirimHint">${escapeHtml(t("kt_off"))}</div></div>`;
}
function bindKirim(pfx) {
    const c = $(pfx + "Kirim"), h = $(pfx + "KirimHint");
    c.addEventListener("change", () => { h.textContent = t(c.checked ? "kt_on" : "kt_off"); h.classList.toggle("kt-now", c.checked); });
    return () => c.checked;
}
/** Kirim pesanan + pilihan kirim. Bila SQL 16 belum dijalankan, otomatis memakai fungsi lama. */
async function cuRpcKirim(name, params, hariIni) {
    const r = await cuRpc(name + "_k", { ...params, p_hari_ini: !!hariIni });
    if (r.error && /does not exist|schema cache|Could not find the function/i.test(r.error.message || "")) return cuRpc(name, params);
    return r;
}
Object.assign(TRANSLATIONS.id, {
    no_fb_dup: "{n} tagar kembar dihapus otomatis", no_fb_over: "Kelebihan {n} tagar (maks. 20 per pesanan)",
    no_fb_ok: "Siap dikirim: {n} tagar × {d} hari", no_draft: "Draf tagar sebelumnya dipulihkan", no_last: "Pilihan terakhir Anda dipakai lagi"
});
Object.assign(TRANSLATIONS.en, {
    no_fb_dup: "{n} duplicate tags removed automatically", no_fb_over: "{n} tags too many (max 20 per order)",
    no_fb_ok: "Ready to send: {n} tags × {d} days", no_draft: "Your previous tag draft was restored", no_last: "Your last choice was reused"
});
/* Ingat pilihan paket/durasi terakhir & draf tagar supaya pesan ulang lebih cepat (hanya di browser ini). */
const NO_LAST_KEY = "no_last_choice", NO_DRAFT_KEY = "no_tag_draft";
function noStore(kind, key, val) { try { const s = kind === "l" ? localStorage : sessionStorage; if (val === undefined) return s.getItem(key); if (val === null) s.removeItem(key); else s.setItem(key, val); } catch (e) { return null; } }
/** Hitung tagar mentah vs unik untuk umpan balik langsung. */
function tagStats(raw) {
    const all = String(raw || "").split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
    const uniq = parseTags(raw);
    return { total: all.length, uniq: uniq.length, dup: all.length - uniq.length };
}

Object.assign(SERVER_ERROR_MAP, {
    "Tagar wajib diisi": "rn_err_tag",
    "Pesanan dengan tagar ini masih menunggu konfirmasi": "no_err_dup",
    "Maksimal 20 tagar per pesanan": "no_err_max"
});

function openNewOrderModal() {
    let last = null; try { last = JSON.parse(noStore("l", NO_LAST_KEY) || "null"); } catch (e) {}
    const st = { hari: (last && Number(last.hari) >= 1 && Number(last.hari) <= 365) ? Number(last.hari) : 30, pkg: (last && RN_PKGS.includes(last.pkg)) ? last.pkg : "BEM" };
    const draft = noStore("s", NO_DRAFT_KEY) || "";
    $("modalBox").innerHTML = `
        <div class="rn-head"><div class="rn-icon">🛒</div>
            <div><div class="modal-title" style="margin:0">${escapeHtml(t("no_modal_title"))}</div>
            <div class="rn-sub">${escapeHtml(t("no_sub"))}</div></div></div>

        <div class="rn-block">
            <div class="rn-label">${escapeHtml(t("rn_pkg_label"))}</div>
            <div class="rn-pkgs" id="noPkgs">${RN_PKGS.map(p => `<button type="button" class="rn-pkg" data-pkg="${p}"><b>${p}</b><small class="rn-pkg-price" data-pkgprice="${p}">&nbsp;</small></button>`).join("")}</div>
        </div>

        <div class="rn-block">
            <label class="rn-label" for="noHari">${escapeHtml(t("rn_days_label"))}</label>
            <div class="rn-days"><input type="number" id="noHari" min="1" max="365" inputmode="numeric" value="${st.hari}"><span>${escapeHtml(t("rn_days_unit"))}</span></div>
            <div class="rn-hint">${escapeHtml(t("rn_days_hint"))}</div>
            <div class="rn-chips" id="noChips">${RN_QUICK.map(n => `<button type="button" class="rn-chip" data-n="${n}">${n}</button>`).join("")}</div>
        </div>

        <div class="rn-block">
            <label class="rn-label" for="noTags">${escapeHtml(t("no_tags_label"))} <span class="no-count" id="noCount"></span></label>
            <textarea id="noTags" class="no-area" rows="4" placeholder="${escapeHtml(t("no_tag_ph"))}" autocomplete="off" spellcheck="false" aria-describedby="noFeedback">${escapeHtml(draft)}</textarea>
            <div class="no-feedback" id="noFeedback" aria-live="polite"></div>
            <div class="rn-hint">${escapeHtml(t("no_tags_hint"))}</div>
        </div>

        <div class="rn-block">
            <label class="rn-label" for="noNote">${escapeHtml(t("no_note_label"))}</label>
            <textarea id="noNote" class="no-area" rows="2" maxlength="500" placeholder="${escapeHtml(t("no_note_ph"))}"></textarea>
        </div>

        ${kirimBlockHtml("no")}

        ${priceBoxHtml("no")}

        <div class="rn-info">ℹ️ ${escapeHtml(t("no_info"))}</div>
        <div class="modal-actions">
            <button type="button" class="btn btn-ghost" id="noNo">${escapeHtml(t("rn_cancel"))}</button>
            <button type="button" class="btn btn-gold" id="noYes">${escapeHtml(t("no_send"))}</button>
        </div>`;
    $("modalOverlay").classList.add("show");

    const getKirim = bindKirim("no");
    const pb = bindPriceBox("no", () => ({ pkg: st.pkg, hari: parseInt($("noHari").value, 10), jumlah: parseTags($("noTags").value).length || 1 }));
    fillPkgPrices($("modalBox"));
    const sync = () => {
        pb.schedule();
        $("noChips").querySelectorAll(".rn-chip").forEach(c => c.classList.toggle("on", Number(c.dataset.n) === Number($("noHari").value)));
        $("noPkgs").querySelectorAll(".rn-pkg").forEach(c => c.classList.toggle("on", c.dataset.pkg === st.pkg));
    };
    $("noHari").addEventListener("input", sync);
    const feedback = () => {
        const v = $("noTags").value, s2 = tagStats(v), hari = parseInt($("noHari").value, 10), fb = $("noFeedback");
        $("noCount").textContent = s2.uniq ? "· " + t("no_tags_count", { n: s2.uniq }) : "";
        const msgs = [];
        if (s2.dup > 0) msgs.push(`<span class="fb-info">${escapeHtml(t("no_fb_dup", { n: s2.dup }))}</span>`);
        if (s2.uniq > 20) msgs.push(`<span class="fb-bad">${escapeHtml(t("no_fb_over", { n: s2.uniq - 20 }))}</span>`);
        else if (s2.uniq > 0 && hari >= 1 && hari <= 365) msgs.push(`<span class="fb-ok">${escapeHtml(t("no_fb_ok", { n: s2.uniq, d: hari }))}</span>`);
        fb.innerHTML = msgs.join("");
        const bad = !s2.uniq || s2.uniq > 20 || !(hari >= 1 && hari <= 365);
        $("noYes").classList.toggle("is-disabled", bad);
        $("noYes").setAttribute("aria-disabled", String(bad));
        noStore("s", NO_DRAFT_KEY, v.trim() ? v : null);
    };
    $("noTags").addEventListener("input", () => { feedback(); pb.schedule(); });
    $("noHari").addEventListener("input", feedback);
    $("noChips").addEventListener("click", (e) => { const c = e.target.closest(".rn-chip"); if (c) { $("noHari").value = c.dataset.n; sync(); } });
    $("noPkgs").addEventListener("click", (e) => { const c = e.target.closest(".rn-pkg"); if (c) { st.pkg = c.dataset.pkg; sync(); } });
    $("noNo").addEventListener("click", closeModal);
    sync();
    feedback();
    if (draft) showToast(t("no_draft"), "info");
    ensurePriceInfo().then(() => { if (!pkgAvail(st.pkg)) { const a = RN_PKGS.find(p => pkgAvail(p)); if (a) { st.pkg = a; sync(); } } });

    $("noYes").addEventListener("click", async () => {
        const hari = parseInt($("noHari").value, 10), tags = parseTags($("noTags").value), note = $("noNote").value.trim();
        if (!hari || hari < 1 || hari > 365) { showToast(t("rn_err_days"), "danger"); return; }
        if (!tags.length) { showToast(t("rn_err_tag"), "danger"); $("noTags").focus(); return; }
        if (tags.length > 20) { showToast(t("no_err_max"), "danger"); return; }
        if (!pkgAvail(st.pkg)) { showToast(t("av_err_pkg"), "danger"); return; }

        // pembayaran dulu (QRIS / Binance / DANA / PayPal), baru masuk antrian
        if (!(await payStep({ pkg: st.pkg, hari, jumlah: tags.length, kode: pb.kode() }))) return;

        const btn = $("noYes"); btn.disabled = true; btn.textContent = t("rn_sending");
        const { data, error } = await cuRpcKirim("cu_request_new_order", { p_dashboard: st.pkg, p_hari: hari, p_tagar_list: tags, p_catatan: note || null, p_kode: pb.kode() || null }, getKirim());
        if (error) {
            btn.disabled = false; btn.textContent = t("no_send");
            const m = error.message || "";
            showToast(/does not exist|schema cache|Could not find the function/i.test(m) ? t("rn_err_not_ready") : (translateServerError(m) || t("rn_err_generic")), "danger");
            return;
        }
        noStore("l", NO_LAST_KEY, JSON.stringify({ pkg: st.pkg, hari })); noStore("s", NO_DRAFT_KEY, null);
        await loadRenewals(); if (typeof loadCoin === "function") loadCoin();
        showRenewSent({ id: data && data.id, tagar: tags.join(", "), pkg: st.pkg, hari, isNew: true, count: tags.length, note, total: data && data.total, kode: pb.kode() });
    });
}

/** "#a\n#b, #c" -> ["#a","#b","#c"] (tanpa kosong & tanpa kembar) */
function parseTags(raw) {
    const seen = new Set(), out = [];
    String(raw || "").split(/[\n,]+/).map(x => x.trim()).filter(Boolean).forEach(x => {
        const k = x.replace(/^#/, "").toLowerCase();
        if (!seen.has(k)) { seen.add(k); out.push(x); }
    });
    return out;
}

document.addEventListener("click", (e) => { if (e.target.closest("[data-new-order]")) openNewOrderModal(); });
