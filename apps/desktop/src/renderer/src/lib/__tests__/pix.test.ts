import { describe, expect, it } from 'vitest'
import { buildPix, crc16, normalizePixKey, parsePix, pixIsValid, pixText } from '@/lib/pix'

describe('PIX copia e cola', () => {
  it('gera exatamente o exemplo do manual do Banco Central (sem valor)', () => {
    const code = buildPix({ key: '123e4567-e12b-12d1-a456-426655440000', name: 'Fulano de Tal', city: 'BRASILIA' })
    expect(code).toBe('00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D')
  })

  it('inclui o valor com duas casas e o CRC confere', () => {
    const code = buildPix({ key: 'contato@salao.com.br', name: 'Salão da Ana', city: 'São Paulo', amount: 30, txid: 'AG-123 abc' })
    const f = parsePix(code)
    expect(f['54']).toBe('30.00')
    expect(f['59']).toBe('Salao da Ana')
    expect(f['60']).toBe('Sao Paulo')
    expect(parsePix(f['62'])['05']).toBe('AG123abc')
    expect(pixIsValid(code)).toBe(true)
  })

  it('detecta código adulterado', () => {
    const code = buildPix({ key: 'contato@salao.com.br', name: 'Ana', city: 'Rio', amount: 10 })
    expect(pixIsValid(code.replace('10.00', '99.00'))).toBe(false)
  })

  it('reconhece e normaliza os tipos de chave', () => {
    expect(normalizePixKey('529.982.247-25')).toEqual({ kind: 'cpf', key: '52998224725' })
    expect(normalizePixKey('11.222.333/0001-81')).toEqual({ kind: 'cnpj', key: '11222333000181' })
    expect(normalizePixKey('(11) 98765-4321')).toEqual({ kind: 'telefone', key: '+5511987654321' })
    expect(normalizePixKey('+55 11 98765-4321')).toEqual({ kind: 'telefone', key: '+5511987654321' })
    expect(normalizePixKey('Ana@Salao.com')).toEqual({ kind: 'email', key: 'ana@salao.com' })
    expect(normalizePixKey('111.111.111-11')).toBeNull()
    expect(normalizePixKey('abc')).toBeNull()
  })

  it('recusa dados faltando ou valor inválido com mensagem clara', () => {
    expect(() => buildPix({ key: 'x', name: 'Ana', city: 'Rio' })).toThrow(/Chave PIX inválida/)
    expect(() => buildPix({ key: 'a@b.com', name: '', city: 'Rio' })).toThrow(/nome/)
    expect(() => buildPix({ key: 'a@b.com', name: 'Ana', city: 'Rio', amount: -5 })).toThrow(/Valor/)
  })

  it('limita nome a 25 e cidade a 15 caracteres, sem acento', () => {
    expect(pixText('Estúdio de Beleza Maravilhosa da Ana', 25)).toBe('Estudio de Beleza Maravil')
    expect(crc16('123456789')).toBe('29B1')
  })
})
