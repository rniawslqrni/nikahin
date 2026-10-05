import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { invitationId } from "../assets/data/data.js";

// Ucapan & doa tersimpan di tabel Supabase `wishes`, terpisah per undangan
// (per user). Struktur baris: id, invitation_id, name, status, message,
// color, created_at. Antarmuka dibuat kompatibel dengan kode lama:
// getComentar() -> { comentar: [...] }, addComentar() -> { comentar } / { error }.

const toComentar = (w) => ({
    id: w.id,
    name: w.name,
    status: w.status,
    message: w.message,
    date: w.created_at,
    color: w.color,
});

export const comentarService = {
    getComentar: async function () {
        try {
            if (!isSupabaseConfigured() || !invitationId) return { comentar: [] };
            const { data, error } = await supabase
                .from("wishes")
                .select("id,name,status,message,color,created_at")
                .eq("invitation_id", invitationId)
                .order("created_at", { ascending: true })
                .limit(500);
            if (error) throw error;
            return { comentar: (data || []).map(toComentar) };
        } catch (error) {
            console.error("Gagal memuat ucapan:", error);
            return { error: error && error.message, comentar: [] };
        }
    },

    addComentar: async function ({ name, status, message, color }) {
        try {
            if (!isSupabaseConfigured() || !invitationId) {
                throw new Error("Supabase belum dikonfigurasi.");
            }
            const cleanName = String(name || "").trim().slice(0, 60);
            const cleanMsg = String(message || "").trim().slice(0, 500);
            if (!cleanName || !cleanMsg) throw new Error("Nama dan ucapan wajib diisi.");
            const { data, error } = await supabase
                .from("wishes")
                .insert({
                    invitation_id: invitationId,
                    name: cleanName,
                    status: status === "Tidak Hadir" ? "Tidak Hadir" : "Hadir",
                    message: cleanMsg,
                    color: color || "#b76e79",
                })
                .select("id,name,status,message,color,created_at")
                .single();
            if (error) throw error;
            return { comentar: toComentar(data) };
        } catch (error) {
            console.error("Gagal mengirim ucapan:", error);
            return { error: error.message || "Gagal mengirim ucapan." };
        }
    },

    deleteComentar: async function (id) {
        const { error } = await supabase.from("wishes").delete().eq("id", id);
        if (error) throw new Error(error.message);
    },
};
