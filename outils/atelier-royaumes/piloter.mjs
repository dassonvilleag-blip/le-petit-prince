// Lance le serveur et un Chrome headless, cuit la recette, écrit atlas + carte.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
const [RACINE, SORTIE] = process.argv.slice(2).map((a) => resolve(a));
mkdirSync(SORTIE, { recursive: true });
const serveur = spawn(process.execPath, [join(RACINE, "serveur.mjs"), RACINE], { stdio: "inherit" });
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--remote-debugging-port=9334", `--user-data-dir=${join(SORTIE, "profil")}`,
  "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "about:blank",
]);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let cible;
for (let i = 0; i < 40 && !cible; i++) {
  await pause(250);
  try { cible = (await (await fetch("http://127.0.0.1:9334/json/list")).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(cible.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let n = 0;
const attente = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) attente.get(m.id)?.(m);
  if (m.method === "Runtime.exceptionThrown") console.log("ERREUR", m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === "Runtime.consoleAPICalled") console.log("console:", m.params.args.map((a) => a.value ?? a.description).join(" "));
};
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; attente.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await cdp("Runtime.enable");
await cdp("Page.enable");
await cdp("Page.navigate", { url: "http://127.0.0.1:5288/cuisson.html" });
for (let i = 0; i < 40; i++) {
  await pause(250);
  if ((await cdp("Runtime.evaluate", { expression: "window.atelierPret === true", returnByValue: true })).result.result.value) break;
}
const r = await cdp("Runtime.evaluate", {
  awaitPromise: true, returnByValue: true,
  expression: `(async () => {
    const recette = (await import("/recette.mjs")).default;
    const sprites = [];
    for (const def of recette) sprites.push(await atelier.cuire(def));
    for (const def of (await import("/unites.mjs")).default) { const t = performance.now(); sprites.push(...(await atelier.cuireUnite(def))); console.log(def.nom, Math.round(performance.now() - t), "ms"); }
    return atelier.atlas(sprites);
  })()`,
});
if (r.result.exceptionDetails) console.log("ÉCHEC", r.result.exceptionDetails.exception?.description);
else {
  const { png, carte, taille } = r.result.result.value;
  writeFileSync(join(SORTIE, "royaumes.png"), Buffer.from(png.split(",")[1], "base64"));
  writeFileSync(join(SORTIE, "royaumes.json"), JSON.stringify(carte));
  console.log("atlas", taille.join("×"), Object.keys(carte).length, "sprites");
}
ws.close();
chrome.kill();
serveur.kill();
process.exit(0);
