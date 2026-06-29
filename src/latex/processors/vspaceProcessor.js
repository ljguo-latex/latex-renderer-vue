import VspaceNode from '../../components/nodes/VspaceNode.vue'
import { readRequiredBraceArgument } from '../environment'
import { parseLatexLength } from '../length'

const COMMAND_TOKEN = '\\vspace'

function findVspaceCommand(input = '', from = 0) {
  let start = input.indexOf(COMMAND_TOKEN, from)

  while (start !== -1) {
    let cursor = start + COMMAND_TOKEN.length

    if (/[A-Za-z]/.test(input[cursor] || '')) {
      start = input.indexOf(COMMAND_TOKEN, cursor)
      continue
    }

    const starred = input[cursor] === '*'

    if (starred) {
      cursor += 1
    }

    const lengthArgument = readRequiredBraceArgument(input, cursor)

    if (!lengthArgument) {
      start = input.indexOf(COMMAND_TOKEN, cursor)
      continue
    }

    return {
      start,
      end: lengthArgument.end,
      lengthString: lengthArgument.content,
      starred,
      original: input.slice(start, lengthArgument.end),
    }
  }

  return null
}

export const vspaceProcessor = {
  name: 'vspace',
  type: 'vspace',
  block: true,
  priority: 80,
  component: VspaceNode,
  find(input, from) {
    return findVspaceCommand(input, from)
  },
  parse(result, { id }) {
    return {
      id,
      type: 'vspace',
      lengthString: result.lengthString || '',
      length: parseLatexLength(result.lengthString || ''),
      starred: result.starred || false,
      original: result.original,
    }
  },
  serialize(node) {
    if (node.original) {
      return node.original
    }

    return `\\vspace${node.starred ? '*' : ''}{${node.length?.raw || node.lengthString || ''}}`
  },
}
