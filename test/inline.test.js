import { describe, expect, it } from 'vitest'

import { inlineCommandHandlers } from '../src/latex/inline/commands.js'
import { parseInlineContent } from '../src/latex/inline/core.js'

function findCommand(nodes, name) {
  for (const node of nodes) {
    if (node.type === 'command' && node.name === name) {
      return node
    }
  }
  return null
}

describe('parseInlineContent (registered commands)', () => {
  it('parses a single \\textbf as a command node', () => {
    const nodes = parseInlineContent('\\textbf{hello}', inlineCommandHandlers)
    const bold = findCommand(nodes, 'textbf')
    expect(bold).toBeTruthy()
    expect(bold.args).toEqual(['hello'])
  })

  it('parses \\textcolor with two arguments', () => {
    const nodes = parseInlineContent('\\textcolor{red}{hi}', inlineCommandHandlers)
    const color = findCommand(nodes, 'textcolor')
    expect(color).toBeTruthy()
    expect(color.args).toEqual(['red', 'hi'])
  })

  it('exposes the nested command in the raw arg body (recursive parse happens in the renderer)', () => {
    const nodes = parseInlineContent('\\textcolor{pink}{\\textbf{xxx}}', inlineCommandHandlers)
    const color = findCommand(nodes, 'textcolor')
    expect(color).toBeTruthy()
    expect(color.args[1]).toBe('\\textbf{xxx}')

    const nested = parseInlineContent(color.args[1], inlineCommandHandlers)
    const bold = findCommand(nested, 'textbf')
    expect(bold).toBeTruthy()
    expect(bold.args).toEqual(['xxx'])
  })

  it('supports two-layer nesting \\textbf{\\textit{x}}', () => {
    const nodes = parseInlineContent('\\textbf{\\textit{x}}', inlineCommandHandlers)
    const bold = findCommand(nodes, 'textbf')
    expect(bold).toBeTruthy()

    const innerNodes = parseInlineContent(bold.args[0], inlineCommandHandlers)
    const italic = findCommand(innerNodes, 'textit')
    expect(italic).toBeTruthy()
    expect(italic.args).toEqual(['x'])
  })

  it('treats a bare group as transparent: {test} renders without braces', () => {
    const nodes = parseInlineContent('{test}', inlineCommandHandlers)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('text')
    expect(nodes[0].content).toBe('test')
  })

  it('strips nested bare groups {{a}}', () => {
    const nodes = parseInlineContent('{{a}}', inlineCommandHandlers)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('text')
    expect(nodes[0].content).toBe('a')
  })

  it('parses commands inside a bare group {\\textbf{a}}', () => {
    const nodes = parseInlineContent('{\\textbf{a}}', inlineCommandHandlers)
    const bold = findCommand(nodes, 'textbf')
    expect(bold).toBeTruthy()
    expect(bold.args).toEqual(['a'])
    expect(nodes.some((node) => node.type === 'text' && node.content.includes('{'))).toBe(false)
  })

  it('keeps the extra group transparent in \\textcolor{red}{{test}}', () => {
    const nodes = parseInlineContent('\\textcolor{red}{{test}}', inlineCommandHandlers)
    const color = findCommand(nodes, 'textcolor')
    expect(color).toBeTruthy()
    expect(color.args[1]).toBe('{test}')

    const inner = parseInlineContent(color.args[1], inlineCommandHandlers)
    expect(inner).toHaveLength(1)
    expect(inner[0].type).toBe('text')
    expect(inner[0].content).toBe('test')
  })

  it('keeps escaped braces literal: \\{a\\}', () => {
    const nodes = parseInlineContent('\\{a\\}', inlineCommandHandlers)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('text')
    expect(nodes[0].content).toBe('\\{a\\}')
  })

  it('keeps an unbalanced brace literal', () => {
    const nodes = parseInlineContent('a { b', inlineCommandHandlers)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].content).toBe('a { b')
  })

  it('leaves unknown-command arguments literal: \\text{def}{ghi}', () => {
    const nodes = parseInlineContent('\\text{def}{ghi} tail', inlineCommandHandlers)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('text')
    expect(nodes[0].content).toBe('\\text{def}{ghi} tail')
  })

  it('still parses the declaration group form {\\color{red} xxx}', () => {
    const nodes = parseInlineContent('{\\color{red} xxx} after', inlineCommandHandlers)
    const color = findCommand(nodes, 'color')
    expect(color).toBeTruthy()
    expect(color.args[0]).toBe('red')
    expect(color.args[1].trim()).toBe('xxx')

    const tail = nodes[nodes.length - 1]
    expect(tail.type).toBe('text')
    expect(tail.content).toBe(' after')
  })

  it('parses math inside a bare group {$x$}', () => {
    const nodes = parseInlineContent('{$x^2$}', inlineCommandHandlers)
    expect(nodes.some((node) => node.type === 'math' && node.content.includes('x^2'))).toBe(true)
    expect(nodes.some((node) => node.type === 'text' && node.content.includes('{'))).toBe(false)
  })

  it('registers the common text-decoration commands', () => {
    const names = ['textbf', 'textit', 'emph', 'underline', 'uline', 'sout', 'overline', 'texttt', 'textrm', 'textsf', 'textsuperscript', 'textsubscript']
    for (const name of names) {
      expect(inlineCommandHandlers[name], `handler missing for \\${name}`).toBeTruthy()
      expect(typeof inlineCommandHandlers[name].toMath).toBe('function')
    }
  })
})
