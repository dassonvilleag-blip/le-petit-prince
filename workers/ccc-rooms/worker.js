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

export class CccRooms {
  constructor(state) {
    this.state = state;
    this.store = createRoomStore();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    const saved = await this.state.storage.get("rooms");
    if (saved) for (const [code, room] of Object.entries(saved)) this.store.rooms.set(code, room);
  }

  async fetch(request) {
    await this.load();
    const path = new URL(request.url).pathname.replace(/^\/api\/ccc/, "");
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
    return new Response(JSON.stringify(out.body), {
      status: out.status,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}

export default {
  fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const id = env.ROOMS.idFromName("global");
    return env.ROOMS.get(id).fetch(request);
  },
};
