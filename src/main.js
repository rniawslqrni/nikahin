import {home} from "./js/home.js";
import {bride} from "./js/bride.js";
import {time} from "./js/time.js";
import {galeri} from "./js/galeri.js";
import {wishas} from "./js/wishas.js";
import {navbar} from "./js/navbar.js";
import {welcome} from "./js/welcome.js";
import {initData} from "./assets/data/data.js";

// load content
document.addEventListener('DOMContentLoaded', async () => {
    AOS.init();

    // Kalau URL membawa ?u=slug (atau /u/slug), muat data undangan milik user dari database.
    // Tanpa slug, tampil data template bawaan seperti biasa.
    await initData();

    welcome();
    navbar();
    home();
    bride()
    time();
    galeri();
    wishas();
});
