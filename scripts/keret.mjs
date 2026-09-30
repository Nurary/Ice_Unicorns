// ===== A team.js keretének beolvasása Node-ból =====
//
// A team.js böngészőbe készült (egy sima <script>), ezért nem lehet
// importálni. Egy üres „böngészőben” futtatjuk le: a document itt nem talál
// semmit, így a megjelenítő rész azonnal kilép, a TEAMS objektum viszont
// megmarad – ez kell a frissítő scriptnek (névpárosítás) és az ellenőrzőnek
// (képútvonalak).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

export function loadTeams(root) {
  const src = readFileSync(join(root, "team.js"), "utf8");
  const sandbox = {
    console,
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({}),
      body: { appendChild() {} },
      addEventListener() {},
    },
  };
  vm.createContext(sandbox);
  // A `const TEAMS` nem kerül fel a globális objektumra, ezért kiírjuk.
  vm.runInContext(src + "\n;globalThis.__TEAMS__ = TEAMS;", sandbox, {
    filename: "team.js",
  });
  return sandbox.__TEAMS__;
}

// Egy csapat összes játékosa (a stáb nélkül)
export function playersOf(team) {
  return (team?.zones || []).flatMap((z) => z.players || []);
}

// Névből összehasonlítható kulcs: ékezet, kis-nagybetű és sorrend nélkül.
// Így a „Kiss Péter Zoltán” és a „Zoltán Péter Kiss” is ugyanaz, és a
// „Varga Istvan” is megtalálja a „Varga István”-t.
export function nameTokens(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
}
