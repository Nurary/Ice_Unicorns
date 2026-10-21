// ===== Ice Unicorns – service worker (telepíthető app, offline mód) =====
//
// A partials.js regisztrálja. Célja, hogy a telefon kezdőképernyőjére
// kitett oldal térerő nélkül is megnyíljon a legutóbb látott tartalommal.
//
// Stratégia (csak a saját domain kéréseire; a külső – pl. Umami – a
// böngésző dolga marad):
//   • oldalak, JS, CSS, JSON, naptár: HÁLÓZAT ELŐSZÖR – mindig a friss
//     tartalom jön (új meccseredmény, frissített menetrend), a tárolt
//     példány csak akkor, ha nincs net;
//   • képek, ikonok, betűtípusok: TÁROLT ELŐSZÖR, a háttérben frissítve –
//     ezek ritkán változnak, így az oldal gyorsabb.
//
// Ha a gyorsítótárazás logikáján változtatsz, emeld a VERSION-t: a régi
// tárolt fájlok ekkor törlődnek.
const VERSION = "v2";
const CACHE = "iceunicorns-" + VERSION;

// Telepítéskor letöltjük a vázat, hogy az első offline megnyitás is működjön
const PRECACHE = [
  "./",
  "index.html",
  "styles.css",
  "partials.js",
  "bajnoksag-adatok.js",
  "bajnoksag.js",
  "assets/logo/logo.jpg",
  "404.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const IMAGE = /\.(png|jpe?g|jfif|gif|webp|avif|svg|ico|woff2)$/i;

function networkFirst(request) {
  return fetch(request)
    .then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    })
    .catch(() =>
      caches.match(request, { ignoreSearch: request.mode === "navigate" }).then(
        (hit) =>
          hit ||
          (request.mode === "navigate"
            ? caches.match("index.html")
            : Promise.reject(new Error("offline")))
      )
    );
}

function cacheFirst(event) {
  const request = event.request;
  return caches.match(request).then((hit) => {
    const update = fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => hit);
    if (hit) {
      event.waitUntil(update.then(() => {}, () => {}));
      return hit;
    }
    return update;
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // A videók Range-kérésekkel jönnek – azokat nem tároljuk
  if (request.headers.has("range")) return;

  event.respondWith(IMAGE.test(url.pathname) ? cacheFirst(event) : networkFirst(request));
});
