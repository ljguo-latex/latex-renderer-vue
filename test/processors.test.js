import { describe, expect, it } from 'vitest'

import { parseLatex, replaceNodeDeep, serializeLatex } from '../src/latex/core.js'
import { defaultProcessors } from '../src/latex/processors/index.js'

function typesOf(nodes) {
  return nodes.map((node) => node.type)
}

describe('imageProcessor', () => {
  it('parses \\includegraphics without alignment env', () => {
    const latex = '\\includegraphics[width=5cm]{foo.png}'
    const nodes = parseLatex(latex, defaultProcessors)

    expect(typesOf(nodes)).toEqual(['image'])
    expect(nodes[0].src).toBe('foo.png')
    expect(nodes[0].options).toEqual({ width: '5cm' })
    expect(nodes[0].alignment).toBe('default')
  })

  it('captures alignment when wrapped in flushleft/center/flushright', () => {
    const latex = '\\begin{center}\\includegraphics{a.png}\\end{center}'
    const nodes = parseLatex(latex, defaultProcessors)

    expect(nodes[0].type).toBe('image')
    expect(nodes[0].alignment).toBe('center')
  })

  it('round-trips serialization when original is preserved', () => {
    const latex = 'prefix \\includegraphics[width=5cm]{foo.png} suffix'
    expect(serializeLatex(parseLatex(latex, defaultProcessors), defaultProcessors)).toBe(latex)
  })
})

describe('centerProcessor', () => {
  it('parses \\begin{center}...\\end{center} into a center node', () => {
    const nodes = parseLatex('\\begin{center}hello\\end{center}', defaultProcessors)
    expect(nodes[0].type).toBe('center')
    expect(nodes[0].environmentName).toBe('center')
  })

  it('round-trips flushleft and flushright', () => {
    for (const env of ['flushleft', 'flushright']) {
      const latex = `\\begin{${env}}hi\\end{${env}}`
      const nodes = parseLatex(latex, defaultProcessors)
      expect(nodes[0].environmentName).toBe(env)
      expect(serializeLatex(nodes, defaultProcessors)).toBe(latex)
    }
  })
})

describe('choicesProcessor', () => {
  it.each(['auto', 'top-left', 'left', 'bottom'])('parses and serializes label-pos = %s', (labelPos) => {
    const latex = `\\begin{choices}[label-pos = ${labelPos}]\\item A\\item B\\end{choices}`
    const nodes = parseLatex(latex, defaultProcessors)
    expect(nodes[0].options).toEqual({ labelPos })
    expect(serializeLatex(nodes, defaultProcessors)).toContain(`[label-pos = ${labelPos}]`)
  })

  it('accepts braces and whitespace around label-pos values', () => {
    const nodes = parseLatex(String.raw`\begin{choices}[label-pos = { bottom }]\item A\end{choices}`, defaultProcessors)
    expect(nodes[0].options.labelPos).toBe('bottom')
  })

  it('falls back to the existing layout for missing or invalid label-pos', () => {
    for (const options of ['', '[label-pos = invalid]']) {
      const nodes = parseLatex(`\\begin{choices}${options}\\item A\\end{choices}`, defaultProcessors)
      expect(nodes[0].options).toEqual({})
      expect(serializeLatex(nodes, defaultProcessors)).toContain('\\begin{choices}\n')
    }
  })

  it('preserves independent nested label positions after an image edit', () => {
    const nodes = parseLatex(String.raw`\begin{choices}[label-pos=left]\item \begin{choices}[label-pos=bottom]\item \includegraphics[width=3cm]{a.png}\end{choices}\end{choices}`, defaultProcessors)
    const image = nodes[0].items[0][0].items[0][0]
    const updated = replaceNodeDeep(nodes, { ...image, options: { width: '4cm' } })
    const serialized = serializeLatex(updated, defaultProcessors)
    expect(serialized).toContain('\\begin{choices}[label-pos = left]')
    expect(serialized).toContain('\\begin{choices}[label-pos = bottom]')
    expect(serialized).toContain('\\includegraphics[width=4cm]{a.png}')
  })

  it('splits items and preserves order', () => {
    const latex = '\\begin{choices}\\item a\\item b\\item c\\end{choices}'
    const nodes = parseLatex(latex, defaultProcessors)

    expect(nodes[0].type).toBe('choices')
    expect(nodes[0].items).toHaveLength(3)
  })
})

describe('enumerateProcessor', () => {
  it('extracts the label option', () => {
    const latex = '\\begin{enumerate}[label = (\\arabic*)]\\item x\\end{enumerate}'
    const nodes = parseLatex(latex, defaultProcessors)

    expect(nodes[0].type).toBe('enumerate')
    expect(nodes[0].options?.label).toBe('(\\arabic*)')
  })

  it('supports nested choices inside enumerate items', () => {
    const latex = [
      '\\begin{enumerate}',
      '\\item first',
      '\\begin{choices}',
      '\\item A',
      '\\item B',
      '\\end{choices}',
      '\\item second',
      '\\end{enumerate}',
    ].join('\n')

    const nodes = parseLatex(latex, defaultProcessors)
    expect(nodes[0].type).toBe('enumerate')
    expect(nodes[0].items).toHaveLength(2)

    const firstItemNodes = nodes[0].items[0]
    expect(Array.isArray(firstItemNodes)).toBe(true)
    expect(firstItemNodes.some((n) => n.type === 'choices')).toBe(true)
  })
})

describe('vspaceProcessor', () => {
  it('parses length string and starred variant', () => {
    const nodes = parseLatex('\\vspace*{1.5em}', defaultProcessors)

    expect(nodes[0].type).toBe('vspace')
    expect(nodes[0].starred).toBe(true)
    expect(nodes[0].lengthString).toBe('1.5em')
    expect(nodes[0].length?.css).toBe('1.5em')
  })
})

describe('minipageProcessor', () => {
  it('parses width argument and alignment marker', () => {
    const latex = '\\begin{minipage}{0.5\\linewidth}\\centering body\\end{minipage}'
    const nodes = parseLatex(latex, defaultProcessors)

    expect(nodes[0].type).toBe('minipage')
    expect(nodes[0].widthString).toBe('0.5\\linewidth')
    expect(nodes[0].alignment).toBe('center')
  })
})

describe('tabularProcessor', () => {
  it('parses a simple tabular', () => {
    const latex = '\\begin{tabular}{|l|c|}\\hline a & b \\\\ \\hline c & d \\\\ \\hline\\end{tabular}'
    const nodes = parseLatex(latex, defaultProcessors)

    expect(nodes[0].type).toBe('tabular')
    expect(nodes[0].rows).toHaveLength(2)
    expect(nodes[0].columns).toHaveLength(2)
  })
})

describe('mathEnvironmentProcessor', () => {
  it('captures block math environments', () => {
    const latex = '\\begin{equation}x=1\\end{equation}'
    const nodes = parseLatex(latex, defaultProcessors)

    expect(nodes[0].type).toBe('mathEnvironment')
    expect(nodes[0].environmentName).toBe('equation')
  })

  it('ignores math environments that live inside inline math delimiters', () => {
    const latex = '$\\begin{aligned}x=1\\end{aligned}$'
    const nodes = parseLatex(latex, defaultProcessors)
    expect(nodes.every((node) => node.type !== 'mathEnvironment')).toBe(true)
  })
})
