import EnumerateNode from '../../components/nodes/EnumerateNode.vue'
import { parseItemContent } from '../itemParser'

const ENUMERATE_PATTERN = /\\begin\{enumerate\}(?:\[(.*?)\])?([\s\S]*?)\\end\{enumerate\}/g
const ITEM_INDENT = '    '

/**
 * 智能分割 \item，跳过嵌套环境内的 \item
 */
function splitItems(body = '') {
  const items = []
  let currentItem = ''
  let depth = 0 // 跟踪嵌套深度
  let i = 0

  while (i < body.length) {
    // 检查是否是 \begin{...}
    if (body.substring(i).match(/^\\begin\{[^}]+\}/)) {
      const match = body.substring(i).match(/^\\begin\{[^}]+\}/)
      currentItem += match[0]
      i += match[0].length
      depth++
      continue
    }

    // 检查是否是 \end{...}
    if (body.substring(i).match(/^\\end\{[^}]+\}/)) {
      const match = body.substring(i).match(/^\\end\{[^}]+\}/)
      currentItem += match[0]
      i += match[0].length
      depth--
      continue
    }

    // 检查是否是 \item（只在 depth === 0 时才作为分隔符）
    if (depth === 0 && body.substring(i).match(/^\\item\s+/)) {
      const match = body.substring(i).match(/^\\item\s+/)

      // 保存当前项（如果有内容）
      if (currentItem.trim()) {
        items.push(currentItem.trim())
      }

      // 开始新项
      currentItem = ''
      i += match[0].length
      continue
    }

    // 普通字符
    currentItem += body[i]
    i++
  }

  // 添加最后一项
  if (currentItem.trim()) {
    items.push(currentItem.trim())
  }

  return items
}

function parseItems(body = '', processors = []) {
  const rawItems = splitItems(body)

  // 递归解析每个项目的内容
  return rawItems.map(itemContent => parseItemContent(itemContent, processors))
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
    const pattern = new RegExp(ENUMERATE_PATTERN)
    pattern.lastIndex = from
    const match = pattern.exec(input)

    if (!match) {
      return null
    }

    return {
      start: match.index,
      end: match.index + match[0].length,
      match,
    }
  },
  parse(result, { id, processors = [] }) {
    return {
      id,
      type: 'enumerate',
      items: parseItems(result.match[2] || '', processors),
      options: parseOptions(result.match[1] || ''),
      original: result.match[0],
    }
  },
  serialize(node) {
    const label = node.options?.label
    const optionBlock = label ? `[label = ${label}]` : ''

    const items = (node.items || [])
      .map((item) => {
        // 处理新格式（节点数组）和旧格式（字符串）
        let itemContent
        if (typeof item === 'string') {
          itemContent = item
        } else if (Array.isArray(item)) {
          // 导入 serializeLatex 并序列化嵌套节点
          const { serializeLatex } = require('../core')
          const { defaultProcessors } = require('../processors')
          itemContent = serializeLatex(item, defaultProcessors)
        } else {
          itemContent = ''
        }

        return `${ITEM_INDENT}\\item ${itemContent.replace(/\n/g, `\n${ITEM_INDENT}`)}`
      })
      .join('\n')

    return `\\begin{enumerate}${optionBlock}\n${items}\n\\end{enumerate}`
  },
}
