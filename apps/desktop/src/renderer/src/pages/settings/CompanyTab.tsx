import { useEffect, useRef, useState } from 'react'
import { AtSign, Building2, Camera, Mail, MapPin, Phone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Card, CardHeader, Switch } from '@/components/ui/misc'
import { SEGMENTS, useCompany, WEEKDAYS, type CompanyInfo, type DayHours } from '@/lib/company'
import { cn } from '@/lib/utils'

/** Barra de salvar que só aparece habilitada quando há alteração */
export function SaveBar({ dirty, onSave, onReset }: { dirty: boolean; onSave: () => void; onReset?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
      {dirty && <span className="mr-auto text-xs text-warning">Alterações não salvas</span>}
      {onReset && (
        <Button variant="ghost" onClick={onReset} disabled={!dirty}>
          Descartar
        </Button>
      )}
      <Button onClick={onSave} disabled={!dirty}>
        Salvar alterações
      </Button>
    </div>
  )
}

export function CompanyLogo({ info, size = 64, className }: { info: Pick<CompanyInfo, 'name' | 'logo'>; size?: number; className?: string }) {
  const initials = info.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return info.logo ? (
    <img src={info.logo} alt={info.name} className={cn('shrink-0 rounded-2xl object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 font-bold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials || <Building2 />}
    </div>
  )
}

export function CompanyTab() {
  const { info, updateInfo } = useCompany()
  const [form, setForm] = useState(info)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => setForm(info), [info])

  const set = <K extends keyof CompanyInfo>(k: K, v: CompanyInfo[K]) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify({ ...form, hours: undefined }) !== JSON.stringify({ ...info, hours: undefined })

  const pickLogo = (file?: File) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error('A logo deve ter até 2 MB')
    const r = new FileReader()
    r.onload = () => set('logo', String(r.result))
    r.readAsDataURL(file)
  }

  const save = () => {
    if (!form.name.trim()) return toast.error('Informe o nome da empresa')
    if (form.segment === 'outro' && !form.segmentCustom?.trim()) return toast.error('Conte qual é o seu segmento', { description: 'A IA usa essa informação para atender do jeito certo.' })
    updateInfo({ ...form, hours: info.hours, name: form.name.trim(), segmentCustom: form.segment === 'outro' ? form.segmentCustom?.trim() : undefined })
    toast.success('Dados da empresa salvos', { description: 'O nome e a logo já aparecem em todo o sistema.' })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Dados da empresa" description="Aparecem para a IA, nas mensagens automáticas e nos relatórios" />
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <div className="flex items-center gap-4 sm:col-span-2">
            <CompanyLogo info={form} />
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Camera /> {form.logo ? 'Trocar logo' : 'Enviar logo'}
                </Button>
                {form.logo && (
                  <Button variant="ghost" size="icon-sm" aria-label="Remover logo" onClick={() => set('logo', undefined)}>
                    <Trash2 />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted">PNG ou JPG, até 2 MB. Quadrada fica melhor.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
          </div>
          <Field label="Nome fantasia">
            <Input icon={<Building2 />} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Segmento" hint="Ajusta termos e sugestões da IA">
            <Select value={form.segment} onChange={(e) => set('segment', e.target.value)}>
              {Object.entries(SEGMENTS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          {form.segment === 'outro' && (
            <Field label="Qual é o seu segmento?" hint="Ex.: Academia, escritório de advocacia, loja de roupas. A IA usa para entender seu negócio" className="sm:col-span-2">
              <Input autoFocus maxLength={80} value={form.segmentCustom ?? ''} onChange={(e) => set('segmentCustom', e.target.value)} placeholder="Descreva em poucas palavras" />
            </Field>
          )}
          <Field label="CNPJ ou CPF (opcional)">
            <Input value={form.document} onChange={(e) => set('document', e.target.value)} placeholder="00.000.000/0001-00" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input icon={<Phone />} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input icon={<Mail />} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Instagram">
            <Input icon={<AtSign />} value={form.instagram} onChange={(e) => set('instagram', e.target.value)} />
          </Field>
          <Field label="Endereço" className="sm:col-span-2" hint="A IA usa para explicar como chegar">
            <Input icon={<MapPin />} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </div>
        <SaveBar dirty={dirty} onSave={save} onReset={() => setForm(info)} />
      </Card>

      <HoursCard />
    </div>
  )
}

/** Horário de funcionamento por dia da semana — usado pela agenda (horários livres) e pela IA */
function HoursCard() {
  const { info, updateInfo, hoursText } = useCompany()
  const [hours, setHours] = useState<DayHours[]>(info.hours)
  useEffect(() => setHours(info.hours), [info.hours])
  const dirty = JSON.stringify(hours) !== JSON.stringify(info.hours)
  const setDay = (i: number, p: Partial<DayHours>) => setHours((h) => h.map((d, j) => (j === i ? { ...d, ...p } : d)))

  const invalid = hours.some((d) => d.open && d.start >= d.end)

  return (
    <Card>
      <CardHeader title="Horário de funcionamento" description={`Hoje a IA informa: “${hoursText}”`} />
      <div className="flex flex-col px-5 pb-4">
        {hours.map((d, i) => (
          <div key={WEEKDAYS[i]} className="flex flex-wrap items-center gap-3 border-b border-border py-2.5 last:border-0">
            <label className="flex w-36 items-center gap-2.5">
              <Switch checked={d.open} onCheckedChange={(v) => setDay(i, { open: v })} aria-label={`Abre ${WEEKDAYS[i]}`} />
              <span className={cn('text-[13.5px] font-medium', !d.open && 'text-muted')}>{WEEKDAYS[i]}</span>
            </label>
            {d.open ? (
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                <Input type="time" className="w-28" value={d.start} onChange={(e) => setDay(i, { start: e.target.value })} aria-label="Abre às" />
                até
                <Input type="time" className="w-28" value={d.end} onChange={(e) => setDay(i, { end: e.target.value })} aria-label="Fecha às" />
                <span className="ml-2">Almoço</span>
                <Input
                  type="time"
                  className="w-28"
                  value={d.lunchStart ?? ''}
                  onChange={(e) => setDay(i, { lunchStart: e.target.value || undefined })}
                  aria-label="Início do almoço"
                />
                <Input
                  type="time"
                  className="w-28"
                  value={d.lunchEnd ?? ''}
                  onChange={(e) => setDay(i, { lunchEnd: e.target.value || undefined })}
                  aria-label="Fim do almoço"
                />
              </div>
            ) : (
              <span className="text-[13px] text-subtle">Fechado</span>
            )}
          </div>
        ))}
        {invalid && <p className="mt-2 text-xs text-danger">Há um dia com horário de fechamento antes da abertura.</p>}
      </div>
      <SaveBar
        dirty={dirty}
        onReset={() => setHours(info.hours)}
        onSave={() => {
          if (invalid) return toast.error('Corrija os horários antes de salvar')
          updateInfo({ hours })
          toast.success('Horário de funcionamento salvo', { description: 'A agenda e a IA já usam os novos horários.' })
        }}
      />
    </Card>
  )
}
