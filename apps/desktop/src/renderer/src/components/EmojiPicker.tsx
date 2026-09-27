import { useState, type ReactNode } from 'react'
import { Popover } from 'radix-ui'
import Picker, { Categories, EmojiStyle, SkinTonePickerLocation, SuggestionMode, Theme } from 'emoji-picker-react'
import { useTheme } from '@/lib/theme'

const CATEGORIES = [
  { category: Categories.SUGGESTED, name: 'Usados recentemente' },
  { category: Categories.SMILEYS_PEOPLE, name: 'Carinhas e pessoas' },
  { category: Categories.ANIMALS_NATURE, name: 'Animais e natureza' },
  { category: Categories.FOOD_DRINK, name: 'Comidas e bebidas' },
  { category: Categories.TRAVEL_PLACES, name: 'Viagens e lugares' },
  { category: Categories.ACTIVITIES, name: 'Atividades' },
  { category: Categories.OBJECTS, name: 'Objetos' },
  { category: Categories.SYMBOLS, name: 'Símbolos' },
  { category: Categories.FLAGS, name: 'Bandeiras' }
]

/**
 * Seletor completo de emojis (todos os do teclado), com busca, categorias,
 * tons de pele e "usados recentemente". Usa os emojis nativos do sistema, sem internet.
 */
export function EmojiPopover({ children, onPick }: { children: ReactNode; onPick: (emoji: string) => void }) {
  const { resolved } = useTheme()
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={10}
          collisionPadding={8}
          className="icchat-emoji z-50 animate-slide-up overflow-hidden rounded-2xl border border-border shadow-(--shadow-pop) outline-none"
        >
            <Picker
              onEmojiClick={(e) => onPick(e.emoji)}
              theme={resolved === 'dark' ? Theme.DARK : Theme.LIGHT}
              emojiStyle={EmojiStyle.NATIVE}
              categories={CATEGORIES}
              suggestedEmojisMode={SuggestionMode.RECENT}
              skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
              searchPlaceholder="Buscar emoji (em inglês: smile, heart…)"
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis
              width="min(352px, calc(100vw - 16px))"
              height={420}
              autoFocusSearch
            />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
