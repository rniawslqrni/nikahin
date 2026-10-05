import { data as templateData } from "./template.js";
import { supabase, isSupabaseConfigured } from "../../lib/supabase.js";

// Live binding: semua section (home, bride, time, ...) mengimpor {data} dari
// file ini dan membacanya saat render. initData() dipanggil (await) di main.js
// sebelum render, sehingga data bisa diganti dengan data milik user dari database.
export let data = templateData;

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
            .select("data")
            .eq("slug", slug)
            .eq("is_published", true)
            .maybeSingle();
        if (!error && inv && inv.data) data = inv.data;
    } catch (e) {
        console.warn("Gagal memuat data undangan:", e);
    }
}
