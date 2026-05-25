import { defineConfig } from "vite";

export default defineConfig({
  base: "/lambda_world/",
  root: "./",
  publicDir: "public",
  build: {outDir: "./docs",},
});
