import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    // le tunnel Cloudflare présente ce hostname au serveur de dev
    allowedHosts: ["leptitprince.simptom.fr"],
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
      },
    },
  },
});
