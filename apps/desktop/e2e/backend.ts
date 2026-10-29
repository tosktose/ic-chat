import type { Page, Route } from '@playwright/test'
import { fakeSession } from './helpers'

type Row = Record<string, unknown>

/**
 * Banco de mentira (em memória) que responde como o PostgREST do Supabase.
 * Serve para testar o sistema "de ponta a ponta" sem depender de internet nem de uma conta real:
 * tudo que a tela grava aparece em `writes`, e o que foi gravado volta quando a página é recarregada.
 */
export async function mockBackend(page: Page, opts: { email?: string; seed?: Partial<Record<string, Row[]>> } = {}) {
  const tables: Record<string, Row[]> = {
    contacts: [], conversations: [], messages: [], deals: [], appointments: [], tasks: [], campaigns: [], channel_connections: [],
    company_settings: [], tenant_members: [{ tenant_id: 't-1', user_id: 'u-1', role: 'owner', display_name: 'Cliente Novo', tenants: { name: 'Empresa Teste' } }],
    subscriptions: [{ plan: 'trial', status: 'trialing', trial_ends_at: new Date(Date.now() + 5 * 86400_000).toISOString(), current_period_ends_at: null }],
    ...opts.seed
  }
  const writes: { table: string; method: string; body: Row[] }[] = []

  await fakeSession(page, opts.email ?? 'cliente@exemplo.com')

  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  await page.route('**/rest/v1/rpc/ensure_tenant_for_current_user', (r) => json(r, 't-1'))
  await page.route('**/rest/v1/*', async (route) => {
    const url = new URL(route.request().url())
    const table = url.pathname.split('/').pop() ?? ''
    if (!(table in tables)) return json(route, [])
    const method = route.request().method()
    const wantsObject = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')

    if (method === 'GET') {
      let rows = tables[table]
      for (const [k, v] of url.searchParams) {
        if (v.startsWith('eq.')) rows = rows.filter((r) => String(r[k]) === v.slice(3))
      }
      return wantsObject ? (rows[0] ? json(route, rows[0]) : json(route, { message: 'no rows' }, 406)) : json(route, rows)
    }
    if (method === 'POST' || method === 'PATCH') {
      const raw = route.request().postData()
      const body = (raw ? JSON.parse(raw) : []) as Row | Row[]
      const list = Array.isArray(body) ? body : [body]
      writes.push({ table, method, body: list })
      for (const row of list) {
        const key = table === 'company_settings' ? 'tenant_id' : 'id'
        const i = tables[table].findIndex((x) => x[key] === row[key])
        if (i >= 0) tables[table][i] = { ...tables[table][i], ...row }
        else tables[table].push({ created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...row })
      }
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    }
    if (method === 'DELETE') {
      writes.push({ table, method, body: [] })
      const id = url.searchParams.get('id')?.replace('eq.', '')
      if (id) tables[table] = tables[table].filter((x) => x.id !== id)
      return route.fulfill({ status: 204, body: '' })
    }
    return route.continue()
  })

  return { tables, writes }
}

export const iso = (minAgo = 0) => new Date(Date.now() - minAgo * 60_000).toISOString()
