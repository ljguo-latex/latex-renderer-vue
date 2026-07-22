import { describe, expect, it } from 'vitest'

import { replaceNodeDeep } from '../src/latex/core.js'

describe('replaceNodeDeep', () => {
  it('returns the same array reference when nothing matches', () => {
    const nodes = [{ id: 'a', type: 'text', content: 'x' }]
    const result = replaceNodeDeep(nodes, { id: 'missing', type: 'text', content: 'y' })
    expect(result).toBe(nodes)
  })

  it('replaces a top-level node by id', () => {
    const nodes = [
      { id: 'a', type: 'text', content: 'x' },
      { id: 'b', type: 'text', content: 'y' },
    ]

    const result = replaceNodeDeep(nodes, { id: 'b', type: 'text', content: 'Y' })
    expect(result[1].content).toBe('Y')
    expect(result[0]).toBe(nodes[0])
  })

  it('replaces a node nested inside children', () => {
    const inner = { id: 'inner', type: 'text', content: 'old' }
    const nodes = [{ id: 'outer', type: 'center', children: [inner] }]

    const result = replaceNodeDeep(nodes, { id: 'inner', type: 'text', content: 'new' })
    expect(result[0].children[0].content).toBe('new')
  })

  it('replaces a node nested inside enumerate items', () => {
    const inner = { id: 'inner', type: 'text', content: 'old' }
    const nodes = [{ id: 'e', type: 'enumerate', items: [[inner]] }]

    const result = replaceNodeDeep(nodes, { id: 'inner', type: 'text', content: 'new' })
    expect(result[0].items[0][0].content).toBe('new')
  })

  it('replaces a node nested inside tabular cells', () => {
    const inner = { id: 'inner', type: 'text', content: 'old' }
    const nodes = [
      {
        id: 't',
        type: 'tabular',
        rows: [
          {
            id: 'row_1',
            cells: [
              { id: 'cell_1_1', content: 'x', children: [inner] },
            ],
          },
        ],
      },
    ]

    const result = replaceNodeDeep(nodes, { id: 'inner', type: 'text', content: 'new' })
    expect(result[0].rows[0].cells[0].children[0].content).toBe('new')
  })

  it('does not clone unrelated tabular rows when replacing (guards against the previous reference-comparison bug)', () => {
    const otherRow = {
      id: 'row_other',
      cells: [{ id: 'cell_other', content: 'z', children: [] }],
    }
    const nodes = [
      {
        id: 't',
        type: 'tabular',
        rows: [
          otherRow,
          {
            id: 'row_target',
            cells: [
              {
                id: 'cell_target',
                content: 'x',
                children: [{ id: 'inner', type: 'text', content: 'old' }],
              },
            ],
          },
        ],
      },
    ]

    const result = replaceNodeDeep(nodes, { id: 'inner', type: 'text', content: 'new' })
    expect(result[0].rows[0]).toBe(otherRow)
  })
})
