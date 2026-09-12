#!/usr/bin/env node
// ===== Ice Unicorns – bajnoksági adatok frissítése =====
//
// Lekéri az MJSZ nyilvános bajnoksági API-járól (ugyanaz, amiből a
// jegkorongszovetseg.hu bajnokság-oldalai is dolgoznak) az OB4C és OB4D
// menetrendjét és tabelláját, majd újraírja a bajnoksag-adatok.js fájlt.
//
// Futtatás kézzel:   node scripts/bajnoksag-frissites.mjs
// Automatikusan:     .github/workflows/bajnoksag-frissites.yml (időzítve)
//
// Környezeti változók (mind elhagyható, van értelmes alapértékük):
//   MJSZ_API_KEY – API kulcs. Ha nincs megadva, a jegkorongszovetseg.hu
//                  oldalába épített nyilvános kulcsot használjuk. Ez csak
//                  átmeneti megoldás: sajátot az info@icehockey.hu címen
//                  lehet kérni (lásd https://api.icehockey.hu/widgets/docs/v2/vbr-api/).
//   MJSZ_ORIGIN  – ehhez a domainhez van engedélyezve a kulcs. A sajátunk
//                  megérkezésekor ez lesz https://iceunicorns.hu.
//   SZEZON       – pl. "2026-2027". Alapból az alábbi SEASON.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "bajnoksag-adatok.js");

const API_BASE = "https://api.icehockey.hu/vbr/v2";
const API_KEY = process.env.MJSZ_API_KEY || "7b4f4d1b466b5a3572990ae24452abf2a086e7ee";
const ORIGIN = process.env.MJSZ_ORIGIN || "https://www.jegkorongszovetseg.hu";

const SEASON = process.env.SZEZON || "2026-2027";
const OUR_TEAM = "Ice Unicorns";
const OUR_LOGO = "assets/logo/logo.jpg"; // a saját emblémánk, nem az IVR-es

// Melyik oldal melyik MJSZ-bajnokságból töltődik.
// A kulcs (ob4d / ob4c) a HTML-ben lévő data-league értéke.
const LEAGUE_CONFIG = {
  ob4d: { label: "OB4D", championshipName: "OB IV/D Bajnokság" },
  ob4c: { label: "OB4C", championshipName: "OB IV/C Bajnokság" },
};

// ---- API ----

async function api(path, params) {
  const url = new URL(API_BASE + path);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
      Origin: ORIGIN,
      Referer: ORIGIN + "/",
    },
  });
  if (!res.ok) {
    throw new Error(`${path} → HTTP ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  if (body.error || body.data?.message) {
    throw new Error(`${path} → ${body.data?.message || body.message}`);
  }
  return body.data;
}

// ---- Átalakítás a weboldal adatszerkezetére ----

// "2026-10-04T19:00:00.000+02:00" → { date: "2026-10-04", time: "19:00" }
// A dátum már budapesti idő szerint jön, ezért csak kivágjuk belőle a
// részeket – átszámolni nem kell (és nem is szabad, mert elcsúszna).
function splitGameDate(iso) {
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return { date: String(iso).slice(0, 10), time: null };
  const time = `${m[2]}:${m[3]}`;
  // A 00:00 azt jelenti, hogy még nincs kiírva pontos kezdés.
  return { date: m[1], time: time === "00:00" ? null : time };
}

const isPlayed = (g) =>
  g.gameStatus !== 0 && g.homeTeamScore !== null && g.awayTeamScore !== null;

// Egy mérkőzés a mi szemszögünkből (a menetrendbe csak a sajátjaink kerülnek)
function toMatch(g) {
  const home = g.homeTeam.longName === OUR_TEAM;
  const opp = home ? g.awayTeam : g.homeTeam;
  const { date, time } = splitGameDate(g.gameDate);
  const played = isPlayed(g);

  const match = { date };
  if (time) match.time = time;
  match.opponent = opp.longName;
  match.home = home;
  if (g.location?.locationName) match.venue = g.location.locationName;
  if (opp.logo) match.logo = opp.logo;
  match.us = played ? (home ? g.homeTeamScore : g.awayTeamScore) : null;
  match.them = played ? (home ? g.awayTeamScore : g.homeTeamScore) : null;
  if (played && (g.isOvertime || g.isShootout)) match.ot = true;
  return match;
}

// Egy tabellasor. Ebben a bajnokságban nincs döntetlen: ami rendes
// játékidőben nem dől el, azt hosszabbítás vagy szétlövés zárja le, és a
// pontozás is eszerint megy (győzelem 3, hosszabbításos győzelem 2,
// hosszabbításos vereség 1, vereség 0 pont). Ezért a négy kimenetelt külön
// tartjuk meg – a tabella is így mutatja.
function toStandingsRow(r) {
  const t = r.team || {};
  const us = t.longName === OUR_TEAM;
  const row = {
    team: t.longName,
    gp: r.gamesPlayed ?? 0,
    w: r.w ?? 0, // győzelem rendes játékidőben
    otw: r.otw ?? 0, // győzelem hosszabbításban
    sow: r.sow ?? 0, // győzelem szétlövésben
    otl: r.otl ?? 0, // vereség hosszabbításban
    sol: r.sol ?? 0, // vereség szétlövésben
    v: r.l ?? 0, // vereség rendes játékidőben
    gf: r.gf ?? 0,
    ga: r.ga ?? 0,
    pts: r.points ?? 0,
  };
  const logo = us ? OUR_LOGO : t.logo;
  if (logo) row.logo = logo;
  if (us) row.us = true;
  return row;
}

// Csoport csapatai a menetrendből, nullázott tabellasorokkal.
// A szezon elején a tabella még üres, de a csapatokat már ki tudjuk írni.
function teamsFromGames(games, group) {
  const seen = new Map();
  games
    // Ha nincs alcsoport (egycsoportos bajnokság), minden meccs beleszámít.
    .filter((g) => !group || g.divisionStage3Name === group)
    .forEach((g) => {
      [g.homeTeam, g.awayTeam].forEach((t) => {
        if (!seen.has(t.longName)) seen.set(t.longName, t);
      });
    });
  return [...seen.values()]
    .sort((a, b) => a.longName.localeCompare(b.longName, "hu"))
    .map((t) => toStandingsRow({ team: t }));
}

// ---- Egy bajnokság összeszedése ----

async function fetchLeague(cfg) {
  const seasons = await api("/championship-seasons", {
    championshipName: cfg.championshipName,
  });
  const season = seasons.find((s) => s.seasonName === SEASON);
  if (!season) {
    throw new Error(
      `${cfg.championshipName}: nincs "${SEASON}" szezon ` +
        `(elérhető: ${seasons.map((s) => s.seasonName).join(", ")})`
    );
  }
  const championshipId = season.championshipId;

  const sections = await api("/championship-sections", { championshipId });
  // Az alapszakasz két alcsoportból áll (A és B) – ezekből lesz a tabella.
  // A rájátszás ágai (negyeddöntő, elődöntő, helyosztó…) is szakaszként
  // jönnek vissza, de azok párharcok, nem tabellák: kihagyjuk őket.
  // A megkülönböztetés a phaseBaseId: 1 = alapszakasz, 2 = rájátszás.
  const phases = sections
    .flatMap((s) => s.phases || [])
    .filter((p) => p.phaseBaseId === 1)
    .map((p) => ({
      phaseId: p.phaseId,
      // "A" / "B" – ez köti össze a tabellát a menetrend
      // divisionStage3Name mezőjével
      group: p.phaseSubType?.phaseSubTypeName || null,
      name: p.phaseName,
    }))
    .sort((a, b) => String(a.group).localeCompare(String(b.group), "hu"));

  const games = await api("/games-list", { championshipId });

  const matches = games
    .filter(
      (g) => g.homeTeam.longName === OUR_TEAM || g.awayTeam.longName === OUR_TEAM
    )
    .map(toMatch)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const groups = [];
  for (const phase of phases) {
    const rows = await api("/standings", { championshipId, phaseId: phase.phaseId });
    const standings = rows.length
      ? rows.map(toStandingsRow)
      : teamsFromGames(games, phase.group);
    if (standings.length) {
      // Ha van alcsoport, az adja a címet ("A csoport"), különben a
      // szakasz neve ("Alapszakasz") – egycsoportos bajnokságra is jó.
      const name = phase.group ? `${phase.group} csoport` : phase.name;
      groups.push({ name, standings });
    }
  }

  return { label: cfg.label, season: SEASON, championshipId, matches, groups };
}

// ---- Kiírás ----

// A korábbi adatok – ha egy bajnokság lekérése üresen jönne vissza, inkább
// meghagyjuk a régit, mint hogy egy API-hiba letörölje az oldalról.
function readPrevious() {
  try {
    const src = readFileSync(OUT_FILE, "utf8");
    const m = src.match(/window\.LEAGUES\s*=\s*(\{[\s\S]*?\});\s*\n/);
    return m ? JSON.parse(m[1]) : null;
  } catch {
    return null;
  }
}

function render(leagues, generatedAt) {
  return `// ===== Ice Unicorns – bajnoksági adatok (GENERÁLT FÁJL) =====
//
// EZT A FÁJLT NE SZERKESZD KÉZZEL – minden futásnál felülíródik.
// A scripts/bajnoksag-frissites.mjs állítja elő az MJSZ nyilvános
// bajnoksági API-jából, a .github/workflows/bajnoksag-frissites.yml
// pedig időzítve lefuttatja, és commitolja, ha változott valami.
//
// Szezon: ${SEASON}
// Utolsó frissítés: ${generatedAt}
//
// A mezők jelentését a bajnoksag.js tetején lévő leírás mondja el.

window.LEAGUES = ${JSON.stringify(leagues, null, 2)};

window.LEAGUES_FRISSITVE = ${JSON.stringify(generatedAt)};
`;
}

async function main() {
  const previous = readPrevious();
  const leagues = {};
  const warnings = [];

  for (const [key, cfg] of Object.entries(LEAGUE_CONFIG)) {
    const league = await fetchLeague(cfg);

    if (!league.matches.length && !league.groups.length && previous?.[key]) {
      warnings.push(`${cfg.label}: üres választ kaptunk, marad a korábbi adat.`);
      leagues[key] = previous[key];
      continue;
    }
    leagues[key] = league;
    console.log(
      `${cfg.label}: ${league.matches.length} saját meccs, ` +
        `${league.groups.length} csoport ` +
        `(${league.groups.map((g) => g.standings.length).join("+")} csapat)`
    );
  }

  warnings.forEach((w) => console.warn("FIGYELEM: " + w));

  // A frissítés időpontja mindig változik, ezért a „történt-e változás”
  // kérdést a tényleges adatokon döntjük el – így nem lesz felesleges commit.
  if (previous && JSON.stringify(previous) === JSON.stringify(leagues)) {
    console.log("Nincs változás az adatokban.");
    return;
  }

  writeFileSync(OUT_FILE, render(leagues, new Date().toISOString()), "utf8");
  console.log(`Frissítve: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("Hiba a frissítés közben:", err.message);
  process.exit(1);
});
