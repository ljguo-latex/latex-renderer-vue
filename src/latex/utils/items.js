const BEGIN_TOKEN_PATTERN = /\\begin\{[^}]+\}/y
const END_TOKEN_PATTERN = /\\end\{[^}]+\}/y
const ITEM_TOKEN_PATTERN = /\\item(?![A-Za-z])/y

function execAt(pattern, input, index) {
  pattern.lastIndex = index
  return pattern.exec(input)
}

function skipItemArguments(body, from) {
  let cursor = from

  while (cursor < body.length && /[ \t]/.test(body[cursor])) {
    cursor += 1
  }

  if (body[cursor] === '[') {
    let depth = 0

    for (let index = cursor; index < body.length; index += 1) {
      if (body[index] === '[') {
        depth += 1
        continue
      }
      if (body[index] === ']') {
        depth -= 1
        if (depth === 0) {
          cursor = index + 1
          break
        }
      }
    }
  }

  while (cursor < body.length && /\s/.test(body[cursor])) {
    cursor += 1
  }

  return cursor
}

export function splitItems(body = '') {
  const items = []
  let currentItem = ''
  let depth = 0
  let cursor = 0

  while (cursor < body.length) {
    const beginMatch = execAt(BEGIN_TOKEN_PATTERN, body, cursor)

    if (beginMatch) {
      currentItem += beginMatch[0]
      cursor += beginMatch[0].length
      depth += 1
      continue
    }

    const endMatch = execAt(END_TOKEN_PATTERN, body, cursor)

    if (endMatch) {
      currentItem += endMatch[0]
      cursor += endMatch[0].length
      depth -= 1
      continue
    }

    if (depth === 0 && execAt(ITEM_TOKEN_PATTERN, body, cursor)) {
      if (currentItem.trim()) {
        items.push(currentItem.trim())
      }

      cursor = skipItemArguments(body, cursor + '\\item'.length)
      currentItem = ''
      continue
    }

    currentItem += body[cursor]
    cursor += 1
  }

  if (currentItem.trim()) {
    items.push(currentItem.trim())
  }

  return items
}
