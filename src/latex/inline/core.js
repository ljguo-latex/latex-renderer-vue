function createMathTextNode(content, id) {
  return {
    id,
    type: 'math-text',
    content,
  }
}

function createCommandNode(match, id) {
  return {
    id,
    type: 'command',
    name: match[1],
    param: match[2] ?? null,
    raw: match[0],
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildCommandPattern(commandNames = []) {
  if (!commandNames.length) {
    return null
  }

  const names = [...commandNames].sort((left, right) => right.length - left.length).map(escapeRegExp)
  return new RegExp(`\\\\(${names.join('|')})(?:\\{([^}]*)\\})?`, 'g')
}

export function parseInlineContent(content = '', commandNames = []) {
  const nodes = []
  const pattern = buildCommandPattern(commandNames)
  let cursor = 0
  let count = 0

  if (!pattern) {
    return [createMathTextNode(content, 'inline_text_1')]
  }

  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0

    if (start > cursor) {
      nodes.push(createMathTextNode(content.slice(cursor, start), `inline_text_${++count}`))
    }

    nodes.push(createCommandNode(match, `inline_command_${++count}`))
    cursor = start + match[0].length
  }

  if (cursor < content.length) {
    nodes.push(createMathTextNode(content.slice(cursor), `inline_text_${++count}`))
  }

  if (nodes.length === 0) {
    nodes.push(createMathTextNode(content, 'inline_text_1'))
  }

  return nodes
}
