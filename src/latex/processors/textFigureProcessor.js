import TextFigureNode from '../../components/nodes/TextFigureNode.vue'
import { parseLatex, prefixNodeIds, serializeLatex } from '../core'
import {
  findTextFigure,
  formatTextFigureOptionBlock,
  parseTextFigureOptions,
  splitOuterWhitespace,
} from '../textFigure.js'

function parseRegion(raw = '', processors = [], prefix = '') {
  const { lead, body, trail } = splitOuterWhitespace(raw)

  return {
    lead,
    trail,
    nodes: prefixNodeIds(parseLatex(body, processors), prefix),
  }
}

// items 固定为 [文字栏, 图栏] 两个节点列表，复用 items 的替换、前缀与上下文遍历
export const textFigureProcessor = {
  name: 'textfigure',
  type: 'textfigure',
  block: true,
  priority: 90,
  component: TextFigureNode,
  isEditable: ({ editableImages }) => editableImages,
  find(input, from) {
    return findTextFigure(input, from)
  },
  parse(result, { id, processors = [] }) {
    const text = parseRegion(result.text, processors, `${id}_item_1`)
    const figure = parseRegion(result.figure, processors, `${id}_item_2`)

    return {
      id,
      type: 'textfigure',
      optionString: result.optionString,
      options: parseTextFigureOptions(result.optionString || ''),
      items: [text.nodes, figure.nodes],
      spacing: [[text.lead, text.trail], [figure.lead, figure.trail]],
      original: result.original,
    }
  },
  serialize(node, { processors = [] } = {}) {
    if (node.original) {
      return node.original
    }

    const regions = (node.items || []).map((nodes, index) => {
      const [lead = '\n', trail = '\n'] = node.spacing?.[index] || []
      return `{${lead}${serializeLatex(nodes || [], processors)}${trail}}`
    })

    return `\\textfigure${formatTextFigureOptionBlock(node)}${regions.join('')}`
  },
}
