import TabularNode from '../../components/nodes/TabularNode.vue'
import { parseLatex, prefixNodeIds, serializeLatex } from '../core'
import { readOptionalBracketArgument, readRequiredBraceArgument } from '../environment'
import { isEscaped, readBalancedGroup } from '../utils/balance.js'

const BEGIN_TOKEN = '\\begin{tabular}'
const END_TOKEN = '\\end{tabular}'

function readTabularOpening(input = '', start = 0) {
  let cursor = start + BEGIN_TOKEN.length
  const option = readOptionalBracketArgument(input, cursor)

  if (option) {
    cursor = option.end
  }

  const columnSpec = readRequiredBraceArgument(input, cursor)

  if (!columnSpec) {
    return null
  }

  return {
    optionString: option?.content || '',
    columnSpec: columnSpec.content,
    bodyStart: columnSpec.end,
  }
}

function findTabularBlock(input = '', from = 0) {
  let searchFrom = from
  let start = input.indexOf(BEGIN_TOKEN, searchFrom)

  while (start !== -1) {
    const opening = readTabularOpening(input, start)

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
        const nestedOpening = readTabularOpening(input, nextBegin)

        if (!nestedOpening) {
          cursor = nextBegin + BEGIN_TOKEN.length
          continue
        }

        depth += 1
        cursor = nestedOpening.bodyStart
        continue
      }

      depth -= 1

      if (depth === 0) {
        const end = nextEnd + END_TOKEN.length

        return {
          start,
          end,
          body: input.slice(opening.bodyStart, nextEnd),
          optionString: opening.optionString,
          columnSpec: opening.columnSpec,
          original: input.slice(start, end),
        }
      }

      cursor = nextEnd + END_TOKEN.length
    }

    return null
  }

  return null
}

function parseColumns(columnSpec = '') {
  const columns = []
  let pendingLeftBorder = false
  let cursor = 0

  while (cursor < columnSpec.length) {
    const char = columnSpec[cursor]

    if (/\s/.test(char)) {
      cursor += 1
      continue
    }

    if (char === '|') {
      if (columns.length) {
        columns[columns.length - 1].rightBorder = true
      } else {
        pendingLeftBorder = true
      }

      cursor += 1
      continue
    }

    if (char === '@' || char === '!' || char === '>' || char === '<') {
      const group = readBalancedGroup(columnSpec, cursor + 1)
      cursor = group ? group.end : cursor + 1
      continue
    }

    if (char === 'p' || char === 'm' || char === 'b') {
      const group = readBalancedGroup(columnSpec, cursor + 1)

      columns.push({
        align: 'left',
        leftBorder: pendingLeftBorder,
        rightBorder: false,
        spec: group ? `${char}{${group.content}}` : char,
      })
      pendingLeftBorder = false
      cursor = group ? group.end : cursor + 1
      continue
    }

    if (char === 'l' || char === 'c' || char === 'r') {
      columns.push({
        align: char === 'c' ? 'center' : char === 'r' ? 'right' : 'left',
        leftBorder: pendingLeftBorder,
        rightBorder: false,
        spec: char,
      })
      pendingLeftBorder = false
    }

    cursor += 1
  }

  return columns
}

function updateScanState(state, input, index) {
  const char = input[index]

  if (state.mathClose) {
    if (input.startsWith(state.mathClose, index) && !isEscaped(input, index)) {
      const closeLength = state.mathClose.length
      state.mathClose = ''
      return closeLength
    }

    return 1
  }

  if (char === '$' && !isEscaped(input, index)) {
    state.mathClose = input[index + 1] === '$' ? '$$' : '$'
    return state.mathClose.length
  }

  if (input.startsWith('\\(', index)) {
    state.mathClose = '\\)'
    return 2
  }

  if (input.startsWith('\\[', index)) {
    state.mathClose = '\\]'
    return 2
  }

  if (char === '{' && !isEscaped(input, index)) {
    state.braceDepth += 1
  } else if (char === '}' && !isEscaped(input, index)) {
    state.braceDepth = Math.max(state.braceDepth - 1, 0)
  }

  return 1
}

function skipOptionalRowSpacing(input = '', from = 0) {
  const option = readOptionalBracketArgument(input, from)

  return option ? option.end : from
}

function splitTopLevelRows(body = '') {
  const tokens = []
  const state = { braceDepth: 0, mathClose: '' }
  let cursor = 0
  let rowStart = 0

  function pushRow(end) {
    const content = body.slice(rowStart, end).trim()

    if (content) {
      tokens.push({ type: 'row', content })
    }
  }

  while (cursor < body.length) {
    if (!state.mathClose && state.braceDepth === 0) {
      if (body.startsWith('\\hline', cursor)) {
        pushRow(cursor)
        tokens.push({ type: 'hline' })
        cursor += '\\hline'.length
        rowStart = cursor
        continue
      }

      if (body.startsWith('\\\\', cursor)) {
        pushRow(cursor)
        cursor = skipOptionalRowSpacing(body, cursor + 2)
        rowStart = cursor
        continue
      }
    }

    cursor += updateScanState(state, body, cursor)
  }

  pushRow(body.length)

  return tokens
}

function splitTopLevelCells(rowContent = '') {
  const cells = []
  const state = { braceDepth: 0, mathClose: '' }
  let cursor = 0
  let cellStart = 0

  while (cursor < rowContent.length) {
    if (!state.mathClose && state.braceDepth === 0 && rowContent[cursor] === '&' && !isEscaped(rowContent, cursor)) {
      cells.push(rowContent.slice(cellStart, cursor).trim())
      cellStart = cursor + 1
      cursor += 1
      continue
    }

    cursor += updateScanState(state, rowContent, cursor)
  }

  cells.push(rowContent.slice(cellStart).trim())

  return cells
}

function parseRows(body = '', processors = [], id = 'tabular') {
  const rows = []
  let pendingTopBorder = false

  for (const token of splitTopLevelRows(body)) {
    if (token.type === 'hline') {
      if (rows.length) {
        rows[rows.length - 1].bottomBorder = true
      } else {
        pendingTopBorder = true
      }

      continue
    }

    const rowIndex = rows.length
    const cells = splitTopLevelCells(token.content).map((cellContent, cellIndex) => ({
      id: `cell_${rowIndex + 1}_${cellIndex + 1}`,
      content: cellContent,
      children: prefixNodeIds(parseLatex(cellContent, processors), `${id}_cell_${rowIndex + 1}_${cellIndex + 1}`),
    }))

    rows.push({
      id: `row_${rowIndex + 1}`,
      cells,
      topBorder: pendingTopBorder,
      bottomBorder: false,
    })
    pendingTopBorder = false
  }

  if (pendingTopBorder && rows.length) {
    rows[rows.length - 1].bottomBorder = true
  }

  return rows
}

function serializeOpening(node) {
  const optionBlock = node.optionString ? `[${node.optionString}]` : ''

  return `\\begin{tabular}${optionBlock}{${node.columnSpec || ''}}`
}

export const tabularProcessor = {
  name: 'tabular',
  type: 'tabular',
  inlineBox: true,
  priority: 78,
  component: TabularNode,
  find(input, from) {
    return findTabularBlock(input, from)
  },
  parse(result, { id, processors = [] }) {
    return {
      id,
      type: 'tabular',
      optionString: result.optionString || '',
      columnSpec: result.columnSpec || '',
      columns: parseColumns(result.columnSpec || ''),
      rows: parseRows(result.body || '', processors, id),
      original: result.original,
    }
  },
  serialize(node, { processors = [] } = {}) {
    if (node.original) {
      return node.original
    }

    const rows = (node.rows || [])
      .map((row) =>
        row.cells
          ?.map((cell) => (Array.isArray(cell.children) ? serializeLatex(cell.children, processors) : cell.content || ''))
          .join(' & ') || '',
      )
      .join(' \\\\\n')

    return `${serializeOpening(node)}\n${rows}\n${END_TOKEN}`
  },
}
