// Sert le dossier scratchpad en local, pour la page de cuisson des sprites.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize, resolve } from "node:path";
const RACINE = resolve(process.argv[2]);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".gltf": "model/gltf+json", ".glb": "model/gltf-binary", ".bin": "application/octet-stream", ".png": "image/png", ".jpg": "image/jpeg" };
createServer(async (req, res) => {
  const chemin = normalize(join(RACINE, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!chemin.startsWith(RACINE)) return res.writeHead(403).end();
  try {
    const data = await readFile(chemin);
    res.writeHead(200, { "content-type": TYPES[extname(chemin)] ?? "application/octet-stream" }).end(data);
  } catch {
    res.writeHead(404).end();
  }
}).listen(5288, "127.0.0.1", () => console.log("atelier sur http://127.0.0.1:5288/"));
