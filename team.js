// ===== Ice Unicorns – csapat adatok =====
// TÖLTSD FEL valós adatokkal! A mezők jelentése:
//   nick   – fantázia/becenév (ez látszik a pályán)
//   name   – POLGÁRI (civil) név, ez jelenik meg a pop-up címében (most üres → becenév látszik)
//   num    – mezszám (most helykitöltő)
//   pos    – poszt: "Kapus" | "Védő" | "Csatár"
//   grip   – ütőfogás: "bal" | "jobb"  (most "–")
//   sweet  – kedvenc édesség (most "–")
//   power  – szuperképesség (most "–")
//   photo  – kép útvonala, pl. "assets/players/fankocska.jpg"  (most üres → 🦄 / mezszám)
//   bio    – a bolondos leírás (az eredeti oldalról)
// Új játékos: csak vegyél fel egy objektumot a megfelelő zónába – a pálya tördel.
const ZONES = [
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
      { nick: "Patkószörny", name: "Merkl Dominik", num: 4, pos: "Védő", grip: "–", sweet: "–", power: "–", photo: "assets/Players/Patkószörny.png", bio: "Védi a mundér becsületét – a csapat első számú védője." },
      { nick: "Pöttömke", name: "Zsuzsanna Erdős", num: 9, pos: "Védő", grip: "–", sweet: "–", power: "–", photo: "assets/Players/Pöttömke.png", bio: "Kis termet, nagy hatás. „Most akkor mi támadunk!”" },
      { nick: "Hópehely", name: "Miklós Galaczi", num: 20, pos: "Védő", grip: "Bal", sweet: "Aranygaluska", power: "–", photo: "", bio: "Ha tehetné még a jégen is biciklivel tekerne" },
    ],
  },
  {
    label: "Csatár",
    players: [
      { nick: "Pitypang", name: "Kiss Péter Zoltán", num: 15, pos: "Csatár", captain: true, grip: "Bal", sweet: "Roséfröccs", power: "Hátrafelé korizva is előre gyorsulok.", photo: "assets/Players/Pitypang.png", bio: "Vezeti és összehangolja a Ménest a pályán." },
      { nick: "Fecske", name: "Czuppon Attila", num: 14, pos: "Csatár", grip: "–", sweet: "–", power: "–", photo: "assets/Players/Fecske.png", bio: "A támadók szárnyaló vezére." },
      { nick: "Lócitromka", name: "", num: 19, pos: "Csatár", grip: "–", sweet: "–", power: "–", photo: "", bio: "Fő feladata az ellenfél legjobb védőjének kiiktatása." },
      { nick: "Mályvacukor", name: "Köller József", num: 27, pos: "Csatár", grip: "–", sweet: "–", power: "–", photo: "assets/Players/Mályvacukor.png", bio: "Mogorva kívül, lágy belül – agresszív, de gólra még vár." },
      { nick: "Villámpatkó", name: "Jakab Zsolt", num: 77, pos: "Csatár", grip: "–", sweet: "–", power: "–", photo: "assets/Players/VillámPatkó.png", bio: "A korongbedobásnál nem csak édesen mosolyog." },
      { nick: "Bolyhospofi", name: "Lokár Gábor", num: 22, pos: "Csatár", grip: "–", sweet: "–", power: "–", photo: "assets/Players/Bolyhospofi.png", bio: "Az elszántsága megkérdőjelezhetetlen." },
      { nick: "Szikrácska", name: "Istvan Gergely Varga", num: 31, pos: "Csatár", grip: "Jobb", sweet: "Peroni", power: "100% találati arány a kapus fejére bemelegítéskor", photo: "assets/Players/Szikrácska.png", bio: "Tüzes láb, csillámos korcsolya – sosem áll le." },
      { nick: "KristályPatkó", name: "Hegyi Bálint", num: 87, pos: "Csatár", grip: "Jobb", sweet: "Rum-kóla", power: "Olyan egyedi csuklólövésem van, aminek az irányát még a fizika törvényei sem ismerik", photo: "", bio: "" },
    ],
  },
];

const STAFF = [
  { nick: "Árpi bácsi", name: "Sofron Árpád", icon: "🏒", pos: "Edző", photo: "assets/Players/Sofron_Árpád.png", bio: "A jég melletti higgadt fej." },
  { nick: "Áron bácsi", name: "Merkl Áron", icon: "🏒", pos: "Edző", photo: "assets/Players/Merkl_Áron.png", bio: "Tapasztalata több, mint a játékosoké összesen." },
];

// Statisztika mezők – töltsd fel, ha lesznek adatok (most "–")
// Mezőnyjátékos: Meccs / Gól / Assziszt / Pont
function statsFor() {
  return { M: "–", G: "–", A: "–", P: "–" };
}
// Kapus: Meccs / Kapott gól / Védés % / Shutout
function goalieStatsFor() {
  return { M: "–", KG: "–", SV: "–", SO: "–" };
}

(function () {
  const rinkZones = document.getElementById("rinkZones");
  const benchEl = document.getElementById("bench");
  if (!rinkZones) return;

  function skaterButton(p, opts = {}) {
    const btn = document.createElement("button");
    btn.className = "skater" + (p.captain ? " captain" : "") + (opts.staff ? " staff" : "");
    btn.type = "button";
    const badge = p.captain ? '<span class="cbadge">C</span>' : "";
    let puck;
    if (opts.staff) {
      puck = p.photo
        ? `<span class="puck has-photo"><img src="${p.photo}" alt="${p.nick}">${badge}</span>`
        : `<span class="puck">${p.icon || "🦄"}${badge}</span>`;
    } else if (p.photo) {
      puck = `<span class="puck has-photo"><img src="${p.photo}" alt="${p.nick}"><span class="num">${p.num}</span>${badge}</span>`;
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

  // Build rink zones
  ZONES.forEach((zone) => {
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

  // Build bench (staff)
  if (benchEl) {
    STAFF.forEach((p) => benchEl.appendChild(skaterButton(p, { staff: true })));
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
  const elBio = overlay.querySelector(".pm-bio");
  const elHint = overlay.querySelector(".pm-hint");

  // Mezőnyjátékos és kapus statisztikái eltérnek
  const STAT_LABELS = { M: "Meccs", G: "Gól", A: "Assziszt", P: "Pont" };
  const GOALIE_LABELS = { M: "Meccs", KG: "Kapott gól", SV: "Védés %", SO: "Shutout" };

  function addTag(text) {
    const t = document.createElement("span");
    t.className = "pm-tag";
    t.textContent = text;
    elMeta.appendChild(t);
  }

  function openModal(p, opts = {}) {
    // Photo (fallback: 🦄 / stáb ikon)
    pmPhoto.innerHTML = p.photo
      ? `<img src="${p.photo}" alt="${p.nick}">`
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
    if (opts.staff) {
      elStats.style.display = "none";
      elHint.style.display = "none";
    } else {
      elStats.style.display = "";
      elHint.style.display = "";
      const isGoalie = p.pos === "Kapus";
      const labels = isGoalie ? GOALIE_LABELS : STAT_LABELS;
      const st = isGoalie ? goalieStatsFor(p) : statsFor(p);
      Object.keys(labels).forEach((k) => {
        const box = document.createElement("div");
        box.className = "pm-stat";
        box.innerHTML = `<strong>${st[k]}</strong><span>${labels[k]}</span>`;
        elStats.appendChild(box);
      });
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
