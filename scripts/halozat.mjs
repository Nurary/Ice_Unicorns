// ===== Ice Unicorns – hálózati kérések időkorláttal és újrapróbálással =====
//
// A frissítő scriptek (bajnoksag-frissites.mjs, logok.mjs) ezzel kérnek le
// mindent. Ha az MJSZ szervere egy pillanatra akad, nem bukik el azonnal
// az egész frissítés (és nem nyílik feleslegesen hiba-issue), ha pedig
// egyáltalán nem válaszol, nem lóg órákig a GitHub-os futás.

// Egy kérés legfeljebb ennyi ideig várhat a válaszra (ms)
const TIMEOUT = 30_000;
// Átmeneti hibánál (hálózat, időtúllépés, 429, 5xx) ennyiszer próbáljuk újra,
// ennyi várakozással – egy pillanatnyi MJSZ-akadás ne nyisson hiba-issue-t
const RETRY_DELAYS = [3_000, 10_000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch időkorláttal és újrapróbálással. 4xx hibánál (pl. rossz kulcs) nem
// próbálkozik újra, mert attól nem lesz jobb.
export async function fetchRetry(url, opts = {}, label = String(url)) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT) });
      if (res.ok || (res.status < 500 && res.status !== 429)) return res;
      if (attempt >= RETRY_DELAYS.length) return res;
      console.warn(`${label} → HTTP ${res.status}, újrapróbálom…`);
    } catch (err) {
      if (attempt >= RETRY_DELAYS.length) throw new Error(`${label} → ${err.message}`);
      console.warn(`${label} → ${err.message}, újrapróbálom…`);
    }
    await sleep(RETRY_DELAYS[attempt]);
  }
}

