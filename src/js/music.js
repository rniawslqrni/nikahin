// Modul musik latar: mendukung file audio langsung (mp3) atau URL YouTube.
// YouTube diputar via IFrame Player API (hanya audio, player disembunyikan).
// Dipakai welcome.js untuk tombol putar/jeda dan autoplay saat undangan dibuka.

let ytPlayer = null;
let ytReady = false;
let audioEl = null;
let mode = "audio"; // 'audio' | 'youtube'

export function parseMusicSource(url) {
    if (!url || !String(url).trim()) return { type: "none" };
    const m = String(url).match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([\w-]{11})/
    );
    if (m) return { type: "youtube", id: m[1] };
    return { type: "audio", url: String(url).trim() };
}

function loadYouTubeAPI() {
    return new Promise((resolve) => {
        if (window.YT && window.YT.Player) return resolve();
        const existed = document.querySelector("script[data-yt-api]");
        if (existed) {
            const t = setInterval(() => {
                if (window.YT && window.YT.Player) { clearInterval(t); resolve(); }
            }, 250);
            setTimeout(() => { clearInterval(t); resolve(); }, 15000);
            return;
        }
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.dataset.ytApi = "1";
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
        document.head.appendChild(tag);
        setTimeout(resolve, 15000); // jangan gantung selamanya
    });
}

export async function initMusic(audioElement, sourceUrl) {
    audioEl = audioElement;
    const src = parseMusicSource(sourceUrl);
    if (src.type === "youtube") {
        mode = "youtube";
        try {
            await loadYouTubeAPI();
            if (!window.YT || !window.YT.Player) return;
            let holder = document.getElementById("ytMusicHolder");
            if (!holder) {
                holder = document.createElement("div");
                holder.id = "ytMusicHolder";
                holder.style.cssText =
                    "position:fixed;width:2px;height:2px;left:-10px;bottom:0;opacity:0;pointer-events:none;";
                document.body.appendChild(holder);
            }
            if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) {} }
            ytPlayer = new window.YT.Player(holder, {
                videoId: src.id,
                playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3 },
            });
            ytReady = true;
        } catch (e) {
            console.warn("YouTube API gagal dimuat:", e);
        }
    } else if (src.type === "audio") {
        mode = "audio";
        audioEl.innerHTML = `<source src="${src.url}" type="audio/mpeg"/>`;
        audioEl.load();
    } else {
        mode = "none";
    }
}

export function playMusic() {
    if (mode === "youtube") {
        if (ytPlayer && ytReady) { try { ytPlayer.playVideo(); } catch (e) {} }
    } else if (mode === "audio" && audioEl) {
        audioEl.play().catch(() => {});
    }
}

export function pauseMusic() {
    if (mode === "youtube") {
        if (ytPlayer && ytReady) { try { ytPlayer.pauseVideo(); } catch (e) {} }
    } else if (mode === "audio" && audioEl) {
        audioEl.pause();
    }
}

export function currentMusicMode() { return mode; }
