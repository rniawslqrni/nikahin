import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const looksConfigured =
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("ISI-PROJECT-URL") &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.includes("ISI-ANON-KEY");

export const isSupabaseConfigured = () => looksConfigured;

export const supabase = looksConfigured
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export async function requireSession() {
    if (!looksConfigured) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function getProfile(userId) {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, is_admin, created_at")
        .eq("id", userId)
        .single();
    if (error) return null;
    return data;
}

export async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("./login.html");
}
