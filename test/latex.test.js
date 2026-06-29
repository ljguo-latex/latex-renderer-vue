import { describe, it, expect } from 'vitest'
import { parseLatex, serializeLatex } from '../src/latex/core.js'
import { defaultProcessors } from '../src/latex/processors/index.js'

describe('LaTeX Typesetting Elements Parser and Serializer', () => {
  it('should parse and serialize blank lines correctly', () => {
    const latex = '1. 已知 $f(x) = \\blank{}$，答案是 \\blank{}。'
    const parsed = parseLatex(latex, defaultProcessors)
    expect(parsed.length).toBe(1)
    expect(parsed[0].type).toBe('text')
    
    // Test serialization
    const serialized = serializeLatex(parsed, defaultProcessors)
    expect(serialized).toBe(latex)
  })

  it('should parse and serialize choices parentheses correctly', () => {
    const latex = '2. 若 $A \\subseteq B$，则答案为 \\paren{}。'
    const parsed = parseLatex(latex, defaultProcessors)
    expect(parsed.length).toBe(1)
    expect(parsed[0].type).toBe('text')

    // Test serialization
    const serialized = serializeLatex(parsed, defaultProcessors)
    expect(serialized).toBe(latex)
  })

  it('should parse and serialize circled numbers correctly', () => {
    const latex = '序号 \\circled{1}，\\circled{10} 都是圆圈数字。'
    const parsed = parseLatex(latex, defaultProcessors)
    expect(parsed[0].type).toBe('text')

    // Verify serialization
    const serialized = serializeLatex(parsed, defaultProcessors)
    expect(serialized).toBe(latex)
  })
})
