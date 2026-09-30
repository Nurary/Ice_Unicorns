// ===== Feliratkozható meccsnaptár (.ics) =====
//
// A bajnoksági adatokból iCalendar fájlt készít. A Google Naptár, az
// Apple Naptár és az Outlook is fel tud iratkozni rá: pár óránként újra
// letöltik, így az időpont-módosítások és az eredmények maguktól megjelennek.
//
// A kimenet determinisztikus (ugyanabból az adatból bájtra ugyanaz jön ki),
// hogy ne legyen felesleges commit.

const SITE = "https://iceunicorns.hu";
const OUR_TEAM = "Ice Unicorns";
// Egy amatőr meccs a jégpálya-foglalással együtt nagyjából ennyi
const GAME_MINUTES = 120;

// A menetrend budapesti helyi időben van, ezért azt adjuk meg időzónának
// (nem UTC-t) – így a nyári/téli időszámítást a naptár kezeli.
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Budapest",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

// Szöveges mező escape-elése az RFC 5545 szerint
const esc = (s) =>
  String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// A sorok legfeljebb 75 bájtosak lehetnek (bájt, nem karakter – az ékezetes
// betű UTF-8-ban két bájt). A folytatósor szóközzel kezdődik.
function fold(line) {
  const out = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    const limit = out.length ? 74 : 75; // a folytatósor szóköze is számít
    if (bytes + b > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const compact = (date) => date.replace(/-/g, "");

// "2026-10-03" + "18:50" + 120 perc → "20261003T205000" (helyi idő)
function addMinutes(date, time, minutes) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm) + minutes * 60000);
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}` +
    `T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00`
  );
}

function nextDay(date) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

// "2026-09-30T20:15:03.859Z" → "20260930T201503Z"
const stamp = (iso) =>
  String(iso).replace(/[-:]/g, "").replace(/\.\d+/, "").slice(0, 15) + "Z";

function eventLines(match, league, leagueKey, dtstamp) {
  const home = match.home ? OUR_TEAM : match.opponent;
  const away = match.home ? match.opponent : OUR_TEAM;
  const played = typeof match.us === "number" && typeof match.them === "number";
  const score = played
    ? ` (${match.home ? match.us : match.them}–${match.home ? match.them : match.us}` +
      `${match.ot ? " h.u." : ""})`
    : "";

  const lines = [
    "BEGIN:VEVENT",
    // A meccs azonosítója stabil: ha az időpont változik, a naptár ugyanazt
    // az eseményt helyezi át, nem vesz fel egy újat.
    `UID:mjsz-${match.id ?? leagueKey + "-" + match.date + "-" + match.opponent}@iceunicorns.hu`,
    `DTSTAMP:${dtstamp}`,
  ];
  if (match.time) {
    lines.push(
      `DTSTART;TZID=Europe/Budapest:${compact(match.date)}T${match.time.replace(":", "")}00`,
      `DTEND;TZID=Europe/Budapest:${addMinutes(match.date, match.time, GAME_MINUTES)}`
    );
  } else {
    // Pontos kezdés még nincs kiírva → egész napos esemény
    lines.push(
      `DTSTART;VALUE=DATE:${compact(match.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(match.date))}`
    );
  }
  lines.push(`SUMMARY:${esc(`🏒 ${home} – ${away}${score}`)}`);
  if (match.venue) lines.push(`LOCATION:${esc(match.venue)}`);
  const desc = [
    `${league.label} · ${league.season} szezon`,
    match.home ? "Hazai meccs" : "Idegenbeli meccs",
    match.time ? "" : "A pontos kezdési időpont még nincs kiírva.",
    `${SITE}/${leagueKey}.html`,
  ].filter(Boolean);
  lines.push(`DESCRIPTION:${esc(desc.join("\n"))}`);
  lines.push(`URL:${SITE}/${leagueKey}.html`);
  lines.push("END:VEVENT");
  return lines;
}

// leagues: { ob4d: {...}, ob4c: {...} } – a naptárba mind bekerül
export function renderIcs(leagues, { name, generatedAt }) {
  const dtstamp = stamp(generatedAt);
  const events = [];
  for (const [key, league] of Object.entries(leagues)) {
    for (const m of league.matches || []) {
      events.push({ sort: m.date + (m.time || ""), lines: eventLines(m, league, key, dtstamp) });
    }
  }
  events.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ice Unicorns//Meccsnaptar//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "X-WR-TIMEZONE:Europe/Budapest",
    // Kérés a naptárprogramoknak, hogy 6 óránként nézzenek rá
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...VTIMEZONE,
    ...events.flatMap((e) => e.lines),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
