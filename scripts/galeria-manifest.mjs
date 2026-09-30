#!/usr/bin/env node
// ===== Ice Unicorns – galéria képlistája =====
//
// Az assets/Galery/manifest.json-t a mappa tartalmából állítja elő, így új
// kép feltöltésekor elég a fájlt bemásolni a mappába – a listát nem kell
// kézzel frissíteni. A .github/workflows/kepek.yml minden képfeltöltés után
// lefuttatja.
//
// Futtatás kézzel:   node scripts/galeria-manifest.mjs
//   --check  csak ellenőriz: hibával kilép, ha a lista nem naprakész

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "assets", "Galery");
const MANIFEST = join(DIR, "manifest.json");

// Csak amit a böngészők meg is tudnak jeleníteni (a HEIC például nem)
const SHOWABLE = /\.(jpe?g|jfif|png|webp|gif|avif)$/i;

export function galleryList() {
  // Fájlnév szerint rendezve: a telefonok dátummal/sorszámmal nevezik el a
  // képeket, így nagyjából időrendben jelennek meg.
  return readdirSync(DIR)
    .filter((f) => SHOWABLE.test(f))
    .sort((a, b) => a.localeCompare(b, "hu", { numeric: true }));
}

function main() {
  const list = galleryList();
  const json = JSON.stringify(list, null, 2) + "\n";
  let current = "";
  try {
    current = readFileSync(MANIFEST, "utf8").replace(/\r\n/g, "\n");
  } catch {}

  const skipped = readdirSync(DIR).filter((f) => f !== "manifest.json" && !SHOWABLE.test(f));
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
