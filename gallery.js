// Galéria: a assets/Galery mappa összes képét betölti a manifest alapján.
// Ami a böngészőben nem jeleníthető meg (pl. HEIC), azt csendben kihagyja.
// Az almappák albumok: ha van legalább egy, a képek fölött albumválasztó
// gombsor jelenik meg (a választás a címben is megmarad: galeria.html#album=…).
(function () {
  var grid = document.getElementById("galleryGrid");
  if (!grid) return;
  var note = document.getElementById("galleryNote");

  fetch("assets/Galery/manifest.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : []; })
    .catch(function () { return []; })
    .then(function (list) {
      if (!Array.isArray(list) || !list.length) {
        if (note) note.textContent = "A galéria hamarosan feltöltésre kerül. 🦄";
        return;
      }
      var VEGYES = "Vegyes";
      var albums = [];
      list.forEach(function (fn) {
        var slash = fn.lastIndexOf("/");
        var album = slash > 0 ? fn.slice(0, slash) : VEGYES;
        var base = fn.slice(slash + 1);
        if (albums.indexOf(album) < 0) albums.push(album);
        var fig = document.createElement("figure");
        fig.className = "g-item";
        fig.dataset.album = album;
        var img = document.createElement("img");
        img.src = "assets/Galery/" + fn.split("/").map(encodeURIComponent).join("/");
        img.alt = "Ice Unicorns – " + (album !== VEGYES ? album + " – " : "") + base.replace(/\.[^.]+$/, "");
        img.loading = "lazy";
        img.decoding = "async";
        img.style.cursor = "zoom-in";
        img.onerror = function () { fig.remove(); }; // nem megjeleníthető formátum (HEIC stb.)
        fig.appendChild(img);
        grid.appendChild(fig);
      });
      if (albums.length > 1) setupAlbums(albums);
      setupLightbox();
    });

  function setupAlbums(albums) {
    var bar = document.createElement("div");
    bar.className = "g-albums";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Albumok");
    var count = function (a) {
      return a ? grid.querySelectorAll('[data-album="' + CSS.escape(a) + '"]').length : grid.children.length;
    };
    [""].concat(albums).forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "g-album";
      b.dataset.album = a;
      b.appendChild(document.createTextNode(a || "Összes"));
      var n = document.createElement("span");
      n.textContent = count(a);
      b.appendChild(n);
      bar.appendChild(b);
    });
    grid.parentNode.insertBefore(bar, grid);

    function select(a, updateHash) {
      if (albums.indexOf(a) < 0) a = "";
      Array.prototype.forEach.call(bar.children, function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.album === a));
      });
      Array.prototype.forEach.call(grid.children, function (fig) {
        fig.hidden = !!a && fig.dataset.album !== a;
      });
      if (updateHash && history.replaceState) {
        history.replaceState(null, "", a ? "#album=" + encodeURIComponent(a) : location.pathname);
      }
    }
    bar.addEventListener("click", function (e) {
      var b = e.target.closest(".g-album");
      if (b) select(b.dataset.album, true);
    });
    var m = /^#album=(.*)$/.exec(location.hash);
    var start = "";
    if (m) {
      try { start = decodeURIComponent(m[1]); } catch (err) {}
    }
    select(start, false);
  }

  function setupLightbox() {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML =
      '<button class="lb-close" aria-label="Bezárás">×</button>' +
      '<button class="lb-nav lb-prev" aria-label="Előző kép">‹</button>' +
      '<img class="lb-img" alt="" />' +
      '<button class="lb-nav lb-next" aria-label="Következő kép">›</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector(".lb-img");
    var imgs = [], idx = 0;
    function show(i) {
      idx = (i + imgs.length) % imgs.length;
      lbImg.src = imgs[idx].currentSrc || imgs[idx].src;
      lbImg.alt = imgs[idx].alt || "";
    }
    function open(target) {
      // Csak a kiválasztott album képei között lapozunk
      imgs = Array.prototype.slice.call(grid.querySelectorAll(".g-item:not([hidden]) img"));
      var i = imgs.indexOf(target);
      if (i < 0) return;
      show(i);
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function close() { lb.classList.remove("open"); document.body.style.overflow = ""; }
    grid.addEventListener("click", function (e) {
      if (e.target && e.target.tagName === "IMG") open(e.target);
    });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function (e) { e.stopPropagation(); show(idx - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function (e) { e.stopPropagation(); show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    });
  }
})();
