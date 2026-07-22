import { describe, expect, it } from 'vitest'

import { normalizeLatexTextForPreview } from '../src/utils/latex.js'

describe('normalizeLatexTextForPreview (text-mode commands)', () => {
  it('converts ~ to a non-breaking space', () => {
    expect(normalizeLatexTextForPreview('a~b')).toBe('a\u00A0b')
  })

  it('keeps escaped \\~ literal', () => {
    expect(normalizeLatexTextForPreview('a\\~b')).toBe('a\\~b')
  })

  it('converts \\quad and \\qquad to em spaces', () => {
    expect(normalizeLatexTextForPreview('a\\quad b')).toBe('a\u2003 b')
    expect(normalizeLatexTextForPreview('a\\qquad b')).toBe('a\u2003\u2003 b')
  })

  it('converts \\enspace, \\, and \\; to spacing characters', () => {
    expect(normalizeLatexTextForPreview('a\\enspace b')).toBe('a\u2002 b')
    expect(normalizeLatexTextForPreview('a\\,b')).toBe('a\u2009b')
    expect(normalizeLatexTextForPreview('a\\;b')).toBe('a\u2005b')
  })

  it('does not confuse \\quadxyz with \\quad', () => {
    expect(normalizeLatexTextForPreview('\\quadratic')).toBe('\\quadratic')
  })

  it('converts \\ldots and \\dots to an ellipsis', () => {
    expect(normalizeLatexTextForPreview('a\\ldots b')).toBe('a… b')
    expect(normalizeLatexTextForPreview('a\\dots b')).toBe('a… b')
  })

  it('converts \\newline to a line break', () => {
    expect(normalizeLatexTextForPreview('a\\newline b')).toBe('a\nb')
  })

  it('leaves math segments untouched', () => {
    expect(normalizeLatexTextForPreview('$a~b$')).toBe('$a~b$')
    expect(normalizeLatexTextForPreview('$a\\,b$')).toBe('$a\\,b$')
    expect(normalizeLatexTextForPreview('$x\\ldots y$')).toBe('$x\\ldots y$')
  })

  it('treats \\\\, as a line break followed by a comma', () => {
    expect(normalizeLatexTextForPreview('a\\\\,b')).toBe('a\n,b')
  })

  it('keeps escaped braces for the inline parser (unescaped at the leaf)', () => {
    expect(normalizeLatexTextForPreview('\\{a\\}')).toBe('\\{a\\}')
  })
})
