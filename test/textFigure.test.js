import { describe, expect, it } from 'vitest'

import { parseLatex, replaceNodeDeep, serializeLatex } from '../src/latex/core.js'
import { defaultProcessors } from '../src/latex/processors/index.js'
import {
  applyTextFigureEdit,
  canWrapImage,
  getTextFigureLayout,
  parseTextFigureOptions,
  setTextFigureRatio,
  setTextFigureSide,
} from '../src/latex/textFigure.js'

const parse = (latex) => parseLatex(latex, defaultProcessors)
const serialize = (nodes) => serializeLatex(nodes, defaultProcessors)
const findType = (nodes, type) => nodes.find((node) => node.type === type)

function edit(latex, pickTarget, action) {
  const nodes = parse(latex)
  const target = pickTarget(nodes)
  const nextNodes = applyTextFigureEdit(nodes, target.id, action, defaultProcessors)
  return nextNodes ? serialize(nextNodes) : null
}

describe('textFigureProcessor', () => {
  const latex = String.raw`前文
\textfigure[fig-pos = right-top, text-ratio=0.6]{
如图，$\{x\}$ 中
\begin{choices}
\item A \item B
\end{choices}
}{
\includegraphics[width=.3\linewidth]{a.png}
}
后文`

  it('parses options, text region and figure region', () => {
    const nodes = parse(latex)
    const textFigure = findType(nodes, 'textfigure')

    expect(textFigure.options).toEqual({ 'fig-pos': 'right-top', 'text-ratio': '0.6' })
    expect(textFigure.items[0].map((node) => node.type)).toEqual(['text', 'choices'])
    expect(textFigure.items[1].map((node) => node.type)).toEqual(['image'])
    expect(textFigure.items[1][0].id.startsWith(textFigure.id)).toBe(true)
  })

  it('round-trips the original source', () => {
    expect(serialize(parse(latex))).toBe(latex)
  })

  // choices 序列化会重排条目，结构性断言之外用不含 choices 的源码比对原文
  const plain = String.raw`\textfigure[fig-pos = right-top, text-ratio=0.6]{
  如图，$\{x\}$ 中
}{\includegraphics[width=.3\linewidth]{a.png}}`

  it('keeps region whitespace and option spelling when an inner image changes', () => {
    const nodes = parse(plain)
    const image = findType(nodes, 'textfigure').items[1][0]
    const next = replaceNodeDeep(nodes, { ...image, options: { width: '0.25\\linewidth' }, original: undefined })

    expect(serialize(next)).toBe(plain.replace('width=.3\\linewidth', 'width=0.25\\linewidth'))
  })

  it('rewrites only the option block when layout options change', () => {
    const nodes = parse(plain)
    const textFigure = findType(nodes, 'textfigure')
    const next = replaceNodeDeep(nodes, {
      ...textFigure,
      options: setTextFigureRatio(textFigure.options, 0.7),
      optionString: null,
      original: undefined,
    })

    expect(serialize(next)).toBe(plain.replace('[fig-pos = right-top, text-ratio=0.6]', '[fig-pos=right-top, text-ratio=0.7]'))
  })

  it('ignores incomplete commands and longer command names', () => {
    expect(parse(String.raw`\textfigure{only text}`).map((node) => node.type)).toEqual(['text'])
    expect(parse(String.raw`\textfigures{a}{b}`).map((node) => node.type)).toEqual(['text'])
  })
})

describe('textfigure options', () => {
  it('splits options on top-level commas only', () => {
    expect(parseTextFigureOptions('pos=left, yshift={1pt,2pt},top=1')).toEqual({
      pos: 'left',
      yshift: '{1pt,2pt}',
      top: '1',
    })
  })

  it('derives layout following exam-zh-textfigure defaults', () => {
    expect(getTextFigureLayout({})).toMatchObject({ side: 'bottom', horizontal: 'right', ratio: 1 })
    expect(getTextFigureLayout({ 'fig-pos': 'right', 'text-ratio': '0.6' })).toMatchObject({ side: 'right', vertical: 'center', ratio: 0.6 })
    expect(getTextFigureLayout({ pos: 'left-bottom', ratio: '.5' })).toMatchObject({ side: 'left', vertical: 'bottom', ratio: 0.5 })
    expect(getTextFigureLayout({ 'fig-pos': 'bottom-center', 'text-ratio': '0.5' })).toMatchObject({ ratio: 1 })
  })

  it('updates the key already used by the source', () => {
    expect(setTextFigureSide({ pos: 'right', ratio: '0.6' }, 'left', 'top')).toEqual({ pos: 'left-top', ratio: '0.6' })
    expect(setTextFigureSide({ 'fig-pos': 'bottom' }, 'right')).toEqual({ 'fig-pos': 'right-top', 'text-ratio': '0.65' })
    expect(setTextFigureRatio({ ratio: '0.6' }, 0.95)).toEqual({ ratio: '0.85' })
  })
})

describe('wrap image into textfigure', () => {
  const pickImage = (nodes) => findType(nodes, 'image')

  it('absorbs the preceding paragraph, including choices and the separating blank line', () => {
    const latex = String.raw`第一段。

如图，求 $x$。
\begin{choices}
\item 1 \item 2
\end{choices}

\begin{center}
\includegraphics[width=.5\linewidth]{a.png}
\end{center}
后续`

    expect(edit(latex, pickImage, { type: 'wrap', side: 'right' })).toBe(String.raw`第一段。

\textfigure[fig-pos=right-top, text-ratio=0.5]{
如图，求 $x$。
\begin{choices}
    \item 1
    \item 2
\end{choices}
}{
\includegraphics[width=\linewidth]{a.png}
}

后续`)
  })

  it('derives the text ratio from the image width and converts it to the figure column', () => {
    const result = edit(String.raw`题干\includegraphics[width=0.3\linewidth]{a.png}`, pickImage, { type: 'wrap', side: 'left' })

    expect(result).toBe(String.raw`\textfigure[fig-pos=left-top, text-ratio=0.65]{
题干
}{
\includegraphics[width=\linewidth]{a.png}
}`)
    // 图栏 = 1 - 0.75 - 0.04 = 0.21，0.1 行宽约为图栏的一半
    const narrow = edit(String.raw`题干\includegraphics[width=0.1\linewidth]{a.png}`, pickImage, { type: 'wrap', side: 'right' })
    expect(narrow).toContain(String.raw`text-ratio=0.75]{`)
    expect(narrow).toContain(String.raw`\includegraphics[width=0.48\linewidth]{a.png}`)
  })

  it('lets images without width fill the figure column', () => {
    expect(edit(String.raw`题干
\includegraphics{a.png}`, pickImage, { type: 'wrap', side: 'right' })).toContain(String.raw`\includegraphics[width=\linewidth]{a.png}`)
  })

  it('absorbs the following paragraph when the image opens the content', () => {
    const latex = String.raw`\includegraphics[width=3cm]{a.png}
图后的题干。

下一段`

    expect(edit(latex, pickImage, { type: 'wrap', side: 'left' })).toBe(String.raw`\textfigure[fig-pos=left-top, text-ratio=0.65]{
图后的题干。
}{
\includegraphics[width=3cm]{a.png}
}

下一段`)
  })

  it('stops at another image', () => {
    const latex = String.raw`\includegraphics{a.png}
\includegraphics{b.png}`
    const nodes = parse(latex)
    const second = nodes.filter((node) => node.type === 'image')[1]

    expect(applyTextFigureEdit(nodes, second.id, { type: 'wrap', side: 'right' }, defaultProcessors)).toBeNull()
  })

  it('wraps inside enumerate items but not inside choices', () => {
    const latex = String.raw`\begin{enumerate}
\item 小题题干 \includegraphics{a.png}
\end{enumerate}
\begin{choices}
\item 选项 \includegraphics{b.png}
\end{choices}`
    const nodes = parse(latex)
    const enumerateImage = nodes[0].items[0].find((node) => node.type === 'image')
    const choicesImage = findType(nodes, 'choices').items[0].find((node) => node.type === 'image')

    expect(canWrapImage(nodes, enumerateImage.id)).toBe(true)
    expect(canWrapImage(nodes, choicesImage.id)).toBe(false)
    expect(serialize(applyTextFigureEdit(nodes, enumerateImage.id, { type: 'wrap', side: 'right' }, defaultProcessors)))
      .toContain(String.raw`\item \textfigure[fig-pos=right-top, text-ratio=0.65]{`)
  })
})

describe('textfigure structural edits', () => {
  const pickGroup = (nodes) => findType(nodes, 'textfigure')
  const group = String.raw`\textfigure[fig-pos=right-top, text-ratio=0.6]{
段一

段二
}{
\includegraphics[width=.3\linewidth]{a.png}
}`

  it('unwraps into text followed by a centered image of the same size', () => {
    // 图栏 = 1 - 0.6 - 0.04 = 0.36，占图栏 0.3 即约 0.11 行宽
    expect(edit(`前\n${group}\n后`, pickGroup, { type: 'unwrap' })).toBe(String.raw`前
段一

段二
\begin{center}
\includegraphics[width=0.11\linewidth]{a.png}
\end{center}
后`)
  })

  it('keeps figure widths when unwrapping a top or bottom layout', () => {
    expect(edit(group.replace('fig-pos=right-top, text-ratio=0.6', 'fig-pos=bottom-center'), pickGroup, { type: 'unwrap' }))
      .toContain(String.raw`\includegraphics[width=.3\linewidth]{a.png}`)
  })

  it('puts the image first when unwrapping a left layout', () => {
    expect(edit(group.replace('right-top', 'left'), pickGroup, { type: 'unwrap' })).toMatch(/^\\begin\{center\}/)
  })

  it('expands to the previous and next paragraphs', () => {
    const latex = `甲\n\n乙\n\n${group}\n\n丙\n\n丁`

    expect(edit(latex, pickGroup, { type: 'adjust', action: 'expand-before' })).toBe(`甲\n\n${group.replace('{\n段一', '{\n乙\n\n段一')}\n\n丙\n\n丁`)
    expect(edit(latex, pickGroup, { type: 'adjust', action: 'expand-after' })).toBe(`甲\n\n乙\n\n${group.replace('段二\n}', '段二\n\n丙\n}')}\n\n丁`)
  })

  it('moves the first or last paragraph out of the text region', () => {
    expect(edit(group, pickGroup, { type: 'adjust', action: 'shrink-first' })).toBe(`段一\n\n${group.replace('段一\n\n', '')}`)
    expect(edit(group, pickGroup, { type: 'adjust', action: 'shrink-last' })).toBe(`${group.replace('\n\n段二', '')}\n\n段二`)
  })

  it('refuses edits that would leave the text region empty or absorb nothing', () => {
    const single = group.replace('段一\n\n段二', '只有一段')

    expect(edit(single, pickGroup, { type: 'adjust', action: 'shrink-first' })).toBeNull()
    expect(edit(single, pickGroup, { type: 'adjust', action: 'expand-before' })).toBeNull()
  })
})
