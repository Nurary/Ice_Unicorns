// ===== Ice Unicorns – bajnokság megjelenítés =====
// Maguk az adatok a bajnoksag-adatok.js fájlban vannak (window.LEAGUES),
// azt a scripts/bajnoksag-frissites.mjs generálja az MJSZ nyilvános
// API-jából – kézzel nem kell szerkeszteni.
//
// Bajnokságonként külön blokk. A rendszer abból tudja, melyiket rajzolja,
// hogy a Bajnokság-panelen milyen data-league érték áll
// (ob4d.html → data-league="ob4d", ob4c.html → data-league="ob4c").
//
// Egy MECCS mezői:
//   date     – "2026-02-14" (ISO dátum; e szerint rendezünk)
//   time     – "18:30" (elhagyható)
//   opponent – az ellenfél neve
//   home     – true = hazai pálya, false = idegenben
//   venue    – helyszín (elhagyható)
//   logo     – ellenfél embléma URL-je (elhagyható, ha nincs)
//   us/them  – lőtt / kapott gól. Amíg null, a meccs még nem volt lejátszva.
//   ot       – true, ha hosszabbításban vagy szétlövésben dőlt el (elhagyható)
//
// Egy TABELLA-SOR mezői:
//   team – csapatnév, gp – lejátszott meccs
//   Nincs döntetlen: ami rendes játékidőben nem dől el, azt hosszabbítás
//   vagy szétlövés zárja le, és a pontozás is eszerint megy (3-2-1-0).
//   w   – győzelem rendes játékidőben (3 pont)
//   otw / sow – győzelem hosszabbításban / szétlövésben (2 pont)
//   otl / sol – vereség hosszabbításban / szétlövésben (1 pont)
//   v   – vereség rendes játékidőben (0 pont)
//   gf – lőtt gól, ga – kapott gól, pts – pont
//   logo – csapatembléma URL-je (elhagyható, ha nincs)
//   us: true – ez a mi sorunk, kiemelve jelenik meg
//
// A tabella két csoportra oszlik (groups: [{ name, standings }, ...]),
// mert az OB4D és az OB4C is A/B csoportban zajlik. A menetrend (matches)
// viszont csak a mi csapatunk meccseit tartalmazza – az az érdekes belőle.
//
// Amíg a listák üresek, az oldalon barátságos „hamarosan" üzenet látszik,
// tehát a szezon eleji üres tabella sem törik el.
const LEAGUES = (typeof window !== "undefined" && window.LEAGUES) || {};

(function () {
  const panels = document.querySelectorAll("[data-league]");
  if (!panels.length) return;

  const US = "Ice Unicorns";
  // data-league="mind" → mindkét bajnokság együtt (ezt a kezdőlap használja)
  const MIND = "mind";

  // "2026-02-14" → helyi idejű Date (a sima new Date(iso) UTC-t ért alatta,
  // ami negatív időzónában egy nappal korábbi dátumot mutatna)
  function parseDate(iso) {
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function fmtDate(iso) {
    return parseDate(iso).toLocaleDateString("hu-HU", {
      month: "short",
      day: "numeric",
    });
  }

  function fmtWeekday(iso) {
    return parseDate(iso).toLocaleDateString("hu-HU", { weekday: "short" });
  }

  const played = (m) => m.us !== null && m.us !== undefined &&
                        m.them !== null && m.them !== undefined;

  const RESULT_WORD = { gy: "Győzelem", v: "Vereség", d: "Döntetlen" };

  // Győzelem / döntetlen / vereség a saját szempontunkból
  function outcome(m) {
    if (m.us > m.them) return { key: "gy", label: "Gy" };
    if (m.us < m.them) return { key: "v", label: "V" };
    return { key: "d", label: "D" };
  }

  // A hosszabbításban és a szétlövésben született eredményt egy oszlopban
  // mutatjuk: a bajnokság pontozása szempontjából a kettő egyet ér
  // (2, illetve 1 pont), és így nem hízik hétoszlopossá a tabella.
  const otWins = (r) => (r.otw || 0) + (r.sow || 0);
  const otLosses = (r) => (r.otl || 0) + (r.sol || 0);

  // ---- Forma ----
  // A generált adat MINDEN meccset tartalmaz (league.games), nem csak a
  // mieinket, ezért bármelyik csapat legutóbbi eredményeit ki tudjuk rakni.
  const FORM_LEN = 5;

  const gamePlayed = (g) =>
    g.hs !== null && g.hs !== undefined && g.as !== null && g.as !== undefined;

  // Egy csapat utolsó néhány meccse, időrendben (a legrégebbi elöl).
  // Telt karika = rendes játékidőben dőlt el, üres = hosszabbítás/szétlövés.
  //
  // Csak az alapszakasz meccsei számítanak: a rájátszás párharcai külön
  // "csoportban" futnak (9-12., 13-16. stb.), és ha azokat is beleszámolnánk,
  // egy nyeretlen csapat mellett is zöld karikák jelennének meg – a tabella
  // számaihoz képest ez értelmezhetetlen lenne.
  function formOf(league, team, len) {
    const info = (league.teams || {})[team];
    const group = info ? info.group : null;
    return (league.games || [])
      .filter(
        (g) =>
          gamePlayed(g) &&
          (g.home === team || g.away === team) &&
          (!group || g.group === group)
      )
      .slice(-(len || FORM_LEN))
      .map((g) => {
        const home = g.home === team;
        const our = home ? g.hs : g.as;
        const their = home ? g.as : g.hs;
        const win = our > their;
        const opponent = home ? g.away : g.home;
        return {
          key: g.ot ? (win ? "hgy" : "hv") : win ? "gy" : "v",
          title:
            `${fmtDate(g.date)} · ${home ? "" : "@"}${opponent} ` +
            `${our}–${their}${g.ot ? " (h.u.)" : ""}`,
        };
      });
  }

  function formDots(entries) {
    if (!entries || !entries.length) return "";
    const dots = entries
      .map((e) => `<i class="fd ${e.key}" title="${e.title}"></i>`)
      .join("");
    return `<span class="form-dots" aria-label="Legutóbbi eredmények">${dots}</span>`;
  }

  // Egy csapat helyezése és tabellasora a saját csoportjában
  function standingOf(league, team) {
    for (const g of league.groups || []) {
      const sorted = (g.standings || []).slice().sort(standingsSort);
      const i = sorted.findIndex((r) => r.team === team);
      if (i >= 0) return { row: sorted[i], pos: i + 1, group: g.name };
    }
    return null;
  }

  // A tabella rendezése: pont, majd gólkülönbség szerint. Két helyen kell
  // (tabella + gyorsstatisztika), ezért közös.
  function standingsSort(a, b) {
    return (b.pts || 0) - (a.pts || 0) ||
      ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0));
  }

  // Egy meccs kezdő időpontja Date-ként. Ha nincs pontos idő megadva,
  // este 20:00-ra saccolunk (a legtöbb amatőr meccs esti).
  function matchStart(m) {
    const d = parseDate(m.date);
    if (m.time) {
      const [h, mi] = String(m.time).split(":").map(Number);
      d.setHours(h || 0, mi || 0, 0, 0);
    } else {
      d.setHours(20, 0, 0, 0);
    }
    return d;
  }

  function empty(text) {
    const p = document.createElement("p");
    p.className = "league-empty";
    p.textContent = text;
    return p;
  }

  // Kezdőbetűs korong azoknak a csapatoknak, amelyeknek nincs emblémája
  function teamChip(name) {
    return `<span class="team-chip" title="${name}">${(name || "?").charAt(0)}</span>`;
  }

  // Ha egy embléma nem jön be (az MJSZ-nél akad néhány halott link), a
  // kezdőbetűs korong lép a helyére. Ott használjuk, ahol a csapatot csak a
  // logó jelöli, és üresen maradna a helye.
  //
  // A betöltés már a src beállításakor elindul, tehát a hiba akár azelőtt
  // megtörténhet, hogy ideérnénk – ezért a figyelő mellett a már befejezett
  // (complete, de nulla széles) képeket is meg kell néznünk.
  function chipOnError(img) {
    const swap = () => {
      const span = document.createElement("span");
      span.className = "team-chip";
      span.title = img.alt;
      span.textContent = (img.alt || "?").charAt(0);
      img.replaceWith(span);
    };
    img.addEventListener("error", swap);
    if (img.complete && img.naturalWidth === 0) swap();
  }

  // Csapatembléma <img> – ha nincs logo mező, üres string (nem jelenik meg semmi)
  function teamLogo(url, extraClass) {
    if (!url) return "";
    const cls = "team-logo" + (extraClass ? " " + extraClass : "");
    return `<img class="${cls}" src="${url}" alt="" loading="lazy" onerror="this.remove()">`;
  }

  // Eredményjelző-oszlop egy csapatnak: kerek logó-jelvény, név, hazai/vendég.
  // Logó nélkül a név kezdőbetűje kerül a jelvénybe (CSS: data-init).
  const escHtml = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function boardTeam(logo, name, side) {
    return (
      `<span class="gm-team-logo" data-init="${escHtml(String(name).charAt(0))}">${teamLogo(logo, "gm-logo")}</span>` +
      `<span class="gm-team-name">${escHtml(name)}</span><span class="gm-team-side">${side}</span>`
    );
  }

  // ---- Következő meccs (kiemelt kártya) ----
  // A kezdőlapon mindkét bajnokság meccsei közül a legközelebbi kell, ezért
  // a meccsek mellé odatesszük, melyik bajnokságból valók.
  function matchesOf(key) {
    if (key === MIND) {
      return Object.keys(LEAGUES).reduce((all, k) => {
        const l = LEAGUES[k];
        return all.concat(
          (l.matches || []).map((m) => ({ m: m, label: l.label, key: k }))
        );
      }, []);
    }
    const l = LEAGUES[key];
    return l ? (l.matches || []).map((m) => ({ m: m, label: l.label, key: key })) : [];
  }

  function renderNext(host, key, label) {
    const upcoming = matchesOf(key)
      .filter((x) => !played(x.m))
      .sort((a, b) => parseDate(a.m.date) - parseDate(b.m.date))[0];

    if (!upcoming) {
      // A kezdőlapon egy üres kártya befejezetlennek hat – ott inkább
      // eltüntetjük az egész szakaszt.
      if (host.hasAttribute("data-hide-if-empty")) {
        const sec = host.closest("section") || host;
        sec.remove();
        return;
      }
      host.classList.add("is-empty");
      host.appendChild(
        empty(`Az ${label} következő fordulójának időpontja hamarosan kiderül. 🗓️`)
      );
      return;
    }

    const u = upcoming.m;
    // Csak akkor írjuk ki a bajnokságot, ha egyébként nem derülne ki
    const badge =
      (key === MIND ? `<span class="nm-league">${upcoming.label}</span>` : "") +
      (u.stage ? `<span class="nm-league is-stage">${u.stage}</span>` : "");
    const target = matchStart(u).getTime();
    // A gomb a helyszínhez navigál Google Maps-en – ha nincs megadva
    // helyszín, marad a kapcsolat oldal tartaléknak.
    const ctaHref = u.venue
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(u.venue + ", Magyarország")}`
      : "kapcsolat.html";
    const ctaTarget = u.venue ? ` target="_blank" rel="noopener"` : "";

    // Mit tudunk az ellenfélről? Helyezést csak akkor írunk ki, ha már
    // játszott – a szezon elején mindenki holtversenyben első, annak
    // semmi értelme nem lenne.
    const oppLeague = LEAGUES[upcoming.key];
    const oppStanding = oppLeague ? standingOf(oppLeague, u.opponent) : null;
    const oppForm = oppLeague ? formOf(oppLeague, u.opponent) : [];
    const oppPos =
      oppStanding && (oppStanding.row.gp || 0) > 0
        ? `<strong title="${oppStanding.group}">${oppStanding.pos}. helyezett</strong>`
        : "";
    const oppInfo =
      oppPos || oppForm.length
        ? `<p class="nm-form"><span>Az ellenfél</span>${oppPos}${formDots(oppForm)}</p>`
        : "";

    // Ugyanaz az eredményjelző-elrendezés, mint a jegyzőkönyv fejlécében:
    // mi balra, az ellenfél jobbra, középen a „VS”
    host.innerHTML = `
      <div class="nm-top">
        <span class="kicker">Következő meccs ${badge}</span>
        <span class="nm-date">${[fmtWeekday(u.date), fmtDate(u.date), u.time].filter(Boolean).join(" · ")}</span>
        ${u.venue ? `<span class="nm-venue">${escHtml(u.venue)}</span>` : ""}
      </div>
      <div class="nm-mid">
        <h2 class="nm-board">
          <span class="gm-team">${boardTeam("assets/logo/logo.jpg", "Ice Unicorns", u.home ? "hazai" : "vendég")}</span>
          <span class="nm-center"><span class="nm-vs">VS</span></span>
          <span class="gm-team">${boardTeam(u.logo, u.opponent, u.home ? "vendég" : "hazai")}</span>
        </h2>
        <div class="nm-count" data-countdown="${target}" role="timer" aria-label="Visszaszámlálás a meccsig">
          <div><strong data-cd="d">–</strong><span>nap</span></div>
          <div><strong data-cd="h">–</strong><span>óra</span></div>
          <div><strong data-cd="m">–</strong><span>perc</span></div>
          <div><strong data-cd="s">–</strong><span>mp</span></div>
        </div>
      </div>
      <div class="nm-side">
        ${oppInfo}
        <a href="${ctaHref}"${ctaTarget} class="btn btn-primary">Gyere el szurkolni</a>
      </div>`;
  }

  // ---- Élő visszaszámláló ----
  // Minden [data-countdown] elemet frissít (a cél időpont ezredmásodpercben
  // a data-countdown attribútumban ül), másodpercenként.
  function tickCountdowns() {
    const now = Date.now();
    let van = false;
    document.querySelectorAll("[data-countdown]").forEach((el) => {
      van = true;
      let diff = Number(el.dataset.countdown) - now;
      const live = diff <= 0;
      if (diff < 0) diff = 0;
      const s = Math.floor(diff / 1000);
      const set = (k, v) =>
        (el.querySelector('[data-cd="' + k + '"]').textContent =
          String(v).padStart(2, "0"));
      set("d", Math.floor(s / 86400));
      set("h", Math.floor((s % 86400) / 3600));
      set("m", Math.floor((s % 3600) / 60));
      set("s", s % 60);
      el.classList.toggle("is-live", live);
    });
    return van;
  }

  function startCountdowns() {
    if (!tickCountdowns()) return; // nincs mit számolni
    setInterval(tickCountdowns, 1000);
  }

  // ---- Meccs jegyzőkönyv popup ----
  // Egy meccssorra kattintva megnyílik, és a statisztika.js GAME_STATS-jából
  // (a `clips` mezővel együtt) építi fel: harmadok, meccsstatisztika,
  // gól- és kiállításnapló, valamint a sorok felállása.
  // Amíg egy meccshez nincs feltöltve jegyzőkönyv, barátságos üres állapotot mutat.
  const gmOverlay = document.createElement("div");
  gmOverlay.className = "gm-overlay";
  gmOverlay.innerHTML = `
    <div class="gm-card" role="dialog" aria-modal="true">
      <button class="gm-close" type="button" aria-label="Bezárás">×</button>
      <div class="gm-head">
        <span class="gm-date"></span>
        <span class="gm-venue"></span>
        <h3 class="gm-title">
          <span class="gm-team us"></span>
          <span class="gm-center"><span class="gm-score"></span><span class="gm-result"></span></span>
          <span class="gm-team them"></span>
        </h3>
        <div class="gm-periods"></div>
      </div>
      <div class="gm-body"></div>
    </div>`;
  document.body.appendChild(gmOverlay);

  const gmDate = gmOverlay.querySelector(".gm-date");
  const gmVenue = gmOverlay.querySelector(".gm-venue");
  const gmUs = gmOverlay.querySelector(".gm-team.us");
  const gmThem = gmOverlay.querySelector(".gm-team.them");
  const gmScore = gmOverlay.querySelector(".gm-score");
  const gmResult = gmOverlay.querySelector(".gm-result");
  const gmBody = gmOverlay.querySelector(".gm-body");
  const gmPers = gmOverlay.querySelector(".gm-periods");

  function closeGameModal() {
    gmOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  gmOverlay.querySelector(".gm-close").addEventListener("click", closeGameModal);
  gmOverlay.addEventListener("click", (e) => {
    if (e.target === gmOverlay) closeGameModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeGameModal();
  });

  // Egy gól-/védésvideó gombja egy jegyzőkönyv-sorban
  function gmClipBtn(c) {
    const isSave = c.type === "vedes";
    const icon = isSave ? "🧤" : "🥅";
    const title = (isSave ? "Védés" : "Gól") + (c.time ? " – " + c.time : "") + (c.note ? " (" + c.note + ")" : "");
    return `<a class="gm-clip" href="${c.url}" target="_blank" rel="noopener" title="${title}">${icon}${c.time ? " " + c.time : ""}</a>`;
  }

  function gmRow(nick, statText, clips) {
    const clipsHtml = clips.length ? `<div class="gm-clips">${clips.map(gmClipBtn).join("")}</div>` : "";
    return `
      <div class="gm-row">
        <span class="gm-nick">${nick}</span>
        <span class="gm-stat">${statText}</span>
        ${clipsHtml}
      </div>`;
  }

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sum = (arr) => (arr || []).reduce((s, n) => s + (n || 0), 0);
  const perLabel = (p) => (p === "OT" ? "Hosszabbítás" : p === "SO" ? "Szétlövés" : p + ". harmad");

  // A team.js keretéből a játékos saját fotója (ha van) – a sorok
  // korongjaihoz. Ha nincs, az MJSZ-es profilképét használjuk.
  const rosterPhoto = (() => {
    const map = {};
    if (typeof TEAMS !== "undefined") {
      Object.values(TEAMS).forEach((t) =>
        (t.zones || []).forEach((z) => (z.players || []).forEach((p) => { if (p.photo) map[p.nick] = p.photo; }))
      );
    }
    return (nick) => map[nick] || null;
  })();

  // A komoly csapatoknál (team.js: komoly: true) a jegyzőkönyvben is a
  // polgári név látszik. Az openGameModal állítja be az adott bajnoksághoz.
  let gmName = (nick) => nick;
  function namesFor(leagueKey) {
    const team = typeof TEAMS !== "undefined" ? TEAMS[leagueKey] : null;
    if (!team || !team.komoly) return (nick) => nick;
    const map = {};
    (team.zones || []).forEach((z) => (z.players || []).forEach((p) => { if (p.name) map[p.nick] = p.name; }));
    return (nick) => map[nick] || nick;
  }

  // Fejléc alatti harmad-bontás: „1–4 · 1–1 · 1–2”
  function gmPeriods(record) {
    if (!record || !(record.periods || []).length) return "";
    return record.periods
      .map((p) => {
        const cls = p.us > p.them ? " won" : p.us < p.them ? " lost" : "";
        const lbl = p.p === "OT" ? "H" : p.p === "SO" ? "SZL" : p.p + ".";
        return `<span class="gm-per${cls}"><small>${lbl}</small>${p.us}–${p.them}</span>`;
      })
      .join("");
  }

  // „Meccs számokban” – egymással szembeállított sávok (mi balra, ők jobbra),
  // az állás alakulása időben, és néhány érdekesség a jegyzőkönyvből
  const pct = (a, b) => (b > 0 ? (a / b) * 100 : null);
  const fmtPct = (v) => v.toFixed(1).replace(".", ",") + "%";
  const toSec = (t) => {
    const [m, s] = String(t || "").split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  };
  const fmtSec = (sec) => Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0");

  function gmCompare(record) {
    const ev = record.events || [];
    const goals = ev.filter((e) => e.kind === "gol");
    const shotsUs = record.shots ? sum(record.shots.us) : 0;
    const shotsThem = record.shots ? sum(record.shots.them) : 0;
    const ourGk = Object.values(record.goalies || {}).filter((l) => typeof l.sv === "number");
    const ourSv = ourGk.reduce((s, l) => s + l.sv, 0);

    // [címke, mi, ők, kiírás(mi), kiírás(ők)]
    const rows = [];
    if (record.shots) {
      rows.push(["Kapura lövés", shotsUs, shotsThem]);
      const a = pct(record.us, shotsUs);
      const b = pct(record.them, shotsThem);
      if (a !== null && b !== null) rows.push(["Lövéshatékonyság", a, b, fmtPct(a), fmtPct(b)]);
    }
    if (ourGk.length && record.oppGk) {
      const a = pct(ourSv, ourSv + record.them);
      const b = pct(record.oppGk.sv, record.oppGk.sv + record.oppGk.ga);
      if (a !== null && b !== null) rows.push(["Védési hatékonyság", a, b, fmtPct(a), fmtPct(b)]);
    }
    if (ev.length) {
      const pim = (us) => ev.filter((e) => e.kind === "kiall" && e.us === us).reduce((s, e) => s + (e.min || 0), 0);
      rows.push(["Kiállítás (perc)", pim(true), pim(false)]);
    }

    const bars = rows
      .map(([label, us, them, usTxt, themTxt]) => {
        const tot = us + them || 1;
        return `
        <div class="gm-cmp">
          <b class="gm-cmp-us">${usTxt ?? us}</b>
          <span class="gm-cmp-lbl">${label}</span>
          <b class="gm-cmp-them">${themTxt ?? them}</b>
          <div class="gm-cmp-bar"><i style="width:${(us / tot) * 100}%"></i></div>
        </div>`;
      })
      .join("");

    // Lövések harmadonként
    let perShots = "";
    if (record.shots && record.shots.us.length > 1) {
      perShots = `<div class="gm-split-h">Kapura lövés harmadonként</div><div class="gm-pershots">${record.shots.us
        .map((n, i) => {
          const p = (record.periods || [])[i];
          const lbl = p ? (p.p === "OT" ? "H" : p.p + ".") : i + 1 + ".";
          return `<span><small>${lbl} harmad</small><b>${n}–${record.shots.them[i] ?? 0}</b></span>`;
        })
        .join("")}</div>`;
    }

    // Az állás alakulása: mennyi ideig vezettünk / volt döntetlen / voltunk hátrányban
    let split = "";
    if (goals.length && goals.every((g) => g.score)) {
      const end = Math.max(3600, ...ev.map((e) => toSec(e.t)));
      const time = { lead: 0, tie: 0, trail: 0 };
      let at = 0;
      let diff = 0;
      goals.forEach((g) => {
        const t = toSec(g.t);
        time[diff > 0 ? "lead" : diff < 0 ? "trail" : "tie"] += t - at;
        at = t;
        diff = g.score[0] - g.score[1];
      });
      time[diff > 0 ? "lead" : diff < 0 ? "trail" : "tie"] += end - at;
      const seg = (k) => (time[k] > 0 ? `<i class="${k}" style="flex:${time[k]}"></i>` : "");
      split = `
        <div class="gm-split-h">Az állás alakulása</div>
        <div class="gm-split">${seg("lead")}${seg("tie")}${seg("trail")}</div>
        <div class="gm-split-lg">
          <span class="lead">Vezettünk <b>${fmtSec(time.lead)}</b></span>
          <span class="tie">Döntetlen <b>${fmtSec(time.tie)}</b></span>
          <span class="trail">Hátrányban <b>${fmtSec(time.trail)}</b></span>
        </div>`;
    }

    // Érdekességek
    const facts = [];
    if (record.pp) {
      facts.push(
        `Emberelőny: <b>${record.pp.g}/${record.pp.n}</b>` + (record.pp.t ? ` (${fmtSec(record.pp.t)} perc)` : "")
      );
      facts.push(`Emberhátrány kivédve: <b>${record.pk.n - record.pk.ga}/${record.pk.n}</b>`);
    }
    const ourGoals = goals.filter((g) => g.us);
    if (ourGoals.length) {
      facts.push(`Gólpasszos gólunk: <b>${ourGoals.filter((g) => (g.a || []).length).length}/${ourGoals.length}</b>`);
    }
    if (goals.length) {
      const first = goals[0];
      facts.push(`Első gól: <b>${first.us ? "a miénk" : "az ellenfélé"}</b> (${esc(first.t)})`);
    }
    // Leggyorsabb válaszunk egy kapott gólra
    let best = null;
    goals.forEach((g, i) => {
      const prev = goals[i - 1];
      if (g.us && prev && !prev.us) {
        const gap = toSec(g.t) - toSec(prev.t);
        if (gap >= 0 && (!best || gap < best.gap)) best = { gap, g };
      }
    });
    if (best && best.gap <= 120) {
      facts.push(`Válaszgól: <b>${best.gap} mp-cel</b> a kapott gól után – ${esc(gmName(best.g.who))}`);
    }

    if (!bars && !split && !facts.length) return "";
    return `<div class="gm-section"><h4>Meccs számokban</h4>${bars}${perShots}${split}${
      facts.length ? `<div class="gm-facts">${facts.map((f) => `<span>${f}</span>`).join("")}</div>` : ""
    }</div>`;
  }

  // Gól- és kiállításnapló harmadonként, futó állással
  function gmTimeline(record, clips) {
    const ev = record.events || [];
    if (!ev.length) return "";
    const pers = [];
    ev.forEach((e) => { if (!pers.includes(e.per)) pers.push(e.per); });
    const perScore = {};
    (record.periods || []).forEach((p) => (perScore[p.p] = `${p.us}–${p.them}`));

    const item = (e) => {
      const side = e.us ? "us" : "them";
      const num = e.num != null ? `<span class="gm-ev-num">#${e.num}</span>` : "";
      if (e.kind === "kiall") {
        return `
          <li class="gm-ev pen ${side}">
            <span class="gm-ev-t">${esc(e.t)}</span>
            <span class="gm-ev-ic" aria-hidden="true">⏱</span>
            <span class="gm-ev-txt"><b>${esc(e.us ? gmName(e.who) : e.who) || "Csapatbüntetés"}</b>${num}
              <small>${e.min} perc${e.cause ? " · " + esc(e.cause) : ""}</small></span>
          </li>`;
      }
      const tags = [];
      if (e.adv && /^PP/.test(e.adv)) tags.push("emberelőny");
      else if (e.adv && /^SH/.test(e.adv)) tags.push("emberhátrány");
      if (e.en) tags.push("üres kapu");
      if (e.ps) tags.push("büntetőlövés");
      if (e.gwg) tags.push("győztes gól");
      const assists = (e.a || []).map((n) => esc(e.us ? gmName(n) : n)).join(", ");
      const vids = e.us
        ? clips.filter((c) => c.type === "gol" && c.player === e.who && (!c.time || c.time === e.t)).map(gmClipBtn).join("")
        : "";
      return `
        <li class="gm-ev goal ${side}">
          <span class="gm-ev-t">${esc(e.t)}</span>
          <span class="gm-ev-ic" aria-hidden="true">${e.us ? "🦄" : "🥅"}</span>
          <span class="gm-ev-txt"><b>${esc(e.us ? gmName(e.who) : e.who)}</b>${num}
            <small>${assists ? "Assz.: " + assists : "önálló gól"}${tags.length ? " · " + tags.join(" · ") : ""}</small>
            ${vids ? `<span class="gm-clips">${vids}</span>` : ""}</span>
          ${e.score ? `<span class="gm-ev-sc">${e.score[0]}–${e.score[1]}</span>` : ""}
        </li>`;
    };

    return `<div class="gm-section"><h4>Gólok és kiállítások</h4>${pers
      .map(
        (p) => `
        <div class="gm-period">
          <div class="gm-period-h"><span>${perLabel(p)}</span>${perScore[p] ? `<b>${perScore[p]}</b>` : ""}</div>
          <ol class="gm-evs">${ev.filter((e) => e.per === p).map(item).join("")}</ol>
        </div>`
      )
      .join("")}</div>`;
  }

  // Egy játékos korongja a sorok nézetben
  function gmPuck(p, line) {
    const photo = rosterPhoto(p.nick) || p.pic;
    const face = photo
      ? `<img src="${esc(photo)}" alt="" loading="lazy" onerror="this.remove()"><span class="gm-pk-num">${p.num}</span>`
      : `<span class="gm-pk-only">${p.num}</span>`;
    const badges = [];
    if (line) {
      if (line.g) badges.push(`<b class="gm-bd g" title="${line.g} gól">${line.g} G</b>`);
      if (line.a) badges.push(`<b class="gm-bd a" title="${line.a} gólpassz">${line.a} A</b>`);
      if (line.pim) badges.push(`<b class="gm-bd p" title="${line.pim} büntetőperc">${line.pim}'</b>`);
    }
    return `
      <div class="gm-pk${line && (line.g || line.a) ? " hot" : ""}">
        <span class="gm-pk-face">${face}${p.cap ? `<span class="gm-pk-cap">${p.cap}</span>` : ""}</span>
        <span class="gm-pk-nick">${esc(gmName(p.nick))}</span>
        ${badges.length ? `<span class="gm-bds">${badges.join("")}</span>` : ""}
      </div>`;
  }

  // Felállás: kapus(ok), majd soronként a csatárhármas és a védőpár
  function gmLines(record) {
    const lines = record.lines || [];
    if (!lines.length) return "";
    const order = (list, pos) => pos.map((k) => list.find((p) => p.pos === k)).filter(Boolean);
    const sk = record.skaters || {};

    const html = lines
      .map((ln) => {
        if (ln.row === "gk") {
          return ln.players
            .map((p) => {
              const g = (record.goalies || {})[p.nick];
              const stat = g
                ? `${typeof g.sv === "number" ? `<b>${g.sv}</b> védés · ` : ""}<b>${g.ga}</b> kapott gól` +
                  (g.min ? ` · ${g.min} perc` : "")
                : "nem lépett jégre";
              return `
                <div class="gm-line gk">
                  <span class="gm-line-h">Kapus</span>
                  <div class="gm-gk">${gmPuck(p)}<span class="gm-gk-stat">${stat}</span></div>
                </div>`;
            })
            .join("");
        }
        const fwd = order(ln.players, ["lw", "c", "rw"]);
        const def = order(ln.players, ["ld", "rd"]);
        const rest = ln.players.filter((p) => !fwd.includes(p) && !def.includes(p));
        const g = ln.players.reduce((s, p) => s + ((sk[p.nick] || {}).g || 0), 0);
        const pts = ln.players.reduce((s, p) => s + ((sk[p.nick] || {}).g || 0) + ((sk[p.nick] || {}).a || 0), 0);
        const row = (ps, cls) =>
          ps.length ? `<div class="gm-line-row ${cls}">${ps.map((p) => gmPuck(p, sk[p.nick])).join("")}</div>` : "";
        return `
          <div class="gm-line">
            <span class="gm-line-h">${esc(ln.row)}. sor${g || pts ? `<em>${g} gól · ${pts} pont</em>` : ""}</span>
            ${row(fwd.concat(rest), "fwd")}${row(def, "def")}
          </div>`;
      })
      .join("");
    return `<div class="gm-section"><h4>Felállás</h4><div class="gm-lines">${html}</div></div>`;
  }

  // A régi (sorok és gólnapló nélküli) jegyzőkönyvekhez: egyszerű listák
  function gmSimple(record) {
    const clips = record.clips || [];
    const scorers = Object.entries(record.skaters || {})
      .filter(([, l]) => l.g || l.a)
      .sort((a, b) => (b[1].g || 0) - (a[1].g || 0));
    const goalies = Object.entries(record.goalies || {});
    let html = "";
    if (scorers.length) {
      html += `<div class="gm-section"><h4>Gólszerzők</h4>${scorers
        .map(([nick, l]) =>
          gmRow(
            esc(gmName(nick)),
            `${l.g || 0} gól · ${l.a || 0} assziszt`,
            clips.filter((c) => c.player === nick && c.type === "gol")
          )
        )
        .join("")}</div>`;
    }
    if (goalies.length) {
      html += `<div class="gm-section"><h4>Kapusok</h4>${goalies
        .map(([nick, l]) =>
          gmRow(
            esc(gmName(nick)),
            `${l.ga ?? 0} kapott gól` + (typeof l.sv === "number" ? ` · ${l.sv} védés` : ""),
            clips.filter((c) => c.player === nick && c.type === "vedes")
          )
        )
        .join("")}</div>`;
    }
    return html;
  }

  // Összefoglaló: a mi pontszerzőink és a kapus egy pillantásra
  function gmLeaders(record) {
    const sk = Object.entries(record.skaters || {})
      .filter(([, l]) => l.g || l.a)
      .sort((a, b) => (b[1].g || 0) + (b[1].a || 0) - ((a[1].g || 0) + (a[1].a || 0)) || (b[1].g || 0) - (a[1].g || 0));
    const gk = Object.entries(record.goalies || {});
    if (!sk.length && !gk.length) return "";
    const chip = (name, stat) => `<span class="gm-ldr"><b>${esc(gmName(name))}</b>${stat}</span>`;
    return `<div class="gm-section"><h4>Pontszerzőink</h4><div class="gm-ldrs">${
      sk.map(([n, l]) => chip(n, [l.g ? l.g + " G" : "", l.a ? l.a + " A" : ""].filter(Boolean).join(" · "))).join("") ||
      '<span class="gm-ldr-none">Ezen a meccsen nem szereztünk pontot.</span>'
    }</div>${
      gk.length
        ? `<h4>Kapus</h4><div class="gm-ldrs">${gk
            .map(([n, l]) => chip(n, (typeof l.sv === "number" ? l.sv + " védés · " : "") + (l.ga ?? 0) + " kapott gól"))
            .join("")}</div>`
        : ""
    }</div>`;
  }

  // Fülsor és panelek. Egyetlen fülnél nincs fülsor, csak a tartalom.
  function gmTabs(tabs) {
    if (!tabs.length) return "";
    if (tabs.length === 1) return tabs[0].html;
    const bar = tabs
      .map(
        (t, i) =>
          `<button type="button" role="tab" class="gm-tab" id="gm-tab-${t.id}" aria-controls="gm-panel-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${t.label}</button>`
      )
      .join("");
    const panels = tabs
      .map(
        (t, i) =>
          `<div class="gm-panel" role="tabpanel" id="gm-panel-${t.id}" aria-labelledby="gm-tab-${t.id}"${i === 0 ? "" : " hidden"}>${t.html}</div>`
      )
      .join("");
    return `<div class="gm-tabs" role="tablist" aria-label="Jegyzőkönyv">${bar}</div>${panels}`;
  }

  function gmSelectTab(btn, focus) {
    const card = gmOverlay.querySelector(".gm-card");
    gmBody.querySelectorAll(".gm-tab").forEach((b) => {
      const on = b === btn;
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
      gmBody.querySelector("#" + b.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) btn.focus();
    // Fülváltáskor a panel elejére ugrunk (ha a fülsor már feljebb görgött)
    const bar = gmBody.querySelector(".gm-tabs");
    if (card.scrollTop > bar.offsetTop) card.scrollTop = bar.offsetTop;
  }

  gmBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".gm-tab");
    if (btn) gmSelectTab(btn);
  });
  // Nyilakkal is lehet lépkedni a fülek között
  gmBody.addEventListener("keydown", (e) => {
    const btn = e.target.closest(".gm-tab");
    if (!btn || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    const all = [...gmBody.querySelectorAll(".gm-tab")];
    const i = all.indexOf(btn) + (e.key === "ArrowRight" ? 1 : -1);
    gmSelectTab(all[(i + all.length) % all.length], true);
    e.preventDefault();
  });

  function openGameModal(leagueKey, m) {
    const record =
      typeof GAME_STATS !== "undefined"
        ? GAME_STATS.find((g) => g.league === leagueKey && g.date === m.date && g.opponent === m.opponent)
        : null;

    // Eredményjelző: mi mindig balra, az ellenfél jobbra, köztük az eredmény
    gmDate.textContent = [fmtWeekday(m.date), fmtDate(m.date), m.time].filter(Boolean).join(" · ");
    gmVenue.textContent = m.venue || "";
    gmUs.innerHTML = boardTeam("assets/logo/logo.jpg", "Ice Unicorns", m.home ? "hazai" : "vendég");
    gmThem.innerHTML = boardTeam(m.logo, m.opponent, m.home ? "vendég" : "hazai");
    if (played(m)) {
      const o = outcome(m);
      gmScore.innerHTML = `<b>${m.us}</b><i>–</i><b>${m.them}</b>`;
      gmResult.className = "gm-result " + o.key;
      gmResult.textContent =
        { gy: "Győzelem", v: "Vereség", d: "Döntetlen" }[o.key] + (m.ot ? " · h.u." : "");
    } else {
      gmScore.innerHTML = `<span class="gm-vs">vs</span>`;
      gmResult.className = "gm-result";
      gmResult.textContent = "Közelgő meccs";
    }
    gmPers.innerHTML = gmPeriods(record);
    gmName = namesFor(leagueKey);

    let html = "";
    if (record && (record.lines || record.events)) {
      // Részletes jegyzőkönyv: fülekre bontva, hogy ne egy hosszú lista legyen
      const clips = record.clips || [];
      const tabs = [
        { id: "osszegzes", label: "Összefoglaló", html: gmCompare(record) + gmLeaders(record) },
        { id: "naplo", label: "Meccsnapló", html: gmTimeline(record, clips) },
        { id: "felallas", label: "Felállás", html: gmLines(record) },
        {
          id: "videok",
          label: "Videók",
          html: clips.length
            ? `<div class="gm-section"><h4>Videók</h4>${clips
                .map((c) => gmRow(esc(gmName(c.player)), c.type === "vedes" ? "védés" : "gól", [c]))
                .join("")}</div>`
            : "",
        },
      ].filter((t) => t.html);
      html = gmTabs(tabs);
    } else if (record) {
      html = gmSimple(record);
    }

    gmBody.innerHTML =
      html ||
      (played(m)
        ? `<p class="gm-empty">A jegyzőkönyv ehhez a meccshez még nem érkezett meg. 📋</p>`
        : `<p class="gm-empty">A meccs után itt lesz a jegyzőkönyv: eredmény, gólok és felállás. 🏒</p>`);

    gmOverlay.classList.add("open");
    gmOverlay.querySelector(".gm-card").scrollTop = 0;
    document.body.style.overflow = "hidden";
  }

  // ---- Menetrend és eredmények ----
  function renderMatches(host, league, leagueKey) {
    if (!league.matches.length) {
      host.appendChild(empty("Amint kijön a menetrend, itt látod majd a fordulókat. 🏒"));
      return;
    }

    // Elöl a közelgő meccsek (a legközelebbivel kezdve), utána a lejátszottak
    // a legfrissebbtől visszafelé.
    const byDate = (a, b) => parseDate(a.date) - parseDate(b.date);
    const upcoming = league.matches.filter((m) => !played(m)).sort(byDate);
    const done = league.matches.filter(played).sort((a, b) => byDate(b, a));
    const row = (m) => {
      const li = document.createElement("li");
      li.className = "match-row" + (played(m) ? "" : " upcoming");
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", "Jegyzőkönyv: Ice Unicorns – " + m.opponent);

      // Az eredmény-címke szóval áll: a „V” betű a vasárnapot is jelölhetné
      const right = played(m)
        ? `<span class="match-score">${m.us}–${m.them}${
            m.ot ? '<span class="match-ot">h.u.</span>' : ""
          }</span>
           <span class="result-pill ${outcome(m).key}">${RESULT_WORD[outcome(m).key]}</span>`
        : `<span class="match-time">${m.time || "–"}</span>`;

      li.innerHTML = `
        <span class="match-date">
          <span class="md-wd">${fmtWeekday(m.date)}</span>
          <span class="md-d">${fmtDate(m.date)}</span>
        </span>
        <span class="match-teams">
          <span class="match-opp">${teamLogo(m.logo)}${m.opponent}</span>
          <span class="match-where">${m.stage ? m.stage + " · " : ""}${m.home ? "hazai" : "idegenben"}</span>
        </span>
        <span class="match-right">${right}</span>`;
      li.addEventListener("click", () => openGameModal(leagueKey, m));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openGameModal(leagueKey, m);
        }
      });
      return li;
    };

    const section = (title, list) => {
      if (!list.length) return;
      const h = document.createElement("h3");
      h.className = "lg-sub";
      h.innerHTML = `${title}<span>${list.length}</span>`;
      const ul = document.createElement("ul");
      ul.className = "match-list";
      list.forEach((m) => ul.appendChild(row(m)));
      host.appendChild(h);
      host.appendChild(ul);
    };

    section("Következő meccseink", upcoming);
    section("Lejátszott meccsek", done);
  }

  // ---- Tabella ----
  // A bajnokság A/B csoportra oszlik, ezért csoportonként külön táblázat
  // jelenik meg, saját címmel.
  function renderStandingsGroup(host, group, league) {
    const rows = group.standings.slice().sort(standingsSort);
    // A formaoszlop csak akkor kerül ki, ha van már lejátszott meccs.
    const anyForm = !group.noForm && rows.some((r) => (r.gp || 0) > 0);

    if (group.name) {
      const title = document.createElement("h3");
      title.className = "standings-group-title";
      title.textContent = group.name;
      host.appendChild(title);
    }

    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    const table = document.createElement("table");
    table.className = "standings";
    table.innerHTML = `
      <thead>
        <tr>
          <th class="c-pos">#</th>
          <th class="c-team">Csapat</th>
          <th title="Lejátszott meccs">M</th>
          <th title="Győzelem rendes játékidőben">Gy</th>
          <th class="c-ot" title="Győzelem hosszabbításban vagy szétlövésben">H.Gy</th>
          <th class="c-ot" title="Vereség hosszabbításban vagy szétlövésben">H.V</th>
          <th title="Vereség rendes játékidőben">V</th>
          <th title="Lőtt és kapott gól">LG–KG</th>
          <th class="c-pts" title="Pont">P</th>
          ${anyForm ? '<th class="c-form" title="Az utolsó öt meccs">Forma</th>' : ""}
        </tr>
      </thead>
      <tbody></tbody>`;

    const tbody = table.querySelector("tbody");
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      // A saját sorunkat vagy az us jelölő, vagy a csapatnév alapján emeljük ki
      if (r.us || r.team === US) tr.className = "us";
      tr.innerHTML = `
        <td class="c-pos">${i + 1}</td>
        <td class="c-team"><span class="team-cell">${teamLogo(r.logo)}${r.team}</span>${
          anyForm ? `<span class="team-form">${formDots(formOf(league, r.team))}</span>` : ""
        }</td>
        <td>${r.gp ?? "–"}</td>
        <td>${r.w ?? "–"}</td>
        <td class="c-ot">${otWins(r)}</td>
        <td class="c-ot">${otLosses(r)}</td>
        <td>${r.v ?? "–"}</td>
        <td>${(r.gf ?? "–") + "–" + (r.ga ?? "–")}</td>
        <td class="c-pts">${r.pts ?? "–"}</td>
        ${anyForm ? `<td class="c-form">${formDots(formOf(league, r.team))}</td>` : ""}`;
      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    host.appendChild(wrap);
  }

  // Csoportváltó gombsor (Tabella és Fordulók fül). A mi csoportunk áll
  // elöl, és alapból az van kiválasztva. A gombra
  // kattintva a draw(csoport) rajzolja újra a tartalmat.
  function groupSwitch(host, league, groupKeys, draw) {
    const names = {};
    (league.groups || []).forEach((g) => (names[g.group] = g.name || g.group + " csoport"));
    const keys = groupKeys
      .filter((g) => g === league.ourGroup)
      .concat(groupKeys.filter((g) => g !== league.ourGroup).sort());

    const body = document.createElement("div");
    if (keys.length > 1) {
      const sw = document.createElement("div");
      sw.className = "gr-switch";
      sw.setAttribute("role", "group");
      sw.setAttribute("aria-label", "Csoport");
      sw.innerHTML = keys
        .map(
          (g, i) =>
            `<button type="button" data-group="${g}" aria-pressed="${i === 0}">${names[g] || g + " csoport"}</button>`
        )
        .join("");
      sw.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-group]");
        if (!btn) return;
        sw.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        body.innerHTML = "";
        draw(body, btn.dataset.group);
      });
      host.appendChild(sw);
    }
    host.appendChild(body);
    draw(body, keys[0] || league.ourGroup);
  }

  function renderStandings(host, league) {
    const groups = (league.groups || []).filter((g) => g.standings && g.standings.length);
    if (!groups.length) {
      host.appendChild(empty("A tabella a szezon rajtja után jelenik meg. 📊"));
      return;
    }

    groupSwitch(
      host,
      league,
      groups.map((g) => g.group),
      (body, key) => {
        const g = groups.find((x) => x.group === key) || groups[0];
        // A címet a váltó már mutatja, ezért itt nem ismételjük
        renderStandingsGroup(body, Object.assign({}, g, { name: "" }), league);
      }
    );

    const legend = document.createElement("p");
    legend.className = "lg-legend";
    legend.innerHTML =
      "<b>M</b> meccs · <b>Gy</b> győzelem · <b>H.Gy / H.V</b> győzelem / vereség hosszabbításban vagy szétlövésben · " +
      "<b>V</b> vereség · <b>LG–KG</b> lőtt–kapott gól · <b>P</b> pont" +
      (groups.some((g) => g.standings.some((r) => (r.gp || 0) > 0))
        ? " · <b>Forma</b> az utolsó öt meccs (zöld: győzelem, piros: vereség; telt: rendes játékidő, üres: hosszabbítás)"
        : "");
    host.appendChild(legend);
  }

  // ---- A csoport fordulói ----
  // A saját csoportunk meccsei – nemcsak a mieink, hanem a riválisoké is.
  // Elsősorban a már lejátszottak érdekesek (a legfrissebbel elöl), de amíg
  // azokból nincs elég, a soron következő fordulókkal töltjük fel a listát.
  // Így a szezon rajtja előtt is van mit mutatni.
  // Hány közelgő meccs látszik alapból – a többi lenyitható
  const GROUP_UPCOMING_LEN = 8;
  // Hány legutóbbi meccsnap eredménye látszik alapból
  const GROUP_RECENT_DAYS = 3;

  function renderGroupResults(host, league) {
    // Csak az alapszakasz csoportjai (A, B) – a helyosztók a Rájátszás fülön vannak
    const base = (league.groups || []).map((g) => g.group);
    const present = [...new Set((league.games || []).map((g) => g.group).filter((g) => g && base.includes(g)))];
    groupSwitch(host, league, present, (body, key) => drawGroupResults(body, league, key));
  }

  function drawGroupResults(host, league, group) {
    host.innerHTML = "";
    const ours = (league.games || []).filter((g) => (!group || g.group === group) && (!g.stage || g.stage === "Helyosztó"));
    const byDate = (a, b) => parseDate(a.date) - parseDate(b.date);
    const done = ours.filter(gamePlayed).sort((a, b) => byDate(b, a));
    const upcoming = ours.filter((g) => !gamePlayed(g)).sort(byDate);

    if (!done.length && !upcoming.length) {
      host.appendChild(empty("A csoport sorsolása hamarosan érkezik. 🗓️"));
      return;
    }

    const teams = league.teams || {};
    const logoOf = (name) => teamLogo(teams[name] && teams[name].logo);

    const row = (g) => {
      const mine = g.home === US || g.away === US;
      const isDone = gamePlayed(g);
      const homeWon = isDone && g.hs > g.as;
      // Lejátszott meccsnél az eredmény, előtte a kezdés ideje áll
      // ugyanott – ha még az sincs kiírva, egy halvány „vs”.
      const middle = isDone
        ? `${g.hs}–${g.as}${g.ot ? '<span class="match-ot">h.u.</span>' : ""}`
        : g.time || "vs";
      return `
        <div class="gr-row${mine ? " is-us" : ""}${isDone ? "" : " upcoming"}">
          <span class="gr-team gr-home${homeWon ? " won" : ""}">
            <span class="gr-name">${g.home}</span>${logoOf(g.home)}
          </span>
          <span class="gr-score">${middle}</span>
          <span class="gr-team gr-away${isDone && !homeWon ? " won" : ""}">
            ${logoOf(g.away)}<span class="gr-name">${g.away}</span>
          </span>
        </div>`;
    };

    // Meccsnaponként egy fejléc („Szo · okt. 3.”), alatta az aznapi meccsek
    const byDay = (list) => {
      const days = [];
      list.forEach((g) => {
        const last = days[days.length - 1];
        if (last && last.date === g.date) last.games.push(g);
        else days.push({ date: g.date, games: [g] });
      });
      return days
        .map(
          (d) => `
          <div class="gr-day">
            <div class="gr-day-h">${fmtWeekday(d.date)} · ${fmtDate(d.date)}</div>
            ${d.games.map(row).join("")}
          </div>`
        )
        .join("");
    };

    let html = "";
    if (done.length) {
      // Alapból csak az utolsó néhány meccsnap látszik, a régebbiek lenyithatók –
      // így a szezon végén sem lesz végtelen hosszú a lista
      const days = [...new Set(done.map((g) => g.date))];
      const recentDays = days.slice(0, GROUP_RECENT_DAYS);
      const recent = done.filter((g) => recentDays.includes(g.date));
      const older = done.filter((g) => !recentDays.includes(g.date));
      html += `<h3 class="lg-sub">Legutóbbi eredmények<span>${done.length}</span></h3>${byDay(recent)}`;
      if (older.length) {
        html += `<details class="lg-more"><summary>Korábbi eredmények (${older.length} meccs)</summary>${byDay(older)}</details>`;
      }
    }
    if (upcoming.length) {
      const first = upcoming.slice(0, GROUP_UPCOMING_LEN);
      const rest = upcoming.slice(GROUP_UPCOMING_LEN);
      html += `<h3 class="lg-sub">Következő meccsek<span>${upcoming.length}</span></h3>${byDay(first)}`;
      if (rest.length) {
        html += `<details class="lg-more"><summary>A teljes hátralévő sorsolás (még ${rest.length} meccs)</summary>${byDay(rest)}</details>`;
      }
    }
    host.innerHTML = html;
  }

  // ---- Rájátszás ----
  // Az alapszakasz után az MJSZ két dolgot rendez:
  //   • a bajnoki ágat (negyeddöntő → elődöntő → döntő + bronzmérkőzés):
  //     a negyed- és elődöntő oda-visszavágós párharc (a két meccs
  //     összesített gólkülönbsége dönt), a döntő és a bronz egy meccs;
  //   • helyosztókat (5–8., 9–12., …): négycsapatos körmérkőzéses csoportok.
  // Az API nem ad párharc-azonosítót, ezért a párokat a két csapat neve
  // alapján rakjuk össze. Az ágrajz NHL-stílusú: bal és jobb oldalról
  // halad a döntő felé, középen a döntő.
  const PO_ROUNDS = ["Nyolcaddöntő", "Negyeddöntő", "Elődöntő", "Döntő"];

  function poSeries(games, stage) {
    const map = new Map();
    games
      .filter((g) => g.stage === stage)
      .forEach((g) => {
        const key = [g.home, g.away].sort().join("|");
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(g);
      });
    return [...map.values()]
      .map((list) => {
        list.sort((x, y) => parseDate(x.date) - parseDate(y.date) || (x.no || 0) - (y.no || 0));
        // A felső sor az első meccs hazai csapata
        const a = list[0].home;
        const b = list[0].away;
        const playedGames = list.filter(gamePlayed);
        const goals = (t) => playedGames.reduce((n, g) => n + (g.home === t ? g.hs : g.as), 0);
        return {
          a,
          b,
          games: list,
          sa: goals(a),
          sb: goals(b),
          played: playedGames.length,
          done: playedGames.length === list.length,
          no: Math.min(...list.map((g) => g.no || 1e9)),
        };
      })
      .sort((x, y) => x.no - y.no);
  }

  const poHas = (s, team) => s && (s.a === team || s.b === team);

  // Ki jutott tovább? Ha a csapat a következő körben is szerepel, az biztos.
  // Különben a lejátszott párharc összesítése dönt; döntetlennél az utolsó
  // meccs (hosszabbítás / szétlövés) győztese.
  function poWinner(s, nextRound) {
    if (nextRound) {
      if (nextRound.some((n) => poHas(n, s.a))) return s.a;
      if (nextRound.some((n) => poHas(n, s.b))) return s.b;
    }
    if (!s.done || !s.played) return null;
    if (s.sa !== s.sb) return s.sa > s.sb ? s.a : s.b;
    const last = s.games[s.games.length - 1];
    if (last.hs !== last.as) return last.hs > last.as ? last.home : last.away;
    return null;
  }

  function poCard(s, league, nextRound) {
    if (!s) {
      return `<div class="br-s br-tbd"><span>A párharc még nem dőlt el</span></div>`;
    }
    const teams = league.teams || {};
    const win = poWinner(s, nextRound);
    const line = (t, goals) => `
      <div class="br-t${win === t ? " win" : win ? " out" : ""}${t === US ? " us" : ""}">
        <span class="br-logo" data-init="${escHtml(String(t).charAt(0))}">${teamLogo(teams[t] && teams[t].logo) || teamChip(t)}</span>
        <span class="br-name">${t}</span>
        <b>${s.played ? goals : ""}</b>
      </div>`;
    // Meccsenként az eredmény a felső csapat szemszögéből, vagy a dátum
    const legs = s.games
      .map((g) =>
        gamePlayed(g)
          ? `${g.home === s.a ? g.hs : g.as}–${g.home === s.a ? g.as : g.hs}${g.ot ? " h.u." : ""}`
          : fmtDate(g.date)
      )
      .join(", ");
    return `
      <div class="br-s${poHas(s, US) ? " is-us" : ""}">
        ${line(s.a, s.sa)}${line(s.b, s.sb)}
        <div class="br-legs">${s.games.length > 1 ? "Meccsek: " : ""}${legs}</div>
      </div>`;
  }

  function renderBracket(league) {
    const games = league.games || [];
    const rounds = PO_ROUNDS.filter((r) => games.some((g) => g.stage === r));
    if (!rounds.length) return "";
    // Az első szereplő körtől a döntőig minden kör kell (a még ki nem
    // sorsoltak „még nem dőlt el” helyőrzővel)
    const first = PO_ROUNDS.indexOf(rounds[0]);
    const all = PO_ROUNDS.slice(first);
    const series = all.map((r) => poSeries(games, r));
    const want = all.map((r, i) => Math.max(1, Math.pow(2, all.length - 1 - i)));

    // Sorrend: a döntőtől visszafelé, hogy minden párharc a „gyermekei”
    // mellé kerüljön (azok a párharcok, ahonnan a résztvevői jöttek)
    const ordered = series.map((x) => x.slice());
    for (let i = all.length - 2; i >= 0; i--) {
      const parents = ordered[i + 1];
      if (!parents.length) continue;
      const out = [];
      parents.forEach((p) =>
        series[i].forEach((c) => {
          if (!out.includes(c) && (poHas(c, p.a) || poHas(c, p.b))) out.push(c);
        })
      );
      series[i].forEach((c) => out.includes(c) || out.push(c));
      ordered[i] = out;
    }

    const cards = (i, from, to) => {
      const list = [];
      for (let k = from; k < to; k++) list.push(poCard(ordered[i][k], league, series[i + 1]));
      return list.join("");
    };
    const col = (i, side) => {
      const half = want[i] / 2;
      const [from, to] = side === "left" ? [0, half] : [half, want[i]];
      return `
        <div class="br-col br-${side}" style="--r:${i}">
          <h4>${all[i]}</h4>
          <div class="br-list">${cards(i, from, to)}</div>
        </div>`;
    };

    const last = all.length - 1;
    let html = "";
    for (let i = 0; i < last; i++) html += col(i, "left");
    const bronze = poSeries(games, "Bronzmérkőzés")[0];
    html += `
      <div class="br-col br-center" style="--r:${last}">
        <h4>🏆 Döntő</h4>
        <div class="br-list">
          ${poCard(ordered[last][0], league)}
          ${bronze ? `<div class="br-bronze"><h4>🥉 Bronzmérkőzés</h4>${poCard(bronze, league)}</div>` : ""}
        </div>
      </div>`;
    for (let i = last - 1; i >= 0; i--) html += col(i, "right");

    return `
      <div class="lg-po-block">
        <h3 class="lg-sub">Bajnoki ág · 1–${want[0] * 2}. hely</h3>
        <div class="br" style="--rounds:${last * 2 + 1}">${html}</div>
      </div>`;
  }

  // Helyosztó csoportok: tabella a meccseikből számolva (3 / 2 / 1 / 0 pont)
  function placementRows(games, league) {
    const teams = league.teams || {};
    const rows = {};
    const row = (t) =>
      rows[t] ||
      (rows[t] = { team: t, logo: teams[t] && teams[t].logo, us: t === US, gp: 0, w: 0, otw: 0, otl: 0, v: 0, gf: 0, ga: 0, pts: 0 });
    games.forEach((g) => {
      const h = row(g.home);
      const a = row(g.away);
      if (!gamePlayed(g)) return;
      const [win, lose] = g.hs > g.as ? [h, a] : [a, h];
      h.gp++, a.gp++;
      h.gf += g.hs, h.ga += g.as, a.gf += g.as, a.ga += g.hs;
      if (g.ot) win.otw++, win.pts += 2, lose.otl++, lose.pts += 1;
      else win.w++, win.pts += 3, lose.v++;
    });
    return Object.values(rows);
  }

  // A rájátszás állása a mi szemszögünkből – a csempék alatti csíkhoz.
  // null, ha még nincs rájátszás-meccsünk.
  function poStatus(league) {
    const games = league.games || [];
    const mine = games.filter((g) => g.stage && (g.home === US || g.away === US));
    if (!mine.length) return null;
    mine.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const last = mine[mine.length - 1];
    const stage = last.stage;
    const nextGame = mine.find((g) => !gamePlayed(g));
    const nextTxt = nextGame
      ? `Következő meccs: ${fmtWeekday(nextGame.date)} · ${fmtDate(nextGame.date)}${nextGame.time ? ", " + nextGame.time : ""}`
      : "";

    if (stage === "Helyosztó") {
      const list = games.filter((g) => g.stage === "Helyosztó" && g.group === last.group);
      const rows = placementRows(list, league).sort(standingsSort);
      const idx = rows.findIndex((r) => r.us);
      const done = list.every(gamePlayed);
      const base = parseInt(last.group, 10) || 1;
      return {
        title: `Helyosztó · ${last.group} hely`,
        main: done ? `Végeredmény: ${base + idx}. hely` : `Jelenleg a csoport ${idx + 1}. helyén`,
        sub: nextTxt,
      };
    }

    const series = poSeries(games, stage).find((x) => poHas(x, US));
    if (!series) return null;
    const opp = series.a === US ? series.b : series.a;
    const ours = series.a === US ? series.sa : series.sb;
    const theirs = series.a === US ? series.sb : series.sa;
    const nextIdx = PO_ROUNDS.indexOf(stage) + 1;
    const nextRound = PO_ROUNDS[nextIdx] ? poSeries(games, PO_ROUNDS[nextIdx]) : null;
    const win = poWinner(series, nextRound);
    const multi = series.games.length > 1;
    const score = series.played ? ` · ${multi ? "összesítve " : ""}${ours}–${theirs}` : "";

    let verdict = "";
    if (win) {
      const won = win === US;
      if (stage === "Döntő") verdict = won ? "Bajnokok vagyunk! 🏆" : "Ezüstérem 🥈";
      else if (stage === "Bronzmérkőzés") verdict = won ? "Bronzérem 🥉" : "4. hely";
      else verdict = won ? "Továbbjutottunk" : "Itt búcsúztunk";
    }
    return {
      title: stage,
      main: `Ice Unicorns – ${opp}${score}`,
      sub: verdict || nextTxt,
      won: win === US,
    };
  }

  function renderPlayoffs(host, league) {
    const games = league.games || [];
    const html = renderBracket(league);
    if (html) host.insertAdjacentHTML("beforeend", html);

    const placement = games.filter((g) => g.stage === "Helyosztó" && g.group);
    const keys = [...new Set(placement.map((g) => g.group))].sort((x, y) => parseInt(x, 10) - parseInt(y, 10));
    keys.forEach((k) => {
      const block = document.createElement("div");
      block.className = "lg-po-block";
      const list = placement.filter((g) => g.group === k);
      block.innerHTML = `<h3 class="lg-sub">Helyosztó · ${k} hely</h3>`;
      renderStandingsGroup(block, { name: "", standings: placementRows(list, league), noForm: true }, league);
      const det = document.createElement("details");
      det.className = "lg-more";
      det.innerHTML = `<summary>A helyosztó meccsei (${list.length})</summary>`;
      const inner = document.createElement("div");
      drawGroupResults(inner, league, k);
      det.appendChild(inner);
      block.appendChild(det);
      host.appendChild(block);
    });

    return !!html || keys.length > 0;
  }

  // ---- Bajnoki pontverseny ----
  // A saját csoportunk legjobb pontszerzői – a mi játékosaink kiemelve,
  // hogy egy pillantással látszódjon, hol állnak a mezőnyben.
  function renderLeagueScorers(host, league) {
    const rows = league.scorers || [];
    // A szezon rajtja előtt nincs kit rangsorolni. A szakaszt viszont nem
    // rejtjük el: ugyanúgy barátságos üzenet áll benne, mint a házi
    // pontvadászatnál, hogy látsszon, mi fog majd ide kerülni.
    if (!rows.length) {
      host.appendChild(
        empty("Az első forduló után itt jelenik meg a csoport pontversenye. 🏒")
      );
      return;
    }

    const teams = league.teams || {};
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    const table = document.createElement("table");
    table.className = "standings scorers";
    table.innerHTML = `
      <thead>
        <tr>
          <th class="c-pos">#</th>
          <th class="c-team">Játékos</th>
          <th title="Lejátszott meccs">M</th>
          <th title="Gól">G</th>
          <th title="Gólpassz">A</th>
          <th class="c-pts" title="Pont">P</th>
        </tr>
      </thead>
      <tbody></tbody>`;

    const tbody = table.querySelector("tbody");
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      if (r.us) tr.className = "us";
      const club = teams[r.team] && teams[r.team].logo;
      tr.innerHTML = `
        <td class="c-pos">${i + 1}</td>
        <td class="c-team">
          <span class="sc-name">${r.name}</span>
          <span class="sc-club">${
            club
              ? `<img class="team-logo" src="${club}" alt="${r.team}" loading="lazy">`
              : teamChip(r.team)
          }${r.team}</span>
        </td>
        <td>${r.gp}</td>
        <td>${r.g}</td>
        <td>${r.a}</td>
        <td class="c-pts">${r.pts}</td>`;
      tbody.appendChild(tr);
    });

    // A halott emblémalinkeket kezdőbetűs koronggal pótoljuk
    tbody.querySelectorAll(".sc-club img").forEach(chipOnError);

    wrap.appendChild(table);
    host.appendChild(wrap);
  }

  // ---- Gyorsstatisztika-csempék (helyezés / mérleg / pont / gólkülönbség) ----
  // A tabellából számoljuk, külön adat nem kell hozzá. Ha még nincs tabella,
  // vagy nincs benne a mi sorunk, a csempesor eltűnik (nem hagyunk üres dobozt).
  function renderSummary(host, league) {
    // A helyezés csak a saját csoportunkon belül értelmes, ezért azt a
    // csoportot keressük meg, amelyikben a mi sorunk szerepel.
    const groups = league.groups || [];
    let rows = null;
    let idx = -1;
    for (const g of groups) {
      const sorted = (g.standings || []).slice().sort(standingsSort);
      const i = sorted.findIndex((r) => r.us || r.team === US);
      if (i >= 0) {
        rows = sorted;
        idx = i;
        break;
      }
    }
    if (!rows) {
      host.remove();
      return;
    }
    const r = rows[idx];
    const gd = (r.gf || 0) - (r.ga || 0);
    const tiles = [
      { v: idx + 1 + ".", l: "Helyezés" },
      {
        v: [r.w ?? 0, otWins(r), otLosses(r), r.v ?? 0].join("–"),
        l: "Gy–H.Gy–H.V–V",
        cls: "is-record", // négy szám, ezért kicsit kisebb betű
      },
      { v: r.pts ?? 0, l: "Pont" },
      { v: (gd > 0 ? "+" : "") + gd, l: "Gólkülönbség" },
    ];
    // A nézőszám csak akkor kerül ki, ha az MJSZ fel is töltötte –
    // egy „0 néző” csempe rosszabb, mint a semmi.
    const att = league.attendance;
    if (att && att.totalAvg) {
      tiles.push({
        v: att.totalAvg,
        l: "Néző / meccs",
        title:
          `Hazai átlag: ${att.homeAvg} · idegenben: ${att.awayAvg} · ` +
          `összesen ${att.total} néző`,
      });
    }
    host.innerHTML = tiles
      .map(
        (t) =>
          `<div class="ls-tile${t.cls ? " " + t.cls : ""}"${
            t.title ? ` title="${t.title}"` : ""
          }>` + `<strong>${t.v}</strong><span>${t.l}</span></div>`
      )
      .join("");
  }

  // ---- Házi pontvadászat ----
  // A saját játékosaink rangsora pont szerint. Külön adat nem kell hozzá:
  // a keret a team.js-ből, az összesítés a statisztika.js-ből jön.
  function renderScorers(host, key) {
    if (typeof TEAMS === "undefined" || typeof Stats === "undefined") return;
    const team = TEAMS[key];
    if (!team) return;

    // Kapusok nélkül – nekik saját mutatóik vannak a kártyán
    const mezony = (team.zones || [])
      .reduce((all, z) => all.concat(z.players || []), [])
      .filter((p) => p.pos !== "Kapus");

    const sorok = mezony
      .map((p) => ({ p: p, st: Stats.skater(p.nick, key) }))
      .filter((r) => !r.st._empty)
      .sort((a, b) =>
        Number(b.st.P) - Number(a.st.P) ||
        Number(b.st.G) - Number(a.st.G) ||
        Number(a.st.M) - Number(b.st.M));

    if (!sorok.length) {
      host.appendChild(empty("Az első meccs után itt jelenik meg a házi pontvadászat. 🥅"));
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    const table = document.createElement("table");
    table.className = "standings scorers";
    table.innerHTML = `
      <thead>
        <tr>
          <th class="c-pos">#</th>
          <th class="c-team">Játékos</th>
          <th title="Mérkőzés">M</th>
          <th title="Gól">G</th>
          <th title="Gólpassz">A</th>
          <th class="c-pts" title="Pont">P</th>
        </tr>
      </thead>
      <tbody></tbody>`;

    // A táblázatba csak a pontszerzők kerülnek; aki még pont nélkül áll,
    // az alatta egy sorban, név szerint – így nem egy hosszú nullás lista.
    const pontos = sorok.filter((r) => Number(r.st.P) > 0);
    const nullas = sorok.filter((r) => !(Number(r.st.P) > 0));
    const nev = (p) => (TEAMS[key] && TEAMS[key].komoly && p.name ? p.name : p.nick);
    if (!pontos.length) {
      host.appendChild(empty("Még senki nem szerzett pontot – az első gól után itt a rangsor. 🥅"));
    }

    const tbody = table.querySelector("tbody");
    pontos.forEach((r, i) => {
      const tr = document.createElement("tr");
      if (i < 3) tr.className = "rang" + (i + 1);
      tr.innerHTML = `
        <td class="c-pos">${i + 1}</td>
        <td class="c-team">${nev(r.p)}</td>
        <td>${r.st.M}</td>
        <td>${r.st.G}</td>
        <td>${r.st.A}</td>
        <td class="c-pts">${r.st.P}</td>`;
      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    if (pontos.length) host.appendChild(wrap);
    if (nullas.length) {
      const p = document.createElement("p");
      p.className = "lg-legend";
      p.innerHTML = `<b>Még pont nélkül (${nullas.length}):</b> ${nullas.map((r) => nev(r.p)).join(", ")}`;
      host.appendChild(p);
    }
  }

  // ---- Strukturált adat a keresőknek (schema.org SportsEvent) ----
  // A Google a JavaScripttel beszúrt JSON-LD-t is feldolgozza, így a
  // meccseink eseményként jelenhetnek meg a találatok között.

  // Budapesti időeltolódás egy adott napra ("+02:00" nyáron, "+01:00" télen)
  function budapestOffset(iso) {
    try {
      const part = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Budapest",
        timeZoneName: "shortOffset",
      })
        .formatToParts(new Date(iso + "T12:00:00Z"))
        .find((p) => p.type === "timeZoneName");
      const m = part && part.value.match(/GMT([+-])(\d+)/);
      if (m) return `${m[1]}${m[2].padStart(2, "0")}:00`;
    } catch (e) {}
    return "+01:00";
  }

  function addStructuredData(league, key) {
    const team = (name) => ({ "@type": "SportsTeam", name: name });
    const events = (league.matches || []).map((m) => {
      const ev = {
        "@type": "SportsEvent",
        name: m.home ? `${US} – ${m.opponent}` : `${m.opponent} – ${US}`,
        sport: "Ice hockey",
        // Pontos kezdés nélkül csak a nap ismert
        startDate: m.time ? `${m.date}T${m.time}:00${budapestOffset(m.date)}` : m.date,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        homeTeam: team(m.home ? US : m.opponent),
        awayTeam: team(m.home ? m.opponent : US),
        url: `https://iceunicorns.hu/${key}.html`,
        description: `${league.label} bajnoki mérkőzés, ${league.season} szezon`,
      };
      if (m.venue) {
        ev.location = {
          "@type": "Place",
          name: m.venue,
          address: { "@type": "PostalAddress", addressCountry: "HU" },
        };
      }
      return ev;
    });
    if (!events.length) return;
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": events });
    document.head.appendChild(s);
  }

  panels.forEach((panel) => {
    const key = panel.dataset.league;
    const league = key === MIND ? { label: "Ice Unicorns" } : LEAGUES[key];
    if (!league) return;

    const seasonEl = panel.querySelector("[data-season]");
    if (seasonEl && league.season) seasonEl.textContent = league.season + " szezon";

    const next = panel.querySelector("[data-next-match]");
    if (next) renderNext(next, key, league.label);

    // A többi blokknak konkrét bajnokság kell – a kezdőlapon nincsenek is meg
    if (key === MIND) return;

    addStructuredData(league, key);

    const summary = panel.querySelector("[data-summary]");
    if (summary) renderSummary(summary, league);

    const matches = panel.querySelector("[data-matches]");
    if (matches) renderMatches(matches, league, key);

    const standings = panel.querySelector("[data-standings]");
    if (standings) renderStandings(standings, league);

    const scorers = panel.querySelector("[data-scorers]");
    if (scorers) renderScorers(scorers, key);

    const groupResults = panel.querySelector("[data-group-results]");
    if (groupResults) renderGroupResults(groupResults, league);

    // Rájátszás idején a Rájátszás fül kerül előre, és az nyílik meg alapból
    const playoffs = panel.querySelector("[data-playoffs]");
    if (playoffs && renderPlayoffs(playoffs, league)) {
      const tab = panel.querySelector('[data-lg-tab="rajatszas"]');
      if (tab) {
        tab.hidden = false;
        tab.parentElement.prepend(tab);
        tab.parentElement.dataset.default = "rajatszas";
      }
      const strip = panel.querySelector("[data-po-status]");
      const st = poStatus(league);
      if (strip && st) {
        strip.innerHTML = `
          <div class="po-text">
            <span class="po-kicker">Rájátszás · ${st.title}</span>
            <strong>${st.main}</strong>
            ${st.sub ? `<span class="po-sub">${st.sub}</span>` : ""}
          </div>
          <button type="button" class="btn btn-primary po-go">Ágrajz megnézése</button>`;
        strip.classList.toggle("is-won", !!st.won);
        strip.hidden = false;
        strip.querySelector(".po-go").addEventListener("click", () => {
          const t = panel.querySelector('[data-lg-tab="rajatszas"]');
          if (!t) return;
          t.click();
          t.parentElement.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }

    const leagueScorers = panel.querySelector("[data-league-scorers]");
    if (leagueScorers) renderLeagueScorers(leagueScorers, league);
  });

  // ---- Al-fülek (Menetrend / Tabella / Pontverseny / Fordulók) ----
  // A választott fület megjegyezzük (csak ebben a böngészőben), hogy
  // visszatéréskor ugyanott folytasd.
  document.querySelectorAll(".lg-tabs").forEach((bar) => {
    const tabs = Array.from(bar.querySelectorAll("[data-lg-tab]"));
    const root = bar.parentElement;
    const store = "lg-tab:" + location.pathname + (bar.dataset.default ? ":" + bar.dataset.default : "");
    const select = (btn, focus) => {
      tabs.forEach((t) => {
        const on = t === btn;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = root.querySelector('[data-lg-panel="' + t.dataset.lgTab + '"]');
        if (panel) panel.hidden = !on;
      });
      if (focus) btn.focus();
      try {
        localStorage.setItem(store, btn.dataset.lgTab);
      } catch (e) {}
    };
    tabs.forEach((t) => t.addEventListener("click", () => select(t)));
    // A rejtett fül (pl. Rájátszás az alapszakaszban) kimarad a léptetésből
    bar.addEventListener("keydown", (e) => {
      const shown = tabs.filter((t) => !t.hidden);
      const i = shown.indexOf(e.target);
      if (i < 0 || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
      e.preventDefault();
      select(shown[(i + (e.key === "ArrowRight" ? 1 : -1) + shown.length) % shown.length], true);
    });
    let saved = null;
    try {
      saved = localStorage.getItem(store);
    } catch (e) {}
    const start =
      tabs.find((t) => t.dataset.lgTab === saved && !t.hidden) ||
      tabs.find((t) => t.dataset.lgTab === bar.dataset.default && !t.hidden);
    if (start) select(start);
  });

  // A következő-meccs kártyák kirajzolása után indul a visszaszámláló.
  startCountdowns();
})();
