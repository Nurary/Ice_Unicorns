// ===== Ice Unicorns – ellenfél-logók helyben tárolása =====
//
// Az MJSZ-től kapott csapatlogókat a frissítés letölti az assets/csapatok/
// mappába, és az adatokban már a helyi fájlra hivatkozik. Így a logók akkor
// is megjelennek, ha az MJSZ szervere épp akad (vagy egy link megszűnik), és
// a látogató böngészője sem fordul az MJSZ-hez.
//
// A fájl neve a csapat nevéből jön, ékezetek nélkül, kisbetűvel:
//   „Óbudai Gepárd D” → assets/csapatok/obudai-gepard-d.png
//
// • Ha a fájl már megvan, nem tölti le újra. (Ha az MJSZ-nél új logó lett,
//   töröld a régit, és a következő frissítés letölti az újat.)
// • Ha egy csapatnak az MJSZ-nél nincs logója, KÉZZEL is be lehet tenni:
//   elég a fenti nevű fájlt (png, jpg, webp vagy svg) bemásolni a mappába,
//   és a következő frissítéstől az látszik. A frissítés naplója kiírja,
//   kinek hiányzik a logója és milyen néven várjuk.

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchRetry } from "./halozat.mjs";

export const LOGO_DIR = "assets/csapatok";
const EXTS = ["png", "jpg", "jpeg", "webp", "svg"];
const TYPE_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
const MAX_BYTES = 1_000_000;

// „Óbudai Gepárd D” → „obudai-gepard-d”
export function slugify(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const isRemote = (u) => typeof u === "string" && /^https:\/\//i.test(u);

function localLogo(root, slug) {
  let files;
  try {
    files = readdirSync(join(root, LOGO_DIR));
  } catch {
    return null;
  }
  const hit = EXTS.map((e) => `${slug}.${e}`).find((f) => files.includes(f));
  return hit ? `${LOGO_DIR}/${hit}` : null;
}

async function download(root, slug, url) {
  const res = await fetchRetry(url, {}, `logó: ${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = TYPE_EXT[type];
  if (!ext) throw new Error(`nem kép (${type || "ismeretlen típus"})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length || buf.length > MAX_BYTES) throw new Error(`gyanús méret (${buf.length} bájt)`);
  mkdirSync(join(root, LOGO_DIR), { recursive: true });
  const rel = `${LOGO_DIR}/${slug}.${ext}`;
  writeFileSync(join(root, rel), buf);
  return rel;
}

// A bajnokságok összes logó-hivatkozását helyi fájlra cseréli (ahol lehet).
// Visszaadja, kinek nincs logója egyáltalán, és mi jött le most.
export async function localizeLogos(leagues, { root, us, warn = console.warn, fetchLogos = true }) {
  // Csapatnév → az MJSZ-es logó URL-je (ha van)
  const remote = new Map();
  const note = (name, logo) => {
    if (!name || name === us) return;
    if (!remote.has(name)) remote.set(name, null);
    if (isRemote(logo) && !remote.get(name)) remote.set(name, logo);
  };
  for (const l of Object.values(leagues)) {
    Object.entries(l.teams || {}).forEach(([name, t]) => note(name, t && t.logo));
    (l.matches || []).forEach((m) => note(m.opponent, m.logo));
    (l.groups || []).forEach((g) => (g.standings || []).forEach((r) => note(r.team, r.logo)));
  }

  const resolved = new Map();
  const missing = [];
  const downloaded = [];
  for (const [name, url] of remote) {
    const slug = slugify(name);
    let logo = slug ? localLogo(root, slug) : null;
    if (!logo && url && fetchLogos) {
      try {
        logo = await download(root, slug, url);
        downloaded.push(name);
      } catch (err) {
        warn(`${name}: a logó nem jött le (${err.message}) – marad az MJSZ-es link.`);
      }
    }
    logo = logo || url || null;
    if (!logo) missing.push(`${name} → ${LOGO_DIR}/${slug}.png`);
    resolved.set(name, logo);
  }

  const apply = (obj, key, name) => {
    if (!resolved.has(name)) return;
    const logo = resolved.get(name);
    if (logo) obj[key] = logo;
    else delete obj[key];
  };
  for (const l of Object.values(leagues)) {
    Object.entries(l.teams || {}).forEach(([name, t]) => {
      if (resolved.has(name)) t.logo = resolved.get(name);
    });
    (l.matches || []).forEach((m) => apply(m, "logo", m.opponent));
    (l.groups || []).forEach((g) => (g.standings || []).forEach((r) => apply(r, "logo", r.team)));
  }
  return { missing, downloaded };
}
