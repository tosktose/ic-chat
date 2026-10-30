import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

// Política de segurança do conteúdo: só no build (no dev o Vite injeta scripts inline)
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: icchat-media:",
  "font-src 'self' data:",
  // Auth e licença consultam Supabase diretamente no renderer.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co icchat-media:",
  "media-src 'self' blob: data: icchat-media:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'self' blob: data:"
].join('; ')

const cspPlugin: Plugin = {
  name: 'icchat-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<head>', `<head>
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
}

export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: {
        output: { format: 'cjs', entryFileNames: '[name].cjs' }
      }
    }
  },
  renderer: {
    resolve: { alias: { '@': resolve('src/renderer/src') } },
    plugins: [react(), tailwindcss(), cspPlugin]
  }
})
