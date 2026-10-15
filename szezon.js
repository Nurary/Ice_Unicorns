// ===== Ice Unicorns – szezonválasztó: adatfájl betöltése =====
//
// A bajnoksági oldalak (ob4c.html, ob4d.html) ezzel töltik be az adatokat.
// Alapból az aktuális szezon jön (bajnoksag-adatok.js). Ha az URL-ben van
// ?szezon=2026-2027, akkor helyette az archivált fájl (szezonok/2026-2027.js),
// amit a scripts/bajnoksag-frissites.mjs a szezonváltáskor tesz félre.
//
// Szándékosan NEM defer-rel töltődik be, és document.write-tal írja ki a
// választott fájlt: így az adat garantáltan a deferes scriptek (statisztika.js,
// bajnoksag.js) előtt megérkezik, és azoknak semmit sem kell tudniuk róla.
// A szezonválasztó menüt magát a bajnoksag.js rajzolja ki.
(function () {
  var szezon = null;
  try {
    szezon = new URLSearchParams(location.search).get("szezon");
  } catch (e) {}
  var archiv = /^\d{4}-\d{4}$/.test(szezon || "");
  window.ARCHIVE_SEASON = archiv ? szezon : null;
  var src = archiv ? "szezonok/" + szezon + ".js" : "bajnoksag-adatok.js";
  document.write("<script src=\"" + src + "\"><\/script>");
})();
