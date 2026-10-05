import {home} from "./js/home.js";
import {bride} from "./js/bride.js";
import {time} from "./js/time.js";
import {galeri} from "./js/galeri.js";
import {wishas} from "./js/wishas.js";
import {navbar} from "./js/navbar.js";
import {welcome} from "./js/welcome.js";
import {initData, resolveSlug} from "./assets/data/data.js";
import {applyTheme} from "./js/theme.js";

// load content
document.addEventListener('DOMContentLoaded', async () => {
    AOS.init();

    const slug = resolveSlug();
    const landingEl = document.getElementById('landing');
    const invitationEl = document.getElementById('invitation');

    if (slug) {
        // Mode undangan: sembunyikan landing, tampilkan undangan milik user.
        if (landingEl) landingEl.style.display = 'none';
        await initData();
        applyTheme();
        welcome();
        navbar();
        home();
        bride()
        time();
        galeri();
        wishas();
    } else {
        // Mode landing page platform.
        if (invitationEl) invitationEl.style.display = 'none';
        document.body.classList.add('landing-mode');
    }
});
