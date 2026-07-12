// Galéria: a assets/Galery mappa összes képét betölti a manifest alapján.
// Ami a böngészőben nem jeleníthető meg (pl. HEIC), azt csendben kihagyja.
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
      list.forEach(function (fn) {
        var fig = document.createElement("figure");
        fig.className = "g-item";
        var img = document.createElement("img");
        img.src = "assets/Galery/" + encodeURIComponent(fn);
        img.alt = "Ice Unicorns – " + fn.replace(/\.[^.]+$/, "");
        img.loading = "lazy";
        img.decoding = "async";
        img.style.cursor = "zoom-in";
        img.onerror = function () { fig.remove(); }; // nem megjeleníthető formátum (HEIC stb.)
        fig.appendChild(img);
        grid.appendChild(fig);
      });
      setupLightbox();
    });

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
      imgs = Array.prototype.slice.call(grid.querySelectorAll("img"));
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
