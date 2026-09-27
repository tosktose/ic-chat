"""Gera src/renderer/src/assets/fonts/twemoji.woff2 a partir do pacote twemoji-colr-font.

O Chromium não entrega o seletor de variação U+FE0F para o GSUB quando a fonte
não tem cmap formato 14, e as sequências com ZWJ (ex.: 💇‍♀️, 🏳️‍🌈) aparecem
separadas. Aqui cada ligadura ganha uma cópia sem o FE0F.

Uso: pip install fonttools brotli && python scripts/fix-twemoji.py <twemoji.woff2 de origem>
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot

f = TTFont(sys.argv[1])
st = f['GSUB'].table.LookupList.Lookup[0].SubTable[0]
for first, ligs in list(st.ligatures.items()):
    have = {tuple(l.Component) for l in ligs}
    extra = []
    for l in ligs:
        comp = [c for c in l.Component if c != 'ufe0f']
        if len(comp) != len(l.Component) and comp and tuple(comp) not in have:
            n = ot.Ligature()
            n.Component, n.CompCount, n.LigGlyph = comp, len(comp) + 1, l.LigGlyph
            extra.append(n)
            have.add(tuple(comp))
    # a sequência mais longa precisa ser testada primeiro
    st.ligatures[first] = sorted(ligs + extra, key=lambda l: -len(l.Component))
f.save('src/renderer/src/assets/fonts/twemoji.woff2')
