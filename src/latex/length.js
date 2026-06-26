const CSS_LENGTH_PATTERN = /^(\d+(?:\.\d+)?|\.\d+)\s*(cm|mm|in|pt|px)$/i
const CSS_PERCENT_PATTERN = /^(\d+(?:\.\d+)?|\.\d+)\s*%$/
const RELATIVE_TEXT_WIDTH_PATTERN = /^(\d+(?:\.\d+)?|\.\d+)\s*\\(?:textwidth|linewidth|columnwidth)$/

function trimNumber(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return value
  }

  return Number(number.toFixed(4)).toString()
}

export function parseLatexLength(value = '') {
  const raw = String(value || '').trim()

  if (!raw) {
    return {
      raw,
      css: null,
      kind: 'unknown',
    }
  }

  const percentMatch = raw.match(CSS_PERCENT_PATTERN)

  if (percentMatch) {
    return {
      raw,
      css: `${trimNumber(percentMatch[1])}%`,
      kind: 'percent',
    }
  }

  const fixedMatch = raw.match(CSS_LENGTH_PATTERN)

  if (fixedMatch) {
    return {
      raw,
      css: `${trimNumber(fixedMatch[1])}${fixedMatch[2].toLowerCase()}`,
      kind: 'fixed',
    }
  }

  const relativeMatch = raw.match(RELATIVE_TEXT_WIDTH_PATTERN)

  if (relativeMatch) {
    return {
      raw,
      css: `${trimNumber(Number(relativeMatch[1]) * 100)}%`,
      kind: 'relative',
    }
  }

  return {
    raw,
    css: null,
    kind: 'unknown',
  }
}
