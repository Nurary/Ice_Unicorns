#!/usr/bin/env node
// ===== Ice Unicorns – képek optimalizálása =====
//
// A feltöltött képek (telefonfotók, játékoskártyák) gyakran több MB-osak,
// ami mobilon lassú. Ez a script átméretezi és újratömöríti őket – a
// FÁJLNÉV ÉS A FORMÁTUM MARAD, tehát egyetlen hivatkozást sem kell átírni.
//
// Futtatás kézzel:   npm install && node scripts/kepek-optimalizalasa.mjs
// Automatikusan:     .github/workflows/kepek.yml (minden képfeltöltés után)
//
// Csak a „nehéz” képekhez nyúl (nagy fájl, túl nagy felbontás, elforgatást
// igénylő telefonfotó, vagy a kiterjesztéssel nem egyező formátum), így a
// már optimalizált képeket nem tömöríti újra és újra.
//
// A metaadatokat (EXIF) eltávolítja – ezzel a telefonfotókba írt GPS-pozíció
// is eltűnik. Előtte az EXIF szerinti elforgatást „beégeti” a képbe, hogy a
// fotó ne dőljön el.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// maxEdge: a hosszabbik oldal legfeljebb ennyi pixel
// minBytes: ennél kisebb fájlt nem tömörítünk újra (ha amúgy rendben van)
const RULES = [
  { dir: "assets/Galery", maxEdge: 1920, minBytes: 350_000 },
  // A játékoskártyán a kép legfeljebb ~420 px széles, retinán ennek dupla
  { dir: "assets/Players", maxEdge: 1000, minBytes: 300_000 },
  // A preview.png a megosztási kép: 1200 px széles a szabványos méret
  { dir: "assets/logo", maxEdge: 1200, minBytes: 300_000 },
  { dir: "assets/Errors", maxEdge: 900, minBytes: 300_000 },
  { dir: "assets/favicons", maxEdge: 512, minBytes: 100_000 },
];

const FORMAT_BY_EXT = {
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".jfif": "jpeg",
  ".png": "png",
  ".webp": "webp",
};

// Bájt / pixel, ami fölött egy kép még „nehéznek” számít. Egy már
// optimalizált kép ez alatt van, így a script nem tömöríti újra (a veszteséges
// tömörítés minden körrel rontana a képen).
const MAX_BYTES_PER_PIXEL = { jpeg: 0.2, png: 0.8, webp: 0.2 };

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function optimize(file, rule) {
  const ext = extname(file).toLowerCase();
  const want = FORMAT_BY_EXT[ext];
  if (!want) return null; // pl. HEIC, GIF – ezekhez nem nyúlunk

  const input = readFileSync(file);
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch (err) {
    return { file, skipped: `nem olvasható (${err.message})` };
  }

  const longEdge = Math.max(meta.width || 0, meta.height || 0);
  const rotated = (meta.orientation || 1) !== 1;
  const wrongFormat = meta.format !== want;
  const tooBig = longEdge > rule.maxEdge;
  const pixels = (meta.width || 1) * (meta.height || 1);
  const heavy =
    input.length > rule.minBytes &&
    input.length / pixels > (MAX_BYTES_PER_PIXEL[meta.format] ?? 0.5);
  if (!rotated && !wrongFormat && !tooBig && !heavy) return null;

  let img = sharp(input).rotate(); // EXIF szerinti elforgatás beégetése
  if (tooBig) {
    img = img.resize({
      width: rule.maxEdge,
      height: rule.maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  if (want === "jpeg") img = img.jpeg({ quality: 80, mozjpeg: true });
  else if (want === "webp") img = img.webp({ quality: 80 });
  else {
    // Palettás PNG: a rajzolt játékoskártyáknál és logóknál szemmel nem
    // látszik a különbség, a méret viszont a töredéke lesz.
    img = img.png({ palette: true, quality: 85, effort: 10, compressionLevel: 9 });
  }
  const output = await img.toBuffer();

  // Csak akkor írjuk felül, ha tényleg megéri – vagy ha javítani kellett
  // (elforgatás, rossz formátum), mert az a méretnél fontosabb.
  const mustFix = rotated || wrongFormat;
  if (!mustFix && output.length > input.length * 0.9) return null;

  writeFileSync(file, output);
  return { file, before: input.length, after: output.length, rotated, wrongFormat };
}

async function main() {
  const results = [];
  const skipped = [];
  for (const rule of RULES) {
    const dir = join(ROOT, rule.dir);
    let files;
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of files) {
      const file = join(dir, name);
      if (!statSync(file).isFile()) continue;
      if (/\.(heic|heif)$/i.test(name)) {
        skipped.push(`${relative(ROOT, file)}: HEIC formátum – a böngészők nem tudják megjeleníteni, mentsd el JPG-ként`);
        continue;
      }
      const r = await optimize(file, rule);
      if (r?.skipped) skipped.push(`${relative(ROOT, file)}: ${r.skipped}`);
      else if (r) results.push(r);
    }
  }

  let saved = 0;
  results.forEach((r) => {
    saved += r.before - r.after;
    const notes = [r.rotated && "elforgatva", r.wrongFormat && "formátum javítva"]
      .filter(Boolean)
      .join(", ");
    console.log(
      `${relative(ROOT, r.file)}: ${kb(r.before)} → ${kb(r.after)}${notes ? ` (${notes})` : ""}`
    );
  });
  skipped.forEach((s) =>
    console.warn(process.env.GITHUB_ACTIONS ? `::warning::${s}` : `FIGYELEM: ${s}`)
  );
  console.log(
    results.length
      ? `${results.length} kép optimalizálva, összesen ${kb(saved)} megtakarítás.`
      : "Nincs optimalizálnivaló kép."
  );
}

main().catch((err) => {
  console.error("Hiba a képek optimalizálása közben:", err.message);
  process.exit(1);
});
