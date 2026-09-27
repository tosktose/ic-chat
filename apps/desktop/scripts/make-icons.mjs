// Gera os ícones do IC Chat a partir de LOGO/ICON.png:
// remove o fundo branco (mantendo as letras brancas do "ic"), recorta e exporta
// PNG transparente + .ico (Windows) nos tamanhos da aba, do instalador e da área de trabalho.
//
// Uso: npm run icons -w @icchat/desktop
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const SRC = resolve(root, '../../LOGO/ICON.png')

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const px = (x, y) => (y * W + x) * 4

// 1) Fundo = pixels claros ligados à borda (flood fill). As letras brancas ficam
//    dentro do balão azul, então não são alcançadas.
const isLight = (i) => {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  return Math.min(r, g, b) >= 200 && Math.max(r, g, b) - Math.min(r, g, b) < 45
}
const bg = new Uint8Array(W * H)
const stack = []
for (let x = 0; x < W; x++) stack.push([x, 0], [x, H - 1])
for (let y = 0; y < H; y++) stack.push([0, y], [W - 1, y])
while (stack.length) {
  const [x, y] = stack.pop()
  if (x < 0 || y < 0 || x >= W || y >= H) continue
  const k = y * W + x
  if (bg[k] || !isLight(px(x, y))) continue
  bg[k] = 1
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
}

// 2) Distância até o fundo (para suavizar só a borda do balão)
const EDGE = 4
const nearBg = (x, y) => {
  for (let dy = -EDGE; dy <= EDGE; dy++)
    for (let dx = -EDGE; dx <= EDGE; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && bg[ny * W + nx]) return true
    }
  return false
}

// 3) Transparência: fundo some; na borda, "desmistura" o branco usando o canal vermelho
//    (o balão é azul/ciano, com vermelho baixo em todo o gradiente)
const R_SOLID = 18
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = px(x, y)
    if (bg[y * W + x]) {
      data[i + 3] = 0
      continue
    }
    if (!nearBg(x, y)) continue
    const a = Math.max(0, Math.min(1, (255 - data[i]) / (255 - R_SOLID)))
    if (a <= 0.02) {
      data[i + 3] = 0
      continue
    }
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - (1 - a) * 255) / a)))
    data[i + 3] = Math.round(a * 255)
  }

// 4) Recorta no conteúdo e centraliza num quadrado com pequena margem
let minX = W, minY = H, maxX = 0, maxY = 0
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (data[px(x, y) + 3] > 8) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
const cw = maxX - minX + 1, ch = maxY - minY + 1
const side = Math.round(Math.max(cw, ch) * 1.04)

const trimmed = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: minX, top: minY, width: cw, height: ch })
  .png()
  .toBuffer()

const square = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: trimmed, left: Math.round((side - cw) / 2), top: Math.round((side - ch) / 2) }])
  .png()
  .toBuffer()

const out = async (file, size) => {
  mkdirSync(dirname(file), { recursive: true })
  const buf = await sharp(square).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(file, buf)
  return buf
}

// App empacotado / instalador (electron-builder exige ≥ 256px; 1024 fica nítido em telas 4K)
await out(resolve(root, 'build/icon.png'), 1024)
// Ícone da janela e da barra de tarefas em desenvolvimento
await out(resolve(root, 'build/icon-256.png'), 256)
// Aba / favicon e marca dentro da interface
await out(resolve(root, 'src/renderer/src/assets/icon.png'), 256)
await out(resolve(root, 'src/renderer/public/favicon.png'), 64)
// Cópia transparente junto das logos originais
await out(resolve(root, '../../LOGO/ICON-transparente.png'), 1024)

// .ico do Windows com todos os tamanhos (atalho da área de trabalho, instalador, Explorer)
const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const pngs = await Promise.all(icoSizes.map((s) => sharp(square).resize(s, s, { kernel: 'lanczos3' }).png().toBuffer()))
writeFileSync(resolve(root, 'build/icon.ico'), await pngToIco(pngs))

console.log(`Ícones gerados (recorte ${cw}x${ch} → ${side}px, fundo removido).`)
