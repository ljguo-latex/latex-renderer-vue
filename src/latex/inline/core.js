import { findBalancedBraceEnd, isEscaped, skipWhitespace } from '../utils/balance.js'
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

function findNextUnescapedBrace(content, from) {
  for (let index = from; index < content.length; index += 1) {
    if (content[index] === '{' && !isEscaped(content, index)) {
      return index
    }
  }

  return -1
}

// `\unknown{...}` / `\unknown[...]{...}`: the brace is an argument of an
// unregistered command, so it must stay literal instead of being treated as a
// transparent group.
const UNKNOWN_COMMAND_PREFIX_PATTERN = /\\[A-Za-z]+\*?(\[[^\]]*\])*\s*$/

function skipLiteralArgumentGroups(content, braceIndex) {
  let cursor = braceIndex

  while (cursor < content.length) {
    const argStart = skipWhitespace(content, cursor)

    if (content[argStart] !== '{') {
      break
    }

    const argEnd = findBalancedBraceEnd(content, argStart)

    if (argEnd === -1) {
      break
    }

    cursor = argEnd + 1
  }

  return cursor
}

// Scans math segments, registered commands, and bare groups in one pass: the
// earliest occurrence wins, so `{$x$}` is a group containing math while
// `$f{x}$` keeps its braces inside the math segment.
function parseInlineSegments(content, commandPattern, handlers, createId) {
  if (!content) {
    return []
  }

  const nodes = []
  const pattern = commandPattern ? cloneRegExp(commandPattern) : null
  let cursor = 0
  let textStart = 0

  const flushText = (end) => {
    if (end > textStart) {
      nodes.push(createTextNode(content.slice(textStart, end), createId('inline_text')))
    }
  }

  while (cursor < content.length) {
    const mathSegment = findNextMathSegment(content, cursor)
    let match = null

    if (pattern) {
      pattern.lastIndex = cursor
      match = pattern.exec(content)
    }

    const braceIndex = findNextUnescapedBrace(content, cursor)

    const mathStart = mathSegment ? mathSegment.start : Infinity
    const commandStart = match ? match.index : Infinity
    const braceStart = braceIndex === -1 ? Infinity : braceIndex

    if (mathStart === Infinity && commandStart === Infinity && braceStart === Infinity) {
      break
    }

    if (mathStart < commandStart && mathStart < braceStart) {
      flushText(mathStart)
      nodes.push(createMathNode(
        serializeMathSegment(content.slice(mathSegment.start, mathSegment.end), commandPattern, handlers),
        createId('inline_math'),
      ))
      cursor = mathSegment.end
      textStart = cursor
      continue
    }

    if (braceStart < commandStart) {
      if (UNKNOWN_COMMAND_PREFIX_PATTERN.test(content.slice(0, braceIndex))) {
        cursor = Math.max(skipLiteralArgumentGroups(content, braceIndex), braceIndex + 1)
        continue
      }

      const groupEnd = findBalancedBraceEnd(content, braceIndex)

      if (groupEnd === -1) {
        cursor = braceIndex + 1
        continue
      }

      flushText(braceIndex)
      nodes.push(...parseInlineSegments(content.slice(braceIndex + 1, groupEnd), commandPattern, handlers, createId))
      cursor = groupEnd + 1
      textStart = cursor
      continue
    }

    const commandNode = createCommandNode(content, match, 'inline_command_pending', handlers)

    if (!commandNode) {
      cursor = (match.index ?? 0) + match[0].length
      continue
    }

    flushText(commandNode.start)

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
  let count = 0

  const createId = (prefix) => `${prefix}_${++count}`

  const nodes = parseInlineSegments(content, commandPattern, handlers, createId)

  if (!nodes.length && !content) {
    nodes.push(createTextNode(content, 'inline_text_1'))
  }

  return nodes
}
