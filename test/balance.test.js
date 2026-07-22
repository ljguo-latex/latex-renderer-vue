import { describe, expect, it } from 'vitest'

import { findBalancedBraceEnd, isEscaped, readBalancedGroup, skipWhitespace } from '../src/latex/utils/balance.js'

describe('isEscaped', () => {
  it('is false at index 0', () => {
    expect(isEscaped('\\a', 0)).toBe(false)
  })

  it('is true after a single backslash', () => {
    expect(isEscaped('a\\{', 2)).toBe(true)
  })

  it('is false after a doubled backslash (escaped backslash)', () => {
    expect(isEscaped('a\\\\{', 3)).toBe(false)
  })

  it('is true after three backslashes', () => {
    expect(isEscaped('\\\\\\{', 3)).toBe(true)
  })
})

describe('findBalancedBraceEnd', () => {
  it('returns -1 when opener is missing', () => {
    expect(findBalancedBraceEnd('abc', 0)).toBe(-1)
  })

  it('finds the matching closing brace', () => {
    expect(findBalancedBraceEnd('{abc}', 0)).toBe(4)
  })

  it('handles nested braces', () => {
    expect(findBalancedBraceEnd('{a{b}c}', 0)).toBe(6)
  })

  it('ignores escaped braces', () => {
    expect(findBalancedBraceEnd('{a\\}b}', 0)).toBe(5)
  })

  it('treats \\\\{ as a real brace (escaped backslash, not brace)', () => {
    const input = '{a\\\\{b}c}'
    expect(findBalancedBraceEnd(input, 0)).toBe(input.length - 1)
  })
})

describe('readBalancedGroup', () => {
  it('returns null when opener is missing', () => {
    expect(readBalancedGroup('abc', 0)).toBeNull()
  })

  it('returns the balanced content and end index', () => {
    const result = readBalancedGroup('{hello}', 0)
    expect(result).toEqual({ end: 7, content: 'hello' })
  })

  it('handles nested groups', () => {
    const result = readBalancedGroup('{a{b}c}', 0)
    expect(result).toEqual({ end: 7, content: 'a{b}c' })
  })
})

describe('skipWhitespace', () => {
  it('advances past space and tab and newline', () => {
    expect(skipWhitespace('   \n\tabc', 0)).toBe(5)
  })

  it('returns from when there is no whitespace', () => {
    expect(skipWhitespace('abc', 0)).toBe(0)
  })
})
