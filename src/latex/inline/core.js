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

function findBalancedBraceEnd(input = '', openIndex = 0) {
  if (input[openIndex] !== '{') {
    return -1
  }

  let depth = 0

  for (let index = openIndex; index < input.length; index += 1) {
    const char = input[index]
    const previous = input[index - 1]

    if (char === '{' && previous !== '\\') {
      depth += 1
      continue
    }

    if (char === '}' && previous !== '\\') {
      depth -= 1

      if (depth === 0) {
        return index
      }
    }
  }

  return -1
}

function skipWhitespace(input = '', from = 0) {
  let cursor = from

  while (cursor < input.length && /\s/.test(input[cursor])) {
    cursor += 1
  }

  return cursor
}

function readBraceArgument(input = '', from = 0) {
  const start = skipWhitespace(input, from)

  if (input[start] !== '{') {
    return null
  }

  const end = findBalancedBraceEnd(input, start)

  if (end === -1) {
    return null
  }

  return {
    start,
    end: end + 1,
    content: input.slice(start + 1, end),
  }
}

function resolveArgumentConfig(handler = {}) {
  if (Number.isInteger(handler.args)) {
    return {
      minArgs: handler.args,
      maxArgs: handler.args,
    }
  }

  return {
    minArgs: Number.isInteger(handler.minArgs) ? handler.minArgs : 0,
    maxArgs: Number.isInteger(handler.maxArgs) ? handler.maxArgs : 1,
  }
}

function createCommandNode(input, match, id, handlers = {}) {
  const name = match[1]
  const handler = handlers[name] || {}
  const { minArgs, maxArgs } = resolveArgumentConfig(handler)
  let cursor = match.index + match[0].length
  const args = []

  for (let argIndex = 0; argIndex < maxArgs; argIndex += 1) {
    const argument = readBraceArgument(input, cursor)

    if (!argument) {
      if (
        handler.declarationGroup &&
        args.length === 1 &&
        input[match.index - 1] === '{'
      ) {
        const groupStart = match.index - 1
        const groupEnd = findBalancedBraceEnd(input, groupStart)

        if (groupEnd !== -1 && groupEnd + 1 > cursor) {
          args.push(input.slice(cursor, groupEnd))

          return {
            id,
            type: 'command',
            name,
            starred: match[2] === '*',
            param: args[0] ?? null,
            args,
            raw: input.slice(groupStart, groupEnd + 1),
            start: groupStart,
            end: groupEnd + 1,
          }
        }
      }

      if (handler.declarationRest && args.length === 1) {
        args.push(input.slice(cursor))

        return {
          id,
          type: 'command',
          name,
          starred: match[2] === '*',
          param: args[0] ?? null,
          args,
          raw: input.slice(match.index),
          start: match.index,
          end: input.length,
        }
      }

      break
    }

    args.push(argument.content)
    cursor = argument.end
  }

  if (args.length < minArgs) {
    return null
  }

  return {
    id,
    type: 'command',
    name,
    starred: match[2] === '*',
    param: args[0] ?? null,
    args,
    raw: input.slice(match.index, cursor),
    start: match.index,
    end: cursor,
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
  return new RegExp(`\\\\(${names.join('|')})(\\*)?(?![A-Za-z])`, 'g')
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
  let textStart = 0

  while (cursor < content.length) {
    pattern.lastIndex = cursor
    const match = pattern.exec(content)

    if (!match) {
      break
    }

    const commandNode = createCommandNode(content, match, 'inline_command_pending', handlers)

    if (!commandNode) {
      cursor = (match.index ?? 0) + match[0].length
      continue
    }

    if (commandNode.start > textStart) {
      nodes.push(createTextNode(content.slice(textStart, commandNode.start), createId('inline_text')))
    }

    nodes.push({
      ...commandNode,
      id: createId('inline_command'),
    })
    cursor = commandNode.end
    textStart = cursor
  }

  if (textStart < content.length) {
    nodes.push(createTextNode(content.slice(textStart), createId('inline_text')))
  }

  if (!nodes.length) {
    nodes.push(createTextNode(content, createId('inline_text')))
  }

  return nodes
}

function renderCommandInMath(match, handlers = {}) {
  const node = createCommandNode(match.input || '', match, 'inline_command_math', handlers)

  if (!node) {
    return match[0]
  }

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

  const pattern = cloneRegExp(commandPattern)
  let output = ''
  let searchCursor = 0
  let outputCursor = 0

  while (searchCursor < content.length) {
    pattern.lastIndex = searchCursor
    const match = pattern.exec(content)

    if (!match) {
      break
    }

    match.input = content
    const node = createCommandNode(content, match, 'inline_command_math', handlers)

    if (!node) {
      searchCursor = (match.index ?? 0) + match[0].length
      continue
    }

    output += content.slice(outputCursor, node.start)
    output += renderCommandInMath(match, handlers)
    searchCursor = node.end
    outputCursor = node.end
  }

  return output + content.slice(outputCursor)
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
