// ===== Ice Unicorns – csapat adatok =====
// Két csapat van: OB4D és OB4C. Mindkettőnek saját kerete (zones) és stábja (staff) van.
// A pálya azt a keretet rajzolja ki, amelyik a #rinkZones elem data-team attribútumában áll
// (ob4d.html → data-team="ob4d", ob4c.html → data-team="ob4c").
//
// A játékos mezők jelentése:
//   nick   – fantázia/becenév (ez látszik a pályán)
//   name   – POLGÁRI (civil) név, ez jelenik meg a pop-up címében (most üres → becenév látszik)
//   num    – mezszám (most helykitöltő)
//   pos    – poszt: "Kapus" | "Védő" | "Csatár"
//   grip   – ütőfogás: "bal" | "jobb"  (most "–")
//   sweet  – kedvenc édesség (most "–")
//   power  – szuperképesség (most "–")
//   photo  – kép útvonala, pl. "assets/players/fankocska.jpg"  (most üres → 🦄 / mezszám)
//   bio    – a bolondos leírás (az eredeti oldalról)
// Új játékos: csak vegyél fel egy objektumot a megfelelő csapat megfelelő zónájába – a pálya tördel.
const TEAMS = {
  ob4d: {
    label: "OB4D",
    zones: [
      {
        label: "Kapus",
        players: [
          { nick: "Fánkocska", name: "Virág Christof Máté", num: 69, pos: "Kapus", grip: "–", sweet: "–", power: "–", photo: "", bio: "A háló és a győzelem őre." },
          { nick: "Barackmag", name: "", num: 14, pos: "Kapus", grip: "–", sweet: "–", power: "–", photo: "", bio: "Az ember, aki nem ijed meg a káosztól." },
        ],
      },
      {
        label: "Védő",
        players: [
          { nick: "Patkószörny", name: "Merkl Dominik", num: 13, pos: "Védő", grip: "–", sweet: "–", power: "–", photo: "assets/Players/Patkószörny.png", bio: "Védi a mundér becsületét – a csapat első számú védője." },
          { nick: "Pöttömke", name: "Erdős Zsuzsanna", num: 9, pos: "Védő", grip: "–", sweet: "–", power: "–", photo: "assets/Players/Pöttömke.png", bio: "Kis termet, nagy hatás. „Most akkor mi támadunk!”" },
          { nick: "Hópehely", name: "Galaczi Miklós", num: 20, pos: "Védő", grip: "Bal", sweet: "Aranygaluska", power: "–", photo: "", bio: "Ha tehetné még a jégen is biciklivel tekerne" },
          { nick: "Maszat", name: "Szymon Wlaszczyk", num: 44, pos: "Védő", grip: "Bal", sweet: "", power: "", photo: "assets/Players/Maszat.png", bio: "A lengyel srác, akivel inkább ne vitatkozz" },
        ],
      },
      {
        label: "Csatár",
        players: [
          { nick: "Pitypang", name: "Kiss Péter Zoltán", num: 15, pos: "Csatár", captain: true, grip: "Bal", sweet: "Roséfröccs", power: "Hátrafelé korizva is előre gyorsulok.", photo: "assets/Players/Pitypang.png", bio: "Vezeti és összehangolja a Ménest a pályán." },
          { nick: "Fecske", name: "Czuppon Attila", num: 14, pos: "Csatár", grip: "–", sweet: "–", power: "–", photo: "assets/Players/Fecske.png", bio: "A támadók szárnyaló vezére." },
          { nick: "Lócitromka", name: "", num: 19, pos: "Csatár", grip: "–", sweet: "–", power: "–", photo: "", bio: "Fő feladata az ellenfél legjobb védőjének kiiktatása." },
          { nick: "Mályvacukor", name: "Köller József", num: 67, pos: "Csatár", grip: "Bal", sweet: "Tiramisu", power: "Cukormázba csomagolt forgalmi akadály.", photo: "assets/Players/Mályvacukor.png", bio: "Mogorva kívül, lágy belül – agresszív, de gólra még vár." },
          { nick: "Villámpatkó", name: "Jakab Zsolt", num: 10, pos: "Csatár", grip: "Jobb", sweet: "JägeresPálinka", power: "A Lesek királya, aki mindig nézi a kék vonalat de sose látja", photo: "assets/Players/VillámPatkó.png", bio: "A korongbedobásnál nem csak édesen mosolyog." },
          { nick: "Bolyhospofi", name: "Lokár Gábor", num: 84, pos: "Csatár", grip: "Jobb", sweet: "Pez cukorka (Unikornis adagolóból)", power: "Lopva figyel, pánikot szül. Szakmája: lesből támadó zavarkeltő", photo: "assets/Players/Bolyhospofi.png", bio: "Az elszántsága megkérdőjelezhetetlen." },
          { nick: "Szikrácska", name: "Varga Istvan Gergely", num: 31, pos: "Csatár", grip: "Jobb", sweet: "Peroni", power: "100% találati arány a kapus fejére bemelegítéskor", photo: "assets/Players/Szikrácska.png", bio: "Tüzes láb, csillámos korcsolya – sosem áll le." },
          { nick: "KristályPatkó", name: "Hegyi Bálint", num: 87, pos: "Csatár", grip: "Jobb", sweet: "Rum-kóla", power: "Olyan egyedi csuklólövésem van, aminek az irányát még a fizika törvényei sem ismerik", photo: "assets/Players/KristalyPatko.png", bio: "" },
        ],
      },
    ],
    staff: [
      { nick: "Árpi bácsi", name: "Sofron Árpád", icon: "🏒", pos: "Edző", photo: "assets/Players/Sofron_Árpád.png", bio: "A jég melletti higgadt fej." },
      { nick: "Áron bácsi", name: "Merkl Áron", icon: "🏒", pos: "Edző", photo: "assets/Players/Merkl_Áron.png", bio: "Tapasztalata több, mint a játékosoké összesen." },
    ],
  },

  // ⬇️ OB4C keret – ide kerülnek a játékosok, ha összeállt a névsor.
  // Ugyanaz a formátum, mint fent; amíg üres, a pályán egy „hamarosan” üzenet látszik.
  ob4c: {
    label: "OB4C",
    zones: [
      { label: "Kapus", players: [] },
      { label: "Védő", players: [] },
      { label: "Csatár", players: [] },
    ],
    staff: [],
  },
};

// A statisztikák a statisztika.js-ből, a mérkőzés-jegyzőkönyvekből számolódnak.
// Amíg nincs felvitt meccs, minden mező "–".
function statsFor(p, leagueKey) {
  return Stats.skater(p.nick, leagueKey);
}
function goalieStatsFor(p, leagueKey) {
  return Stats.goalie(p.nick, leagueKey);
}

(function () {
  const rinkZones = document.getElementById("rinkZones");
  const benchEl = document.getElementById("bench");
  if (!rinkZones) return;

  const teamKey = rinkZones.dataset.team || "ob4d";
  const team = TEAMS[teamKey];
  if (!team) return;

  const zones = team.zones || [];
  const staff = team.staff || [];
  const hasPlayers = zones.some((z) => (z.players || []).length);

  function skaterButton(p, opts = {}) {
    const btn = document.createElement("button");
    btn.className = "skater" + (p.captain ? " captain" : "") + (opts.staff ? " staff" : "");
    btn.type = "button";
    const badge = p.captain ? '<span class="cbadge">C</span>' : "";
    let puck;
    if (opts.staff) {
      puck = p.photo
        ? `<span class="puck has-photo"><img src="${p.photo}" alt="${p.nick}" loading="lazy" decoding="async">${badge}</span>`
        : `<span class="puck">${p.icon || "🦄"}${badge}</span>`;
    } else if (p.photo) {
      puck = `<span class="puck has-photo"><img src="${p.photo}" alt="${p.nick}" loading="lazy" decoding="async"><span class="num">${p.num}</span>${badge}</span>`;
    } else {
      puck = `<span class="puck">${p.num}${badge}</span>`;
    }
    btn.innerHTML =
      puck +
      `<span class="sk-name">${p.nick}</span>` +
      `<span class="sk-role">${p.pos}</span>`;
    btn.addEventListener("click", () => openModal(p, opts));
    return btn;
  }

  // Elgépelt becenév a jegyzőkönyvekben csendben elnyelné a statisztikát,
  // ezért mindkét keret neveivel összevetjük (konzol-figyelmeztetés).
  if (typeof Stats !== "undefined") {
    const minden = [];
    Object.values(TEAMS).forEach((t) => {
      (t.zones || []).forEach((z) => (z.players || []).forEach((p) => minden.push(p.nick)));
    });
    Stats.validate(minden);
  }

  // Build rink zones
  if (hasPlayers) {
    zones.forEach((zone) => {
      if (!(zone.players || []).length) return;
      const wrap = document.createElement("div");
      const label = document.createElement("span");
      label.className = "zone-label";
      label.textContent = zone.label;
      const row = document.createElement("div");
      row.className = "rink-zone";
      zone.players.forEach((p) => row.appendChild(skaterButton(p)));
      wrap.appendChild(label);
      wrap.appendChild(row);
      rinkZones.appendChild(wrap);
    });
  } else {
    const empty = document.createElement("p");
    empty.className = "rink-empty";
    empty.textContent = `Az ${team.label} keret hamarosan érkezik! 🦄`;
    rinkZones.appendChild(empty);
  }

  // Build bench (staff)
  if (benchEl) {
    if (staff.length) {
      staff.forEach((p) => benchEl.appendChild(skaterButton(p, { staff: true })));
    } else {
      const benchSide = benchEl.closest(".bench-side");
      if (benchSide) benchSide.style.display = "none";
    }
  }

  // ===== Modal =====
  const overlay = document.createElement("div");
  overlay.className = "pm-overlay";
  overlay.innerHTML = `
    <div class="pm-card" role="dialog" aria-modal="true">
      <div class="pm-photo"></div>
      <div class="pm-main">
        <div class="pm-head">
          <button class="pm-close" aria-label="Bezárás">×</button>
          <div class="pm-num"></div>
          <h3></h3>
          <div class="pm-civil"></div>
          <div class="pm-role"></div>
        </div>
        <div class="pm-body">
          <div class="pm-meta"></div>
          <div class="pm-stats"></div>
          <div class="pm-games">
            <h4 class="pm-games-title">Meccsenkénti bontás</h4>
            <div class="pm-games-list"></div>
          </div>
          <p class="pm-bio"></p>
          <p class="pm-hint">📊 A statisztikák hamarosan érkeznek!</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const pmPhoto = overlay.querySelector(".pm-photo");
  const elNum = overlay.querySelector(".pm-num");
  const elName = overlay.querySelector("h3");
  const elCivil = overlay.querySelector(".pm-civil");
  const elRole = overlay.querySelector(".pm-role");
  const elMeta = overlay.querySelector(".pm-meta");
  const elStats = overlay.querySelector(".pm-stats");
  const elGames = overlay.querySelector(".pm-games");
  const elGamesList = overlay.querySelector(".pm-games-list");
  const elBio = overlay.querySelector(".pm-bio");
  const elHint = overlay.querySelector(".pm-hint");

  // "2026-09-20" → "szept. 20." – rövid dátum a meccssorokhoz
  function fmtGameDate(iso) {
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("hu-HU", {
      month: "short",
      day: "numeric",
    });
  }

  // Egy gól-/védésvideó linkje – amíg nincs clips adat, ez sose fut le
  function clipLink(c) {
    const isSave = c.type === "vedes";
    const icon = isSave ? "🧤" : "🥅";
    const title = (isSave ? "Védés" : "Gól") + (c.time ? " – " + c.time : "") + (c.note ? " (" + c.note + ")" : "");
    return `<a class="pmg-clip" href="${c.url}" target="_blank" rel="noopener" title="${title}">${icon}${c.time ? " " + c.time : ""}</a>`;
  }

  // Egy meccssor: dátum, ellenfél, eredmény, a játékos aznapi statja,
  // és – ha van hozzá felvéve – a gól-/védésvideó linkje.
  function gameRow(row, isGoalie, nick) {
    const g = row.game;
    const line = row.line;
    const result = typeof g.us === "number" && typeof g.them === "number" ? `${g.us}–${g.them}` : "–";
    const statText = isGoalie
      ? `${line.ga ?? 0} KG · ${line.sv ?? 0} véd`
      : `${line.g ?? 0} G · ${line.a ?? 0} A`;
    const clips = (g.clips || []).filter((c) => c.player === nick);
    const clipsHtml = clips.length
      ? `<div class="pmg-clips">${clips.map(clipLink).join("")}</div>`
      : "";
    return `
      <div class="pmg-row">
        <div class="pmg-date">${fmtGameDate(g.date)}</div>
        <div class="pmg-info">
          <span class="pmg-opp">${g.home ? "" : "@ "}${g.opponent}</span>
          <span class="pmg-meta">${g.home ? "hazai" : "idegenben"} · ${result}</span>
        </div>
        <div class="pmg-stat">${statText}</div>
        ${clipsHtml}
      </div>`;
  }

  // Mezőnyjátékos és kapus statisztikái eltérnek.
  // A rövidítés a nagy szám alatt, a teljes név a tooltipben (title).
  const STAT_LABELS = {
    M: ["M", "Mérkőzés"],
    G: ["G", "Gól"],
    A: ["A", "Gólpassz"],
    P: ["P", "Pont (gól + gólpassz)"],
    BP: ["BP", "Büntetőperc"],
    PM: ["+/-", "Plusz/mínusz"],
  };
  const GOALIE_LABELS = {
    M: ["M", "Mérkőzés"],
    KG: ["KG", "Kapott gól"],
    V: ["VÉD", "Védés"],
    SZ: ["VÉD%", "Védési hatékonyság"],
    KGA: ["KGÁ", "Kapott gól átlag (60 percre)"],
    SO: ["SO", "Kapott gól nélküli mérkőzés"],
  };

  function addTag(text) {
    const t = document.createElement("span");
    t.className = "pm-tag";
    t.textContent = text;
    elMeta.appendChild(t);
  }

  function openModal(p, opts = {}) {
    // Photo (fallback: 🦄 / stáb ikon)
    pmPhoto.innerHTML = p.photo
      ? `<img src="${p.photo}" alt="${p.nick}" loading="lazy" decoding="async">`
      : opts.staff
      ? p.icon || "🦄"
      : "🦄";

    elNum.textContent = opts.staff ? "" : "#" + p.num;

    // Unikornis név (cím) + civil (polgári) név külön sorban
    const civil = (p.name || "").trim();
    elName.textContent = p.nick;
    elCivil.textContent = civil ? "🪪 " + civil : "🪪 Polgári név: –";
    elRole.textContent = p.pos + (p.captain ? " · Kapitány" : "");

    // Meta: Ütőfogás + Születési idő (csak játékosnál)
    elMeta.innerHTML = "";
    if (opts.staff) {
      elMeta.style.display = "none";
    } else {
      elMeta.style.display = "";
      addTag("🏒 Ütőfogás: " + (p.grip || "–"));
      addTag("🍩 Kedvenc édesség: " + (p.sweet || "–"));
      addTag("✨ Szuperképesség: " + (p.power || "–"));
    }

    // Stats – kapusoknál más mezők, mint a mezőnyjátékosoknál
    elStats.innerHTML = "";
    elGamesList.innerHTML = "";
    if (opts.staff) {
      elStats.style.display = "none";
      elGames.style.display = "none";
      elHint.style.display = "none";
    } else {
      elStats.style.display = "";
      const isGoalie = p.pos === "Kapus";
      const labels = isGoalie ? GOALIE_LABELS : STAT_LABELS;
      const st = isGoalie ? goalieStatsFor(p, teamKey) : statsFor(p, teamKey);
      Object.keys(labels).forEach((k) => {
        const [rovid, teljes] = labels[k];
        const box = document.createElement("div");
        box.className = "pm-stat";
        box.title = teljes;
        box.innerHTML = `<strong>${st[k]}</strong><span>${rovid}</span>`;
        elStats.appendChild(box);
      });

      // Meccsenkénti bontás – csak akkor jelenik meg, ha már van felvitt meccs
      const rows = typeof Stats !== "undefined" ? Stats.rowsOf(p.nick, teamKey) : [];
      if (rows.length) {
        elGames.style.display = "";
        elGamesList.innerHTML = rows.map((row) => gameRow(row, isGoalie, p.nick)).join("");
      } else {
        elGames.style.display = "none";
      }

      // A „hamarosan" megjegyzés csak addig kell, amíg tényleg nincs adat
      elHint.style.display = st._empty ? "" : "none";
    }

    elBio.textContent = p.bio || "";
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  overlay.querySelector(".pm-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
})();
