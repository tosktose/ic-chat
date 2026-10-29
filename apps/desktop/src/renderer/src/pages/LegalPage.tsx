import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import logo from '@/assets/logo-transparent.png'
import { openCookiePreferences } from '@/lib/consent'
import { useSeo } from '@/lib/seo'
import { pageByPath } from '@/seo/pages'
import { usePublicSettings } from '@/lib/platform'


type Section = { title: string; body: string[] }

const privacy: Section[] = [
  { title: '1. Quem somos', body: ['O IC Chat é um serviço de atendimento multicanal e CRM operado pela ItaCondo ("nós"). Para os dados pessoais tratados por meio do site e do aplicativo, atuamos como controlador, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).'] },
  { title: '2. Dados que coletamos', body: ['Dados de conta: nome da empresa, e-mail e senha (armazenada de forma criptografada pelo provedor de autenticação).', 'Dados de uso do serviço: informações que sua equipe cadastra, como contatos, conversas, oportunidades e agenda. Nesse caso, a sua empresa é a controladora desses dados e nós atuamos como operadores.', 'Dados técnicos: endereço IP, tipo de navegador e registros de acesso, necessários à segurança.', 'Cookies e armazenamento local, conforme a seção 5.'] },
  { title: '3. Para que usamos os dados', body: ['Criar e manter sua conta; prestar o serviço contratado; garantir segurança e prevenir fraudes; cumprir obrigações legais; e, com seu consentimento, medir o uso do site e comunicar novidades.'] },
  { title: '4. Bases legais', body: ['Execução de contrato, cumprimento de obrigação legal, legítimo interesse (segurança) e consentimento (cookies de análise e marketing), conforme o art. 7º da LGPD.'] },
  { title: '5. Cookies', body: ['Necessários: mantêm login, segurança e preferências (tema, densidade). Não dependem de consentimento.', 'Análise e marketing: só são ativados se você aceitar no banner. Você pode alterar a escolha a qualquer momento.'] },
  { title: '6. Compartilhamento', body: ['Compartilhamos dados apenas com provedores necessários à operação (hospedagem, banco de dados e autenticação), sob contrato e com medidas de segurança. Não vendemos dados pessoais.'] },
  { title: '7. Retenção', body: ['Mantemos os dados enquanto a conta estiver ativa e pelo prazo necessário para cumprir obrigações legais. Depois disso, eles são excluídos ou anonimizados.'] },
  { title: '8. Seus direitos', body: ['Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação do consentimento (art. 18 da LGPD).'] },
  { title: '9. Contato do encarregado (DPO)', body: ['Para exercer seus direitos ou tirar dúvidas, escreva para {{CONTATO}}.'] },
  { title: '10. Alterações', body: ['Podemos atualizar esta política. A data da última revisão fica no topo desta página.'] }
]

const terms: Section[] = [
  { title: '1. Aceite', body: ['Ao criar uma conta ou usar o IC Chat, você declara que leu e concorda com estes Termos e com a Política de Privacidade.'] },
  { title: '2. O serviço', body: ['O IC Chat oferece ferramentas de atendimento, gestão de contatos, funil de vendas e agenda, no navegador e em aplicativo para Windows. Recursos e limites variam conforme o plano.'] },
  { title: '3. Período de teste e planos', body: ['Novas contas têm 7 dias de teste. Após o teste, o acesso depende de assinatura ativa. Os valores e condições vigentes são os divulgados no site no momento da contratação.'] },
  { title: '4. Sua responsabilidade', body: ['Você é responsável pelas credenciais da conta, pelo conteúdo cadastrado e por ter base legal para tratar os dados pessoais dos seus clientes. O uso das integrações com WhatsApp, Instagram e outros canais deve respeitar as regras de cada plataforma.'] },
  { title: '5. Uso proibido', body: ['É vedado usar o serviço para spam, fraude, violação de direitos de terceiros ou qualquer atividade ilegal.'] },
  { title: '6. Disponibilidade', body: ['Trabalhamos para manter o serviço disponível, mas não garantimos funcionamento ininterrupto. Manutenções podem ocorrer.'] },
  { title: '7. Cancelamento', body: ['Você pode cancelar a qualquer momento. Podemos suspender contas que violem estes Termos.'] },
  { title: '8. Foro', body: ['Estes Termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do consumidor ou, não sendo relação de consumo, o foro da sede da ItaCondo.'] }
]

export function LegalPage({ kind }: { kind: 'privacidade' | 'termos' }) {
  const contact = usePublicSettings().support_email || 'o e-mail de suporte informado no site'
  const isPrivacy = kind === 'privacidade'
  const sections = (isPrivacy ? privacy : terms).map((s) => ({ ...s, body: s.body.map((p) => p.replace('{{CONTATO}}', contact)) }))
  const seo = pageByPath('/' + kind)!
  useSeo({ title: seo.title, description: seo.description, path: seo.path })
  return (
    <main className="fixed inset-0 overflow-y-auto bg-[#fbfcff] px-5 py-8 text-slate-800 sm:px-8" style={{ colorScheme: 'light' }}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" /> Voltar ao site</Link>
          <img src={logo} alt="IC Chat" className="h-9 w-auto" />
        </div>
        <h1 className="mt-12 text-4xl font-semibold tracking-tight text-slate-950">{isPrivacy ? 'Política de Privacidade' : 'Termos de Uso'}</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: 29 de outubro de 2026</p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-slate-950">{s.title}</h2>
              {s.body.map((p) => <p key={p} className="mt-2 text-[15px] leading-7 text-slate-600">{p}</p>)}
            </section>
          ))}
        </div>
        {isPrivacy && <button onClick={openCookiePreferences} className="mt-10 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold hover:border-blue-300">Gerenciar preferências de cookies</button>}
        <p className="mt-12 text-xs text-slate-400">© 2026 ItaCondo</p>
      </div>
    </main>
  )
}
