function skipWhitespace(input = '', from = 0) {
  let cursor = from

  while (cursor < input.length && /\s/.test(input[cursor])) {
    cursor++
  }

  return cursor
}

export function readOptionalBracketArgument(input = '', from = 0) {
  const start = skipWhitespace(input, from)

  if (input[start] !== '[') {
    return null
  }

  let depth = 0

  for (let cursor = start; cursor < input.length; cursor++) {
    if (input[cursor] === '[') {
      depth++
      continue
    }

    if (input[cursor] === ']') {
      depth--

      if (depth === 0) {
        return {
          start,
          end: cursor + 1,
          content: input.slice(start + 1, cursor),
        }
      }
    }
  }

  return null
}

export function findEnvironmentBlock(input = '', from = 0, environmentName = '') {
  if (!environmentName) {
    return null
  }

  const beginToken = `\\begin{${environmentName}}`
  const endToken = `\\end{${environmentName}}`
  const start = input.indexOf(beginToken, from)

  if (start === -1) {
    return null
  }

  let cursor = start + beginToken.length
  const openingOptions = readOptionalBracketArgument(input, cursor)

  if (openingOptions) {
    cursor = openingOptions.end
  }

  const bodyStart = cursor
  let depth = 1

  while (cursor < input.length) {
    const nextBegin = input.indexOf(beginToken, cursor)
    const nextEnd = input.indexOf(endToken, cursor)

    if (nextEnd === -1) {
      return null
    }

    if (nextBegin !== -1 && nextBegin < nextEnd) {
      depth++
      cursor = nextBegin + beginToken.length

      const nestedOptions = readOptionalBracketArgument(input, cursor)

      if (nestedOptions) {
        cursor = nestedOptions.end
      }

      continue
    }

    depth--

    if (depth === 0) {
      const end = nextEnd + endToken.length

      return {
        start,
        end,
        body: input.slice(bodyStart, nextEnd),
        optionString: openingOptions?.content || '',
        original: input.slice(start, end),
      }
    }

    cursor = nextEnd + endToken.length
  }

  return null
}
