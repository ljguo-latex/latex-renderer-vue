import MinipageNode from '../../components/nodes/MinipageNode.vue'
import { parseLatex, serializeLatex } from '../core'
import { readOptionalBracketArgument, readRequiredBraceArgument } from '../environment'
import { parseLatexLength } from '../length'

const BEGIN_TOKEN = '\\begin{minipage}'
const END_TOKEN = '\\end{minipage}'
const MAX_OPTIONAL_ARGS = 3

function readMinipageOpening(input = '', start = 0) {
  let cursor = start + BEGIN_TOKEN.length
  const options = []

  while (options.length < MAX_OPTIONAL_ARGS) {
    const option = readOptionalBracketArgument(input, cursor)

    if (!option) {
      break
    }

    options.push(option.content)
    cursor = option.end
  }

  const widthArgument = readRequiredBraceArgument(input, cursor)

  if (!widthArgument) {
    return null
  }

  return {
    options,
    width: widthArgument.content,
    bodyStart: widthArgument.end,
  }
}

function findMinipageBlock(input = '', from = 0) {
  let searchFrom = from
  let start = input.indexOf(BEGIN_TOKEN, searchFrom)

  while (start !== -1) {
    const opening = readMinipageOpening(input, start)

    if (!opening) {
      searchFrom = start + BEGIN_TOKEN.length
      start = input.indexOf(BEGIN_TOKEN, searchFrom)
      continue
    }

    let cursor = opening.bodyStart
    let depth = 1

    while (cursor < input.length) {
      const nextBegin = input.indexOf(BEGIN_TOKEN, cursor)
      const nextEnd = input.indexOf(END_TOKEN, cursor)

      if (nextEnd === -1) {
        return null
      }

      if (nextBegin !== -1 && nextBegin < nextEnd) {
        const nestedOpening = readMinipageOpening(input, nextBegin)

        if (!nestedOpening) {
          cursor = nextBegin + BEGIN_TOKEN.length
          continue
        }

        depth++
        cursor = nestedOpening.bodyStart
        continue
      }

      depth--

      if (depth === 0) {
        const end = nextEnd + END_TOKEN.length

        return {
          start,
          end,
          body: input.slice(opening.bodyStart, nextEnd),
          optionArgs: opening.options,
          widthString: opening.width,
          original: input.slice(start, end),
        }
      }

      cursor = nextEnd + END_TOKEN.length
    }

    return null
  }

  return null
}

function serializeOpening(node) {
  const options = (node.optionArgs || []).map((option) => `[${option}]`).join('')
  const width = node.width?.raw || node.widthString || ''

  return `\\begin{minipage}${options}{${width}}`
}

export const minipageProcessor = {
  name: 'minipage',
  type: 'minipage',
  inlineBox: true,
  priority: 75,
  component: MinipageNode,
  find(input, from) {
    return findMinipageBlock(input, from)
  },
  parse(result, { id, processors = [] }) {
    return {
      id,
      type: 'minipage',
      optionArgs: result.optionArgs || [],
      widthString: result.widthString || '',
      width: parseLatexLength(result.widthString || ''),
      children: parseLatex((result.body || '').trim(), processors),
      original: result.original,
    }
  },
  serialize(node, { processors = [] } = {}) {
    if (node.original) {
      return node.original
    }

    return `${serializeOpening(node)}\n${serializeLatex(node.children || [], processors)}\n${END_TOKEN}`
  },
}
