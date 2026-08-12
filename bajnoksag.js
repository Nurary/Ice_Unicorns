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
  function renderNext(host, league) {
    const upcoming = league.matches
      .filter((m) => !played(m))
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))[0];

    if (!upcoming) {
      host.classList.add("is-empty");
      host.appendChild(
        empty(`Az ${league.label} következő fordulójának időpontja hamarosan kiderül. 🗓️`)
      );
      return;
    }

    const where = upcoming.home ? "Hazai pálya" : "Idegenben";
    host.innerHTML = `
      <div class="nm-when">
        <span class="nm-day">${fmtWeekday(upcoming.date)}</span>
        <strong>${fmtDate(upcoming.date)}</strong>
        ${upcoming.time ? `<span class="nm-time">${upcoming.time}</span>` : ""}
      </div>
      <div class="nm-main">
        <span class="kicker">Következő meccs</span>
        <h2>Ice Unicorns <span class="nm-vs">vs</span> ${upcoming.opponent}</h2>
        <p>${where}${upcoming.venue ? ` · ${upcoming.venue}` : ""}</p>
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

  panels.forEach((panel) => {
    const league = LEAGUES[panel.dataset.league];
    if (!league) return;

    const seasonEl = panel.querySelector("[data-season]");
    if (seasonEl && league.season) seasonEl.textContent = league.season + " szezon";

    const next = panel.querySelector("[data-next-match]");
    if (next) renderNext(next, league);

    const matches = panel.querySelector("[data-matches]");
    if (matches) renderMatches(matches, league);

    const standings = panel.querySelector("[data-standings]");
    if (standings) renderStandings(standings, league);
  });
})();
