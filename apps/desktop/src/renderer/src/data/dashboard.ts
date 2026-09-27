// Números do Painel do gerente (demonstração até o Core calcular os reais).

export type Period = 'semana' | 'quinzena' | 'mes'

export const DASHBOARD_DATA: Record<Period, { kpis: { conv: number; convDelta: number; frt: string; frtDelta: number; done: number; doneDelta: number; noShow: number; noShowDelta: number }; daily: { d: string; v: number }[]; pros: number[]; revenue: number[] }> = {
  semana: {
    kpis: { conv: 312, convDelta: 12, frt: '2m 14s', frtDelta: -18, done: 86, doneDelta: 7, noShow: 4.6, noShowDelta: -1.2 },
    daily: [
      { d: 'Dom', v: 12 }, { d: 'Seg', v: 38 }, { d: 'Ter', v: 52 }, { d: 'Qua', v: 47 }, { d: 'Qui', v: 58 }, { d: 'Sex', v: 66 }, { d: 'Sáb', v: 39 }
    ],
    pros: [28, 22, 19, 17],
    revenue: [4380, 1720, 5210, 2340]
  },
  quinzena: {
    kpis: { conv: 604, convDelta: 9, frt: '2m 31s', frtDelta: -11, done: 171, doneDelta: 5, noShow: 5.1, noShowDelta: -0.4 },
    daily: Array.from({ length: 15 }, (_, i) => ({ d: String(13 + i).padStart(2, '0'), v: [18, 41, 49, 44, 55, 61, 36, 12, 38, 52, 47, 58, 66, 39, 20][i] })),
    pros: [55, 44, 39, 33],
    revenue: [8710, 3450, 10120, 4700]
  },
  mes: {
    kpis: { conv: 1248, convDelta: 15, frt: '2m 40s', frtDelta: -22, done: 352, doneDelta: 11, noShow: 5.4, noShowDelta: 0.3 },
    daily: Array.from({ length: 30 }, (_, i) => ({ d: String(i + 1).padStart(2, '0'), v: Math.round(38 + 18 * Math.sin(i / 1.2) + (i % 7 === 0 ? -22 : 0) + i * 0.6) })),
    pros: [112, 91, 80, 69],
    revenue: [17890, 7120, 20870, 9650]
  }
}

export const PERIOD_LABEL: Record<Period, { short: string; range: string }> = {
  semana: { short: 'Semana', range: '21 a 27 de setembro de 2026' },
  quinzena: { short: 'Quinzena', range: '13 a 27 de setembro de 2026' },
  mes: { short: 'Mês', range: '28 de agosto a 27 de setembro de 2026' }
}

/** Atendimento por analista (para o relatório) */
export const ANALYST_STATS: Record<Period, { name: string; chats: number; frt: string; booked: number; rating: number }[]> = {
  semana: [
    { name: 'Juliana Prado', chats: 86, frt: '1m 52s', booked: 27, rating: 4.9 },
    { name: 'Marcos Vieira', chats: 64, frt: '2m 38s', booked: 18, rating: 4.7 },
    { name: 'Renata Alves', chats: 21, frt: '3m 05s', booked: 6, rating: 4.6 }
  ],
  quinzena: [
    { name: 'Juliana Prado', chats: 170, frt: '1m 58s', booked: 51, rating: 4.9 },
    { name: 'Marcos Vieira', chats: 131, frt: '2m 41s', booked: 37, rating: 4.7 },
    { name: 'Renata Alves', chats: 49, frt: '3m 10s', booked: 12, rating: 4.5 }
  ],
  mes: [
    { name: 'Juliana Prado', chats: 341, frt: '2m 01s', booked: 104, rating: 4.8 },
    { name: 'Marcos Vieira', chats: 262, frt: '2m 44s', booked: 73, rating: 4.7 },
    { name: 'Renata Alves', chats: 98, frt: '3m 12s', booked: 25, rating: 4.6 }
  ]
}

/** Origem dos agendamentos (% IA, equipe, link) */
export const ORIGIN_SPLIT: Record<Period, [number, number, number]> = {
  semana: [46, 38, 16],
  quinzena: [44, 40, 16],
  mes: [41, 42, 17]
}
