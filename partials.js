// Shared header/footer + behaviors for all pages.
(function () {
  const NAV = [
    { href: "index.html", label: "Kezdőlap" },
    { href: "rolunk.html", label: "Rólunk" },
    { href: "munkank.html", label: "Munkánk" },
    { href: "galeria.html", label: "Galéria" },
    { href: "ob4c.html", label: "OB4C" },
    { href: "ob4d.html", label: "OB4D" },
    { href: "jatek.html", label: "Játék" },
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
    ".section-head, .card, .work-item, .g-item, .player, .cta-banner, .next-match, .league-block, .contact-info, .contact-form, .about-lead, .page-hero"
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

  // ---- Al-fülek (Bajnokság / Csapat) ----
  // Egy [data-tabs] konténeren belül a [data-tab] gombok kapcsolgatják az azonos
  // nevű [data-panel] blokkokat. Egy névhez több panel is tartozhat (pl. hero + tartalom).
  const tabsRoot = document.querySelector("[data-tabs]");
  if (tabsRoot) {
    const buttons = Array.from(tabsRoot.querySelectorAll("[data-tab]"));
    const panels = Array.from(tabsRoot.querySelectorAll("[data-panel]"));
    const names = buttons.map((b) => b.dataset.tab);

    const activate = (name, updateHash) => {
      if (!names.includes(name)) name = names[0];
      buttons.forEach((b) => {
        const on = b.dataset.tab === name;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => {
        const on = p.dataset.panel === name;
        p.hidden = !on;
        p.setAttribute("aria-hidden", String(!on));
      });
      // Mélylinkelhető (#csapat / #bajnoksag) – görgetés nélkül
      if (updateHash && history.replaceState) {
        history.replaceState(null, "", "#" + name);
      }
    };

    buttons.forEach((b) => {
      b.addEventListener("click", () => activate(b.dataset.tab, true));
    });

    // Nyilakkal is lehet váltani a füleken
    tabsRoot.addEventListener("keydown", (e) => {
      if (!buttons.includes(e.target)) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      const next = buttons[(buttons.indexOf(e.target) + step + buttons.length) % buttons.length];
      activate(next.dataset.tab, true);
      next.focus();
    });

    activate(location.hash.replace("#", ""), false);
    window.addEventListener("hashchange", () =>
      activate(location.hash.replace("#", ""), false)
    );
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

  // (A galéria + lightbox külön a gallery.js-ben van.)
})();
