import { supabase, isSupabaseConfigured, requireSession, getProfile, signOut } from "../lib/supabase.js";

const errEl = document.getElementById("err");
const okEl = document.getElementById("ok");
const showErr = (m) => { errEl.textContent = m; errEl.style.display = "block"; };
const showOk = (m) => { okEl.textContent = m; okEl.style.display = "block"; setTimeout(() => okEl.style.display = "none", 3000); };

const fmtDate = (iso) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

async function main() {
    if (!isSupabaseConfigured()) return showErr("Supabase belum dikonfigurasi. Isi dulu src/config.js.");
    const session = await requireSession();
    if (!session) return window.location.replace("./login.html");

    const profile = await getProfile(session.user.id);
    if (!profile?.is_admin) {
        showErr("Halaman ini khusus admin.");
        setTimeout(() => window.location.replace("./dashboard.html"), 1500);
        return;
    }

    document.getElementById("who").textContent = session.user.email + " · admin";
    document.getElementById("logoutBtn").addEventListener("click", signOut);

    await loadAll(session.user.id);
}

async function loadAll(myId) {
    const { data: users, error } = await supabase
        .from("profiles")
        .select("id, email, is_admin, created_at, invitations(slug, is_published, updated_at)")
        .order("created_at", { ascending: false });
    if (error) return showErr("Gagal memuat data: " + error.message);

    // --- tabel pengguna ---
    const ubody = document.querySelector("#usersTable tbody");
    ubody.innerHTML = "";
    for (const u of users) {
        const inv = u.invitations?.[0];
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(u.email || "-")}<br>
                <span style="font-size:12px;color:var(--muted)">${inv ? `undangan: <a href="${location.origin}/u/${inv.slug}" target="_blank">/u/${escapeHtml(inv.slug)}</a>` : "belum buat undangan"}</span>
            </td>
            <td>${fmtDate(u.created_at)}</td>
            <td>${u.is_admin ? '<span class="badge admin">admin</span>' : '<span class="badge off">user</span>'}</td>
            <td><div class="row-actions"></div></td>`;
        const acts = tr.querySelector(".row-actions");

        if (u.id !== myId) {
            const tgl = document.createElement("button");
            tgl.className = "btn secondary";
            tgl.textContent = u.is_admin ? "Cabut admin" : "Jadikan admin";
            tgl.onclick = async () => {
                if (!confirm(`Ubah status admin untuk ${u.email}?`)) return;
                const { error } = await supabase.from("profiles").update({ is_admin: !u.is_admin }).eq("id", u.id);
                if (error) return showErr(error.message);
                showOk("Status admin diperbarui.");
                loadAll(myId);
            };
            acts.appendChild(tgl);
        }
        if (inv) {
            const del = document.createElement("button");
            del.className = "btn danger";
            del.textContent = "Hapus undangan";
            del.onclick = () => deleteInvitation(u.id, inv.slug, myId);
            acts.appendChild(del);
        }
        ubody.appendChild(tr);
    }

    // --- tabel undangan ---
    const ibody = document.querySelector("#invTable tbody");
    ibody.innerHTML = "";
    for (const u of users) {
        const inv = u.invitations?.[0];
        if (!inv) continue;
        const tr = document.createElement("tr");
        const url = `${location.origin}/u/${inv.slug}`;
        tr.innerHTML = `
            <td><a href="${url}" target="_blank">/u/${escapeHtml(inv.slug)}</a></td>
            <td>${escapeHtml(u.email || "-")}</td>
            <td>${inv.is_published ? '<span class="badge">publik</span>' : '<span class="badge off">privat</span>'}</td>
            <td><div class="row-actions"></div></td>`;
        const acts = tr.querySelector(".row-actions");

        const pub = document.createElement("button");
        pub.className = "btn secondary";
        pub.textContent = inv.is_published ? "Privatkan" : "Publikasikan";
        pub.onclick = async () => {
            const { error } = await supabase.from("invitations")
                .update({ is_published: !inv.is_published }).eq("user_id", u.id);
            if (error) return showErr(error.message);
            showOk("Status publikasi diperbarui.");
            loadAll(myId);
        };
        const del = document.createElement("button");
        del.className = "btn danger";
        del.textContent = "Hapus";
        del.onclick = () => deleteInvitation(u.id, inv.slug, myId);
        acts.append(pub, del);
        ibody.appendChild(tr);
    }

    document.getElementById("usersCard").style.display = "block";
    document.getElementById("invCard").style.display = "block";
}

async function deleteInvitation(userId, slug, myId) {
    if (!confirm(`Hapus undangan /u/${slug}? Tindakan ini tidak bisa dibatalkan.`)) return;
    const { error } = await supabase.from("invitations").delete().eq("user_id", userId);
    if (error) return showErr(error.message);
    showOk("Undangan dihapus.");
    loadAll(myId);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

main();
