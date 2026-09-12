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

  // Csapatembléma <img> – ha nincs logo mező, üres string (nem jelenik meg semmi)
  function teamLogo(url, extraClass) {
    if (!url) return "";
    const cls = "team-logo" + (extraClass ? " " + extraClass : "");
    return `<img class="${cls}" src="${url}" alt="" loading="lazy" onerror="this.remove()">`;
  }

  // ---- Következő meccs (kiemelt kártya) ----
  // A kezdőlapon mindkét bajnokság meccsei közül a legközelebbi kell, ezért
  // a meccsek mellé odatesszük, melyik bajnokságból valók.
  function matchesOf(key) {
    if (key === MIND) {
      return Object.keys(LEAGUES).reduce((all, k) => {
        const l = LEAGUES[k];
        return all.concat((l.matches || []).map((m) => ({ m: m, label: l.label })));
      }, []);
    }
    const l = LEAGUES[key];
    return l ? (l.matches || []).map((m) => ({ m: m, label: l.label })) : [];
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
    const where = u.home ? "Hazai pálya" : "Idegenben";
    // Csak akkor írjuk ki a bajnokságot, ha egyébként nem derülne ki
    const badge = key === MIND
      ? `<span class="nm-league">${upcoming.label}</span>` : "";
    const target = matchStart(u).getTime();
    // A gomb a helyszínhez navigál Google Maps-en – ha nincs megadva
    // helyszín, marad a kapcsolat oldal tartaléknak.
    const ctaHref = u.venue
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(u.venue + ", Magyarország")}`
      : "kapcsolat.html";
    const ctaTarget = u.venue ? ` target="_blank" rel="noopener"` : "";
    host.innerHTML = `
      <div class="nm-when">
        <span class="nm-day">${fmtWeekday(u.date)}</span>
        <strong>${fmtDate(u.date)}</strong>
        ${u.time ? `<span class="nm-time">${u.time}</span>` : ""}
      </div>
      <div class="nm-main">
        <span class="kicker">Következő meccs ${badge}</span>
        <h2>
          <span class="nm-team">${teamLogo("assets/logo/logo.jpg", "nm-logo")}Ice Unicorns</span>
          <span class="nm-vs">vs</span>
          <span class="nm-team">${teamLogo(u.logo, "nm-logo")}${u.opponent}</span>
        </h2>
        <p>${where}${u.venue ? ` · ${u.venue}` : ""}</p>
        <div class="nm-count" data-countdown="${target}" role="timer" aria-label="Visszaszámlálás a meccsig">
          <div><strong data-cd="d">–</strong><span>nap</span></div>
          <div><strong data-cd="h">–</strong><span>óra</span></div>
          <div><strong data-cd="m">–</strong><span>perc</span></div>
          <div><strong data-cd="s">–</strong><span>mp</span></div>
        </div>
      </div>
      <a href="${ctaHref}"${ctaTarget} class="btn btn-primary">Gyere el szurkolni</a>`;
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
  // (a `clips` mezővel együtt) építi fel a gólszerzők/kapusok bontását.
  // Amíg egy meccshez nincs feltöltve jegyzőkönyv, barátságos üres állapotot mutat.
  const gmOverlay = document.createElement("div");
  gmOverlay.className = "gm-overlay";
  gmOverlay.innerHTML = `
    <div class="gm-card" role="dialog" aria-modal="true">
      <button class="gm-close" type="button" aria-label="Bezárás">×</button>
      <div class="gm-head">
        <span class="gm-date"></span>
        <h3 class="gm-title"></h3>
        <span class="gm-score"></span>
      </div>
      <div class="gm-body"></div>
    </div>`;
  document.body.appendChild(gmOverlay);

  const gmDate = gmOverlay.querySelector(".gm-date");
  const gmTitle = gmOverlay.querySelector(".gm-title");
  const gmScore = gmOverlay.querySelector(".gm-score");
  const gmBody = gmOverlay.querySelector(".gm-body");

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

  function openGameModal(leagueKey, m) {
    const record =
      typeof GAME_STATS !== "undefined"
        ? GAME_STATS.find((g) => g.league === leagueKey && g.date === m.date && g.opponent === m.opponent)
        : null;

    gmDate.textContent = fmtWeekday(m.date) + " · " + fmtDate(m.date);
    gmTitle.innerHTML = `
      <span class="nm-team">${teamLogo("assets/logo/logo.jpg", "nm-logo")}Ice Unicorns</span>
      <span class="nm-vs">${m.home ? "vs" : "@"}</span>
      <span class="nm-team">${teamLogo(m.logo, "nm-logo")}${m.opponent}</span>`;
    gmScore.textContent = played(m) ? `${m.us}–${m.them}` : "Még nem játszották le";

    let html = "";
    if (record) {
      const clips = record.clips || [];
      const scorers = Object.entries(record.skaters || {})
        .filter(([, l]) => l.g || l.a)
        .sort((a, b) => (b[1].g || 0) - (a[1].g || 0));
      const goalies = Object.entries(record.goalies || {});

      if (scorers.length) {
        html += `<div class="gm-section"><h4>Gólszerzők</h4>${scorers
          .map(([nick, l]) =>
            gmRow(
              nick,
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
              nick,
              `${l.ga ?? 0} kapott gól · ${l.sv ?? 0} védés`,
              clips.filter((c) => c.player === nick && c.type === "vedes")
            )
          )
          .join("")}</div>`;
      }
    }

    gmBody.innerHTML =
      html || `<p class="gm-empty">A jegyzőkönyv ehhez a meccshez még nem érkezett meg. 📋</p>`;

    gmOverlay.classList.add("open");
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
    const sorted = upcoming.concat(done);

    const list = document.createElement("ul");
    list.className = "match-list";

    sorted.forEach((m) => {
      const li = document.createElement("li");
      li.className = "match-row" + (played(m) ? "" : " upcoming");
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", "Jegyzőkönyv: Ice Unicorns – " + m.opponent);

      const right = played(m)
        ? `<span class="match-score">${m.us}–${m.them}${
            m.ot ? '<span class="match-ot">h.u.</span>' : ""
          }</span>
           <span class="result-pill ${outcome(m).key}">${outcome(m).label}</span>`
        : `<span class="match-time">${m.time || "–"}</span>`;

      li.innerHTML = `
        <span class="match-date">
          <span class="md-wd">${fmtWeekday(m.date)}</span>
          <span class="md-d">${fmtDate(m.date)}</span>
        </span>
        <span class="match-teams">
          <span class="match-opp">${teamLogo(m.logo)}${m.opponent}</span>
          <span class="match-where">${m.home ? "hazai" : "idegenben"}</span>
        </span>
        <span class="match-right">${right}</span>`;
      li.addEventListener("click", () => openGameModal(leagueKey, m));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openGameModal(leagueKey, m);
        }
      });
      list.appendChild(li);
    });

    host.appendChild(list);
  }

  // ---- Tabella ----
  // A bajnokság A/B csoportra oszlik, ezért csoportonként külön táblázat
  // jelenik meg, saját címmel.
  function renderStandingsGroup(host, group) {
    const rows = group.standings.slice().sort(standingsSort);

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
        <td class="c-team"><span class="team-cell">${teamLogo(r.logo)}${r.team}</span></td>
        <td>${r.gp ?? "–"}</td>
        <td>${r.w ?? "–"}</td>
        <td class="c-ot">${otWins(r)}</td>
        <td class="c-ot">${otLosses(r)}</td>
        <td>${r.v ?? "–"}</td>
        <td>${(r.gf ?? "–") + "–" + (r.ga ?? "–")}</td>
        <td class="c-pts">${r.pts ?? "–"}</td>`;
      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    host.appendChild(wrap);
  }

  function renderStandings(host, league) {
    const groups = (league.groups || []).filter((g) => g.standings && g.standings.length);
    if (!groups.length) {
      host.appendChild(empty("A tabella a szezon rajtja után jelenik meg. 📊"));
      return;
    }

    groups.forEach((g) => renderStandingsGroup(host, g));
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
    host.innerHTML = tiles
      .map(
        (t) =>
          `<div class="ls-tile${t.cls ? " " + t.cls : ""}">` +
          `<strong>${t.v}</strong><span>${t.l}</span></div>`
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

    const tbody = table.querySelector("tbody");
    sorok.forEach((r, i) => {
      const tr = document.createElement("tr");
      if (i < 3) tr.className = "rang" + (i + 1);
      tr.innerHTML = `
        <td class="c-pos">${i + 1}</td>
        <td class="c-team">${r.p.nick}</td>
        <td>${r.st.M}</td>
        <td>${r.st.G}</td>
        <td>${r.st.A}</td>
        <td class="c-pts">${r.st.P}</td>`;
      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    host.appendChild(wrap);
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

    const summary = panel.querySelector("[data-summary]");
    if (summary) renderSummary(summary, league);

    const matches = panel.querySelector("[data-matches]");
    if (matches) renderMatches(matches, league, key);

    const standings = panel.querySelector("[data-standings]");
    if (standings) renderStandings(standings, league);

    const scorers = panel.querySelector("[data-scorers]");
    if (scorers) renderScorers(scorers, key);
  });

  // A következő-meccs kártyák kirajzolása után indul a visszaszámláló.
  startCountdowns();
})();
