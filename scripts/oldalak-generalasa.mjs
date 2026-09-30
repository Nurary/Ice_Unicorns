#!/usr/bin/env node
// ===== Ice Unicorns – bajnoksági oldalak generálása =====
//
// Az ob4c.html és az ob4d.html szinte teljesen egyforma, ezért egy közös
// sablonból (scripts/sablonok/bajnoksag.html) készülnek. Ha a két oldal
// szerkezetén változtatnál, a SABLONT szerkeszd, majd futtasd:
//
//   node scripts/oldalak-generalasa.mjs
//
// A bajnokságonként eltérő szövegek az alábbi OLDALAK objektumban vannak.
// Új bajnokság: vegyél fel ide egy sort (és a frissítő scriptbe is).
//
//   --check  csak ellenőriz: hibával kilép, ha a HTML-ek eltérnek attól,
//            amit a sablon adna (ezt futtatja a CI minden pushnál).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = join(ROOT, "scripts", "sablonok", "bajnoksag.html");

export const OLDALAK = {
  ob4d: {
    label: "OB4D",
    description: "Az Ice Unicorns OB4D csapata: a bajnokság és a keret egy helyen.",
    h1: "bizonyítunk",
    lead: "Az Ice Unicorns az OB4D mezőnyében méri össze tudását más amatőr csapatokkal.",
  },
  ob4c: {
    label: "OB4C",
    description: "Az Ice Unicorns OB4C csapata: a bajnokság és a keret egy helyen.",
    h1: "feljebb lépünk",
    lead: "Az Ice Unicorns OB4C csapata egy szinttel feljebb méri össze tudását a mezőnnyel.",
  },
};

// A munkakönyvtárban a git Windows alatt CRLF-re alakíthatja a sorvégeket –
// az összehasonlításnál ez nem számít.
const norm = (s) => s.replace(/\r\n/g, "\n");

export function renderPage(key) {
  const vars = { key, ...OLDALAK[key] };
  const tpl = norm(readFileSync(TEMPLATE, "utf8"));
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, name) => {
    if (!(name in vars)) throw new Error(`Ismeretlen sablonváltozó: ${m}`);
    return vars[name];
  });
}

function main() {
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const key of Object.keys(OLDALAK)) {
    const file = join(ROOT, `${key}.html`);
    const html = renderPage(key);
    let current = "";
    try {
      current = norm(readFileSync(file, "utf8"));
    } catch {}
    if (current === html) continue;
    if (check) {
      console.error(`${key}.html nem egyezik a sablonnal – futtasd: node scripts/oldalak-generalasa.mjs`);
      stale++;
    } else {
      writeFileSync(file, html, "utf8");
      console.log(`Frissítve: ${key}.html`);
    }
  }
  if (stale) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
