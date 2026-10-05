import { data as templateData } from "./template.js";
import { supabase, isSupabaseConfigured } from "../../lib/supabase.js";

// Live binding: semua section (home, bride, time, ...) mengimpor {data} dari
// file ini dan membacanya saat render. initData() dipanggil (await) di main.js
// sebelum render, sehingga data bisa diganti dengan data milik user dari database.

// Normalisasi path aset relatif (./src/..., src/...) menjadi absolut (/src/...)
// agar tetap valid saat halaman dibuka lewat /u/slug (rewrite).
function normalizeAssetPaths(obj) {
    if (typeof obj === "string") {
        if (obj.startsWith("./src/")) return "/" + obj.slice(2);
        if (obj.startsWith("src/")) return "/" + obj;
        return obj;
    }
    if (Array.isArray(obj)) return obj.map(normalizeAssetPaths);
    if (obj && typeof obj === "object") {
        const out = {};
        for (const k of Object.keys(obj)) out[k] = normalizeAssetPaths(obj[k]);
        return out;
    }
    return obj;
}

export let data = normalizeAssetPaths(templateData);
export let invitationId = null;

// ID undangan yang sedang dibuka (diisi initData). Dipakai comentarService
// agar ucapan tersimpan/terbaca per undangan (per user).

function resolveSlug() {
    const q = new URLSearchParams(window.location.search).get("u");
    if (q) return q.trim();
    const m = window.location.pathname.match(/^\/u\/([\w-]+)/);
    return m ? m[1] : null;
}

export async function initData() {
    const slug = resolveSlug();
    if (!slug || !isSupabaseConfigured()) return;
    try {
        const { data: inv, error } = await supabase
            .from("invitations")
            .select("id,data")
            .eq("slug", slug)
            .eq("is_published", true)
            .maybeSingle();
        if (!error && inv) {
            invitationId = inv.id;
            if (inv.data) data = normalizeAssetPaths(inv.data);
        }
    } catch (e) {
        console.warn("Gagal memuat data undangan:", e);
    }
}
