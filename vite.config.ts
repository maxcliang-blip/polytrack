import { defineConfig } from "vite";

export default defineConfig({
  base: "/polytrack/",
  root: ".",
  publicDir: "public",
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
