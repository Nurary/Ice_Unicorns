#!/usr/bin/env node
// ===== Ice Unicorns – bajnoksági adatok frissítése =====
//
// Lekéri az MJSZ nyilvános bajnoksági API-járól (ugyanaz, amiből a
// jegkorongszovetseg.hu bajnokság-oldalai is dolgoznak) az OB4C és OB4D
// menetrendjét, tabelláját és a saját meccseink jegyzőkönyvét, majd
// újraírja a bajnoksag-adatok.js fájlt és a naptar/ mappa .ics fájljait.
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
//   SZEZON       – pl. "2026-2027". Alapból a dátumból számoljuk (júliustól
//                  már az új szezon), és ha az MJSZ azt még nem írta ki,
//                  a legutóbbi elérhető szezon marad – így évente nem kell
//                  kézzel átírni.
//   CSAPAT       – csak teszteléshez: más csapat nevével egy korábbi szezon
//                  adatain is ki lehet próbálni a scriptet.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadTeams, nameTokens, playersOf } from "./keret.mjs";
import { renderIcs } from "./naptar.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "bajnoksag-adatok.js");
const ICS_DIR = join(ROOT, "naptar");

const API_BASE = "https://api.icehockey.hu/vbr/v2";
const API_KEY = process.env.MJSZ_API_KEY || "7b4f4d1b466b5a3572990ae24452abf2a086e7ee";
const ORIGIN = process.env.MJSZ_ORIGIN || "https://www.jegkorongszovetseg.hu";

// A szezon ősztől tavaszig tart: júliustól már a következőt keressük
function currentSeason(d = new Date()) {
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
const SEASON = process.env.SZEZON || currentSeason();
const OUR_TEAM = process.env.CSAPAT || "Ice Unicorns";
const OUR_LOGO = "assets/logo/logo.jpg"; // a saját emblémánk, nem az IVR-es
const SCORERS_LIMIT = 15; // hányan kerüljenek be a csoport pontversenyébe

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
// Rájátszás-szakasz: "Negyeddöntő", "Elődöntő", "Döntő", "Bronzmérkőzés",
// "Helyosztó"… Az alapszakasz meccseinél null. (A helyosztó csoportja –
// "5-8." – a divisionStage3Name-ben van, ugyanott, ahol az alapszakasz A/B-je.)
const stageOf = (g) =>
  g.divisionStage2Name && g.divisionStage2Name !== "Alapszakasz" ? g.divisionStage2Name : null;
// A meccs sorszáma ("OBIVD 71" → 71) – ebből jön a párharcok sorrendje az ágrajzon
const gameNo = (g) => Number((String(g.gameName || "").match(/(\d+)\s*$/) || [])[1]) || null;

function toMatch(g) {
  const home = g.homeTeam.longName === OUR_TEAM;
  const opp = home ? g.awayTeam : g.homeTeam;
  const { date, time } = splitGameDate(g.gameDate);
  const played = isPlayed(g);

  // Az MJSZ meccsazonosítója: ezzel köti össze a naptár az eseményt, ha
  // később módosul az időpont.
  const match = { id: g.gameId, date };
  if (time) match.time = time;
  match.opponent = opp.longName;
  match.home = home;
  if (g.location?.locationName) match.venue = g.location.locationName;
  if (opp.logo) match.logo = opp.logo;
  match.us = played ? (home ? g.homeTeamScore : g.awayTeamScore) : null;
  match.them = played ? (home ? g.awayTeamScore : g.homeTeamScore) : null;
  if (played && (g.isOvertime || g.isShootout)) match.ot = true;
  const stage = stageOf(g);
  if (stage) match.stage = g.divisionStage3Name ? `${stage} (${g.divisionStage3Name})` : stage;
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

async function fetchLeague(key, cfg, ctx) {
  const seasons = await api("/championship-seasons", {
    championshipName: cfg.championshipName,
  });
  let season = seasons.find((s) => s.seasonName === SEASON);
  // Nyáron az új szezon még nincs kiírva: addig a legutóbbi marad fent.
  // (Ha a SZEZON-t kézzel adtad meg, nincs tartalék – akkor hiba legyen.)
  if (!season && !process.env.SZEZON) {
    season = seasons
      .filter((s) => s.seasonName < SEASON)
      .sort((a, b) => b.seasonName.localeCompare(a.seasonName))[0];
    if (season) {
      console.log(`${cfg.championshipName}: a(z) ${SEASON} szezon még nincs kiírva, marad a(z) ${season.seasonName}.`);
    }
  }
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
      groups.push({ name, group: phase.group, standings });
    }
  }

  // Melyik alcsoportban játszunk? A saját meccseink mondják meg. Ez kell a
  // pontversenyhez és a nézőszámhoz, mert azokat szakaszonként kéri az API.
  const ourGame = games.find(
    (g) => g.homeTeam.longName === OUR_TEAM || g.awayTeam.longName === OUR_TEAM
  );
  const ourGroup = ourGame?.divisionStage3Name || null;
  const ourPhase = phases.find((p) => p.group === ourGroup) || phases[0];

  return {
    label: cfg.label,
    season: season.seasonName,
    championshipId,
    ourGroup,
    matches,
    groups,
    // A bajnokság minden csapata egy helyen: innen jön a logó a
    // formasorokhoz és az eredménylistához, hogy ne kelljen minden
    // meccsnél újra kiírni ugyanazt az URL-t.
    teams: teamIndex(games, groups),
    // MINDEN meccs, nem csak a mienk – ebből számoljuk a formát és ebből
    // lesz a „csoport eredményei” lista.
    games: games.map(toGame).sort((a, b) => (a.date < b.date ? -1 : 1)),
    scorers: await fetchScorers(championshipId, ourPhase),
    attendance: await fetchAttendance(championshipId, ourPhase),
    // Ez nem kerül a LEAGUES-be, külön GAME_STATS tömb lesz belőle
    gameStats: await fetchGameStats(key, games, ctx),
  };
}

// Csapatnév → { logo, group }. A logó lehet null, azt a megjelenítés kezeli.
// A csoportot a tabellából vesszük, nem a meccsekből: egy csapat első
// meccse lehet rájátszás is, az meg nem az alapszakasz-csoportja.
function teamIndex(games, groups) {
  const groupOf = {};
  (groups || []).forEach((grp) =>
    (grp.standings || []).forEach((r) => {
      groupOf[r.team] = grp.group;
    })
  );

  const out = {};
  games.forEach((g) => {
    [g.homeTeam, g.awayTeam].forEach((t) => {
      if (!out[t.longName]) {
        out[t.longName] = {
          logo: t.longName === OUR_TEAM ? OUR_LOGO : t.logo || null,
          group: groupOf[t.longName] || null,
        };
      }
    });
  });
  return out;
}

// Egy meccs semlegesen (nem a mi szemszögünkből) – a formasorhoz és a
// csoport eredménylistájához. Szándékosan rövid mezőnevek: ez a tömb a
// generált fájl legnagyobb része.
function toGame(g) {
  const { date, time } = splitGameDate(g.gameDate);
  const played = isPlayed(g);
  const out = { date, group: g.divisionStage3Name || null };
  if (time) out.time = time;
  out.home = g.homeTeam.longName;
  out.away = g.awayTeam.longName;
  if (played) {
    out.hs = g.homeTeamScore;
    out.as = g.awayTeamScore;
    if (g.isOvertime || g.isShootout) out.ot = true;
  }
  // Rájátszás: szakasz és sorszám (az ágrajzhoz)
  const stage = stageOf(g);
  if (stage) {
    out.stage = stage;
    const no = gameNo(g);
    if (no) out.no = no;
  }
  return out;
}

// A saját csoportunk pontversenye. A szezon elején üres listát ad vissza –
// a megjelenítés ilyenkor elrejti a szakaszt.
async function fetchScorers(championshipId, phase) {
  if (!phase) return [];
  const rows = await api("/players-stats", {
    championshipId,
    phaseId: phase.phaseId,
  });
  return rows
    .filter((r) => (r.points ?? 0) > 0 || (r.gp ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.points ?? 0) - (a.points ?? 0) ||
        (b.goals ?? 0) - (a.goals ?? 0) ||
        (a.gp ?? 0) - (b.gp ?? 0)
    )
    .slice(0, SCORERS_LIMIT)
    .map((r) => {
      const p = r.player || {};
      const row = {
        name: `${p.lastName || ""} ${p.firstName || ""}`.trim(),
        team: r.team?.longName || "",
        gp: r.gp ?? 0,
        g: r.goals ?? 0,
        a: r.assists ?? 0,
        pts: r.points ?? 0,
        pim: r.pim ?? 0,
      };
      if (row.team === OUR_TEAM) row.us = true;
      return row;
    });
}

// A saját csapatunk nézőszámai. Ha nincs még adat, null – nem rajzolunk
// csempét nulla nézőről.
async function fetchAttendance(championshipId, phase) {
  if (!phase) return null;
  const rows = await api("/team-attendance", {
    championshipId,
    phaseId: phase.phaseId,
  });
  const ours = rows.find((r) => r.team?.longName === OUR_TEAM);
  if (!ours || !ours.totalAttendance) return null;
  return {
    homeGames: ours.homeGame ?? 0,
    homeAvg: ours.homeAttendanceAvg ?? 0,
    awayAvg: ours.awayAttendanceAvg ?? 0,
    total: ours.totalAttendance ?? 0,
    totalAvg: ours.totalAttendanceAvg ?? 0,
  };
}

// ---- Meccsjegyzőkönyvek → játékosstatisztika ----
//
// Minden lejátszott saját meccsünk jegyzőkönyvét lekérjük (/game-stats), és
// a statisztika.js által várt GAME_STATS alakra hozzuk. A játékosokat a
// team.js kerettel párosítjuk, hogy a becenevükkel szerepeljenek:
//   1. polgári név alapján (ékezet, sorrend és kis-nagybetű nem számít,
//      és az is elég, ha az egyik név a másik része – pl. hiányzó
//      második keresztnév),
//   2. ha a név nem egyértelmű vagy nincs kitöltve, a mezszám alapján –
//      de csak akkor, ha azt a számot egyetlen játékos viseli a keretben.
// Akit egyik módon sem találunk meg, az a polgári nevével kerül be: a meccs
// jegyzőkönyvében így is látszik, a játékoskártyákon viszont nem – a futás
// végén figyelmeztetés jelzi, kinek kell kitölteni a `name` mezőjét.

function rosterIndex(players) {
  const byNum = new Map();
  players.forEach((p) => {
    const k = String(p.num);
    byNum.set(k, byNum.has(k) ? null : p); // null = több játékosé is
  });
  return {
    byName(tokens) {
      const set = new Set(tokens);
      const hits = players.filter((p) => {
        const own = nameTokens(p.name);
        if (!own.length) return false;
        const ownSet = new Set(own);
        return own.every((t) => set.has(t)) || tokens.every((t) => ownSet.has(t));
      });
      return hits.length === 1 ? hits[0] : null;
    },
    byNum: (num) => byNum.get(String(num)) || null,
  };
}

function makeResolver(teams, key) {
  const own = rosterIndex(playersOf(teams?.[key]));
  // Aki a másik csapat keretében szerepel (pl. besegít), azt is felismerjük
  const all = rosterIndex(Object.values(teams || {}).flatMap(playersOf));
  return (player, number) => {
    const tokens = nameTokens(`${player.lastName || ""} ${player.firstName || ""}`);
    const p =
      (tokens.length && (own.byName(tokens) || all.byName(tokens))) ||
      (number != null && number !== "" ? own.byNum(number) : null);
    return p ? p.nick : null;
  };
}

async function fetchGameStats(key, games, ctx) {
  const resolve = makeResolver(ctx.teams, key);
  const ours = games.filter(
    (g) =>
      isPlayed(g) &&
      (g.homeTeam.longName === OUR_TEAM || g.awayTeam.longName === OUR_TEAM)
  );

  const out = [];
  for (const g of ours) {
    const home = g.homeTeam.longName === OUR_TEAM;
    const ourTeamId = String((home ? g.homeTeam : g.awayTeam).id);
    let data;
    try {
      data = await api("/game-stats", { gameId: g.gameId });
    } catch (err) {
      // Egy hibás jegyzőkönyv miatt ne vesszen el a többi: ha korábban már
      // megvolt, azt tartjuk meg.
      const prev = ctx.previousStats.find((r) => r.id === g.gameId);
      ctx.warnings.push(
        `Jegyzőkönyv (${g.gameId}): ${err.message}` + (prev ? " – marad a korábbi." : "")
      );
      if (prev) out.push(prev);
      continue;
    }

    const skaterRows = data?.players?.[ourTeamId] || [];
    const goalieRows = (data?.goalies?.[ourTeamId] || []).filter((r) => (r.mip ?? 0) > 0);
    // Amíg a jegyzőkönyvet nem töltötték fel, nincs mit átvenni – a meccs
    // felugró ablaka ilyenkor a „még nem érkezett meg” üzenetet mutatja.
    if (!skaterRows.length && !goalieRows.length) continue;

    const { date } = splitGameDate(g.gameDate);
    const us = home ? g.homeTeamScore : g.awayTeamScore;
    const them = home ? g.awayTeamScore : g.homeTeamScore;
    const keyOf = (player, number) => {
      const nick = resolve(player || {}, number);
      if (nick) return nick;
      const civil = `${player?.lastName || ""} ${player?.firstName || ""}`.trim();
      ctx.unmatched.add(`${civil} (${LEAGUE_CONFIG[key].label})`);
      return civil;
    };

    const skaters = {};
    skaterRows.forEach((r) => {
      const line = {
        g: r.goal ?? 0,
        a: r.assist ?? 0,
        pim: r.pim ?? 0,
        pm: r.plusMinus ?? 0,
      };
      // A lövésszámot nem minden jegyzőkönyvbe vezetik: 0 = nincs adat
      if (r.shots > 0) line.sog = r.shots;
      skaters[keyOf(r.player, r.number)] = line;
    });

    // Győztes kapus: győzelemnél az, aki a legtöbbet volt a jégen
    const winner =
      us > them
        ? goalieRows.reduce((a, b) => ((b.mip ?? 0) > (a?.mip ?? 0) ? b : a), null)
        : null;
    const goalies = {};
    goalieRows.forEach((r) => {
      const line = { ga: r.ga ?? 0, min: Math.round((r.mip ?? 0) / 60) };
      // Védésszám csak akkor van, ha a kapura lövéseket is vezették (a
      // jegyzőkönyv enélkül negatív „védést” számol – azt nem vesszük át).
      if ((r.sog ?? 0) > 0 && (r.svs ?? -1) >= 0) line.sv = r.svs;
      if (r === winner) line.w = true;
      goalies[keyOf(r.player, r.jerseyNumber)] = line;
    });

    const record = {
      id: g.gameId,
      date,
      league: key,
      opponent: (home ? g.awayTeam : g.homeTeam).longName,
      home,
      us,
      them,
      skaters,
      goalies,
    };
    // A jegyzőkönyv részletei (sorok, gólok, kiállítások, harmadok). Ha ezek
    // lekérése elhasal, a meccs alapstatisztikája ettől még megmarad.
    try {
      Object.assign(record, await fetchGameDetails(g.gameId, ourTeamId, home, data, keyOf));
    } catch (err) {
      ctx.warnings.push(`Meccsrészletek (${g.gameId}): ${err.message}`);
    }
    out.push(record);
  }
  return out;
}

// A kiállítások okai az MJSZ kódjaiból. Ami nincs a listában, az ok nélkül
// jelenik meg („2 perc”), nem a nyers kóddal.
const PENALTY_CAUSES = {
  trip: "gáncsolás",
  hook: "akasztás",
  slash: "ütés bottal",
  cross: "keresztbe tartott bot",
  hi_st: "magasan tartott bot",
  hold: "visszatartás",
  hold_st: "bot lefogása",
  int: "szabálytalan akadályozás",
  rough: "durvaság",
  charg: "szabálytalan test-test elleni játék",
  board: "palánkra lökés",
  elbow: "könyöklés",
  knee: "térdelés",
  spear: "döfés bottal",
  butt: "szúrás a bot végével",
  check_head: "fejre irányuló ütközés",
  check_beh: "hátulról ütközés",
  delay: "játék késleltetése",
  too_m: "túl sok játékos a jégen",
  unsp: "sportszerűtlen viselkedés",
  fight: "verekedés",
  misc: "fegyelmi büntetés",
};

// Az MJSZ "1:4" alakú (hazai:vendég) eredményéből a mi szemszögünk
const ourScore = (s, home) => {
  const m = /^(\d+):(\d+)$/.exec(String(s || "").trim());
  if (!m) return null;
  const [h, a] = [Number(m[1]), Number(m[2])];
  return home ? [h, a] : [a, h];
};

// Sorok, gól- és kiállításnapló, harmadonkénti eredmény és lövések, emberelőny.
// Rövid mezőnevek: ez a generált fájl jelentős része lesz.
//   periods – [{ p: "1" | "OT" | "SO", us, them }]
//   shots   – { us: [harmadonként], them: [...] }  (csak ha vezették)
//   pp / pk – emberelőny: { n: lehetőség, g: gól, t: mp }, emberhátrány: { n, ga, t }
//   oppGk   – az ellenfél kapusai összesen: { sv: védés, ga: kapott gól }
//   lines   – [{ row: "1" | "gk", players: [{ pos, nick, num, cap?, pic? }] }]
//   events  – időrendben: { per, t, kind: "gol" | "kiall", us, who, num,
//             score?, a?, adv?, en?, ps?, gwg?, min?, cause? }
async function fetchGameDetails(gameId, ourTeamId, home, stats, keyOf) {
  const [events, info] = await Promise.all([
    api("/game-events", { gameId }),
    api("/game-data", { gameId }),
  ]);
  const civil = (p) => `${p?.lastName || ""} ${p?.firstName || ""}`.trim();
  const isOurs = (team) => String(team?.id ?? team) === ourTeamId;
  const out = {};

  // Harmadok
  const spr = info?.structuredPeriodResults || {};
  out.periods = ["1", "2", "3", "ot", "so"]
    .map((p) => ({ p: p.toUpperCase(), sc: ourScore(spr[p], home) }))
    .filter((r) => r.sc)
    .map((r) => ({ p: r.p, us: r.sc[0], them: r.sc[1] }));

  // Kapura lövések harmadonként. A csapat sorában a KAPUJÁRA leadott
  // lövések állnak (a védésekkel együtt), ezért a mi sorunk az ellenfélé.
  const shots = { us: [], them: [] };
  (stats?.teamSOG || []).forEach((per) => {
    Object.entries(per || {}).forEach(([teamId, r]) => {
      shots[isOurs(teamId) ? "them" : "us"].push(r?.shots ?? 0);
    });
  });
  if (shots.us.some((n) => n > 0) || shots.them.some((n) => n > 0)) out.shots = shots;

  // Emberelőny / emberhátrány
  const pp = stats?.teamPowerPlay?.[home ? "home" : "away"];
  if (pp) {
    out.pp = { n: pp.adv ?? 0, g: pp.ppgf ?? 0, t: pp.advTime ?? 0 };
    out.pk = { n: pp.dvg ?? 0, ga: pp.ppga ?? 0, t: pp.dvgTime ?? 0 };
  }

  // Az ellenfél kapusainak összesített védése – a védési hatékonyság
  // összevetéséhez (csak ha a lövéseket vezették)
  const oppGk = Object.entries(stats?.goalies || {})
    .filter(([teamId]) => !isOurs(teamId))
    .flatMap(([, rows]) => rows || [])
    .filter((r) => (r.sog ?? 0) > 0 && (r.svs ?? -1) >= 0);
  if (oppGk.length) {
    out.oppGk = {
      sv: oppGk.reduce((n, r) => n + r.svs, 0),
      ga: oppGk.reduce((n, r) => n + (r.ga ?? 0), 0),
    };
  }

  // Sorok – a jegyzőkönyv beosztása szerint (1., 2., … sor és a kapusok)
  const byRow = new Map();
  (stats?.players?.[ourTeamId] || []).forEach((r) => {
    const row = r.position === "gk" || r.row === "gk" ? "gk" : String(r.row || "?");
    const p = { pos: r.position || "", nick: keyOf(r.player, r.number), num: Number(r.number) || r.number };
    if (r.isPlayerC) p.cap = "C";
    else if (r.isPlayerA) p.cap = "A";
    if (r.player?.picture) p.pic = r.player.picture;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(p);
  });
  out.lines = [...byRow.entries()]
    .sort(([a], [b]) => (a === "gk" ? -1 : b === "gk" ? 1 : a.localeCompare(b, "hu", { numeric: true })))
    .map(([row, players]) => ({ row, players }));

  // Gólok és kiállítások
  const who = (e, ours) => (ours ? keyOf(e, e.jerseyNumber) : civil(e));
  const assist = (a, ours) => (a && a.lastName ? who(a, ours) : null);
  out.events = (Array.isArray(events) ? events : [])
    .filter((e) => e.type === "Gól" || e.type === "Kiállítás")
    .map((e) => {
      const us = isOurs(e.team);
      const ev = {
        per: String(e.eventPeriod || "").replace(/^p/, "").toUpperCase(),
        t: e.eventTime,
        kind: e.type === "Gól" ? "gol" : "kiall",
        us,
        who: e.lastName ? who(e, us) : "",
      };
      if (e.jerseyNumber) ev.num = Number(e.jerseyNumber) || e.jerseyNumber;
      if (ev.kind === "gol") {
        const sc = ourScore(e.score, home);
        if (sc) ev.score = sc;
        const a = [assist(e.assists1, us), assist(e.assists2, us)].filter(Boolean);
        if (a.length) ev.a = a;
        if (e.advantage && e.advantage !== "EQ") ev.adv = e.advantage;
        if (e.en) ev.en = true;
        if (e.ps) ev.ps = true;
        if (e.gwg) ev.gwg = true;
      } else {
        ev.min = Number(e.penaltyLength) || 0;
        if (PENALTY_CAUSES[e.penaltyCause]) ev.cause = PENALTY_CAUSES[e.penaltyCause];
      }
      return ev;
    });

  return out;
}

// ---- Kiírás ----

// A korábbi adatok – ha egy bajnokság lekérése üresen jönne vissza, inkább
// meghagyjuk a régit, mint hogy egy API-hiba letörölje az oldalról.
function readPrevious() {
  try {
    const src = readFileSync(OUT_FILE, "utf8");
    const leagues = src.match(/window\.LEAGUES\s*=\s*(\{[\s\S]*?\});\s*\n/);
    if (!leagues) return null;
    const stats = src.match(/window\.GAME_STATS\s*=\s*(\[[\s\S]*?\]);\s*\n/);
    const at = src.match(/window\.LEAGUES_FRISSITVE\s*=\s*"([^"]*)"/);
    return {
      leagues: JSON.parse(leagues[1]),
      stats: stats ? JSON.parse(stats[1]) : [],
      generatedAt: at ? at[1] : null,
    };
  } catch {
    return null;
  }
}

function render(leagues, gameStats, generatedAt) {
  return `// ===== Ice Unicorns – bajnoksági adatok (GENERÁLT FÁJL) =====
//
// EZT A FÁJLT NE SZERKESZD KÉZZEL – minden futásnál felülíródik.
// A scripts/bajnoksag-frissites.mjs állítja elő az MJSZ nyilvános
// bajnoksági API-jából, a .github/workflows/bajnoksag-frissites.yml
// pedig időzítve lefuttatja, és commitolja, ha változott valami.
//
// Szezon: ${[...new Set(Object.values(leagues).map((l) => l.season))].join(", ") || SEASON}
// Utolsó frissítés: ${generatedAt}
//
// A LEAGUES mezőinek jelentését a bajnoksag.js, a GAME_STATS-ét a
// statisztika.js tetején lévő leírás mondja el.

window.LEAGUES = ${JSON.stringify(leagues, null, 2)};

// A saját meccseink jegyzőkönyve – ebből számolódnak a játékoskártyák.
window.GAME_STATS = ${JSON.stringify(gameStats, null, 2)};

window.LEAGUES_FRISSITVE = ${JSON.stringify(generatedAt)};
`;
}

// A naptárfájlok: bajnokságonként egy, és egy közös az összes meccsel
function writeCalendars(leagues, generatedAt) {
  mkdirSync(ICS_DIR, { recursive: true });
  const files = {
    "ice-unicorns.ics": { name: "Ice Unicorns – meccsek", leagues },
  };
  for (const [key, league] of Object.entries(leagues)) {
    files[`${key}.ics`] = {
      name: `Ice Unicorns – ${league.label}`,
      leagues: { [key]: league },
    };
  }
  for (const [file, cfg] of Object.entries(files)) {
    writeFileSync(join(ICS_DIR, file), renderIcs(cfg.leagues, { name: cfg.name, generatedAt }), "utf8");
  }
}

// GitHub Actions alatt a figyelmeztetés a futás összefoglalójában is
// megjelenik, nem csak a naplóban.
const warn = (msg) =>
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `FIGYELEM: ${msg}`);

async function main() {
  const previous = readPrevious();
  const leagues = {};
  const gameStats = [];
  const ctx = {
    teams: loadTeams(ROOT),
    previousStats: previous?.stats || [],
    warnings: [],
    unmatched: new Set(),
  };

  for (const [key, cfg] of Object.entries(LEAGUE_CONFIG)) {
    const { gameStats: stats, ...league } = await fetchLeague(key, cfg, ctx);

    if (!league.matches.length && !league.groups.length && previous?.leagues?.[key]) {
      ctx.warnings.push(`${cfg.label}: üres választ kaptunk, marad a korábbi adat.`);
      leagues[key] = previous.leagues[key];
      gameStats.push(...ctx.previousStats.filter((g) => g.league === key));
      continue;
    }
    leagues[key] = league;
    gameStats.push(...stats);
    console.log(
      `${cfg.label}: ${league.matches.length} saját meccs, ` +
        `${league.groups.length} csoport ` +
        `(${league.groups.map((g) => g.standings.length).join("+")} csapat), ` +
        `${stats.length} jegyzőkönyv`
    );
  }
  gameStats.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  ctx.warnings.forEach(warn);
  if (ctx.unmatched.size) {
    warn(
      "Ezeket a játékosokat nem találtuk a team.js keretben, ezért a " +
        "kártyájukon nem jelenik meg a statisztikájuk (töltsd ki a `name` " +
        "mezőjüket, vagy vedd fel őket): " +
        [...ctx.unmatched].join("; ")
    );
  }

  // A frissítés időpontja mindig változik, ezért a „történt-e változás”
  // kérdést a tényleges adatokon döntjük el – így nem lesz felesleges commit.
  const changed =
    !previous ||
    JSON.stringify(previous.leagues) !== JSON.stringify(leagues) ||
    JSON.stringify(previous.stats) !== JSON.stringify(gameStats);
  const generatedAt = changed ? new Date().toISOString() : previous.generatedAt;

  if (changed) {
    writeFileSync(OUT_FILE, render(leagues, gameStats, generatedAt), "utf8");
    console.log(`Frissítve: ${OUT_FILE}`);
  } else {
    console.log("Nincs változás az adatokban.");
  }

  // A naptárat mindig kiírjuk: ugyanabból az adatból bájtra ugyanaz jön ki,
  // tehát ha nem változott semmi, git szerint sem lesz változás – viszont
  // ha a naptárfájl még nem létezik (vagy a formátuma változott), elkészül.
  writeCalendars(leagues, generatedAt || new Date(0).toISOString());
}

main().catch((err) => {
  console.error("Hiba a frissítés közben:", err.message);
  process.exit(1);
});
