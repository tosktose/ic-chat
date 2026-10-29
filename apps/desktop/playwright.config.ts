import { defineConfig } from '@playwright/test'

// Testes de ponta a ponta do site/app web. Rodam contra o BUILD de produção
// (o mesmo que vai para a Vercel), então pegam erros de build, sitemap e rotas.
// Para testar um endereço já publicado: E2E_BASE_URL=https://seu-site npm run test:e2e
const external = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'e2e/report', open: 'never' }]],
  outputDir: 'e2e/results',
  use: {
    baseURL: external ?? 'http://localhost:4173',
    channel: 'chrome',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: external
    ? undefined
    : {
        command: 'npm run build:web && npx vite preview --config vite.web.config.ts --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: true,
        timeout: 180_000
      }
})
