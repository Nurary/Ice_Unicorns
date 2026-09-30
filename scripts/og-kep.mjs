#!/usr/bin/env node
// ===== Ice Unicorns – megosztási kép a következő meccsről =====
//
// Az ob4c.html / ob4d.html linkjét Facebookon, Messengerben megosztva ez a
// kép jelenik meg (og:image): „Következő meccs: Ice Unicorns – Ellenfél,
// időpont, helyszín”. Ha nincs hátralévő meccs, a szezon utolsó eredményét
// mutatja.
//
// A bajnoksag-adatok.js-ből dolgozik, ezért a frissítő workflow a
// bajnoksági adatok után futtatja. Futtatás kézzel:
//
//   npm install && node scripts/og-kep.mjs
//
// A kimenet: assets/og/<bajnokság>.png (1200×630). Csak akkor írja felül,
// ha tényleg változott – és ha valami nem jött le rendesen (betűtípus,
// ellenfél-logó), inkább meghagyja a régit, mint hogy egy félkész képet
// tegyen ki.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "assets", "og");
const W = 1200;
const H = 630;
const US = "Ice Unicorns";

// A weboldal betűtípusai. A Google Fonts böngésző-azonosító nélkül TTF-et
// ad, azt pedig a resvg közvetlenül be tudja tölteni.
const FONTS = [
  { family: "Baloo+2", weight: 800 },
  { family: "Nunito", weight: 700 },
];

function loadLeagues() {
  const src = readFileSync(join(ROOT, "bajnoksag-adatok.js"), "utf8");
  const window = {};
  new Function("window", src)(window);
  return window.LEAGUES || {};
}

async function fetchFonts() {
  const files = [];
  for (const f of FONTS) {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${f.family}:wght@${f.weight}`)
    ).text();
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    if (!url) throw new Error(`Nem található TTF: ${f.family}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    const file = join(tmpdir(), `iu-${f.family}-${f.weight}.ttf`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    files.push(file);
  }
  return files;
}

// Kép → data URI, hogy a resvg-nek ne kelljen semmit letöltenie
async function logoDataUri(url) {
  if (!url) return { uri: null, ok: true };
  try {
    if (!/^https?:/.test(url)) {
      const buf = readFileSync(join(ROOT, url));
      const type = /\.png$/i.test(url) ? "image/png" : "image/jpeg";
      return { uri: `data:${type};base64,${buf.toString("base64")}`, ok: true };
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return { uri: `data:${type};base64,${buf.toString("base64")}`, ok: true };
  } catch (err) {
    console.warn(`FIGYELEM: a logó nem jött le (${url}): ${err.message}`);
    return { uri: null, ok: false };
  }
}

const xml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// "2026-10-03" → "október 3., szombat"
function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const opts = { timeZone: "UTC" };
  const md = date.toLocaleDateString("hu-HU", { ...opts, month: "long", day: "numeric" });
  const wd = date.toLocaleDateString("hu-HU", { ...opts, weekday: "long" });
  return `${md}, ${wd}`;
}

// Hosszú csapatnévnél kisebb betű, hogy kiférjen a logó alá
const nameSize = (name) => (name.length > 22 ? 30 : name.length > 16 ? 36 : 42);

// A saját logónk négyzetes, rózsaszín hátterű kép: az kitölti a kört. Az
// ellenfelek címerei viszont átlátszóak és változó arányúak, azok a fehér
// korongon belül, a teljes címert mutatva jelennek meg.
function teamBlock(cx, name, logo) {
  const r = 112;
  const cy = 330;
  const id = `clip${cx}`;
  const inner = logo && name === US
    ? `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <image href="${logo}" x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
    : logo
    ? `<image href="${logo}" x="${cx - 80}" y="${cy - 80}" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${cx}" y="${cy + 34}" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="100" fill="#1b2450">${xml(name.charAt(0))}</text>`;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="url(#rainbow)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
    ${inner}
    <text x="${cx}" y="${cy + r + 62}" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="${nameSize(name)}" fill="#ffffff">${xml(name)}</text>`;
}

function svg({ kicker, headline, sub, home, away, middle }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b2450"/>
      <stop offset="1" stop-color="#0d1333"/>
    </linearGradient>
    <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff2d2d"/><stop offset="0.17" stop-color="#ff7a00"/>
      <stop offset="0.34" stop-color="#ffce00"/><stop offset="0.51" stop-color="#1fc950"/>
      <stop offset="0.68" stop-color="#009dff"/><stop offset="0.85" stop-color="#6b4bff"/>
      <stop offset="1" stop-color="#b026ff"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ff3d7f" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ff3d7f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="320" fill="url(#glow)"/>
  <circle cx="90" cy="600" r="260" fill="url(#glow)" opacity="0.7"/>
  <text x="600" y="78" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="30" letter-spacing="5" fill="#ffcf5c">${xml(kicker)}</text>
  <text x="600" y="140" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="54" fill="#ffffff">${xml(headline)}</text>
  ${teamBlock(300, home.name, home.logo)}
  <text x="600" y="352" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="${middle.length > 3 ? 76 : 64}" fill="#ff3d7f">${xml(middle)}</text>
  ${teamBlock(900, away.name, away.logo)}
  <text x="600" y="578" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="26" fill="#c7cdd9">${xml(sub)}</text>
  <rect x="0" y="${H - 12}" width="${W}" height="12" fill="url(#rainbow)"/>
</svg>`;
}

// Mit mutasson a kép: a következő meccset, vagy ha már nincs, a legutóbbit
function cardFor(key, league) {
  const matches = league.matches || [];
  const played = (m) => typeof m.us === "number" && typeof m.them === "number";
  const next = matches.filter((m) => !played(m)).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const last = matches.filter(played).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const m = next || last;
  if (!m) return null;

  const home = m.home ? { name: US, logo: "assets/logo/logo.jpg" } : { name: m.opponent, logo: m.logo };
  const away = m.home ? { name: m.opponent, logo: m.logo } : { name: US, logo: "assets/logo/logo.jpg" };
  const where = m.home ? "Hazai meccs" : "Idegenben";
  if (next) {
    return {
      kicker: `KÖVETKEZŐ MECCS · ${league.label}`,
      headline: fmtDate(m.date) + (m.time ? ` · ${m.time}` : ""),
      sub: [where, m.venue].filter(Boolean).join(" · "),
      home,
      away,
      middle: "VS",
    };
  }
  const hs = m.home ? m.us : m.them;
  const as = m.home ? m.them : m.us;
  return {
    kicker: `LEGUTÓBBI MECCS · ${league.label}`,
    headline: fmtDate(m.date),
    sub: `${league.season} szezon · iceunicorns.hu`,
    home,
    away,
    middle: `${hs}–${as}${m.ot ? "*" : ""}`,
  };
}

async function main() {
  const leagues = loadLeagues();
  const fontFiles = await fetchFonts();
  mkdirSync(OUT_DIR, { recursive: true });

  for (const [key, league] of Object.entries(leagues)) {
    const card = cardFor(key, league);
    const out = join(OUT_DIR, `${key}.png`);
    if (!card) {
      console.log(`${league.label}: nincs meccs, nincs mit kirajzolni.`);
      continue;
    }

    const homeLogo = await logoDataUri(card.home.logo);
    const awayLogo = await logoDataUri(card.away.logo);
    if ((!homeLogo.ok || !awayLogo.ok) && existsSync(out)) {
      console.warn(`${league.label}: egy logó nem jött le, marad a korábbi kép.`);
      continue;
    }
    card.home.logo = homeLogo.uri;
    card.away.logo = awayLogo.uri;

    const raw = new Resvg(svg(card), {
      fitTo: { mode: "width", value: W },
      font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Nunito" },
    })
      .render()
      .asPng();
    // Palettás PNG: harmadakkora, és a kimenet továbbra is determinisztikus
    const png = await sharp(raw).png({ palette: true, quality: 90, effort: 10 }).toBuffer();

    if (existsSync(out) && readFileSync(out).equals(png)) {
      console.log(`${league.label}: a kép nem változott.`);
      continue;
    }
    writeFileSync(out, png);
    console.log(`${league.label}: frissítve (${Math.round(png.length / 1024)} KB) – ${card.headline}`);
  }
}

main().catch((err) => {
  console.error("Hiba a megosztási kép készítésekor:", err.message);
  process.exit(1);
});
