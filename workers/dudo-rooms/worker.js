// Worker Cloudflare pour les salons des « Dés Menteurs » quand le site est
// servi en statique (GitHub Pages) : même logique que le middleware vite, on
// importe rooms-server.ts tel quel. L'état vit dans un Durable Object unique
// (cohérence garantie — indispensable ici : les dés cachés ne doivent exister
// qu'à un seul endroit) et il est persisté dans son storage pour survivre aux
// évictions d'inactivité.
//
// Déploiement (compte Cloudflare gratuit suffisant) :
//   cd workers/dudo-rooms
//   npx wrangler login
//   npx wrangler deploy
// puis reporter l'URL affichée dans REMOTE_API de room-client.ts.

import { createRoomStore } from "../../src/games/les-des-menteurs/rooms-server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export class DudoRooms {
  constructor(state) {
    this.state = state;
    this.store = createRoomStore();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    const rooms = await this.state.storage.get("rooms");
    if (rooms) for (const [code, room] of Object.entries(rooms)) this.store.rooms.set(code, room);
  }

  json(status, body) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  async fetch(request) {
    await this.load();
    const path = new URL(request.url).pathname.replace(/^\/api\/dudo/, "");
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
}

export default {
  fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const id = env.ROOMS.idFromName("global");
    return env.ROOMS.get(id).fetch(request);
  },
};
