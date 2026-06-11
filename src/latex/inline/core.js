import { findNextMathSegment } from '../mathDelimiters.js'

function createTextNode(content, id) {
  return {
    id,
    type: 'text',
    content,
  }
}

function createMathNode(content, id) {
  return {
    id,
    type: 'math',
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

function cloneRegExp(pattern) {
  return new RegExp(pattern.source, pattern.flags)
}

function splitMathSegments(content = '') {
  const segments = []
  let cursor = 0

  while (cursor < content.length) {
    const nextMathSegment = findNextMathSegment(content, cursor)

    if (!nextMathSegment) {
      if (cursor < content.length) {
        segments.push({
          type: 'text',
          content: content.slice(cursor),
        })
      }
      break
    }

    if (nextMathSegment.start > cursor) {
      segments.push({
        type: 'text',
        content: content.slice(cursor, nextMathSegment.start),
      })
    }

    segments.push({
      type: 'math',
      content: content.slice(nextMathSegment.start, nextMathSegment.end),
    })

    cursor = nextMathSegment.end
  }

  return segments
}

function resolveCommandConfig(handlersOrNames) {
  if (Array.isArray(handlersOrNames)) {
    return {
      handlers: {},
      commandNames: handlersOrNames,
    }
  }

  if (!handlersOrNames || typeof handlersOrNames !== 'object') {
    return {
      handlers: {},
      commandNames: [],
    }
  }

  return {
    handlers: handlersOrNames,
    commandNames: Object.keys(handlersOrNames),
  }
}

function parseCommandTextSegment(content, commandPattern, handlers, createId) {
  if (!content) {
    return []
  }

  if (!commandPattern) {
    return [createTextNode(content, createId('inline_text'))]
  }

  const nodes = []
  const pattern = cloneRegExp(commandPattern)
  let cursor = 0

  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0

    if (start > cursor) {
      nodes.push(createTextNode(content.slice(cursor, start), createId('inline_text')))
    }

    nodes.push(createCommandNode(match, createId('inline_command')))
    cursor = start + match[0].length
  }

  if (cursor < content.length) {
    nodes.push(createTextNode(content.slice(cursor), createId('inline_text')))
  }

  if (!nodes.length) {
    nodes.push(createTextNode(content, createId('inline_text')))
  }

  return nodes
}

function renderCommandInMath(match, handlers = {}) {
  const node = createCommandNode(match, 'inline_command_math')
  const handler = handlers[node.name]

  if (typeof handler?.toMath !== 'function') {
    return node.raw
  }

  return handler.toMath(node)
}

function serializeMathSegment(content, commandPattern, handlers) {
  if (!commandPattern) {
    return content
  }

  return content.replace(cloneRegExp(commandPattern), (...args) => renderCommandInMath(args, handlers))
}

export function parseInlineContent(content = '', handlersOrNames = {}) {
  const { handlers, commandNames } = resolveCommandConfig(handlersOrNames)
  const commandPattern = buildCommandPattern(commandNames)
  const segments = splitMathSegments(content)
  const nodes = []
  let count = 0

  const createId = (prefix) => `${prefix}_${++count}`

  if (!segments.length) {
    return [createTextNode(content, 'inline_text_1')]
  }

  for (const segment of segments) {
    if (segment.type === 'math') {
      nodes.push(createMathNode(serializeMathSegment(segment.content, commandPattern, handlers), createId('inline_math')))
      continue
    }

    nodes.push(...parseCommandTextSegment(segment.content, commandPattern, handlers, createId))
  }

  if (!nodes.length) {
    nodes.push(createTextNode(content, 'inline_text_1'))
  }

  return nodes
}
