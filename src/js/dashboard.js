import { supabase, isSupabaseConfigured, requireSession, getProfile, signOut } from "../lib/supabase.js";
import { data as templateData } from "../assets/data/template.js";

const errEl = document.getElementById("err");
const okEl = document.getElementById("ok");
const form = document.getElementById("invForm");
const showErr = (m) => { errEl.textContent = m; errEl.style.display = "block"; okEl.style.display = "none"; };
const showOk = (m) => { okEl.textContent = m; okEl.style.display = "block"; errEl.style.display = "none"; };

// path utils: "bride.L.name" / "bank.0.rekening" / "galeri.2.image"
function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, val) {
    const keys = path.split(".");
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
        o = o[k];
    }
    o[keys[keys.length - 1]] = val;
}

function buildGaleriInputs(current) {
    const grid = document.getElementById("galeriGrid");
    grid.innerHTML = "";
    for (let i = 0; i < 5; i++) {
        const cur = getPath(current, `galeri.${i}.image`) || "";
        const wrap = document.createElement("div");
        wrap.className = "field";
        wrap.innerHTML = `
            <label>Foto ${i + 1}</label>
            <input type="file" accept="image/*" data-upload="galeri.${i}.image" data-key="galeri-${i}" data-preview="prevG${i}" data-current="${cur}">
            <img class="preview-img" id="prevG${i}" style="display:none" alt="">`;
        grid.appendChild(wrap);
    }
}

function bindFilePreviews() {
    document.querySelectorAll('input[type=file][data-upload]').forEach((inp) => {
        const prev = document.getElementById(inp.dataset.preview);
        const show = (src) => { if (prev && src) { prev.src = src; prev.style.display = "block"; } };
        show(inp.dataset.current);
        inp.addEventListener("change", () => {
            const f = inp.files[0];
            if (f) show(URL.createObjectURL(f));
        });
    });
}

function fillForm(d) {
    document.querySelectorAll("#invForm [name]").forEach((el) => {
        if (el.type === "file" || el.name === "__slug") return;
        const v = getPath(d, el.name);
        if (v != null) el.value = v;
    });
}

async function uploadImage(userId, key, file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${key}.${ext}`;
    const { error } = await supabase.storage
        .from("invitation-images")
        .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error("Upload " + key + " gagal: " + error.message);
    const { data } = supabase.storage.from("invitation-images").getPublicUrl(path);
    return data.publicUrl;
}

const sanitizeSlug = (s) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

async function main() {
    if (!isSupabaseConfigured()) {
        return showErr("Supabase belum dikonfigurasi. Isi dulu src/config.js, lalu refresh.");
    }
    const session = await requireSession();
    if (!session) return window.location.replace("./login.html");
    const user = session.user;

    const profile = await getProfile(user.id);
    document.getElementById("who").textContent = user.email + (profile?.is_admin ? " · admin" : "");
    if (profile?.is_admin) document.getElementById("adminLink").style.display = "inline-block";
    document.getElementById("logoutBtn").addEventListener("click", signOut);

    // Muat undangan yang sudah ada (kalau ada)
    const { data: existing } = await supabase
        .from("invitations").select("slug, data, is_published").eq("user_id", user.id).maybeSingle();

    let current = structuredClone(templateData);
    if (existing?.data && Object.keys(existing.data).length) current = existing.data;
    if (existing) {
        document.getElementById("slug").value = existing.slug;
        document.getElementById("isPublished").checked = existing.is_published;
        const url = `${location.origin}/u/${existing.slug}`;
        document.getElementById("publicUrl").textContent = url;
        document.getElementById("publicUrlRow").style.display = "flex";
        const vl = document.getElementById("viewLink");
        vl.href = url; vl.style.display = "inline-block";
    }

    // set data-current untuk preview foto yang sudah ada
    document.querySelectorAll('input[type=file][data-upload]').forEach((inp) => {
        if (inp.dataset.upload.startsWith("galeri.")) return;
        inp.dataset.current = getPath(current, inp.dataset.upload) || "";
    });
    buildGaleriInputs(current);
    fillForm(current);
    bindFilePreviews();
    form.style.display = "block";

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("saveBtn");
        btn.disabled = true; btn.textContent = "Menyimpan…";
        try {
            const slug = sanitizeSlug(document.getElementById("slug").value);
            if (!slug) throw new Error("Slug tidak boleh kosong.");
            document.getElementById("slug").value = slug;

            // Slug dipakai user lain?
            const { data: taken } = await supabase
                .from("invitations").select("user_id").eq("slug", slug).maybeSingle();
            if (taken && taken.user_id !== user.id) throw new Error("Slug “" + slug + "” sudah dipakai orang lain.");

            const invData = structuredClone(current);
            document.querySelectorAll('#invForm [name]').forEach((el) => {
                if (el.type === "file" || el.name === "__slug") return;
                setPath(invData, el.name, el.value.trim());
            });

            // Upload foto baru
            for (const inp of document.querySelectorAll('input[type=file][data-upload]')) {
                const f = inp.files[0];
                if (!f) continue;
                showOk("Mengunggah " + f.name + "…");
                const url = await uploadImage(user.id, inp.dataset.key, f);
                setPath(invData, inp.dataset.upload, url);
            }

            const isPublished = document.getElementById("isPublished").checked;
            const { error } = await supabase.from("invitations").upsert(
                { user_id: user.id, slug, data: invData, is_published: isPublished },
                { onConflict: "user_id" }
            );
            if (error) throw error;

            current = invData;
            const url = `${location.origin}/u/${slug}`;
            document.getElementById("publicUrl").textContent = url;
            document.getElementById("publicUrlRow").style.display = "flex";
            const vl = document.getElementById("viewLink");
            vl.href = url; vl.style.display = "inline-block";
            showOk("Tersimpan! Undanganmu bisa dibuka di " + url);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            showErr(err.message || "Gagal menyimpan.");
        } finally {
            btn.disabled = false; btn.textContent = "Simpan Undangan";
        }
    });
}

main();
