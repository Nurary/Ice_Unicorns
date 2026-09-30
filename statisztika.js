// ===== Ice Unicorns – mérkőzés-statisztikák =====
//
// A meccsek jegyzőkönyvei AUTOMATIKUSAN jönnek: a scripts/bajnoksag-frissites.mjs
// minden lejátszott saját meccsünk jegyzőkönyvét lekéri az MJSZ API-jából, és
// a bajnoksag-adatok.js-be írja (window.GAME_STATS). Kézzel nem kell felvinni.
// Ebből számoljuk a játékosok szezonösszesítését (a kártyán ez látszik) és a
// meccsenkénti bontást.
//
// A játékosokat a team.js keretével párosítjuk: a polgári név (`name`), vagy
// ha az nincs, az egyértelmű mezszám (`num`) alapján. Aki így sem található,
// az a polgári nevével szerepel – a frissítés naplója figyelmeztet rá.
//
// EGY MECCS (generált):
//   id       – az MJSZ meccsazonosítója
//   date     – "2026-09-20" (ISO)
//   league   – "ob4d" | "ob4c"  (melyik csapat meccse)
//   opponent – ellenfél neve
//   home     – true = hazai
//   us/them  – végeredmény
//   skaters  – mezőnyjátékosok sorai, a JÁTÉKOS BECENEVÉVEL kulcsolva
//       g    – gól
//       a    – gólpassz (assziszt)
//       pim  – büntetőperc
//       pm   – plusz/mínusz (+2, -1, 0 …)
//       sog  – kapura lövés (csak ha vezették)
//   goalies  – kapusok sorai, szintén becenévvel kulcsolva
//       ga   – kapott gól
//       sv   – védés (csak ha a kapura lövéseket is vezették)
//       min  – a jégen töltött perc (a kapott gól átlaghoz kell)
//       w    – true, ha ő volt a győztes kapus
//
// GÓL- ÉS VÉDÉSVIDEÓK – ezeket továbbra is kézzel kell felvenni, az alábbi
// KLIPPEK tömbbe. A meccset a dátum és a bajnokság azonosítja:
//   { date: "2026-10-03", league: "ob4d", player: "Pitypang",
//     type: "gol" | "vedes", time: "12:34", url: "https://…", note: "" }
// A `player` a becenév – a meccs felugró ablakában és a játékos kártyáján
// a meccsenkénti bontásban automatikusan megjelenik a linkje.
//
// Ha egy becenév elgépelt, a böngésző konzoljába figyelmeztetés kerül,
// hogy ne vesszen el csendben a statisztika.
const KLIPPEK = [];

const GAME_STATS = ((typeof window !== "undefined" && window.GAME_STATS) || []).map((g) => {
  const clips = KLIPPEK.filter((c) => c.date === g.date && c.league === g.league);
  return clips.length ? Object.assign({}, g, { clips: clips }) : g;
});

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
    const MIN = rows.reduce((s, r) => s + num(r.min), 0);
    // Védést csak ott vezetnek, ahol a kapura lövéseket is számolják. A
    // hatékonyságot ezért csak azokból a meccsekből számoljuk, ahol van
    // védésszám – különben a hiányzó adat 0%-nak látszana.
    const svRows = rows.filter((r) => typeof r.sv === "number");
    const V = svRows.reduce((s, r) => s + r.sv, 0);
    const lovesek = V + svRows.reduce((s, r) => s + num(r.ga), 0); // kapura lövés
    // Kapott gól átlag = kapott gól / 60 perc
    const KGA = MIN > 0 ? ((KG * 60) / MIN).toFixed(2) : "–";
    // Védési hatékonyság = védés / kapura lövés
    const SZ = lovesek > 0 ? ((V / lovesek) * 100).toFixed(1) + "%" : "–";
    const SO = rows.filter((r) => num(r.ga) === 0 && num(r.min) > 0).length;

    return {
      M: String(rows.length),
      KG: String(KG),
      V: svRows.length ? String(V) : "–",
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
        "[statisztika] Ezek a játékosok nincsenek a team.js keretben, ezért a " +
        "statisztikájuk csak a meccsek jegyzőkönyvében látszik, a kártyákon nem " +
        "(töltsd ki a name mezőjüket): " + Array.from(bad).join(", ")
      );
    }
  }

  return { games, rowsOf, skater, goalie, validate };
})();
