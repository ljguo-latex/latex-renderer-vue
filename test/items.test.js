import { describe, expect, it } from 'vitest'

import { splitItems } from '../src/latex/utils/items.js'

describe('splitItems', () => {
  it('splits simple items separated by \\item', () => {
    const body = '\\item first\n\\item second'
    expect(splitItems(body)).toEqual(['first', 'second'])
  })

  it('splits when \\item is directly followed by a brace (no whitespace)', () => {
    const body = '\\item{first}\n\\item{second}'
    expect(splitItems(body)).toEqual(['{first}', '{second}'])
  })

  it('does not treat \\itemize as an \\item token', () => {
    const body = '\\item something \\itemize followup'
    expect(splitItems(body)).toEqual(['something \\itemize followup'])
  })

  it('consumes the optional [label] on \\item', () => {
    const body = '\\item[a] first\n\\item[b] second'
    expect(splitItems(body)).toEqual(['first', 'second'])
  })

  it('accepts \\item at EOF (no trailing whitespace)', () => {
    const body = '\\item only'
    expect(splitItems(body)).toEqual(['only'])
  })

  it('does not split \\item inside a nested environment', () => {
    const body = [
      '\\item outer1',
      '\\begin{choices}',
      '\\item innerA',
      '\\item innerB',
      '\\end{choices}',
      '\\item outer2',
    ].join('\n')

    const [first, second] = splitItems(body)
    expect(second).toBe('outer2')
    expect(first).toContain('\\begin{choices}')
    expect(first).toContain('innerA')
    expect(first).toContain('innerB')
  })
})
