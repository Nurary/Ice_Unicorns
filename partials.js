// Shared header/footer + behaviors for all pages.
(function () {
  // ===== Beállítások =====
  //
  // Látogatottságmérés – Umami (https://cloud.umami.is, ingyenes csomag).
  // A „Website ID” a Umami felületén: Settings → Websites → Edit. Amíg üres,
  // nincs mérés. Sütit nem használ, ezért cookie-banner sem kell hozzá.
  const UMAMI_WEBSITE_ID = "66e84dea-85cb-4e5f-8625-8c13d0852b34";

  // Kapcsolatűrlap – Web3Forms (https://web3forms.com, ingyenes). Az
  // info@iceunicorns.hu címmel kért „Access Key” ide jön; ez nyilvános kulcs,
  // nyugodtan lehet a kódban. Amíg üres, az űrlap a látogató levelezőjét
  // nyitja meg (mailto), mint eddig.
  const WEB3FORMS_KEY = "42897af6-c0a3-43f5-845c-260152f942d8";

  // Meccs előtti értesítés – OneSignal (https://onesignal.com, ingyenes
  // webes push). Az „App ID” a OneSignal felületén: Settings → Keys & IDs.
  // Amíg üres, az „Értesítést kérek” gomb sehol nem jelenik meg. Az
  // értesítéseket a .github/workflows/meccs-ertesites.yml küldi ki.
  const ONESIGNAL_APP_ID = "";

  // Támogatóink – a lábléc és a Támogatás oldal ebből építkezik. Egy sor:
  //   { name: "Cég neve", logo: "assets/tamogatok/ceg.png", url: "https://ceg.hu" }
  // A logó elhagyható (akkor a név látszik), az url is. Amíg a lista üres,
  // a láblécben nem jelenik meg semmi, a Támogatás oldalon pedig egy
  // „Itt lehetne a te logód” kártya.
  const TAMOGATOK = [];

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Egy támogató: logó (ha van) vagy név, linkkel (ha van)
  const sponsorHTML = (t) => {
    const inner = t.logo
      ? `<img src="${esc(t.logo)}" alt="${esc(t.name)}" loading="lazy" />`
      : `<span>${esc(t.name)}</span>`;
    return t.url
      ? `<a class="sponsor" href="${esc(t.url)}" target="_blank" rel="noopener" title="${esc(t.name)}" data-umami-event="tamogato-kattintas" data-umami-event-nev="${esc(t.name)}">${inner}</a>`
      : `<span class="sponsor" title="${esc(t.name)}">${inner}</span>`;
  };
  const NAV = [
    { href: "index.html", label: "Kezdőlap" },
    { href: "rolunk.html", label: "Rólunk" },
    { href: "munkank.html", label: "Munkánk" },
    { href: "galeria.html", label: "Galéria" },
    { href: "ob4c.html", label: "OB4C" },
    { href: "ob4d.html", label: "OB4D" },
    { href: "jatek.html", label: "Játék" },
    { href: "tamogatas.html", label: "Támogatás" },
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
        <button class="theme-toggle" id="themeToggle" type="button" aria-label="Sötét mód" aria-pressed="false">
          <svg class="ic-moon" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
          <svg class="ic-sun" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </button>
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
        ${TAMOGATOK.length ? `<div class="footer-sponsors"><span>Támogatóink</span><div class="sponsor-row">${TAMOGATOK.map(sponsorHTML).join("")}</div></div>` : ""}
        <div class="footer-social">
          <a href="https://facebook.com/iceunicorns" target="_blank" rel="noopener" class="social-btn" aria-label="Ice Unicorns a Facebookon" data-umami-event="facebook">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z"/></svg>
          </a>
          <a href="kapcsolat.html#contactForm" class="social-btn" aria-label="Írj nekünk">
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

  // ---- Sötét / világos mód ----
  // A választás előre, a <head>-ben lévő apró script alkalmazza, hogy ne
  // villanjon fel a másik mód. Itt már csak a gomb kezelése marad.
  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    const root = document.documentElement;
    const rendszerSotet = window.matchMedia("(prefers-color-scheme: dark)");

    // Ha nincs kézi választás, a rendszerbeállítás dönt
    const aktualis = () =>
      root.dataset.theme || (rendszerSotet.matches ? "dark" : "light");

    const gombFrissit = () => {
      const sotet = aktualis() === "dark";
      themeBtn.classList.toggle("is-dark", sotet);
      themeBtn.setAttribute("aria-pressed", String(sotet));
      themeBtn.setAttribute("aria-label", sotet ? "Világos mód" : "Sötét mód");
      themeBtn.title = sotet ? "Váltás világos módra" : "Váltás sötét módra";
    };

    themeBtn.addEventListener("click", () => {
      const uj = aktualis() === "dark" ? "light" : "dark";
      root.dataset.theme = uj;
      try { localStorage.setItem("theme", uj); } catch (e) { /* privát mód */ }
      gombFrissit();
    });

    // Rendszerbeállítás változása csak akkor számít, ha nincs kézi választás
    rendszerSotet.addEventListener("change", () => {
      if (!root.dataset.theme) gombFrissit();
    });

    gombFrissit();
  }

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

  // ---- Kapcsolatűrlap ----
  // Web3Forms-kulccsal az üzenet közvetlenül az info@iceunicorns.hu-ra megy;
  // kulcs nélkül (vagy ha a küldés nem sikerül) a levelezőprogram nyílik meg.
  const form = document.getElementById("contactForm");
  if (form) {
    const status = document.getElementById("formStatus");
    const submitBtn = form.querySelector('button[type="submit"]');
    const setStatus = (text, ok) => {
      status.textContent = text;
      status.className = "form-status " + (ok ? "ok" : "err");
    };
    // kapcsolat.html?tema=tamogatas – a Támogatás oldal gombjai így hoznak
    // ide: a tárgyban látszik, hogy támogatásról van szó
    let tema = "";
    try {
      tema = new URLSearchParams(location.search).get("tema") || "";
    } catch (e) {}
    const subjectFor = (name) =>
      (tema === "tamogatas" ? "Támogatás" : "Üzenet az oldalról") + ` – ${name}`;
    if (tema === "tamogatas") {
      const msg = form.querySelector("#message");
      if (msg) msg.placeholder = "Hogyan támogatnád a csapatot? (cég, elérhetőség, elképzelés)";
    }
    const mailtoHref = (name, email, message) =>
      `mailto:info@iceunicorns.hu?subject=${encodeURIComponent(subjectFor(name))}` +
      `&body=${encodeURIComponent(`${message}\n\n— ${name} (${email})`)}`;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!name || !validEmail || !message) {
        setStatus("Kérlek tölts ki minden mezőt érvényes email címmel.", false);
        return;
      }
      // Rejtett mező: ember nem látja, csak a spamrobotok töltik ki
      if (data.get("botcheck")) return;

      if (!WEB3FORMS_KEY) {
        window.location.href = mailtoHref(name, email, message);
        setStatus("Köszönjük! Megnyitottuk a levelezőt az üzenet elküldéséhez.", true);
        form.reset();
        return;
      }

      submitBtn.disabled = true;
      setStatus("Küldés…", true);
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: subjectFor(name),
          from_name: "iceunicorns.hu",
          name,
          email,
          message,
        }),
      })
        .then((r) => r.json().catch(() => ({})).then((j) => (r.ok && j.success ? j : Promise.reject(j))))
        .then(() => {
          setStatus("Köszönjük, megkaptuk az üzeneted! Hamarosan válaszolunk. 🦄", true);
          form.reset();
          if (window.umami) window.umami.track("kapcsolat-urlap");
        })
        .catch(() => {
          status.className = "form-status err";
          status.innerHTML =
            "Hoppá, most nem sikerült elküldeni. " +
            `<a href="${esc(mailtoHref(name, email, message))}">Küldd el emailben</a>, vagy próbáld újra később.`;
        })
        .finally(() => {
          submitBtn.disabled = false;
        });
    });
  }

  // ---- Támogatók a Támogatás oldalon ----
  // Amíg nincs támogató, a „Itt lehetne a te logód” kártya csak felirat (a
  // fenti „Írj nekünk” gomb úgyis ott van); ha már van, a „+ Te is” kártya
  // kattintható, és emailt nyit.
  const sponsorsHost = document.querySelector("[data-sponsors]");
  if (sponsorsHost) {
    const ctaText = "<span>Írj nekünk, és a logód itt és az oldal láblécében is megjelenik.</span>";
    sponsorsHost.innerHTML = TAMOGATOK.length
      ? TAMOGATOK.map(sponsorHTML).join("") +
        `<a class="sponsor sponsor-cta" href="kapcsolat.html?tema=tamogatas#contactForm" data-umami-event="tamogatoi-ajanlat">` +
        `<strong>+ Te is</strong>${ctaText}</a>`
      : `<div class="sponsor sponsor-cta"><strong>Itt lehetne a te logód</strong>${ctaText}</div>`;
  }

  // ---- Látogatottságmérés (Umami) ----
  // Csak az éles domainen mér (data-domains), a helyi tesztelés nem számít bele.
  if (UMAMI_WEBSITE_ID) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://cloud.umami.is/script.js";
    s.dataset.websiteId = UMAMI_WEBSITE_ID;
    s.dataset.domains = "iceunicorns.hu,www.iceunicorns.hu";
    document.head.appendChild(s);
  }

  // ---- Meccs előtti értesítés (OneSignal) ----
  // A [data-push] helyekre (kezdőlap, bajnoksági oldalak) egy gomb kerül,
  // amivel a látogató feliratkozhat. iPhone-on a böngésző csak akkor enged
  // értesítést, ha az oldal ki van téve a kezdőképernyőre – ott ezt írjuk ki.
  const pushSlots = document.querySelectorAll("[data-push]");
  const pushLive = ONESIGNAL_APP_ID && /(^|\.)iceunicorns\.hu$/.test(location.hostname);
  if (pushSlots.length && pushLive) {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

    const render = (html) => pushSlots.forEach((slot) => {
      slot.innerHTML = html;
      slot.hidden = false;
    });

    if (ios && !standalone) {
      render(
        `<p class="push-hint">🔔 Értesítést kérnél a meccsek előtt? iPhone-on előbb tedd ki az oldalt ` +
          `a kezdőképernyőre: <strong>Megosztás → Főképernyőhöz adás</strong>, és onnan nyisd meg.</p>`
      );
    } else if (supported) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      const s = document.createElement("script");
      s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      s.defer = true;
      document.head.appendChild(s);
      window.OneSignalDeferred.push(async (OneSignal) => {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerPath: "push/onesignal/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/push/onesignal/" },
        });
        const sub = OneSignal.User.PushSubscription;
        const draw = () => {
          const on = OneSignal.Notifications.permission && sub.optedIn;
          render(
            `<button type="button" class="btn push-btn${on ? " is-on" : ""}" aria-pressed="${on}">` +
              (on ? "🔔 Értesítés bekapcsolva" : "🔔 Szólj a meccs előtt") +
              `</button><span class="push-note">${
                on ? "A meccs előtti napon küldünk egy emlékeztetőt. Kattints a kikapcsoláshoz." : "Meccs előtti napon egy rövid emlékeztető, más semmi."
              }</span>`
          );
          pushSlots.forEach((slot) =>
            slot.querySelector(".push-btn").addEventListener("click", async () => {
              if (on) await sub.optOut();
              else if (!OneSignal.Notifications.permission) await OneSignal.Notifications.requestPermission();
              else await sub.optIn();
              if (window.umami) window.umami.track(on ? "ertesites-ki" : "ertesites-be");
            })
          );
        };
        sub.addEventListener("change", draw);
        OneSignal.Notifications.addEventListener("permissionChange", draw);
        draw();
      });
    }
  }

  // ---- Telepíthető alkalmazás (PWA) ----
  // A service worker (sw.js) gyorsítótárazza az oldalt: térerő nélkül is
  // megnyílik a legutóbb látott menetrend, és a telefon kezdőképernyőjére
  // is ki lehet tenni az oldalt.
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  // (A galéria + lightbox külön a gallery.js-ben van.)
})();
