import { supabase, isSupabaseConfigured, requireSession } from "../lib/supabase.js";

const errEl = document.getElementById("err");
const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = "block"; };
const hideErr = () => { errEl.style.display = "none"; };

const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function setMode(mode) {
    const isReg = mode === "register";
    tabLogin.classList.toggle("active", !isReg);
    tabRegister.classList.toggle("active", isReg);
    loginForm.style.display = isReg ? "none" : "block";
    registerForm.style.display = isReg ? "block" : "none";
    hideErr();
    document.title = (isReg ? "Daftar" : "Masuk") + " — Nikahin";
}
tabLogin.addEventListener("click", () => setMode("login"));
tabRegister.addEventListener("click", () => setMode("register"));
setMode(new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login");

if (!isSupabaseConfigured()) {
    showErr("Supabase belum dikonfigurasi. Isi dulu src/config.js dengan Project URL dan anon key, lalu refresh halaman ini.");
} else {
    const session = await requireSession();
    if (session) {
        window.location.replace("./dashboard.html");
    } else {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideErr();
            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;
            const btn = loginForm.querySelector("button[type=submit]");
            btn.disabled = true; btn.textContent = "Memproses…";
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            btn.disabled = false; btn.textContent = "Masuk";
            if (error) return showErr("Gagal masuk: " + error.message);
            window.location.replace("./dashboard.html");
        });

        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideErr();
            const email = document.getElementById("regEmail").value.trim();
            const password = document.getElementById("regPassword").value;
            const confirm = document.getElementById("regConfirm").value;
            if (password.length < 6) return showErr("Kata sandi minimal 6 karakter.");
            if (password !== confirm) return showErr("Konfirmasi kata sandi tidak sama.");
            const btn = registerForm.querySelector("button[type=submit]");
            btn.disabled = true; btn.textContent = "Mendaftarkan…";
            const { error } = await supabase.auth.signUp({ email, password });
            btn.disabled = false; btn.textContent = "Daftar";
            if (error) return showErr("Gagal daftar: " + error.message);
            window.location.replace("./dashboard.html");
        });
    }
}
