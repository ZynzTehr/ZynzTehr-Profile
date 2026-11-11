import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const mediaDir = path.resolve(import.meta.dirname, "public/media");

function readMediaFlags() {
  return {
    hasHeroIntroVideo:
      fs.existsSync(path.join(mediaDir, "hero-monarch-intro.webm")) ||
      fs.existsSync(path.join(mediaDir, "hero-monarch-intro.mp4")),
    hasHeroVideo:
      fs.existsSync(path.join(mediaDir, "hero-monarch-loop.webm")) ||
      fs.existsSync(path.join(mediaDir, "hero-monarch-loop.mp4")),
    hasPortfolioVideo:
      fs.existsSync(path.join(mediaDir, "portfolio-porch-loop.webm")) ||
      fs.existsSync(path.join(mediaDir, "portfolio-porch-loop.mp4")),
  };
}

function watchAtelierMediaPlugin(): Plugin {
  return {
    name: "watch-atelier-media",
    configureServer(server) {
      server.watcher.add(mediaDir);
      const onMediaChange = (file: string) => {
        if (file.startsWith(mediaDir) && /\.(webm|mp4)$/i.test(file)) {
          void server.restart();
        }
      };
      server.watcher.on("add", onMediaChange);
      server.watcher.on("unlink", onMediaChange);
    },
  };
}

const mediaFlags = readMediaFlags();

export default defineConfig({
  plugins: [react(), tailwindcss(), watchAtelierMediaPlugin()],
  publicDir: "public",
  define: {
    __HAS_HERO_INTRO_VIDEO__: JSON.stringify(mediaFlags.hasHeroIntroVideo),
    __HAS_HERO_VIDEO__: JSON.stringify(mediaFlags.hasHeroVideo),
    __HAS_PORTFOLIO_VIDEO__: JSON.stringify(mediaFlags.hasPortfolioVideo),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
          if (id.includes("node_modules/motion")) return "motion";
          if (id.includes("node_modules/gsap") || id.includes("node_modules/lenis")) return "gsap";
          return undefined;
        },
      },
    },
  },
});
