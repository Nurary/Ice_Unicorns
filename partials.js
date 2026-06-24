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
  const onScroll = () =>
    header && header.classList.toggle("scrolled", window.scrollY > 20);
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
})();
