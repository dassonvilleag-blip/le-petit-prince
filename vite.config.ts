import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        orbites: resolve(__dirname, "games/petites-orbites/index.html"),
        echelle: resolve(__dirname, "games/echelle-du-temps/index.html"),
      },
    },
  },
});
