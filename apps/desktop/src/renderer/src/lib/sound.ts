// Sons de notificação gerados na hora (Web Audio): funcionam sem internet e sem arquivos.

export type SoundId = 'suave' | 'ping' | 'sino' | 'bolha'

export const SOUNDS: { id: SoundId; label: string }[] = [
  { id: 'suave', label: 'Suave (padrão)' },
  { id: 'ping', label: 'Ping' },
  { id: 'sino', label: 'Sino' },
  { id: 'bolha', label: 'Bolha' }
]

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/**
 * Navegadores (e o Electron) só liberam áudio depois de uma interação do usuário.
 * Chamamos isto no primeiro clique/tecla para que as notificações seguintes tenham som.
 */
export function unlockAudio(): void {
  const unlock = () => {
    audio()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

type Note = { f: number; t: number; d: number; type?: OscillatorType; to?: number }

const PATTERNS: Record<SoundId, Note[]> = {
  suave: [
    { f: 880, t: 0, d: 0.28 },
    { f: 1318, t: 0.1, d: 0.35 }
  ],
  ping: [{ f: 1760, t: 0, d: 0.35, type: 'triangle' }],
  sino: [
    { f: 1046, t: 0, d: 0.9 },
    { f: 1568, t: 0, d: 0.7 },
    { f: 2093, t: 0, d: 0.45 }
  ],
  bolha: [{ f: 420, t: 0, d: 0.16, to: 980 }]
}

/** Toca o som escolhido. volume: 0 a 1 */
export function playSound(id: SoundId = 'suave', volume = 0.6): void {
  const ac = audio()
  if (!ac || volume <= 0) return
  const now = ac.currentTime + 0.01
  const peak = 0.22 * Math.min(1, Math.max(0, volume))
  for (const n of PATTERNS[id]) {
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = n.type ?? 'sine'
    o.frequency.setValueAtTime(n.f, now + n.t)
    if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, now + n.t + n.d)
    g.gain.setValueAtTime(0.0001, now + n.t)
    g.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d)
    o.connect(g).connect(ac.destination)
    o.start(now + n.t)
    o.stop(now + n.t + n.d + 0.05)
  }
}
