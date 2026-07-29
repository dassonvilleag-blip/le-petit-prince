// Worker Cloudflare pour les salons de « Ça coûte combien ?! » quand le site
// est servi en statique (GitHub Pages) : même logique que le middleware vite,
// on importe rooms-server.ts tel quel. L'état vit dans un Durable Object
// unique (cohérence garantie) et il est persisté dans son storage pour
// survivre aux évictions d'inactivité.
//
// Déploiement (compte Cloudflare gratuit suffisant) :
//   cd workers/ccc-rooms
//   npx wrangler login
//   npx wrangler deploy
// puis reporter l'URL affichée dans REMOTE_API de room-client.ts.

import { createRoomStore } from "../../src/games/ca-coute-combien/rooms-server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const PHARE_TTL_MS = 10 * 60_000;
const PHARE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export class CccRooms {
  constructor(state) {
    this.state = state;
    this.store = createRoomStore();
    this.phare = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    const saved = await this.state.storage.get(["rooms", "phare"]);
    const rooms = saved.get("rooms");
    if (rooms) for (const [code, room] of Object.entries(rooms)) this.store.rooms.set(code, room);
    const phare = saved.get("phare");
    if (phare) for (const [code, room] of Object.entries(phare)) this.phare.set(code, room);
  }

  json(status, body) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  async fetch(request) {
    await this.load();
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith("/api/phare")) return this.handlePhare(request, pathname.replace(/^\/api\/phare/, ""));

    const path = pathname.replace(/^\/api\/ccc/, "");
    let body;
    if (request.method === "POST") {
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }
    const out = this.store.handle(request.method, path, body);
    if (request.method === "POST") await this.state.storage.put("rooms", Object.fromEntries(this.store.rooms));
    return this.json(out.status, out.body);
  }

  // Signalisation du Phare : mêmes routes que le middleware vite (offre et
  // réponse WebRTC en texte brut, indexées par un code court, TTL 10 min).
  async handlePhare(request, path) {
    const now = Date.now();
    for (const [code, room] of this.phare) if (now - room.at > PHARE_TTL_MS) this.phare.delete(code);

    const save = () => this.state.storage.put("phare", Object.fromEntries(this.phare));

    if (request.method === "POST" && path === "/rooms") {
      const offer = await request.text();
      if (!offer || offer.length > 4000) return this.json(400, { error: "bad offer" });
      let code = "";
      do {
        code = Array.from({ length: 4 }, () => PHARE_ALPHABET[Math.floor(Math.random() * PHARE_ALPHABET.length)]).join("");
      } while (this.phare.has(code));
      this.phare.set(code, { offer, at: now });
      await save();
      return this.json(200, { code });
    }

    const mRoom = path.match(/^\/rooms\/([A-Z0-9]{4})$/);
    if (request.method === "GET" && mRoom) {
      const room = this.phare.get(mRoom[1]);
      return room ? this.json(200, { offer: room.offer }) : this.json(404, { error: "unknown" });
    }

    const mAns = path.match(/^\/rooms\/([A-Z0-9]{4})\/answer$/);
    if (mAns) {
      const room = this.phare.get(mAns[1]);
      if (!room) return this.json(404, { error: "unknown" });
      if (request.method === "POST") {
        const answer = await request.text();
        if (!answer || answer.length > 4000) return this.json(400, { error: "bad answer" });
        room.answer = answer;
        await save();
        return this.json(200, {});
      }
      return this.json(200, { answer: room.answer ?? null });
    }

    return this.json(404, { error: "route inconnue" });
  }
}

export default {
  fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const id = env.ROOMS.idFromName("global");
    return env.ROOMS.get(id).fetch(request);
  },
};
