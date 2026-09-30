#!/usr/bin/env node
// ===== Helyi fejlesztői szerver =====
//
// A weboldal statikus, de a galéria (fetch) és a naptárfájlok miatt nem
// elég simán megnyitni az index.html-t – egy kis szerver kell hozzá.
//
//   node scripts/szerver.mjs          → http://localhost:4173
//   PORT=8080 node scripts/szerver.mjs
//
// Külső csomag nem kell hozzá. A 404-es oldalt ugyanúgy adja vissza, mint
// a GitHub Pages.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".ics": "text/calendar; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

async function resolve(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = normalize(join(ROOT, p));
  if (!file.startsWith(ROOT + sep) && file !== ROOT) return null; // ../ kiszűrése
  try {
    const s = await stat(file);
    return s.isDirectory() ? join(file, "index.html") : file;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const file = await resolve(req.url || "/");
  try {
    if (!file) throw new Error("404");
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(body);
  } catch {
    const body = await readFile(join(ROOT, "404.html")).catch(() => "404");
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end(body);
  }
}).listen(PORT, () => console.log(`Ice Unicorns: http://localhost:${PORT}`));
