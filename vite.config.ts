import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

// Signalisation minimale pour Le Phare : offre/réponse WebRTC stockées en
// mémoire quelques minutes, indexées par un code court. Servie par le serveur
// lui-même (exposé par le tunnel), donc zéro infra supplémentaire.
function phareSignaling(): Plugin {
  interface Room {
    offer: string;
    answer?: string;
    at: number;
  }
  const rooms = new Map<string, Room>();
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I/L/O/0/1 ambigus

  const readBody = (req: IncomingMessage): Promise<string> =>
    new Promise((done) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => done(data));
    });

  const send = (res: ServerResponse, status: number, obj: unknown): void => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };

  const handle = async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
    const url = (req.url ?? "").split("?")[0];
    const now = Date.now();
    for (const [k, v] of rooms) if (now - v.at > 10 * 60_000) rooms.delete(k);

    if (req.method === "POST" && url === "/rooms") {
      const offer = await readBody(req);
      if (!offer || offer.length > 4000) return send(res, 400, { error: "bad offer" });
      let code = "";
      do {
        code = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
      } while (rooms.has(code));
      rooms.set(code, { offer, at: now });
      return send(res, 200, { code });
    }

    const mRoom = url.match(/^\/rooms\/([A-Z0-9]{4})$/);
    if (req.method === "GET" && mRoom) {
      const room = rooms.get(mRoom[1]);
      return room ? send(res, 200, { offer: room.offer }) : send(res, 404, { error: "unknown" });
    }

    const mAns = url.match(/^\/rooms\/([A-Z0-9]{4})\/answer$/);
    if (mAns) {
      const room = rooms.get(mAns[1]);
      if (!room) return send(res, 404, { error: "unknown" });
      if (req.method === "POST") {
        const answer = await readBody(req);
        if (!answer || answer.length > 4000) return send(res, 400, { error: "bad answer" });
        room.answer = answer;
        return send(res, 200, {});
      }
      return send(res, 200, { answer: room.answer ?? null });
    }

    next();
  };

  return {
    name: "phare-signaling",
    configureServer(server) {
      server.middlewares.use("/api/phare", (req, res, next) => void handle(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/phare", (req, res, next) => void handle(req, res, next));
    },
  };
}

export default defineConfig({
  plugins: [phareSignaling()],
  server: {
    // le tunnel Cloudflare présente ce hostname au serveur de dev
    allowedHosts: ["leptitprince.simptom.fr"],
    // jamais de cache (navigateur ou edge Cloudflare) sur les assets de dev :
    // un HTML frais avec un CSS périmé donne des rendus cassés
    headers: { "Cache-Control": "no-store" },
  },
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        orbites: resolve(__dirname, "games/petites-orbites/index.html"),
        echelle: resolve(__dirname, "games/echelle-du-temps/index.html"),
        jardin: resolve(__dirname, "games/jardin-infini/index.html"),
        peche: resolve(__dirname, "games/peche-abyssale/index.html"),
        jukebox: resolve(__dirname, "games/juke-box/index.html"),
        phare: resolve(__dirname, "games/le-phare/index.html"),
      },
    },
  },
});
