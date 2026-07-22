import ChoicesNode from '../../components/nodes/ChoicesNode.vue'
import { prefixNodeIds, serializeLatex } from '../core'
import { findEnvironmentBlock } from '../environment'
import { parseItemContent } from '../itemParser'
import { splitItems } from '../utils/items.js'

const ITEM_INDENT = '    '

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
      original: result.original,
    }
  },
  serialize(node, { processors = [] } = {}) {
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

    return `\\begin{choices}\n${items}\n\\end{choices}`
  },
}
