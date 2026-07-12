// ===== Ice Unicorns – Pöccintős hoki (v1) =====
// Körökre osztott, felülnézetes flick-játék. Gép ellen vagy helyi (hotseat).
// 5v5 (4 mezőny + fél-automata kapus), 5 gólig, energia + erők.
(function () {
  var root = document.getElementById("gameRoot");
  if (!root) return;

  // --- Játékos-keret (valós fotókkal) ---
  // Teljes választható keret (a nélküli mezszámok helykitöltők – bátran írd át)
  var FIELD = [
    { n: "Pitypang", num: 15, f: "Pitypang.png" },
    { n: "Fecske", num: 14, f: "Fecske.png" },
    { n: "Villámpatkó", num: 10, f: "VillámPatkó.png" },
    { n: "Mályvacukor", num: 67, f: "Mályvacukor.png" },
    { n: "Bolyhospofi", num: 84, f: "Bolyhospofi.png" },
    { n: "Szikrácska", num: 31, f: "Szikrácska.png" },
    { n: "Patkószörny", num: 13, f: "Patkószörny.png" },
    { n: "Pöttömke", num: 9, f: "Pöttömke.png" },
    { n: "KristályPatkó", num: 87, f: "KristalyPatko.png" },
    { n: "Maszat", num: 44, f: "Maszat.png" },
  ];
  var imgCache = {};
  function imgFor(f) {
    if (!f) return null;
    if (imgCache[f]) return imgCache[f];
    var im = new Image();
    im.src = "assets/Players/" + f;
    imgCache[f] = im;
    return im;
  }
  FIELD.forEach(function (p) { imgFor(p.f); });

  // --- Pálya méretek (logikai) ---
  var W = 520, H = 760, PAD = 16;
  var RL = PAD, RR = W - PAD, RT = PAD, RB = H - PAD;
  var MOUTH = 120, ML = W / 2 - MOUTH / 2, MR = W / 2 + MOUTH / 2;
  var GBACK = 96, GDEPTH = 26, GL_T = RT + GBACK, GL_B = RB - GBACK;
  var FR = 24, GR = 22, PR = 13;
  var PINK = "#ff3d7f", NAVY = "#1b2450", GOLD = "#ffcf5c", ICE = "#e9f6ff", BLUE = "#2f6bff";

  // --- Állapot ---
  var st = {};
  function resetState() {
    st = {
      mode: "menu", vsCPU: true, diff: "közepes",
      pickA: [], pickB: [], turn: "A", scoreA: 0, scoreB: 0,
      bodies: [], puck: null, sim: false, goal: null, touched: false,
      aim: null, raf: 0,
    };
  }
  resetState();

  // ================= UI KÉPERNYŐK =================
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function showMenu() {
    stopLoop();
    root.innerHTML = "";
    var box = el("div", "g-panel");
    box.appendChild(el("h2", "g-h", "Válassz módot"));
    var modes = el("div", "g-modes");
    var mBtns = [
      { k: "cpu", t: "🤖 Gép ellen", d: "Egyedül, a gép ellen" },
      { k: "local", t: "👥 Helyi (2 játékos)", d: "Egy eszközön, felváltva" },
    ];
    mBtns.forEach(function (m) {
      var b = el("button", "g-mode" + (m.off ? " off" : ""), "<b>" + m.t + "</b><span>" + m.d + "</span>");
      if (!m.off) b.onclick = function () { st.vsCPU = m.k === "cpu"; showSelect("A"); };
      else b.disabled = true;
      modes.appendChild(b);
    });
    box.appendChild(modes);
    var rec = el("p", "g-note", "Rekord ellened a gép ellen: legtöbb gól egy meccsen: " + (localStorage.iu_hockey_rec || 0));
    box.appendChild(rec);
    root.appendChild(box);
  }

  function showSelect(team) {
    root.innerHTML = "";
    var isA = team === "A", pick = [], col = isA ? PINK : BLUE;
    var who = st.vsCPU ? "A csapatod" : (isA ? "🦄 Ménes (rózsaszín)" : "💙 Kék csapat");
    var box = el("div", "g-panel");
    var h = el("h2", "g-h", "Válogatás – " + who); h.style.color = col;
    box.appendChild(h);
    box.appendChild(el("p", "g-note", "Válassz 4 játékost. Kapus nincs – az üres kaput kell eltalálni!" + (st.vsCPU ? " Az ellenfél a maradékból áll fel." : "")));
    var grid = el("div", "g-picks");
    var excluded = (!isA && !st.vsCPU) ? st.pickA : [];
    FIELD.forEach(function (p, i) {
      if (excluded.indexOf(i) >= 0) return;
      var b = el("button", "g-pick");
      b.innerHTML = '<span class="g-face" style="background-image:url(assets/Players/' + p.f + ')"></span><span class="g-pn">' + p.n + '</span><span class="g-pnum">#' + p.num + "</span>";
      b.onclick = function () {
        var idx = pick.indexOf(i);
        if (idx >= 0) { pick.splice(idx, 1); b.classList.remove("sel"); }
        else if (pick.length < 4) { pick.push(i); b.classList.add("sel"); }
        start.disabled = pick.length !== 4;
        cnt.textContent = pick.length + " / 4 kiválasztva";
      };
      grid.appendChild(b);
    });
    box.appendChild(grid);
    var cnt = el("p", "g-note", "0 / 4 kiválasztva");
    box.appendChild(cnt);
    var row = el("div", "g-row");
    var back = el("button", "btn btn-ghost", "Vissza");
    back.onclick = function () { if (isA) showMenu(); else showSelect("A"); };
    var nextLocal = isA && !st.vsCPU;
    var start = el("button", "btn btn-primary", nextLocal ? "Tovább → 💙 Kék" : "Kezdés");
    start.disabled = true;
    start.onclick = function () {
      if (isA) { st.pickA = pick.slice(); if (nextLocal) { showSelect("B"); return; } }
      else { st.pickB = pick.slice(); }
      setupMatch();
    };
    row.appendChild(back); row.appendChild(start);
    box.appendChild(row);
    root.appendChild(box);
  }

  var elScore, elTurn, elTip, cv, ctx;
  function showPlay() {
    root.innerHTML = "";
    var wrap = el("div", "g-play");
    var hud = el("div", "g-hud");
    elScore = el("div", "g-score", '<span style="color:' + PINK + '">' + st.aName + " " + st.scoreA + '</span> : <span style="color:' + BLUE + '">' + st.scoreB + " " + st.bName + "</span>");
    elTurn = el("div", "g-turn", "");
    hud.appendChild(elScore); hud.appendChild(elTurn);
    wrap.appendChild(hud);

    cv = el("canvas", "g-canvas"); cv.width = W; cv.height = H;
    wrap.appendChild(cv);
    ctx = cv.getContext("2d");
    elTip = el("p", "g-tip", "Húzd vissza az egyik játékosodat, és engedd el!");
    wrap.appendChild(elTip);
    root.appendChild(wrap);
    bindInput();
    updHud();
    loop();
  }

  function showResult() {
    stopLoop();
    var youWin = st.scoreA > st.scoreB;
    if (st.vsCPU && st.scoreA > (+localStorage.iu_hockey_rec || 0)) localStorage.iu_hockey_rec = st.scoreA;
    root.innerHTML = "";
    var box = el("div", "g-panel");
    box.appendChild(el("h2", "g-h", youWin ? "Nyertél! 🏆🦄" : "Vereség 🥲"));
    box.appendChild(el("div", "g-bigscore", st.aName + " " + st.scoreA + " – " + st.scoreB + " " + st.bName));
    var row = el("div", "g-row");
    var again = el("button", "btn btn-primary", "Új meccs");
    again.onclick = function () { setupMatch(); };
    var menu = el("button", "btn btn-ghost", "Menü");
    menu.onclick = showMenu;
    row.appendChild(again); row.appendChild(menu);
    box.appendChild(row);
    root.appendChild(box);
  }

  // ================= MECCS FELÁLLÍTÁS =================
  function setupMatch() {
    st.scoreA = 0; st.scoreB = 0;
    var a = st.pickA.map(function (i) { return FIELD[i]; });
    var b;
    if (st.vsCPU) {
      var rest = FIELD.filter(function (p, i) { return st.pickA.indexOf(i) < 0; });
      shuffle(rest); b = rest.slice(0, 4);
    } else {
      b = st.pickB.map(function (i) { return FIELD[i]; });
    }
    st.aName = "Ménes"; st.bName = st.vsCPU ? "Gép" : "Kék";
    st.teamA = a; st.teamB = b;
    st.mode = "play";
    st.turn = "A";
    formation();
    showPlay();
  }

  function formation() {
    st.bodies = [];
    // A (te) – lent, kapu lent (y=H)
    var aPos = [[W / 2 - 120, H - 190], [W / 2 + 120, H - 190], [W / 2 - 66, H - 320], [W / 2 + 66, H - 320]];
    var bPos = [[W / 2 - 120, 190], [W / 2 + 120, 190], [W / 2 - 66, 320], [W / 2 + 66, 320]];
    st.teamA.forEach(function (p, i) { st.bodies.push(mkBody("A", "field", aPos[i][0], aPos[i][1], p)); });
    st.teamB.forEach(function (p, i) { st.bodies.push(mkBody("B", "field", bPos[i][0], bPos[i][1], p)); });
    st.puck = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: PR, m: 1, puck: true };
    st.lastTouch = null;
    st.sim = false; st.goal = null; st.aim = null;
  }
  function mkBody(team, role, x, y, player) {
    var r = role === "goalie" ? GR : FR;
    return { team: team, role: role, x: x, y: y, vx: 0, vy: 0, r: r, m: role === "goalie" ? Infinity : 3, player: player, img: player.f ? imgFor(player.f) : null };
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } }

  // ================= INPUT =================
  var boundGlobal = false;
  function bindInput() {
    cv.addEventListener("pointerdown", onDown);
    if (!boundGlobal) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      boundGlobal = true;
    }
  }
  function toLocal(e) { var b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width * W, y: (e.clientY - b.top) / b.height * H }; }
  function humanTurn() { return !st.sim && (st.turn === "A" || (st.turn === "B" && !st.vsCPU)); }
  function onDown(e) {
    if (!humanTurn()) return;
    var p = toLocal(e);
    var best = null, bd = 1e9;
    st.bodies.forEach(function (b) {
      if (b.team !== st.turn || b.role !== "field") return;
      var d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < b.r + 12 && d < bd) { bd = d; best = b; }
    });
    if (best) { st.aim = { body: best, x: p.x, y: p.y }; e.preventDefault(); }
  }
  function onMove(e) { if (st.aim) { var p = toLocal(e); st.aim.x = p.x; st.aim.y = p.y; } }
  function onUp() {
    if (!st.aim) return;
    var a = st.aim, b = a.body;
    var dx = b.x - a.x, dy = b.y - a.y;
    var speed = Math.min(Math.hypot(dx, dy) * 0.22, 24);
    var ang = Math.atan2(dy, dx);
    if (speed > 1.5) {
      b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed;
      st.activePiece = b; st.sim = true; updHud();
    }
    st.aim = null;
  }

  function updHud() {
    if (!elScore) return;
    elScore.innerHTML = '<span style="color:' + PINK + '">' + st.aName + " " + st.scoreA + '</span> : <span style="color:' + BLUE + '">' + st.scoreB + " " + st.bName + "</span>";
    var pill;
    if (st.sim) pill = ["⛸️ Csúszás…", NAVY];
    else if (st.turn === "A") pill = [st.vsCPU ? "🦄 Te jössz!" : "🦄 Ménes jön!", PINK];
    else pill = [st.vsCPU ? "🤖 Gép köre…" : "💙 Kék jön!", BLUE];
    elTurn.innerHTML = '<span class="g-turnpill" style="background:' + pill[1] + '">' + pill[0] + "</span>";
    if (elTip) {
      if (st.sim) elTip.textContent = "⛸️ Csúszik minden…";
      else if (st.turn === "A") elTip.textContent = "Húzd vissza az arany nyíllal jelölt bábuk egyikét, célozz, és engedd el!";
      else elTip.textContent = st.vsCPU ? "🤖 A gép gondolkodik…" : "Kék játékos: húzd vissza az egyik bábudat!";
    }
  }

  // ================= FIZIKA =================
  function moving() {
    if (Math.hypot(st.puck.vx, st.puck.vy) > 0.25) return true;
    for (var i = 0; i < st.bodies.length; i++) { var b = st.bodies[i]; if (b.role !== "goalie" && Math.hypot(b.vx, b.vy) > 0.25) return true; }
    return false;
  }
  function physics() {
    var movers = st.bodies.filter(function (b) { return b.role !== "goalie"; }).concat([st.puck]);
    st.puck.py = st.puck.y;
    // integrálás + súrlódás
    movers.forEach(function (b) { b.x += b.vx; b.y += b.vy; b.vx *= 0.968; b.vy *= 0.968; if (Math.abs(b.vx) < 0.09) b.vx = 0; if (Math.abs(b.vy) < 0.09) b.vy = 0; });
    // palánk – mindig pattan (a kapu beljebb van, mögötte játszható jég)
    movers.forEach(function (b) {
      if (b.x - b.r < RL) { b.x = RL + b.r; b.vx = -b.vx * 0.82; }
      if (b.x + b.r > RR) { b.x = RR - b.r; b.vx = -b.vx * 0.82; }
      if (b.y - b.r < RT) { b.y = RT + b.r; b.vy = -b.vy * 0.82; }
      if (b.y + b.r > RB) { b.y = RB - b.r; b.vy = -b.vy * 0.82; }
    });
    // kapufák (pattanás)
    var posts = [[ML, GL_T], [MR, GL_T], [ML, GL_B], [MR, GL_B]];
    movers.forEach(function (b) {
      for (var pi = 0; pi < 4; pi++) {
        var px = posts[pi][0], py = posts[pi][1], dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy), mn = b.r + 5;
        if (d > 0 && d < mn) { var nx = dx / d, ny = dy / d; b.x = px + nx * mn; b.y = py + ny * mn; var vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; } }
      }
    });
    // kapu vasak: hátsó gerenda + oldalrudak – ezeken nem lehet átmenni
    movers.forEach(function (b) {
      segColl(b, ML, GL_T - GDEPTH, MR, GL_T - GDEPTH);
      segColl(b, ML, GL_T - GDEPTH, ML, GL_T);
      segColl(b, MR, GL_T - GDEPTH, MR, GL_T);
      segColl(b, ML, GL_B + GDEPTH, MR, GL_B + GDEPTH);
      segColl(b, ML, GL_B, ML, GL_B + GDEPTH);
      segColl(b, MR, GL_B, MR, GL_B + GDEPTH);
    });
    // gól: a korong átlépi a gólvonalat a kapun belül
    if (!st.goal) {
      var pk = st.puck, inM = pk.x > ML + 2 && pk.x < MR - 2;
      if (inM) {
        if (pk.py >= GL_T && pk.y < GL_T) scoreGoal("A");
        else if (pk.py <= GL_B && pk.y > GL_B) scoreGoal("B");
      }
    }
    // ütközések (mezőnyök + korong + kapusok)
    var all = st.bodies.concat([st.puck]);
    for (var i = 0; i < all.length; i++) for (var j = i + 1; j < all.length; j++) collide(all[i], all[j]);
  }
  function segColl(b, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
    var t = len2 ? Math.max(0, Math.min(1, ((b.x - x1) * dx + (b.y - y1) * dy) / len2)) : 0;
    var cx = x1 + dx * t, cy = y1 + dy * t;
    var ex = b.x - cx, ey = b.y - cy, d = Math.hypot(ex, ey), min = b.r + 3;
    if (d === 0 || d >= min) return;
    var nx = ex / d, ny = ey / d;
    b.x = cx + nx * min; b.y = cy + ny * min;
    var vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; }
  }
  function collide(a, b) {
    var invA = a.m === Infinity ? 0 : 1 / a.m, invB = b.m === Infinity ? 0 : 1 / b.m;
    if (invA === 0 && invB === 0) return;
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
    if (d === 0 || d >= min) return;
    var nx = dx / d, ny = dy / d, overlap = min - d, tot = invA + invB;
    a.x -= nx * overlap * (invA / tot); a.y -= ny * overlap * (invA / tot);
    b.x += nx * overlap * (invB / tot); b.y += ny * overlap * (invB / tot);
    var rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv < 0) {
      var jimp = -(1.9) * rv / tot;
      a.vx -= jimp * invA * nx; a.vy -= jimp * invA * ny;
      b.vx += jimp * invB * nx; b.vy += jimp * invB * ny;
    }
    // korong-érintés: az utolsó érintő lesz a gólszerző
    if (a === st.puck || b === st.puck) {
      var other = a === st.puck ? b : a;
      if (other.role === "field") st.lastTouch = other;
    }
  }

  function scoreGoal(team) {
    if (st.goal) return;
    st.goal = team;
    var t = st.lastTouch;
    st.goalScorer = t ? { name: t.player.n, num: t.player.num, img: t.img, own: t.team !== team } : null;
    st.puck.vx = 0; st.puck.vy = 0;
    if (team === "A") st.scoreA++; else st.scoreB++;
  }

  function endTurn() {
    st.sim = false;
    st.activePiece = null;
    if (st.goal) {
      var conceded = st.goal === "A" ? "B" : "A";
      var done = st.scoreA >= 5 || st.scoreB >= 5;
      var g = st.goal; st.goal = null;
      flash = { t: 120, col: g === "A" ? PINK : BLUE, forA: g === "A", scorer: st.goalScorer };
      if (done) { setTimeout(showResult, 900); return; }
      formation();
      st.turn = conceded;
    } else {
      st.turn = st.turn === "A" ? "B" : "A";
    }
    updHud();
    if (st.turn === "B" && st.vsCPU) setTimeout(cpuMove, 620);
  }

  // ================= GÉP =================
  function cpuMove() {
    if (st.mode !== "play" || st.sim || st.turn !== "B") return;
    var puck = st.puck, goal = { x: W / 2, y: H }; // B a lenti (A) kapura lő
    var best = null, bs = -1e9;
    st.bodies.forEach(function (b) {
      if (b.team !== "B" || b.role !== "field") return;
      // jó, ha a korong "alatta" van (b.y < puck.y) → lefelé tudja tolni
      var behind = puck.y - b.y;
      var d = Math.hypot(b.x - puck.x, b.y - puck.y);
      var s = behind - d * 0.5;
      if (s > bs) { bs = s; best = b; }
    });
    if (!best) return;
    // célpont: a korongon túl a kapu felé
    var aimX = puck.x + (goal.x - puck.x) * 0.25;
    var aimY = puck.y + (goal.y - puck.y) * 0.22;
    var ang = Math.atan2(aimY - best.y, aimX - best.x);
    var noise = st.diff === "nehéz" ? 0.12 : 0.26;
    ang += (Math.random() - 0.5) * noise;
    var speed = 17 + Math.random() * 5;
    best.vx = Math.cos(ang) * speed; best.vy = Math.sin(ang) * speed;
    st.activePiece = best; st.sim = true; updHud();
  }

  // ================= RAJZ + LOOP =================
  var flash = null, simFrames = 0;
  function loop() {
    if (st.mode !== "play") return;
    try {
      if (st.sim) {
        physics(); simFrames++;
        if (!moving() || st.goal || simFrames > 300) { simFrames = 0; endTurn(); }
      } else simFrames = 0;
      draw();
    } catch (err) { console.error("LOOP hiba:", err); }
    st.raf = requestAnimationFrame(loop);
  }
  function stopLoop() { if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; st.mode = st.mode === "play" ? st.mode : st.mode; }

  function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  function draw() {
    if (!ctx) return;
    var tN = performance.now() / 1000;
    // keret = a soros csapat színe (erős kör-jelzés)
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = st.turn === "A" ? PINK : BLUE; ctx.fillRect(0, 0, W, H);
    // jég
    ctx.fillStyle = ICE; roundRect(RL, RT, RR - RL, RB - RT, 44); ctx.fill();
    ctx.lineCap = "round";
    // gólvonalak (teljes szélesség)
    ctx.strokeStyle = "#e63950"; ctx.lineWidth = 2.5; line(RL + 6, GL_T, RR - 6, GL_T); line(RL + 6, GL_B, RR - 6, GL_B);
    // kék vonalak
    ctx.strokeStyle = BLUE; ctx.globalAlpha = 0.55; ctx.lineWidth = 5; line(RL + 6, H * 0.34, RR - 6, H * 0.34); line(RL + 6, H * 0.66, RR - 6, H * 0.66); ctx.globalAlpha = 1;
    // piros középvonal
    ctx.strokeStyle = "#e63950"; ctx.lineWidth = 5; line(RL + 6, H / 2, RR - 6, H / 2);
    // középkör + kék középpont + kabala
    ctx.strokeStyle = BLUE; ctx.globalAlpha = 0.55; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(W / 2, H / 2, 50, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = BLUE; dot(W / 2, H / 2, 5);
    ctx.globalAlpha = 0.15; ctx.font = "42px sans-serif"; ctx.textAlign = "center"; ctx.fillText("🦄", W / 2, H / 2 + 15); ctx.globalAlpha = 1;
    // bulikörök (faceoff) + pontok
    ctx.strokeStyle = "#e63950"; ctx.globalAlpha = 0.4; ctx.lineWidth = 2.5;
    [[130, 176], [390, 176], [130, H - 176], [390, H - 176]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 32, 0, 7); ctx.stroke(); });
    ctx.globalAlpha = 1; ctx.fillStyle = "#e63950";
    [[130, 176], [390, 176], [130, H - 176], [390, H - 176]].forEach(function (p) { dot(p[0], p[1], 4); });
    // kapuk
    drawNet(true); drawNet(false);
    // palánk + arany rúgódeszka
    ctx.strokeStyle = NAVY; ctx.lineWidth = 6; roundRect(RL, RT, RR - RL, RB - RT, 44); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.globalAlpha = 0.9; ctx.lineWidth = 2.5; roundRect(RL + 5, RT + 5, RR - RL - 10, RB - RT - 10, 38); ctx.stroke(); ctx.globalAlpha = 1;
    // korong
    ctx.fillStyle = "#0a0f1f"; ctx.beginPath(); ctx.arc(st.puck.x, st.puck.y, PR, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(st.puck.x, st.puck.y, PR - 1, 0, 7); ctx.stroke();
    // bábuk
    st.bodies.forEach(function (b) { drawBody(b, tN); });
    // célzás: vonal + végpont + erő-csík
    if (st.aim) {
      var b = st.aim.body, dx = b.x - st.aim.x, dy = b.y - st.aim.y;
      var ex = b.x + dx, ey = b.y + dy;
      var pct = Math.min(Math.hypot(dx, dy) * 0.22, 24) / 24;
      ctx.strokeStyle = "rgba(255,61,127,.65)"; ctx.setLineDash([7, 6]); ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pct > 0.85 ? "#e11d48" : "rgba(255,61,127,.9)"; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, 7); ctx.fill();
      var bw = 52, bx = b.x - bw / 2, by = b.y - b.r - 22;
      ctx.fillStyle = "rgba(27,36,80,.25)"; ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = pct > 0.85 ? "#e11d48" : GOLD; ctx.fillRect(bx, by, bw * pct, 7);
      ctx.strokeStyle = NAVY; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, 7);
    }
    if (flash && flash.t > 0) {
      flash.t--;
      var cw = 330, ch = 104, cx0 = W / 2 - cw / 2, cy0 = H / 2 - 160;
      ctx.globalAlpha = 0.97; ctx.fillStyle = "#fff"; roundRect(cx0, cy0, cw, ch, 22); ctx.fill();
      ctx.globalAlpha = 1; ctx.lineWidth = 4; ctx.strokeStyle = flash.col; roundRect(cx0, cy0, cw, ch, 22); ctx.stroke();
      var sc = flash.scorer, pcx = cx0 + 56, pcy = cy0 + ch / 2, pr2 = 36;
      ctx.save(); ctx.beginPath(); ctx.arc(pcx, pcy, pr2, 0, 7); ctx.closePath(); ctx.fillStyle = "#eef2fa"; ctx.fill();
      if (sc && sc.img && sc.img.complete && sc.img.naturalWidth) { ctx.clip(); ctx.drawImage(sc.img, pcx - pr2, pcy - pr2, pr2 * 2, pr2 * 2); }
      else { ctx.fillStyle = flash.col; ctx.font = "700 20px 'Baloo 2',sans-serif"; ctx.textAlign = "center"; ctx.fillText(sc ? "#" + sc.num : "🦄", pcx, pcy + 7); }
      ctx.restore();
      ctx.lineWidth = 4; ctx.strokeStyle = flash.col; ctx.beginPath(); ctx.arc(pcx, pcy, pr2, 0, 7); ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillStyle = flash.col; ctx.font = "800 26px 'Baloo 2',sans-serif";
      ctx.fillText(sc && sc.own ? "ÖNGÓL! 😬" : (flash.forA ? "GÓÓÓL! 🦄" : "GÓÓÓL!"), cx0 + 106, cy0 + 46);
      ctx.fillStyle = NAVY; ctx.font = "700 18px 'Baloo 2',sans-serif";
      ctx.fillText(sc ? sc.name + "  #" + sc.num : (flash.forA ? "Ménes" : st.bName), cx0 + 106, cy0 + 76);
      if (flash.t <= 0) flash = null;
    }
  }
  function drawNet(top) {
    var gl = top ? GL_T : GL_B, back = top ? gl - GDEPTH : gl + GDEPTH, y0 = Math.min(gl, back);
    // kapuelőtér (crease) a pálya közepe felé
    ctx.fillStyle = "rgba(47,107,255,.10)";
    ctx.beginPath(); ctx.arc(W / 2, gl, 46, top ? 0 : Math.PI, top ? Math.PI : 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(47,107,255,.35)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(W / 2, gl, 46, top ? 0 : Math.PI, top ? Math.PI : 0); ctx.stroke();
    // háló (a gólvonal mögött, a palánk felé)
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fillRect(ML, y0, MOUTH, GDEPTH);
    ctx.strokeStyle = "rgba(27,36,80,.16)"; ctx.lineWidth = 1;
    for (var gx = ML + 11; gx < MR; gx += 13) line(gx, y0, gx, y0 + GDEPTH);
    for (var gy = y0 + 8; gy < y0 + GDEPTH; gy += 9) line(ML, gy, MR, gy);
    // kapu keret: hátsó gerenda + oldalrudak (a szája a közép felé nyitott)
    ctx.strokeStyle = "#e11d48"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(ML, gl); ctx.lineTo(ML, back); ctx.lineTo(MR, back); ctx.lineTo(MR, gl); ctx.stroke();
    // kapufák (elöl, a gólvonalon)
    ctx.fillStyle = "#e11d48"; dot(ML, gl, 5); dot(MR, gl, 5);
  }
  function drawBody(b, tN) {
    var col = b.team === "A" ? PINK : BLUE;
    var mySel = !st.sim && st.mode === "play" && b.role === "field" && b.team === st.turn && (st.turn === "A" || !st.vsCPU);
    var isAim = st.aim && st.aim.body === b;
    ctx.globalAlpha = 0.2; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.closePath();
    ctx.fillStyle = "#fff"; ctx.fill();
    if (b.img && b.img.complete && b.img.naturalWidth) { ctx.clip(); ctx.drawImage(b.img, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); }
    else { ctx.fillStyle = b.role === "goalie" ? "#dfe4ef" : col; ctx.fill(); ctx.fillStyle = b.role === "goalie" ? NAVY : "#fff"; ctx.textAlign = "center"; ctx.font = "700 15px 'Baloo 2',sans-serif"; ctx.fillText("#" + b.player.num, b.x, b.y + 5); }
    ctx.restore();
    ctx.lineWidth = 4.5; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 3, 0, 7); ctx.stroke();
    // mozgatható bábu: forgó arany gyűrű + pattogó nyíl
    if (mySel) {
      ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.setLineDash([7, 8]); ctx.lineDashOffset = -tN * 26;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 8, 0, 7); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      if (!isAim) {
        var ay = b.y - b.r - 17 + Math.sin(tN * 4 + b.x) * 3;
        ctx.fillStyle = GOLD; ctx.strokeStyle = NAVY; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(b.x - 8, ay - 9); ctx.lineTo(b.x + 8, ay - 9); ctx.lineTo(b.x, ay + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
  }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  showMenu();
})();
