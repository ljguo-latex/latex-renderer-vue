import ChoicesNode from '../../components/nodes/ChoicesNode.vue'
import { prefixNodeIds, serializeLatex } from '../core'
import { findEnvironmentBlock } from '../environment'
import { parseItemContent } from '../itemParser'
import { splitItems } from '../utils/items.js'

const ITEM_INDENT = '    '
const LABEL_POSITIONS = new Set(['auto', 'top-left', 'left', 'bottom'])

function readOption(optionString, key) {
  const match = optionString.match(new RegExp(
    `(?:^|,)\\s*${key}\\s*=\\s*(?:\\{\\s*([^{}]*?)\\s*\\}|([^,]*))`,
  ))
  return (match?.[1] ?? match?.[2] ?? '').trim()
}

function isValidColumns(columns) {
  return columns === 'auto' || (Number.isSafeInteger(columns) && columns > 0)
}

function parseOptions(optionString = '') {
  const options = {}
  const labelPos = readOption(optionString, 'label-pos')
  const columnsValue = readOption(optionString, 'columns')
  const columns = /^\d+$/.test(columnsValue) ? Number(columnsValue) : columnsValue

  if (LABEL_POSITIONS.has(labelPos)) options.labelPos = labelPos
  if (isValidColumns(columns)) options.columns = columns
  return options
}

function parseChoiceItems(body = '', processors = [], id = 'choices') {
  const rawItems = splitItems(body)

  // 递归解析每个项目的内容
  return rawItems.map((itemContent, index) => prefixNodeIds(parseItemContent(itemContent, processors), `${id}_item_${index + 1}`))
}

export const choicesProcessor = {
  name: 'choices',
  type: 'choices',
  block: true,
  priority: 90,
  component: ChoicesNode,
  find(input, from) {
    return findEnvironmentBlock(input, from, 'choices')
  },
  parse(result, { id, processors = [] }) {
    return {
      id,
      type: 'choices',
      items: parseChoiceItems(result.body || '', processors, id),
      options: parseOptions(result.optionString),
      original: result.original,
    }
  },
  serialize(node, { processors = [] } = {}) {
    const { labelPos, columns } = node.options || {}
    const options = []
    if (LABEL_POSITIONS.has(labelPos)) options.push(`label-pos = ${labelPos}`)
    if (isValidColumns(columns)) options.push(`columns = ${columns}`)
    const optionBlock = options.length ? `[${options.join(', ')}]` : ''
    const items = (node.items || [])
      .map((item) => {
        // 处理新格式（节点数组）和旧格式（字符串）
        let itemContent
        if (typeof item === 'string') {
          itemContent = item
        } else if (Array.isArray(item)) {
          itemContent = serializeLatex(item, processors)
        } else {
          itemContent = ''
        }

        return `${ITEM_INDENT}\\item ${itemContent.replace(/\n/g, `\n${ITEM_INDENT}`)}`
      })
      .join('\n')

    return `\\begin{choices}${optionBlock}\n${items}\n\\end{choices}`
  },
}
