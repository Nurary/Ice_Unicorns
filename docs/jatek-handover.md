# 🏒 Ice Unicorns – „Shootout" mini-játék · Design Handover

> **Cél:** átadni a Claude Designnak egy átgondolt játéktervet, amiből megszülethet
> az oldal mini-játéka. **Nem** a végleges kód – ez a *terv és a látvány iránya*.
> A fejlesztés ezután külön fázisban, külön branchen történik.

---

## 0. TL;DR – mit építünk

Egy **büntető-párbaj (shootout)** mini-játék az `iceunicorns.hu`-ra, ahol a
látogató kétféleképpen játszhat:

1. **🏒 Lövő mód** – kiválasztott Ice Unicorns játékossal lősz a kapura.
2. **🧤 Kapus mód** – te véded a hálót, az AI/csapattárs lő rád.

A játék **ne legyen túl egyszerű**: nem „egy kattintás = gól". Időzítés + irány +
erő + a kapus/lövő kiszámíthatatlansága adja a mélységet. A meglévő
csapat-adatbázisra (`team.js`) épül, így minden játékosnak van **egyedi
szuperképessége**, ami befolyásolja a játékmenetet.

---

## 1. Miért illik ez az oldalhoz

- Az oldal hangvétele játékos, csillámos, unikornisos (lásd `index.html`, `styles.css`).
  Egy mini-játék tökéletesen passzol a „a hoki több, mint sport" küldetéshez (`munkank.html`).
- Már megvan a **játékos-adatbázis** becenevekkel, mezszámokkal, posztokkal és
  „szuperképességekkel" (`team.js` → `ZONES`). Ezt újra tudjuk hasznosítani.
- A vizuális nyelv (gradiens, gomb-stílus, kártyák, modal) kész → a játék
  „natívan" fog kinézni, nem idegen testként.

---

## 2. Design rendszer, amiből dolgozni kell

A játéknak a meglévő `:root` változókat kell használnia (lásd `styles.css`):

| Token | Érték | Használat a játékban |
|---|---|---|
| `--bg` / `--bg-2` | `#ff3d7f` / `#ff6ba0` | háttér, pálya-keret |
| `--navy` | `#1b2450` | szöveg, jég-vonalak, HUD |
| `--gold` | `#ffcf5c` | korong, pontszám, CTA gombok |
| `--ice` | `#5ec8ff` | jégfelület, kapus-zóna |
| `--rainbow` / `--grad` | szivárvány gradiens | gól-effekt, „GÓL!" felirat, energia-csík |
| `--surface` / `--surface-soft` | fehér / `#fff3f8` | panel, kártya |
| `--radius` | `24px` | lekerekítés mindenhol |
| `--bounce` | `cubic-bezier(0.34,1.56,0.64,1)` | pattogós animációk (gomb, korong) |

**Betűk:** `Baloo 2` (címek, pontszám) + `Nunito` (szöveg). **Hangulat:** csillám,
emoji, pattogás, konfetti. **Tilos** a szürke/komor sportjáték-esztétika.

---

## 3. Belépési pont az oldalon

- Új menüpont a `partials.js` `NAV` tömbjébe: **„🎮 Játék"** → `jatek.html`.
- Az `index.html`-en egy új „quicklink" kártya (`🎮` ikon) a játékhoz.
- Az aloldal a meglévő sablont követi: `#app-header`, `<main>`, `#app-footer`,
  `partials.js` (lásd `munkank.html` mint minta).

---

## 4. Játékfolyamat (képernyők)

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
│ 1. KEZDŐ    │ →  │ 2. MÓD- ÉS   │ →  │ 3. JÁTÉK     │ →  │ 4. EREDMÉNY │
│ (intró/CTA) │    │ JÁTÉKOS-     │    │ (5 körös     │    │ (pontszám,  │
│             │    │ VÁLASZTÓ     │    │  párbaj)     │    │  újra/megoszt)
└─────────────┘    └──────────────┘    └──────────────┘    └─────────────┘
```

### 4.1 Kezdőképernyő
- Nagy cím: „**Ki a MÉNES legjobb lövője?** 🦄🏒"
- Két nagy gomb: **Lövök** / **Védek** (a `.btn-primary` / `.btn-ghost` stílussal).
- Nehézség választó (lásd 6. pont): Könnyű / Normál / Profi.
- Best score kijelzés (localStorage-ből).

### 4.2 Játékos- / kapus-választó
- A `team.js` adataiból kártyák (mezszám + becenév + fotó, ahol van).
- Lövő módban a **csatárok/védők**, kapus módban a **kapusok** közül választhatsz.
- Minden kártya mutatja a játékos **szuperképességét** (perk – lásd 5.3).

### 4.3 Játék képernyő (a lényeg)
- Felülnézet/„2.5D" kapu-perspektíva: **háló + kapus + lövő pozíció**.
- HUD: kör (1/5), pontszám, eddigi sorozat (streak), aktív játékos perk-ikonja.

### 4.4 Eredmény
- Végeredmény nagy szivárvány „GÓL"-számmal, konfetti.
- „Újra" / „Másik játékos" / „Megosztom" gombok.
- Új rekord esetén külön ünneplő animáció + mentés localStorage-be.

---

## 5. Játékmechanika – „ne legyen túl egyszerű"

A mélységet **három egymásra rétegzett döntés** adja körönként, NEM egyetlen kattintás.

### 5.1 Lövő mód – egy lövés 3 lépésben
1. **Irány (célzás):** egy mozgó célkereszt vándorol a kapu 9 zónája (3×3 rács)
   között – a megfelelő pillanatban kell rögzíteni. (bal-felső, … jobb-alsó)
2. **Erő:** felfutó-lefutó **erőmérő csík** (`--rainbow` gradiens). Túl gyenge →
   a kapus könnyen véd; túl erős → mellé/kapufa. Édes pont = „sweet spot".
3. **Csel (opció):** a lövés előtt egy gyors gomb („Csel!") megpróbálja
   rossz irányba mozdítani a kapust – de **ablakidőre** van, és ha elhibázod,
   a kapus jobban olvas (kockázat/jutalom).

A **kapus AI** közben a célkereszt mozgása és a játékos szokásai alapján
„tippel" egy zónát, és odaveti magát. Gól = nem oda lőttél, ahova vetődött +
elég erő + a zóna nincs takarásban.

### 5.2 Kapus mód – reakció + olvasás
- Az ellenfél „felhúzza" a lövést: rövid **olvasási fázis** (a test/ütő iránya
  mikro-jelzést ad → a profi szinten kevesebb és rövidebb a jelzés).
- Te egy **3×3 rácsból** választasz vetődési zónát egy szűk időablakban.
- Bónusz: „kettős védés" – ha eltalálod a zónát, gyors követő-gombbal a
  kipattanót is meg lehet fogni (extra pont).

### 5.3 Játékos-perkek (a `team.js`-ből, ez adja a „nem sablon" érzést)
Minden játékos `power` mezője egy **gameplay-módosítóra** fordul. Példák a
meglévő adatokból:

| Játékos | Eredeti „power" | Játékbeli perk (javaslat) |
|---|---|---|
| **Szikrácska** | „100% találati arány a kapus fejére bemelegítéskor" | nagyobb erő-sweet-spot, de szűkebb célzó-ablak |
| **KristályPatkó** | „egyedi csuklólövés, amit a fizika sem ismer" | a korong röptében kicsit „kanyarodik" (görbe lövés) |
| **Villámpatkó** | „a Lesek királya" | gyorsabb célkereszt (nehezebb időzíteni, de meglepi a kapust) |
| **Bolyhospofi** | „pánikot szül, lesből zavarkeltő" | erősebb csel-hatás a kapusra |
| **Pitypang** (C) | „hátrafelé korizva is gyorsulok" | egy ingyen „újracélzás" körönként |

> A perkek **kiegyensúlyozása** a design feladata: minden perknek legyen
> előnye ÉS hátránya, hogy ne legyen egyértelmű „legjobb" játékos.

---

## 6. Nehézségi szintek (skálázható kihívás)

| Szint | Kapus-reakció | Célkereszt sebesség | Erő sweet-spot | Csel-ablak |
|---|---|---|---|---|
| 🟢 Könnyű | lassú, sokat hibázik | lassú | széles | nagy |
| 🟡 Normál | reális | közepes | közepes | közepes |
| 🔴 Profi | gyors, olvas, ritkán hibázik | gyors | keskeny | pici |

Cél: könnyű szinten egy 8 éves is sikerélményt kapjon, profin egy felnőtt is
izzadjon. Ettől „nem túl egyszerű".

---

## 7. Pontozás, visszajátszhatóság

- **Alap:** gól = 100 pont. Bónuszok: sweet-spot erő (+25), sikeres csel (+50),
  kettős védés kapusként (+75).
- **Streak-szorzó:** 3+ gól sorozatban → 1.5×, 5/5 (tökéletes párbaj) → 2×.
- **Best score** localStorage-ben (`iu_shootout_best`), nincs backend.
- **Megosztás:** Web Share API + fallback (link másolás), a meglévő OG-kép stílusban.
- (Opcionális, későbbi fázis): heti „MÉNES kihívás" – fix seed, mindenki ugyanazt
  a sorozatot kapja.

---

## 8. Reszponzivitás és vezérlés

- **Mobil-first.** Az időzítős mechanika **egy hüvelykujjal** játszható legyen:
  tap a célzáshoz, tap az erőhöz, tap a cselhez. Nincs apró cél-célpont.
- Desktopon ugyanez egér/billentyű (Szóköz = rögzítés), de a mobil az elsődleges.
- Akadálymentesség: minden interakció billentyűzhető, `prefers-reduced-motion`
  esetén a villogó/pattogó effektek visszafogottak, gól-jelzés szövegesen is.

---

## 9. Hangok és effektek (könnyű, kapcsolható)

- Korong-csattanás, háló-rezgés, kapus-elkapás, tömeg-„óóóó"/„éljen".
- Némítás-kapcsoló alapból **be**; a hang csak felhasználói interakcióra indul.
- Vizuális juttatás: konfetti (`--rainbow`), csillám-spray gólnál, képernyő-rázás
  (finoman) profi gólnál.

---

## 10. Technikai keret (a fejlesztési fázisnak, nem most)

- **Vanilla JS + Canvas** (a játéktérhez) vagy CSS/DOM (egyszerűbb, de elég lehet).
  Nincs build-lépés, illeszkedik a jelenlegi statikus oldalhoz.
- Új fájlok várhatóan: `jatek.html`, `jatek.css` (vagy bővített `styles.css`),
  `jatek.js`. A játékos-adat a meglévő `team.js`-ből jön (közös forrás).
- Méret-korlát: a játék töltődjön gyorsan (cél < 100 KB JS), ne legyen külső
  motor/függőség.
- Asset-igény: néhány SVG (kapu, háló, korong, kapus sziluett), a játékos-fotók
  már megvannak (`assets/Players/`).

---

## 11. Mit kérünk a Claude Designtól (a handover lényege)

1. **Látványterv a 4 fő képernyőre** (kezdő, választó, játék, eredmény) a
   2. pont design-rendszerével.
2. **A játék-képernyő perspektívája és HUD-ja** – hol a kapu, korong, erőmérő,
   célzórács, pontszám; mobilon és desktopon.
3. **Mikrointerakciók / animációk** kulcspillanatai: célzás, lövés, gól vs. védés,
   konfetti, rekord-ünnep.
4. **A 3×3 célzórács és az erőmérő** konkrét vizuális megoldása (hogy érthető
   és „nem túl egyszerű", de tanulható legyen).
5. **Játékos-választó kártya** dizájnja a perk-ikonokkal.
6. (Bónusz) **Kabala-elemek:** unikornis-kapus? szivárvány-korongcsík? csillám?

A `docs/jatek-koncept.html` egy **kiinduló, statikus vizuális vázlat** a fenti
szellemben, a meglévő `styles.css`-re építve – ezt lehet finomítani/átszabni.

---

## 12. Nyitott kérdések a megrendelőnek

- [ ] Csak **egyjátékos** (ember vs. AI), vagy később **2 játékos egy eszközön** is?
- [ ] Kell-e **ranglista** (akár csak helyi, akár később közös)?
- [ ] Mennyire legyen **kompetitív** vs. **vicces/kabala** a hangvétel?
- [ ] Belekerüljön-e a játékba **valódi statisztika** (ha lesz adat a `team.js`-ben)?
- [ ] Kell-e **angol nyelv** is, vagy elég a magyar?

---

*Készítette: design-handover fázis · branch: `claude/shooter-minigame-design-bw1lnf`*
