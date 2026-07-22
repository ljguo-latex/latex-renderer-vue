import EnumerateNode from '../../components/nodes/EnumerateNode.vue'
import { prefixNodeIds, serializeLatex } from '../core'
import { findEnvironmentBlock } from '../environment'
import { parseItemContent } from '../itemParser'
import { splitItems } from '../utils/items.js'

const ITEM_INDENT = '    '

function parseItems(body = '', processors = [], id = 'enumerate') {
  const rawItems = splitItems(body)

  // 递归解析每个项目的内容
  return rawItems.map((itemContent, index) => prefixNodeIds(parseItemContent(itemContent, processors), `${id}_item_${index + 1}`))
}

function unwrapBraces(value = '') {
  const trimmed = value.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function parseOptions(optionString = '') {
  if (!optionString.trim()) {
    return {}
  }

  const labelMatch = optionString.match(/^label\s*=\s*([\s\S]+)$/)

  return {
    label: labelMatch ? unwrapBraces(labelMatch[1]) : null,
  }
}

export const enumerateProcessor = {
  name: 'enumerate',
  type: 'enumerate',
  block: true,
  priority: 80,
  component: EnumerateNode,
  find(input, from) {
    return findEnvironmentBlock(input, from, 'enumerate')
  },
  parse(result, { id, processors = [] }) {
    return {
      id,
      type: 'enumerate',
      items: parseItems(result.body || '', processors, id),
      options: parseOptions(result.optionString || ''),
      original: result.original,
    }
  },
  serialize(node, { processors = [] } = {}) {
    const label = node.options?.label
    const optionBlock = label ? `[label = ${label}]` : ''

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

    return `\\begin{enumerate}${optionBlock}\n${items}\n\\end{enumerate}`
  },
}
