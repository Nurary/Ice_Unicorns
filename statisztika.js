// ===== Ice Unicorns – mérkőzés-statisztikák =====
//
// A felépítés MECCS-KÖZPONTÚ: egy meccs után egyben viszed fel az egész
// jegyzőkönyvet. Ebből számoljuk a játékosok szezonösszesítését (a kártyán
// ez látszik), és ugyanebből jön majd a meccsenkénti részletes bontás és a
// gól-/védésvideók helye is – tehát nem kell később átszervezni az adatokat.
//
// EGY MECCS:
//   date     – "2026-09-20" (ISO)
//   league   – "ob4d" | "ob4c"  (melyik csapat meccse)
//   opponent – ellenfél neve
//   home     – true = hazai
//   us/them  – végeredmény
//   skaters  – mezőnyjátékosok sorai, a JÁTÉKOS BECENEVÉVEL kulcsolva
//              (pontosan úgy, ahogy a team.js-ben a `nick` szerepel!)
//       g    – gól
//       a    – gólpassz (assziszt)
//       pim  – büntetőperc
//       pm   – plusz/mínusz (+2, -1, 0 …)
//       sog  – kapura lövés (elhagyható)
//   goalies  – kapusok sorai, szintén becenévvel kulcsolva
//       ga   – kapott gól
//       sv   – védés
//       min  – a jégen töltött perc (a kapott gól átlaghoz kell)
//       w    – true, ha ő volt a győztes kapus (elhagyható)
//
//   clips    – KÉSŐBBRE: gól- és védésvideók ehhez a meccshez (elhagyható).
//              Alakja:
//                { player: "Pitypang", type: "gol" | "vedes",
//                  time: "12:34", url: "https://…", note: "" }
//              A `player` a becenév – a játékos kártyáján, a meccsenkénti
//              bontásban (team.js) automatikusan megjelenik a linkje, amint
//              felkerül ide.
//
// Ha egy becenév elgépelt, a böngésző konzoljába figyelmeztetés kerül,
// hogy ne vesszen el csendben a statisztika.
const GAME_STATS = [];

const Stats = (function () {
  const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

  function games(leagueKey) {
    return GAME_STATS.filter((g) => !leagueKey || g.league === leagueKey);
  }

  // Egy játékos meccssorai – erre épül majd a meccsenkénti részletes nézet.
  function rowsOf(nick, leagueKey) {
    const out = [];
    games(leagueKey).forEach((g) => {
      const line = (g.skaters && g.skaters[nick]) || (g.goalies && g.goalies[nick]);
      if (line) out.push({ game: g, line });
    });
    return out.sort((a, b) => (a.game.date < b.game.date ? 1 : -1));
  }

  // Mezőnyjátékos szezonösszesítése
  function skater(nick, leagueKey) {
    const rows = games(leagueKey)
      .map((g) => g.skaters && g.skaters[nick])
      .filter(Boolean);

    if (!rows.length) {
      return { M: "–", G: "–", A: "–", P: "–", BP: "–", PM: "–", _empty: true };
    }

    const G = rows.reduce((s, r) => s + num(r.g), 0);
    const A = rows.reduce((s, r) => s + num(r.a), 0);
    const BP = rows.reduce((s, r) => s + num(r.pim), 0);
    const PM = rows.reduce((s, r) => s + num(r.pm), 0);

    return {
      M: String(rows.length),
      G: String(G),
      A: String(A),
      P: String(G + A),
      BP: String(BP),
      PM: (PM > 0 ? "+" : "") + PM,
    };
  }

  // Kapus szezonösszesítése
  function goalie(nick, leagueKey) {
    const rows = games(leagueKey)
      .map((g) => g.goalies && g.goalies[nick])
      .filter(Boolean);

    if (!rows.length) {
      return { M: "–", KG: "–", V: "–", SZ: "–", KGA: "–", SO: "–", _empty: true };
    }

    const KG = rows.reduce((s, r) => s + num(r.ga), 0);
    const V = rows.reduce((s, r) => s + num(r.sv), 0);
    const MIN = rows.reduce((s, r) => s + num(r.min), 0);
    const lovesek = V + KG; // kapura kapott lövés
    // Kapott gól átlag = kapott gól / 60 perc
    const KGA = MIN > 0 ? ((KG * 60) / MIN).toFixed(2) : "–";
    // Védési hatékonyság = védés / kapura lövés
    const SZ = lovesek > 0 ? ((V / lovesek) * 100).toFixed(1) + "%" : "–";
    const SO = rows.filter((r) => num(r.ga) === 0 && num(r.min) > 0).length;

    return {
      M: String(rows.length),
      KG: String(KG),
      V: String(V),
      SZ: SZ,
      KGA: KGA,
      SO: String(SO),
    };
  }

  // Elgépelt becenevek kiszűrése – csak fejlesztői figyelmeztetés
  function validate(knownNicks) {
    const known = new Set(knownNicks);
    const bad = new Set();
    GAME_STATS.forEach((g) => {
      Object.keys(g.skaters || {}).forEach((n) => { if (!known.has(n)) bad.add(n); });
      Object.keys(g.goalies || {}).forEach((n) => { if (!known.has(n)) bad.add(n); });
    });
    if (bad.size) {
      console.warn(
        "[statisztika] Ismeretlen becenév a GAME_STATS-ban, ezek a sorok nem " +
        "jelennek meg sehol: " + Array.from(bad).join(", ")
      );
    }
  }

  return { games, rowsOf, skater, goalie, validate };
})();
