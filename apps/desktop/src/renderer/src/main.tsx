import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

// Aplica o tema antes do primeiro desenho (evita "piscar" claro → escuro)
try {
  const pref = localStorage.getItem('icchat.theme') ?? 'system'
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.density = localStorage.getItem('icchat.density') ?? 'comfortable'
} catch {
  /* sem armazenamento: segue o padrão */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
