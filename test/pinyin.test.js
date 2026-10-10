import { describe, expect, it } from 'vitest'
import { createPinyinTokens } from '../src/latex/pinyin/tokens.js'
import { DEFAULT_PINYIN_OPTIONS, parsePinyinSetup, resolvePinyinOptions } from '../src/latex/pinyin/options.js'
import { createPinyinLines } from '../src/latex/pinyin/scope.js'
import { seedPinyinMath } from '../src/composables/mathJaxPinyin.js'
import { parseLatex, serializeLatex } from '../src/latex/core.js'
import { defaultProcessors } from '../src/latex/processors/index.js'
import { inlineCommandHandlers } from '../src/latex/inline/commands.js'
import { parseInlineContent } from '../src/latex/inline/core.js'
import { resolveDocumentContexts } from '../src/latex/inline/documentContext.js'

const baseContext = { pinyinOptions: resolvePinyinOptions() }
const readings = (text) => createPinyinTokens(text).map((token) => token.pinyin || '')
const lineText = (line) => line.runs.flatMap((run) => run.tokens).map((token) => token.text).join('')

describe('pinyin text model', () => {
  it('uses phrase context to distinguish polyphones', () => {
    expect(readings('音乐快乐')).toEqual(['yīn', 'yuè', 'kuài', 'lè'])
    expect(readings('重阳')).toEqual(['chóng', 'yáng'])
  })

  it('applies explicit readings after resolving the complete text', () => {
    let received
    const tokens = createPinyinTokens('重(zhòng)阳(yáng)', (text) => {
      received = text
      return ['chóng', 'yáng']
    })
    expect(received).toBe('重阳')
    expect(tokens).toEqual([{ text: '重', pinyin: 'zhòng' }, { text: '阳', pinyin: 'yáng' }])
    expect(readings('重阳(yáng)')).toEqual(['chóng', 'yáng'])
  })

  it('retains non-Chinese text, ordinary parentheses and unknown Unicode characters', () => {
    const text = '中国 and (test) 字(说明) <script> & 𠮷😀'
    const tokens = createPinyinTokens(text)
    expect(tokens.map((token) => token.text).join('')).toBe(text)
    expect(tokens.find((token) => token.text === '😀')).toEqual({ text: '😀' })
    expect(createPinyinTokens('𠮷(jí)')).toEqual([{ text: '𠮷', pinyin: 'jí' }])
  })

  it('normalizes decomposed accents and preserves malformed annotations', () => {
    expect(createPinyinTokens('字(zi\u0300)')[0].pinyin).toBe('zì')
    for (const text of ['字()', '字(zì', '字(<img>)']) {
      expect(createPinyinTokens(text).map((token) => token.text).join('')).toBe(text)
    }
    expect(createPinyinTokens('')).toEqual([])
  })

  it('reports an incompatible resolver instead of misaligning readings', () => {
    expect(() => createPinyinTokens('中国', () => ['zhōng'])).toThrow('one reading per Unicode character')
  })
})

describe('pinyin configuration', () => {
  it('validates settings without mutating defaults or the previous snapshot', () => {
    const previous = resolvePinyinOptions({ color: 'red' })
    const next = parsePinyinSetup('ratio=0.7,color=rgb(10,20,30),fallback=false,align=left', previous)
    expect(next).toEqual({ ratio: 0.7, color: 'rgb(10,20,30)', fallback: false, align: 'left' })
    expect(previous.color).toBe('red')
    expect(DEFAULT_PINYIN_OPTIONS.color).toBe('inherit')
    expect(parsePinyinSetup('ratio=Infinity,color=red;position:fixed,fallback=maybe,align=bad', previous)).toEqual(previous)
    expect(parsePinyinSetup('ratio=-1,color={#0d9488}', previous)).toEqual({ ...previous, color: '#0d9488' })
  })

  it('keeps brace groups and math declarations local', () => {
    const nodes = parseInlineContent(String.raw`\xpinyinsetup{color=red}{\xpinyinsetup{color=blue}\pinyin{中}}\pinyin{国}$\xpinyinsetup{color=green}\pinyin{字}$\pinyin{文}`, inlineCommandHandlers, baseContext)
    expect(nodes.filter((node) => node.name === 'pinyin').map((node) => node.context.pinyinOptions.color)).toEqual(['blue', 'red', 'red'])
    expect(nodes.find((node) => node.type === 'math').context.pinyinOptions.color).toBe('red')
  })

  it('inherits declarations across blocks and limits environment declarations to their children', () => {
    const source = String.raw`\xpinyinsetup{color=red}\begin{center}\xpinyinsetup{color=blue}\pinyin{中}\end{center}\begin{pinyinscope}国\end{pinyinscope}\pinyin{文}`
    const raw = parseLatex(source, defaultProcessors)
    const resolved = resolveDocumentContexts(raw, inlineCommandHandlers, baseContext).nodes
    expect(resolved[1].children[0].inlineNodes.find((node) => node.name === 'pinyin').context.pinyinOptions.color).toBe('blue')
    expect(resolved[2].inlineContext.pinyinOptions.color).toBe('red')
    expect(resolved[3].inlineNodes[0].context.pinyinOptions.color).toBe('red')
    expect(serializeLatex(resolved, defaultProcessors)).toBe(source)
    expect(raw[0].inlineContext).toBeUndefined()
  })
})

describe('pinyinscope', () => {
  it('preserves empty lines and treats a newline after a TeX break as one break', () => {
    const lines = createPinyinLines('\n床前明月光\n\n疑是地上霜\\\\\n举头望明月\n')
    expect(lines.map(lineText)).toEqual(['床前明月光', '', '疑是地上霜', '举头望明月'])
  })

  it('captures settings per run without leaking them to callers', () => {
    const options = resolvePinyinOptions()
    const [line] = createPinyinLines(String.raw`中\xpinyinsetup{color=red}国`, options)
    expect(line.runs.map((run) => run.options.color)).toEqual(['inherit', 'red'])
    expect(lineText(line)).toBe('中国')
    expect(options.color).toBe('inherit')
    const [music] = createPinyinLines(String.raw`音\xpinyinsetup{color=red}乐`)
    expect(music.runs.flatMap((run) => run.tokens).map((token) => token.pinyin)).toEqual(['yīn', 'yuè'])
  })

  it('leaves a scope inside math to MathJax and preserves source during serialization', () => {
    const source = String.raw`\begin{pinyinscope}[align=left]中国\end{pinyinscope}$$\begin{pinyinscope}音乐\end{pinyinscope}$$`
    const nodes = parseLatex(source, defaultProcessors)
    expect(nodes.map((node) => node.type)).toEqual(['pinyinscope', 'text'])
    expect(serializeLatex(nodes, defaultProcessors)).toBe(source)
  })
})

describe('MathJax configuration seeding', () => {
  it('seeds each formula independently while preserving grouping and source input', () => {
    const source = String.raw`$\pinyin{中}$ + \(\pinyin{国}\)`
    const output = seedPinyinMath(source, { color: 'red' })
    expect(output.match(/\\xpinyinsetup/g)).toHaveLength(2)
    expect(output).toContain('color={red}')
    expect(output).toContain(String.raw`\(\xpinyinsetup`)
    expect(seedPinyinMath('$x^2$', { color: 'red' })).toBe('$x^2$')
  })

  it('seeds undelimited math environments after their opening', () => {
    const output = seedPinyinMath(String.raw`\begin{equation}\frac{\pinyin{速度}}{t}\end{equation}`, { ratio: 0.5 })
    expect(output).toContain(String.raw`\begin{equation}\xpinyinsetup{ratio=0.5`)
  })
})
