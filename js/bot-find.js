/**
 * CARI TAGAR PESANAN BOT (admin) — Order -> 🔎 Cari Tagar. Butuh sql/koin-usdt-25-cari-tagar.sql (dan 23).
 * Tempel beberapa tagar -> otomatis dicari siapa yang memesannya (Bot Order & Bulk Order, semua status).
 */
const BF = { bound: false, timer: null, seq: 0, tags: [], rows: [] };
const bfPin = () => sessionStorage.getItem("akun_admin_pin");
const bfNorm = t => String(t).trim().replace(/#/g, "").toLowerCase();
const bfWaktu = iso => iso ? new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
const bfParse = text => {
    const seen = new Set(), out = [];
    String(text || "").split(/[\s,;]+/).forEach(w => { const n = bfNorm(w); if (n && !seen.has(n)) { seen.add(n); out.push({ norm: n, shown: w.trim().startsWith("#") ? w.trim() : "#" + w.trim() }); } });
    return out;
};

function bfInit() {
    if (!bfPin()) { ordRenderGate("cari"); return; }
    const pane = document.getElementById("ordPane-cari");
    if (!BF.bound) {
        BF.bound = true;
        pane.innerHTML = `<section class="panel table-section"><div class="panel-title">🔎 Cari Tagar Pesanan Bot <span class="panel-hint">tempel beberapa tagar — otomatis dicari siapa yang memesannya (Bot & Bulk, semua status)</span></div>
            <textarea id="bfInput" class="bf-input" rows="5" placeholder="Satu tagar per baris, atau pisahkan dengan koma / spasi. Contoh:&#10;#tagar1&#10;#tagar2, tagar3" spellcheck="false" autocomplete="off"></textarea>
            <div class="bf-bar"><span id="bfCount" class="muted-note" style="margin:0;">0 tagar</span><span id="bfSummary" class="bf-summary"></span>
                <button type="button" class="btn btn-ghost mini" id="bfCopy" style="display:none;">📋 Salin hasil</button>
                <button type="button" class="btn btn-ghost mini" id="bfCopyMiss" style="display:none;">📋 Salin yang tidak ditemukan</button>
                <button type="button" class="btn btn-ghost mini" id="bfClear">Bersihkan</button></div>
            <div id="bfResults" class="bf-results"></div></section>`;
        const inp = document.getElementById("bfInput");
        inp.addEventListener("input", () => { BF.tags = bfParse(inp.value); document.getElementById("bfCount").textContent = `${BF.tags.length} tagar`; clearTimeout(BF.timer); BF.timer = setTimeout(bfSearch, 450); });
        inp.addEventListener("paste", () => setTimeout(() => { clearTimeout(BF.timer); BF.timer = setTimeout(bfSearch, 150); }, 0));
        document.getElementById("bfClear").addEventListener("click", () => { inp.value = ""; BF.tags = []; BF.rows = []; document.getElementById("bfCount").textContent = "0 tagar"; bfRender(); inp.focus(); });
        document.getElementById("bfCopy").addEventListener("click", bfCopyResult);
        document.getElementById("bfCopyMiss").addEventListener("click", () => {
            const miss = BF.tags.filter(t => !BF.rows.some(r => r.norm === t.norm)).map(t => t.shown);
            bfCopy(miss.join("\n"), `${miss.length} tagar tidak ditemukan`);
        });
    } else if (BF.tags.length) bfSearch();       // buka ulang / auto-refresh: perbarui hasil tanpa menghapus isian
}
async function bfSearch() {
    const my = ++BF.seq;
    if (!BF.tags.length) { BF.rows = []; bfRender(); return; }
    if (BF.tags.length > 300) { showToast("Maksimal 300 tagar sekali cari", "danger"); return; }
    const { data, error } = await supabaseClient.rpc("bot_find_tags", { p_pin: bfPin(), p_tags: BF.tags.map(t => t.shown) });
    if (my !== BF.seq) return;                                     // ada pencarian yang lebih baru
    if (error) {
        const m = error.message || ""; console.error(error);
        if (m.includes("PIN admin salah")) { sessionStorage.removeItem("akun_admin_pin"); ordRenderGate("cari"); BF.bound = false; showToast("PIN admin tidak valid, masukkan ulang", "danger"); }
        else if (/does not exist|schema cache|Could not find the function/i.test(m)) showToast("Jalankan dulu sql/koin-usdt-23-bot-batch.sql dan koin-usdt-25-cari-tagar.sql di Supabase SQL Editor", "danger");
        else showToast(m || "Terjadi kesalahan", "danger");
        return;
    }
    BF.rows = data || []; bfRender();
}
function bfStatus(r) {
    if (r.status === "pending") return `<span class="badge badge-warn">⏳ Menunggu ACC</span>`;
    if (r.status === "rejected") return `<span class="badge badge-bad">✖ Ditolak / dibatalkan</span>`;
    if (r.dikirim || r.q_sent) return `<span class="badge badge-ok">📤 Terkirim</span>`;
    return `<span class="badge badge-warn">✅ Di-ACC · belum dikirim</span>`;
}
function bfStatusText(r) { return r.status === "pending" ? "Menunggu ACC" : r.status === "rejected" ? "Ditolak/dibatalkan" : (r.dikirim || r.q_sent) ? "Terkirim" : "Di-ACC belum dikirim"; }
function bfRender() {
    const box = document.getElementById("bfResults"); if (!box) return;
    const found = BF.tags.filter(t => BF.rows.some(r => r.norm === t.norm)).length;
    document.getElementById("bfSummary").textContent = BF.tags.length ? `Ditemukan ${found} dari ${BF.tags.length} tagar · ${BF.rows.length} pesanan` : "";
    document.getElementById("bfCopy").style.display = BF.rows.length ? "" : "none";
    document.getElementById("bfCopyMiss").style.display = BF.tags.length && found < BF.tags.length ? "" : "none";
    if (!BF.tags.length) { box.innerHTML = ""; return; }
    box.innerHTML = BF.tags.map(t => {
        const rows = BF.rows.filter(r => r.norm === t.norm);
        if (!rows.length) return `<div class="bf-item miss"><div class="bf-tag"><button type="button" class="copy-chip" data-copy="${escapeHtml(t.shown)}">${escapeHtml(t.shown)}</button> <span class="bf-miss">❌ tidak ditemukan</span></div></div>`;
        return `<div class="bf-item"><div class="bf-tag"><button type="button" class="copy-chip" data-copy="${escapeHtml(t.shown)}">${escapeHtml(t.shown)}</button> <small>${rows.length} pesanan</small></div>
            ${rows.map(r => {
                const wa = String(r.whatsapp || "").replace(/[^0-9]/g, "").replace(/^0/, "62");
                return `<div class="bf-row"><b>👤 ${escapeHtml(r.username)}</b>
                    <span class="dash-chip">${escapeHtml(r.dashboard)}${r.bulk ? " · Bulk" : ""}</span> ${bfStatus(r)}
                    ${r.batch ? `<span class="bf-batch">Batch ${r.batch} ${r.q_sent ? "✅" : "⏳"}</span>` : ""}${r.arsip ? ` <span class="badge badge-hold">arsip</span>` : ""}
                    <small>Order #${r.order_id} · ${bfWaktu(r.created_at)}</small>
                    ${wa.length >= 8 ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer" class="bf-wa" title="Buka WhatsApp">💬</a>` : ""}</div>`;
            }).join("")}</div>`;
    }).join("");
}
function bfCopyResult() {
    const lines = ["Tagar\tPelanggan\tPaket\tStatus\tBatch\tOrder"];
    BF.tags.forEach(t => { const rows = BF.rows.filter(r => r.norm === t.norm);
        if (!rows.length) lines.push(`${t.shown}\t-\t-\ttidak ditemukan\t-\t-`);
        rows.forEach(r => lines.push(`${t.shown}\t${r.username}\t${r.dashboard}${r.bulk ? " (Bulk)" : ""}\t${bfStatusText(r)}\t${r.batch || "-"}\t#${r.order_id}`)); });
    bfCopy(lines.join("\n"), "Hasil pencarian");
}
async function bfCopy(text, label) {
    try { await navigator.clipboard.writeText(text); }
    catch (_) { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (__) {} ta.remove(); }
    showToast(`${label} tersalin`, "success");
}
