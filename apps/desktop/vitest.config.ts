import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Testes de unidade das regras de negócio (lembretes, PIX, retorno de clientes, resumo, horários).
export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src/renderer/src') } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' }
})
