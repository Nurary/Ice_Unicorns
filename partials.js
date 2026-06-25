// Shared header/footer + behaviors for all pages.
(function () {
  const NAV = [
    { href: "index.html", label: "Kezdőlap" },
    { href: "rolunk.html", label: "Rólunk" },
    { href: "munkank.html", label: "Munkánk" },
    { href: "galeria.html", label: "Galéria" },
    { href: "csapat.html", label: "Csapat" },
    { href: "ob4d.html", label: "OB4D" },
    { href: "kapcsolat.html", label: "Kapcsolat", cta: true },
  ];

  // Current page filename (default to index.html)
  let current = location.pathname.split("/").pop();
  if (!current) current = "index.html";

  const links = NAV.map((n) => {
    const cls = [n.cta ? "nav-cta" : "", n.href === current ? "active" : ""]
      .filter(Boolean)
      .join(" ");
    return `<a href="${n.href}"${cls ? ` class="${cls}"` : ""}>${n.label}</a>`;
  }).join("\n        ");

  const headerHTML = `
    <div class="aurora" aria-hidden="true">
      <span class="blob blob-1"></span>
      <span class="blob blob-2"></span>
      <span class="blob blob-3"></span>
    </div>
    <header class="site-header" id="header">
      <div class="container nav-wrap">
        <a href="index.html" class="brand">
          <img src="assets/logo/logo.jpg" alt="Ice Unicorns logó" class="brand-logo" onerror="this.style.display='none'" />
          <span class="brand-text">Ice <strong>Unicorns</strong></span>
        </a>
        <nav class="nav" id="nav">
        ${links}
        </nav>
        <button class="nav-toggle" id="navToggle" aria-label="Menü" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>`;

  const year = new Date().getFullYear();
  const footerHTML = `
    <footer class="site-footer">
      <div class="container footer-inner">
        <a href="index.html" class="brand">
          <img src="assets/logo/logo.jpg" alt="Ice Unicorns logó" class="brand-logo" onerror="this.style.display='none'" />
          <span class="brand-text">Ice <strong>Unicorns</strong></span>
        </a>
        <p class="footer-tag">Jégkorong szeretet Székesfehérváron</p>
        <div class="footer-social">
          <a href="https://facebook.com/iceunicorns" target="_blank" rel="noopener" class="social-btn" aria-label="Ice Unicorns a Facebookon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z"/></svg>
          </a>
          <a href="mailto:info@iceunicorns.hu" class="social-btn" aria-label="Email küldése">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
          </a>
        </div>
        <p class="copyright">© ${year} Ice Unicorns Hockey Team. Minden jog fenntartva.</p>
      </div>
    </footer>`;

  // Inject
  const headerSlot = document.getElementById("app-header");
  const footerSlot = document.getElementById("app-footer");
  if (headerSlot) headerSlot.outerHTML = headerHTML;
  if (footerSlot) footerSlot.outerHTML = footerHTML;

  // ---- Behaviors ----
  const header = document.getElementById("header");

  // Vissza a tetejére gomb
  const toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Vissza a tetejére");
  toTop.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
  toTop.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );
  document.body.appendChild(toTop);

  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 20);
    toTop.classList.toggle("show", y > 500);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const navToggle = document.getElementById("navToggle");
  const nav = document.getElementById("nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Reveal on scroll
  const revealTargets = document.querySelectorAll(
    ".section-head, .card, .work-item, .g-item, .player, .ob4d-banner, .contact-info, .contact-form, .about-lead, .page-hero"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in"));
  }

  // Contact form (Phase 0: mailto fallback)
  const form = document.getElementById("contactForm");
  if (form) {
    const status = document.getElementById("formStatus");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!name || !validEmail || !message) {
        status.textContent =
          "Kérlek tölts ki minden mezőt érvényes email címmel.";
        status.className = "form-status err";
        return;
      }
      const subject = encodeURIComponent(`Üzenet az oldalról – ${name}`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:info@iceunicorns.hu?subject=${subject}&body=${body}`;
      status.textContent =
        "Köszönjük! Megnyitottuk a levelezőt az üzenet elküldéséhez.";
      status.className = "form-status ok";
      form.reset();
    });
  }

  // Galéria lightbox (csak a galéria oldalon)
  const galleryImgs = Array.from(document.querySelectorAll(".gallery-grid img"));
  if (galleryImgs.length) {
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML =
      '<button class="lb-close" aria-label="Bezárás">×</button>' +
      '<button class="lb-nav lb-prev" aria-label="Előző kép">‹</button>' +
      '<img class="lb-img" alt="" />' +
      '<button class="lb-nav lb-next" aria-label="Következő kép">›</button>';
    document.body.appendChild(lb);
    const lbImg = lb.querySelector(".lb-img");
    let idx = 0;
    const show = (i) => {
      idx = (i + galleryImgs.length) % galleryImgs.length;
      lbImg.src = galleryImgs[idx].currentSrc || galleryImgs[idx].src;
      lbImg.alt = galleryImgs[idx].alt || "";
    };
    const open = (i) => {
      show(i);
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      lb.classList.remove("open");
      document.body.style.overflow = "";
    };
    galleryImgs.forEach((im, i) => {
      im.style.cursor = "zoom-in";
      im.addEventListener("click", () => open(i));
    });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", (e) => {
      e.stopPropagation();
      show(idx - 1);
    });
    lb.querySelector(".lb-next").addEventListener("click", (e) => {
      e.stopPropagation();
      show(idx + 1);
    });
    lb.addEventListener("click", (e) => {
      if (e.target === lb) close();
    });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    });
  }
})();
