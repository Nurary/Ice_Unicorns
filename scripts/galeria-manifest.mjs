#!/usr/bin/env node
// ===== Ice Unicorns – galéria képlistája =====
//
// Az assets/Galery/manifest.json-t a mappa tartalmából állítja elő, így új
// kép feltöltésekor elég a fájlt bemásolni a mappába – a listát nem kell
// kézzel frissíteni. A .github/workflows/kepek.yml minden képfeltöltés után
// lefuttatja.
//
// ALBUMOK: az assets/Galery egy almappája egy album, a mappa neve az album
// címe (pl. „2025-12 Karácsonyi kupa”). Ha a nevek dátummal kezdődnek, a
// legfrissebb album kerül előre. A közvetlenül az assets/Galery-ben lévő
// képek a „Vegyes” albumba kerülnek. A manifest a mappához képesti útvonalak
// listája („Album/kep.jpg”), a gallery.js ebből rakja össze az albumokat.
//
// Futtatás kézzel:   node scripts/galeria-manifest.mjs
//   --check  csak ellenőriz: hibával kilép, ha a lista nem naprakész

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "assets", "Galery");
const MANIFEST = join(DIR, "manifest.json");

// Csak amit a böngészők meg is tudnak jeleníteni (a HEIC például nem)
const SHOWABLE = /\.(jpe?g|jfif|png|webp|gif|avif)$/i;

const byName = (a, b) => a.localeCompare(b, "hu", { numeric: true });
const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

// Egy mappa megjeleníthető képei, fájlnév szerint rendezve: a telefonok
// dátummal/sorszámmal nevezik el a képeket, így nagyjából időrendben jönnek.
const imagesIn = (dir) => readdirSync(dir).filter((f) => SHOWABLE.test(f)).sort(byName);

export function galleryList() {
  // Az albumok (almappák) a legfrissebbel kezdve, a „Vegyes” képek a végén
  const albums = readdirSync(DIR)
    .filter((f) => !f.startsWith(".") && isDir(join(DIR, f)))
    .sort((a, b) => byName(b, a));
  return [
    ...albums.flatMap((a) => imagesIn(join(DIR, a)).map((f) => `${a}/${f}`)),
    ...imagesIn(DIR),
  ];
}

function main() {
  const list = galleryList();
  const json = JSON.stringify(list, null, 2) + "\n";
  let current = "";
  try {
    current = readFileSync(MANIFEST, "utf8").replace(/\r\n/g, "\n");
  } catch {}

  const skipped = readdirSync(DIR, { recursive: true })
    .map((f) => String(f).replace(/\\/g, "/"))
    .filter((f) => f !== "manifest.json" && !isDir(join(DIR, f)) && !SHOWABLE.test(f));
  skipped.forEach((f) =>
    console.warn(`FIGYELEM: ${f} kimarad a galériából – a böngészők nem tudják megjeleníteni (mentsd el JPG-ként).`)
  );

  if (current === json) {
    console.log(`A galéria listája naprakész (${list.length} kép).`);
    return;
  }
  if (process.argv.includes("--check")) {
    console.error("Az assets/Galery/manifest.json nem naprakész – futtasd: node scripts/galeria-manifest.mjs");
    process.exit(1);
  }
  writeFileSync(MANIFEST, json, "utf8");
  console.log(`Frissítve: manifest.json (${list.length} kép).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
