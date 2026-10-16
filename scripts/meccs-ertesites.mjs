#!/usr/bin/env node
// ===== Ice Unicorns – értesítés a meccs előtti napon =====
//
// Megnézi, van-e HOLNAP (budapesti idő szerint) meccsünk valamelyik
// bajnokságban, és ha igen, push-értesítést küld mindenkinek, aki az oldalon
// a „Szólj a meccs előtt” gombbal feliratkozott. A kézbesítést a OneSignal
// végzi. A .github/workflows/meccs-ertesites.yml naponta egyszer futtatja.
//
// Beállítás (GitHub → Settings → Secrets and variables → Actions):
//   ONESIGNAL_REST_API_KEY  – a OneSignal felületén: Settings → Keys & IDs →
//                             REST API Key (titkos, csak ide kerüljön!)
//   ONESIGNAL_APP_ID        – elhagyható: ha nincs megadva, a partials.js-ben
//                             lévő ONESIGNAL_APP_ID-t használja.
//
// Kézi próba (semmit nem küld, csak kiírja, mit küldene):
//   node scripts/meccs-ertesites.mjs --proba
//   node scripts/meccs-ertesites.mjs --proba --datum=2026-10-25

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://iceunicorns.hu";
const US = "Ice Unicorns";

function loadLeagues() {
  const src = readFileSync(join(ROOT, "bajnoksag-adatok.js"), "utf8");
  const window = {};
  new Function("window", src)(window);
  return window.LEAGUES || {};
}

// A partials.js-ben lévő nyilvános App ID – így elég a titkos kulcsot
// beállítani a GitHubon
function appIdFromSite() {
  const src = readFileSync(join(ROOT, "partials.js"), "utf8");
  return src.match(/const ONESIGNAL_APP_ID = "([^"]*)"/)?.[1] || "";
}

// "YYYY-MM-DD" budapesti idő szerint, `offset` nappal eltolva
function budapestDate(offset = 0) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offset));
  return dt.toISOString().slice(0, 10);
}

const played = (m) => m.us !== null && m.us !== undefined && m.them !== null && m.them !== undefined;

function message(key, league, m) {
  const where = m.home ? "hazai pályán" : "idegenben";
  const title = `Holnap meccs! 🏒 ${league.label}`;
  const body =
    `${US} – ${m.opponent}` +
    (m.time ? ` · ${m.time}` : "") +
    (m.venue ? ` · ${m.venue}` : ` · ${where}`) +
    (m.home ? "\nGyere el szurkolni! 🦄" : "");
  return { title, body, url: `${SITE}/${key}.html` };
}

async function send(appId, apiKey, msg) {
  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      included_segments: ["Subscribed Users"],
      // A OneSignal az angol szöveget kötelezőnek veszi – ugyanaz megy mindkettőbe
      headings: { en: msg.title, hu: msg.title },
      contents: { en: msg.body, hu: msg.body },
      url: msg.url,
      chrome_web_icon: `${SITE}/assets/favicons/icon-192.png`,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    throw new Error(`OneSignal hiba (HTTP ${res.status}): ${JSON.stringify(json.errors || json)}`);
  }
  return json;
}

async function main() {
  const proba = process.argv.includes("--proba");
  const datum = process.argv.find((a) => a.startsWith("--datum="))?.slice(8) || budapestDate(1);
  const leagues = loadLeagues();

  const msgs = [];
  for (const [key, league] of Object.entries(leagues)) {
    for (const m of league.matches || []) {
      if (m.date === datum && !played(m)) msgs.push(message(key, league, m));
    }
  }
  if (!msgs.length) {
    console.log(`${datum}: nincs meccsünk, nincs mit küldeni.`);
    return;
  }

  const appId = process.env.ONESIGNAL_APP_ID || appIdFromSite();
  const apiKey = process.env.ONESIGNAL_REST_API_KEY || "";
  if (proba || !appId || !apiKey) {
    if (!proba) console.log("A OneSignal nincs beállítva (App ID / REST API Key) – csak kiírom, mit küldenék.");
    msgs.forEach((m) => console.log(`---\n${m.title}\n${m.body}\n→ ${m.url}`));
    return;
  }
  for (const m of msgs) {
    const r = await send(appId, apiKey, m);
    console.log(`Elküldve: ${m.title} – ${m.body.split("\n")[0]} (id: ${r.id || "?"})`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
