import { isEscaped } from './utils/balance.js'

export const MATH_DELIMITERS = [
  { open: '$$', close: '$$' },
  { open: '\\[', close: '\\]' },
  { open: '\\(', close: '\\)' },
  { open: '$', close: '$' },
]

export function canStartDelimiter(input, delimiter, index) {
  if (!input.startsWith(delimiter.open, index)) {
    return false
  }

  if (delimiter.open === '$' || delimiter.open === '$$') {
    return !isEscaped(input, index)
  }

  return true
}

export function findClosingDelimiter(input, delimiter, startIndex) {
  let cursor = startIndex + delimiter.open.length

  while (cursor < input.length) {
    const nextIndex = input.indexOf(delimiter.close, cursor)

    if (nextIndex === -1) {
      return -1
    }

    if ((delimiter.close === '$' || delimiter.close === '$$') && isEscaped(input, nextIndex)) {
      cursor = nextIndex + 1
      continue
    }

    return nextIndex
  }

  return -1
}

export function findNextMathSegment(input, from = 0) {
  for (let index = from; index < input.length; index += 1) {
    for (const delimiter of MATH_DELIMITERS) {
      if (!canStartDelimiter(input, delimiter, index)) {
        continue
      }

      const closingIndex = findClosingDelimiter(input, delimiter, index)

      if (closingIndex === -1) {
        continue
      }

      return {
        start: index,
        end: closingIndex + delimiter.close.length,
        bodyStart: index + delimiter.open.length,
        bodyEnd: closingIndex,
        delimiter,
      }
    }
  }

  return null
}

export function findContainingMathSegment(input, index, from = 0) {
  let cursor = from

  while (cursor < input.length) {
    const segment = findNextMathSegment(input, cursor)

    if (!segment || segment.start > index) {
      return null
    }

    if (index >= segment.bodyStart && index < segment.bodyEnd) {
      return segment
    }

    cursor = segment.end
  }

  return null
}
