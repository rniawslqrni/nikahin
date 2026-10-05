import { supabase, isSupabaseConfigured, requireSession } from "../lib/supabase.js";

const errEl = document.getElementById("err");
const showErr = (msg) => {
    errEl.textContent = msg;
    errEl.style.display = "block";
};

if (!isSupabaseConfigured()) {
    showErr("Supabase belum dikonfigurasi. Isi dulu src/config.js dengan Project URL dan anon key, lalu refresh halaman ini.");
} else {
    // Kalau sudah login, langsung ke dashboard
    const session = await requireSession();
    if (session) {
        window.location.replace("./dashboard.html");
    } else {
        const loginForm = document.getElementById("loginForm");
        loginForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const btn = loginForm.querySelector("button[type=submit]");
            btn.disabled = true;
            btn.textContent = "Memproses…";
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            btn.disabled = false;
            btn.textContent = "Masuk";
            if (error) return showErr("Gagal masuk: " + error.message);
            window.location.replace("./dashboard.html");
        });

        const registerForm = document.getElementById("registerForm");
        registerForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const confirm = document.getElementById("confirm").value;
            if (password.length < 6) return showErr("Kata sandi minimal 6 karakter.");
            if (password !== confirm) return showErr("Konfirmasi kata sandi tidak sama.");
            const btn = registerForm.querySelector("button[type=submit]");
            btn.disabled = true;
            btn.textContent = "Mendaftarkan…";
            const { error } = await supabase.auth.signUp({ email, password });
            btn.disabled = false;
            btn.textContent = "Daftar";
            if (error) return showErr("Gagal daftar: " + error.message);
            window.location.replace("./dashboard.html");
        });
    }
}
