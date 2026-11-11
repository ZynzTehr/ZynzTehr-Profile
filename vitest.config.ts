import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    __HAS_HERO_INTRO_VIDEO__: JSON.stringify(false),
    __HAS_HERO_VIDEO__: JSON.stringify(false),
    __HAS_PORTFOLIO_VIDEO__: JSON.stringify(false),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "api/**/*.test.{ts,tsx}"],
  },
});
