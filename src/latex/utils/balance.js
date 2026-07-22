export function isEscaped(input = '', index = 0) {
  let slashCount = 0
  let cursor = index - 1

  while (cursor >= 0 && input[cursor] === '\\') {
    slashCount += 1
    cursor -= 1
  }

  return slashCount % 2 === 1
}

export function skipWhitespace(input = '', from = 0) {
  let cursor = from

  while (cursor < input.length && /\s/.test(input[cursor])) {
    cursor += 1
  }

  return cursor
}

export function findBalancedBraceEnd(input = '', openIndex = 0) {
  if (input[openIndex] !== '{') {
    return -1
  }

  let depth = 0

  for (let index = openIndex; index < input.length; index += 1) {
    const char = input[index]

    if (char === '{' && !isEscaped(input, index)) {
      depth += 1
      continue
    }

    if (char === '}' && !isEscaped(input, index)) {
      depth -= 1

      if (depth === 0) {
        return index
      }
    }
  }

  return -1
}

export function readBalancedGroup(input = '', from = 0, open = '{', close = '}') {
  if (input[from] !== open) {
    return null
  }

  let depth = 0

  for (let cursor = from; cursor < input.length; cursor += 1) {
    if (input[cursor] === open && !isEscaped(input, cursor)) {
      depth += 1
      continue
    }

    if (input[cursor] === close && !isEscaped(input, cursor)) {
      depth -= 1

      if (depth === 0) {
        return {
          end: cursor + 1,
          content: input.slice(from + 1, cursor),
        }
      }
    }
  }

  return null
}
