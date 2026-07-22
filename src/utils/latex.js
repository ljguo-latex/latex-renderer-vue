import { findNextMathSegment } from '../latex/mathDelimiters.js'
import { isEscaped } from '../latex/utils/balance.js'

export const PX_PER_CM = 37.79527559
export const MIN_WIDTH_CM = 1
export const MIN_WIDTH_PX = MIN_WIDTH_CM * PX_PER_CM
export const MAX_WIDTH_CM = 18
export const MAX_WIDTH_PX = MAX_WIDTH_CM * PX_PER_CM
export const IMAGE_ALIGNMENTS = ['default', 'left', 'center', 'right']

export function pxToCm(px) {
  return px / PX_PER_CM
}

export function cmToPx(cm) {
  return cm * PX_PER_CM
}

export function trimNumber(value, digits = 2) {
  return Number(value.toFixed(digits)).toString()
}

export function formatWidthInCm(px) {
  return `${trimNumber(pxToCm(px))}cm`
}

export function clampImageWidthPx(px) {
  return Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, px))
}

export function parseLengthToPx(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') {
    return null
  }

  const match = rawValue.trim().match(/^(-?\d+(?:\.\d+)?)(cm|px)?$/i)

  if (!match) {
    return null
  }

  const numericValue = Number(match[1])
  const unit = (match[2] || 'px').toLowerCase()

  if (!Number.isFinite(numericValue)) {
    return null
  }

  if (unit === 'cm') {
    return cmToPx(numericValue)
  }

  return numericValue
}

export function updateImageSegmentWidth(segment, widthPx) {
  const nextOptions = {
    ...segment.options,
    width: formatWidthInCm(clampImageWidthPx(widthPx)),
  }

  delete nextOptions.height

  return {
    ...segment,
    options: nextOptions,
  }
}

export function updateImageSegmentAlignment(segment, alignment) {
  return {
    ...segment,
    alignment: IMAGE_ALIGNMENTS.includes(alignment) ? alignment : 'default',
  }
}

export function normalizeLatexTextForPreview(content = '') {
  const withoutComments = removeLatexComments(content)
  const normalizedSegments = []
  let cursor = 0

  while (cursor < withoutComments.length) {
    const nextMathSegment = findNextMathSegment(withoutComments, cursor)

    if (!nextMathSegment) {
      normalizedSegments.push(normalizeLatexTextSegment(withoutComments.slice(cursor)))
      break
    }

    if (nextMathSegment.start > cursor) {
      normalizedSegments.push(normalizeLatexTextSegment(withoutComments.slice(cursor, nextMathSegment.start)))
    }

    normalizedSegments.push(withoutComments.slice(nextMathSegment.start, nextMathSegment.end))
    cursor = nextMathSegment.end
  }

  return normalizedSegments
    .join('')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
}

function removeLatexComments(content = '') {
  let result = ''
  let cursor = 0

  while (cursor < content.length) {
    if (content[cursor] === '%' && !isEscaped(content, cursor)) {
      cursor += 1

      while (cursor < content.length && content[cursor] !== '\n' && content[cursor] !== '\r') {
        cursor += 1
      }

      if (content[cursor] === '\r' && content[cursor + 1] === '\n') {
        cursor += 2
      } else if (content[cursor] === '\n' || content[cursor] === '\r') {
        cursor += 1
      }

      continue
    }

    result += content[cursor]
    cursor += 1
  }

  return result
}

function replaceUnescaped(content, pattern, replacement) {
  return content.replace(pattern, (match, offset, source) =>
    isEscaped(source, offset) ? match : replacement,
  )
}

const TEXT_MODE_REPLACEMENTS = [
  [/~/g, '\u00A0'],
  [/\\qquad(?![A-Za-z])/g, '\u2003\u2003'],
  [/\\quad(?![A-Za-z])/g, '\u2003'],
  [/\\enspace(?![A-Za-z])/g, '\u2002'],
  [/\\,/g, '\u2009'],
  [/\\;/g, '\u2005'],
  [/\\l?dots(?![A-Za-z])/g, '…'],
  [/\\newline(?![A-Za-z])/g, '\n'],
]

function normalizeLatexTextSegment(content = '') {
  let result = content.replace(/\\([%&#_$])/g, '$1')

  for (const [pattern, replacement] of TEXT_MODE_REPLACEMENTS) {
    result = replaceUnescaped(result, pattern, replacement)
  }

  return result
    .replace(/\\hfill\b/g, '')
    .replace(/\\centering\b/g, '')
    .replace(/\\\\(?:\[[^\]]*\])?/g, '\n')
}
