import { findBalancedBraceEnd } from './utils/balance.js'

const textCommandStart = '\\text{'

const inlineMathCommandTransforms = {
  blank: {
    args: 0,
    toMath: () => '\\class{math-blank-rule}{\\rule[-0.15em]{4.5em}{2px}}',
  },
  paren: {
    args: 0,
    toMath: () => '\\style{color: var(--latex-renderer-theme-color); font-size: 1.15em;}{\\text{\\textbf{(}}\\qquad\\text{\\textbf{)}}}',
  },
  circled: {
    args: 1,
    toMath: (args) => `\\class{math-circled}{\\enclose{circle}{${args[0] ?? ''}}}`,
  },
  textcolor: {
    args: 2,
    toMath: (args) => `\\textcolor{${args[0] ?? ''}}{\\text{${args[1] ?? ''}}}`,
  },
  color: {
    args: 2,
    toMath: (args) => `\\color{${args[0] ?? ''}}{\\text{${args[1] ?? ''}}}`,
  },
}

function wrapTextSegment(segment) {
  if (!segment) {
    return ''
  }

  return `\\text{${segment}}`
}

function readSupportedCommand(input, start) {
  if (input[start] !== '\\') {
    return null
  }

  const commandMatch = input.slice(start).match(/^\\([A-Za-z]+)\b/)

  if (!commandMatch) {
    return null
  }

  const name = commandMatch[1]
  const transform = inlineMathCommandTransforms[name]

  if (!transform) {
    return null
  }

  let cursor = start + commandMatch[0].length
  const args = []

  for (let argIndex = 0; argIndex < transform.args; argIndex += 1) {
    if (input[cursor] !== '{') {
      return null
    }

    const argEnd = findBalancedBraceEnd(input, cursor)

    if (argEnd === -1) {
      return null
    }

    args.push(input.slice(cursor + 1, argEnd))
    cursor = argEnd + 1
  }

  if (transform.args === 0 && input[cursor] === '{') {
    const emptyArgEnd = findBalancedBraceEnd(input, cursor)

    if (emptyArgEnd !== -1) {
      cursor = emptyArgEnd + 1
    }
  }

  return {
    end: cursor,
    math: transform.toMath(args),
  }
}

function rewriteTextCommandBody(body) {
  let cursor = 0
  let textStart = 0
  const parts = []

  while (cursor < body.length) {
    const command = readSupportedCommand(body, cursor)

    if (!command) {
      cursor += 1
      continue
    }

    parts.push(wrapTextSegment(body.slice(textStart, cursor)))
    parts.push(command.math)
    cursor = command.end
    textStart = cursor
  }

  if (!parts.length) {
    return null
  }

  parts.push(wrapTextSegment(body.slice(textStart)))
  return parts.join('')
}

export function rewriteInlineCommandsInText(latex = '') {
  let cursor = 0
  let output = ''

  while (cursor < latex.length) {
    const start = latex.indexOf(textCommandStart, cursor)

    if (start === -1) {
      output += latex.slice(cursor)
      break
    }

    const bodyStart = start + textCommandStart.length
    const bodyEnd = findBalancedBraceEnd(latex, bodyStart - 1)

    if (bodyEnd === -1) {
      output += latex.slice(cursor)
      break
    }

    const body = latex.slice(bodyStart, bodyEnd)
    const rewrittenBody = rewriteTextCommandBody(body)

    output += latex.slice(cursor, start)
    output += rewrittenBody ?? latex.slice(start, bodyEnd + 1)
    cursor = bodyEnd + 1
  }

  return output
}
