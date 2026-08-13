// ===== Ice Unicorns – bajnoksági adatok =====
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
//   us/them  – lőtt / kapott gól. Amíg null, a meccs még nem volt lejátszva.
//   ot       – true, ha hosszabbításban vagy szétlövésben dőlt el (elhagyható)
//
// Egy TABELLA-SOR mezői:
//   team – csapatnév, gp – meccs, w – győzelem, d – döntetlen, v – vereség,
//   gf – lőtt gól, ga – kapott gól, pts – pont
//   us: true – ez a mi sorunk, kiemelve jelenik meg
//
// Amíg a listák üresek, az oldalon barátságos „hamarosan" üzenet látszik,
// tehát nyugodtan lehet fokozatosan feltölteni.
const LEAGUES = {
  ob4d: {
    label: "OB4D",
    season: "",
    matches: [],
    standings: [],
  },

  ob4c: {
    label: "OB4C",
    season: "",
    matches: [],
    standings: [],
  },
};

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

  function empty(text) {
    const p = document.createElement("p");
    p.className = "league-empty";
    p.textContent = text;
    return p;
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
    host.innerHTML = `
      <div class="nm-when">
        <span class="nm-day">${fmtWeekday(u.date)}</span>
        <strong>${fmtDate(u.date)}</strong>
        ${u.time ? `<span class="nm-time">${u.time}</span>` : ""}
      </div>
      <div class="nm-main">
        <span class="kicker">Következő meccs ${badge}</span>
        <h2>Ice Unicorns <span class="nm-vs">vs</span> ${u.opponent}</h2>
        <p>${where}${u.venue ? ` · ${u.venue}` : ""}</p>
      </div>
      <a href="kapcsolat.html" class="btn btn-primary">Gyere el szurkolni</a>`;
  }

  // ---- Menetrend és eredmények ----
  function renderMatches(host, league) {
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
          <span class="match-opp">${m.opponent}</span>
          <span class="match-where">${m.home ? "hazai" : "idegenben"}</span>
        </span>
        <span class="match-right">${right}</span>`;
      list.appendChild(li);
    });

    host.appendChild(list);
  }

  // ---- Tabella ----
  function renderStandings(host, league) {
    if (!league.standings.length) {
      host.appendChild(empty("A tabella a szezon rajtja után jelenik meg. 📊"));
      return;
    }

    const rows = league.standings
      .slice()
      .sort((a, b) => (b.pts || 0) - (a.pts || 0) ||
                      ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)));

    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    const table = document.createElement("table");
    table.className = "standings";
    table.innerHTML = `
      <thead>
        <tr>
          <th class="c-pos">#</th>
          <th class="c-team">Csapat</th>
          <th>M</th><th>Gy</th><th>D</th><th>V</th>
          <th>LG–KG</th><th class="c-pts">P</th>
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
        <td class="c-team">${r.team}</td>
        <td>${r.gp ?? "–"}</td>
        <td>${r.w ?? "–"}</td>
        <td>${r.d ?? "–"}</td>
        <td>${r.v ?? "–"}</td>
        <td>${(r.gf ?? "–") + "–" + (r.ga ?? "–")}</td>
        <td class="c-pts">${r.pts ?? "–"}</td>`;
      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    host.appendChild(wrap);
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

    const matches = panel.querySelector("[data-matches]");
    if (matches) renderMatches(matches, league);

    const standings = panel.querySelector("[data-standings]");
    if (standings) renderStandings(standings, league);

    const scorers = panel.querySelector("[data-scorers]");
    if (scorers) renderScorers(scorers, key);
  });
})();
