// Keeps the classroom site working on bad wifi: once a page has been opened, it opens again from
// this saved copy if the network is slow or gone. Bump VERSION when the file list below changes.
const VERSION = "classroom-2";
const FILES = ["./", "index.html", "forging-nations.html", "lewis-and-clark.html", "unification-map.json?v=6", "lewis-and-clark-map.json", "vendor/maplibre-gl/maplibre-gl.js", "vendor/maplibre-gl/maplibre-gl.css", "vendor/jspdf/jspdf.umd.min.js", "vendor/fonts/fonts.css", "vendor/fonts/Caveat-4230ff7b.woff2", "vendor/fonts/Caveat-6b226757.woff2", "vendor/fonts/IMFellEnglish-0b909da5.woff2", "vendor/fonts/IMFellEnglish-fc2e7aa0.woff2", "vendor/fonts/IMFellEnglishSC-156088d1.woff2", "vendor/fonts/Nunito-b8db197d.woff2", "vendor/fonts/Nunito-fd8c59c3.woff2", "vendor/glyphs/OpenHistorical Bold/0-255.pbf", "vendor/glyphs/OpenHistorical Bold/256-511.pbf", "vendor/glyphs/OpenHistorical Bold/512-767.pbf", "vendor/glyphs/OpenHistorical Bold/8192-8447.pbf", "vendor/glyphs/OpenHistorical Italic/0-255.pbf", "vendor/glyphs/OpenHistorical Italic/256-511.pbf", "vendor/glyphs/OpenHistorical Italic/512-767.pbf", "vendor/glyphs/OpenHistorical Italic/8192-8447.pbf", "portraits/bismarck.jpg", "portraits/clark.jpg", "portraits/jefferson.jpg", "portraits/lewis.jpg", "portraits/rush.jpg", "portraits/cavour.jpg", "portraits/fw4.jpg", "portraits/garibaldi.jpg", "portraits/list.jpg", "portraits/mazzini.jpg", "portraits/moltke.jpg", "portraits/napoleon3.jpg", "portraits/pius.jpg", "portraits/victor.jpg", "portraits/wilhelm.jpg", "icons/crown.svg", "icons/expedition.svg", "icons/flag.png", "icons/guillotine.png"];

self.addEventListener("install", e => {
  // one file failing must not stop the rest from being saved
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(FILES.map(f => c.add(f.replace(/ /g, "%20"))))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const save = (req, res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };
const saved = req => caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true }));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // pages: newest copy if it arrives within 4 seconds, so updates still reach students
    const net = fetch(req).then(r => save(req, r));
    const slow = new Promise(r => setTimeout(r, 4000)).then(() => saved(req)).then(r => r || net);
    e.respondWith(Promise.race([net, slow]).catch(() => saved(req)).then(r => r || saved("index.html")));
    return;
  }
  // everything else: the saved copy right away, refreshed in the background
  e.respondWith(saved(req).then(hit => {
    const net = fetch(req).then(r => save(req, r));
    if (hit) { net.catch(() => {}); return hit; }
    return net;
  }));
});
