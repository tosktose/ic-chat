// electron.vite.config.ts
import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: icchat-media:",
  "font-src 'self' data:",
  // A interface não acessa a internet diretamente: WhatsApp e Google passam pelo processo principal
  "connect-src 'self' icchat-media:",
  "media-src 'self' blob: data: icchat-media:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'self' blob: data:"
].join("; ");
var cspPlugin = {
  name: "icchat-csp",
  apply: "build",
  transformIndexHtml: (html) => html.replace("<head>", `<head>
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
};
var electron_vite_config_default = defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: {
        output: { format: "cjs", entryFileNames: "[name].cjs" }
      }
    }
  },
  renderer: {
    resolve: { alias: { "@": resolve("src/renderer/src") } },
    plugins: [react(), tailwindcss(), cspPlugin]
  }
});
export {
  electron_vite_config_default as default
};
