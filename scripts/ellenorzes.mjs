#!/usr/bin/env node
// ===== Ice Unicorns – weboldal-ellenőrzés =====
//
// Minden push és pull request előtt lefut (.github/workflows/ellenorzes.yml),
// de kézzel is futtatható:   node scripts/ellenorzes.mjs
//
// Amit megnéz:
//   • minden helyi link és kép (HTML-ben, JS-ben, a team.js fotóinál) létezik-e
//     – KIS- ÉS NAGYBETŰ-HELYESEN! Windowson és macOS-en az „assets/players”
//     is működik, a GitHub Pages-en viszont csak a pontos „assets/Players”.
//   • a JavaScript-fájlok szintaktikailag hibátlanok-e,
//   • az ob4c.html / ob4d.html egyezik-e a sablonnal,
//   • a galéria manifest.json-je naprakész-e,
//   • a JSON-LD blokkok érvényes JSON-ok-e,
//   • a sitemap.xml minden oldala létezik-e.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTeams, playersOf } from "./keret.mjs";
import { OLDALAK, renderPage } from "./oldalak-generalasa.mjs";
import { galleryList } from "./galeria-manifest.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Halmaz: ugyanaz a hibás útvonal több helyről is előkerülhet
const errors = new Set();
const fail = (where, msg) => errors.add(`${where}: ${msg}`);

// ---- Kis- és nagybetű-helyes létezés-ellenőrzés ----
const dirCache = new Map();
function listDir(dir) {
  if (!dirCache.has(dir)) {
    try {
      dirCache.set(dir, new Set(readdirSync(dir).map((f) => f.normalize("NFC"))));
    } catch {
      dirCache.set(dir, null);
    }
  }
  return dirCache.get(dir);
}

// Létezik-e pontosan így (a gyökérhez képest) – ha nem, mi a hiba oka
function checkPath(rel) {
  const parts = rel.normalize("NFC").split("/").filter((p) => p && p !== ".");
  let dir = ROOT;
  for (const part of parts) {
    if (part === "..") return "a weboldal gyökerén kívülre mutat";
    const entries = listDir(dir);
    if (!entries || !entries.has(part)) {
      const ci = entries && [...entries].find((e) => e.toLowerCase() === part.toLowerCase());
      return ci
        ? `kis-/nagybetű eltérés: „${part}” helyett „${ci}” a fájl neve (a GitHub Pages-en ez nem működik)`
        : "nem létezik";
    }
    dir = join(dir, part);
  }
  return null;
}

// Helyi hivatkozás-e (nem külső URL, horgony, mailto stb.)
const isLocal = (url) =>
  url &&
  !/^(https?:|mailto:|tel:|webcal:|data:|javascript:|#|\/\/)/i.test(url) &&
  !url.includes("${"); // sablonliterálban összerakott útvonal – futásidőben dől el

function checkRef(where, url) {
  if (!isLocal(url)) return;
  let path = url.split("#")[0].split("?")[0];
  if (!path) return;
  try {
    path = decodeURI(path);
  } catch {}
  if (path.startsWith("/")) path = path.slice(1);
  if (path === "" || path.endsWith("/")) path += "index.html";
  const err = checkPath(path);
  if (err) fail(where, `${url} – ${err}`);
}

// ---- Fájlok ----
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");
const htmlFiles = files.filter((f) => f.endsWith(".html") && !rel(f).startsWith("scripts/"));
const jsFiles = files.filter((f) => /\.(m?js)$/.test(f));

// 1. HTML-hivatkozások és JSON-LD
for (const file of htmlFiles) {
  const src = readFileSync(file, "utf8");
  const where = rel(file);
  for (const m of src.matchAll(/\s(?:src|href)\s*=\s*"([^"]*)"/g)) checkRef(where, m[1]);
  for (const m of src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (err) {
      fail(where, `hibás JSON-LD: ${err.message}`);
    }
  }
}

// 2. JS: szintaxis + a benne lévő "assets/…" útvonalak
for (const file of jsFiles) {
  const where = rel(file);
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    fail(where, `szintaktikai hiba:\n${String(err.stderr).trim()}`);
  }
  // A team.js fotóit a 3. pont ellenőrzi, a játékos nevével együtt
  if (where.startsWith("scripts/") || where === "team.js") continue;
  const src = readFileSync(file, "utf8")
    // a megjegyzésekben lévő példa-útvonalakat nem ellenőrizzük
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  for (const m of src.matchAll(/["'`]((?:assets|naptar)\/[^"'`\s]+\.\w+)["'`]/g)) checkRef(where, m[1]);
}

// 3. A keret fotói
try {
  const teams = loadTeams(ROOT);
  for (const [key, team] of Object.entries(teams)) {
    [...playersOf(team), ...(team.staff || [])].forEach((p) => {
      if (p.photo) checkRef(`team.js (${key}, ${p.nick})`, p.photo);
    });
  }
} catch (err) {
  fail("team.js", `nem tölthető be: ${err.message}`);
}

// 4. Generált oldalak
for (const key of Object.keys(OLDALAK)) {
  const current = readFileSync(join(ROOT, `${key}.html`), "utf8").replace(/\r\n/g, "\n");
  if (current !== renderPage(key)) {
    fail(`${key}.html`, "nem egyezik a sablonnal (scripts/sablonok/bajnoksag.html) – futtasd: node scripts/oldalak-generalasa.mjs");
  }
}

// 5. Galéria
const manifest = JSON.parse(readFileSync(join(ROOT, "assets/Galery/manifest.json"), "utf8"));
// Csak figyelmeztetés: a kepek.yml workflow ugyanarra a pushra úgyis
// újragenerálja a listát, tehát a feltöltés ettől még nem hibás.
if (JSON.stringify(manifest) !== JSON.stringify(galleryList())) {
  const msg = "assets/Galery/manifest.json: nem naprakész – a képek workflow frissíti, vagy futtasd: node scripts/galeria-manifest.mjs";
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `! ${msg}`);
}
// Ami a listában szerepel, annak viszont léteznie kell
manifest.forEach((f) => checkRef("assets/Galery/manifest.json", `assets/Galery/${f}`));

// 6. Sitemap
const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
for (const m of sitemap.matchAll(/<loc>https:\/\/iceunicorns\.hu\/([^<]*)<\/loc>/g)) {
  checkRef("sitemap.xml", m[1] || "index.html");
}

if (errors.size) {
  console.error(`${errors.size} hiba:\n`);
  errors.forEach((e) =>
    console.error(process.env.GITHUB_ACTIONS ? `::error::${e.replace(/\n/g, "%0A")}` : `✗ ${e}`)
  );
  process.exit(1);
}
console.log(
  `Minden rendben: ${htmlFiles.length} HTML, ${jsFiles.length} JS fájl ellenőrizve.`
);
