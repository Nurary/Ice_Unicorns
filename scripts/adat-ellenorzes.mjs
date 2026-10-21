// ===== Ice Unicorns – a bajnoksági adatok szerkezetének ellenőrzése =====
//
// Két helyen fut:
//   • a frissítő script (bajnoksag-frissites.mjs) MIELŐTT felülírná a
//     bajnoksag-adatok.js-t – ha az MJSZ egyszer furcsa (pl. megváltozott
//     formátumú) választ ad, inkább marad a régi, jó adat;
//   • a weboldal-ellenőrzés (ellenorzes.mjs) minden pushnál, az aktuális és
//     az archivált szezonokra is.
//
// Szándékosan csak azt nézi, amire az oldal tényleg épít: ha ezek közül
// valami hiányzik vagy rossz típusú, az oldalon üres vagy hibás blokk lenne.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const SEASON = /^\d{4}-\d{4}$/;
const isStr = (v) => typeof v === "string" && v.trim() !== "";
const isInt = (v) => Number.isInteger(v) && v >= 0;
const scoreOk = (v) => v === null || v === undefined || isInt(v);
// Logó: helyi fájl (assets/…) vagy https-es link – más (pl. javascript:)
// nem kerülhet az oldalba
const logoOk = (v) => v === undefined || v === null || /^(assets\/[^"'<>\s]+|https:\/\/[^"'<>\s]+)$/.test(v);

export function validateData(leagues, stats) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);

  if (!leagues || typeof leagues !== "object" || Array.isArray(leagues)) {
    return ["LEAGUES: nem objektum"];
  }
  for (const [key, l] of Object.entries(leagues)) {
    const w = `LEAGUES.${key}`;
    if (!isStr(l.label)) err(w, "hiányzik a label");
    if (!SEASON.test(l.season || "")) err(w, `hibás szezon: ${l.season}`);
    if (!Array.isArray(l.matches)) err(w, "a matches nem tömb");
    (l.matches || []).forEach((m, i) => {
      const mw = `${w}.matches[${i}]`;
      if (!ISO_DATE.test(m.date || "")) err(mw, `hibás dátum: ${m.date}`);
      if (m.time !== undefined && !TIME.test(m.time)) err(mw, `hibás időpont: ${m.time}`);
      if (!isStr(m.opponent)) err(mw, "hiányzik az ellenfél neve");
      if (typeof m.home !== "boolean") err(mw, "a home nem logikai érték");
      if (!scoreOk(m.us) || !scoreOk(m.them)) err(mw, "hibás eredmény");
      if (!logoOk(m.logo)) err(mw, `hibás logó: ${m.logo}`);
    });
    if (!Array.isArray(l.groups)) err(w, "a groups nem tömb");
    (l.groups || []).forEach((g, i) => {
      const gw = `${w}.groups[${i}]`;
      if (!Array.isArray(g.standings)) return err(gw, "a standings nem tömb");
      g.standings.forEach((r, j) => {
        if (!isStr(r.team)) err(`${gw}.standings[${j}]`, "hiányzik a csapat neve");
        for (const f of ["gp", "w", "v", "gf", "ga", "pts"]) {
          if (r[f] !== undefined && !isInt(r[f])) err(`${gw}.standings[${j}]`, `hibás ${f}: ${r[f]}`);
        }
        if (!logoOk(r.logo)) err(`${gw}.standings[${j}]`, `hibás logó: ${r.logo}`);
      });
    });
    if (l.games !== undefined && !Array.isArray(l.games)) err(w, "a games nem tömb");
    (l.games || []).forEach((g, i) => {
      if (!ISO_DATE.test(g.date || "") || !isStr(g.home) || !isStr(g.away)) {
        err(`${w}.games[${i}]`, "hiányos meccs (dátum / csapatok)");
      }
    });
    Object.entries(l.teams || {}).forEach(([name, t]) => {
      if (!logoOk(t && t.logo)) err(`${w}.teams[${name}]`, `hibás logó: ${t.logo}`);
    });
  }

  if (stats !== undefined) {
    if (!Array.isArray(stats)) err("GAME_STATS", "nem tömb");
    (stats || []).forEach((g, i) => {
      if (!ISO_DATE.test(g.date || "") || !isStr(g.league) || !isStr(g.opponent)) {
        err(`GAME_STATS[${i}]`, "hiányos jegyzőkönyv (dátum / bajnokság / ellenfél)");
      }
    });
  }
  return errors;
}

// Egy generált adatfájl (bajnoksag-adatok.js vagy szezonok/<szezon>.js)
// betöltése egy külön objektumba
export function loadDataFile(src) {
  const window = {};
  new Function("window", src)(window);
  return { leagues: window.LEAGUES, stats: window.GAME_STATS };
}
