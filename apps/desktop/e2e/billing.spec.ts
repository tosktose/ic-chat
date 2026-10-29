import { expect, test } from '@playwright/test'
import { mockBackend } from './backend'

const MP_URL = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=TESTE-123'

test.describe('Assinatura (Mercado Pago)', () => {
  test('mostra os três planos com o preço certo e o status do teste grátis', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/assinar')
    for (const [name, price] of [['Start', '79'], ['Pro', '149'], ['Business', '299']]) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
      await expect(page.getByText(`R$ ${price}`).first()).toBeVisible()
    }
    await expect(page.getByText(/Teste grátis: \d+ dias? restantes?/).first()).toBeVisible()
  })

  test('assinar chama o servidor com o plano e leva ao checkout do Mercado Pago', async ({ page }) => {
    await mockBackend(page)
    let body = ''
    await page.route('**/functions/v1/create-checkout', (r) => {
      body = r.request().postData() ?? ''
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ url: MP_URL }) })
    })
    await page.route('https://www.mercadopago.com.br/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Checkout simulado</h1>' }))
    await page.goto('/assinar')
    await page.getByRole('button', { name: 'Assinar Pro' }).click()
    await expect(page).toHaveURL(MP_URL)
    expect(JSON.parse(body)).toEqual({ plan: 'pro' }) // o navegador manda só o plano; o preço é do servidor
  })

  test('pagamento ainda não configurado mostra aviso claro', async ({ page }) => {
    await mockBackend(page)
    await page.route('**/functions/v1/create-checkout', (r) =>
      r.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: 'pagamento_nao_configurado' }) })
    )
    await page.goto('/assinar')
    await page.getByRole('button', { name: 'Assinar Start' }).click()
    await expect(page.getByText('O pagamento ainda não foi ativado neste ambiente')).toBeVisible()
    await expect(page).toHaveURL(/\/assinar$/)
  })

  test('retorno do pagamento: aprovado, pendente e recusado', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/assinar/retorno?status=approved')
    await expect(page.getByText('Pagamento aprovado!')).toBeVisible()
    await page.goto('/assinar/retorno?collection_status=pending')
    await expect(page.getByText('Pagamento em análise')).toBeVisible()
    await page.goto('/assinar/retorno?status=rejected')
    await expect(page.getByText('Pagamento não concluído')).toBeVisible()
  })

  test('o aviso do topo e o menu levam à tela de assinatura', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /Teste grátis · \d+ dias/ }).click()
    await expect(page).toHaveURL(/\/assinar/)
  })
})
