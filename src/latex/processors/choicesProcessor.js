import ChoicesNode from '../../components/nodes/ChoicesNode.vue'

const CHOICES_PATTERN = /\\begin\{choices\}([\s\S]*?)\\end\{choices\}/g

function parseChoiceItems(body = '') {
  return body
    .split(/\\item\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export const choicesProcessor = {
  name: 'choices',
  type: 'choices',
  block: true,
  priority: 90,
  component: ChoicesNode,
  find(input, from) {
    const pattern = new RegExp(CHOICES_PATTERN)
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
  parse(result, { id }) {
    return {
      id,
      type: 'choices',
      items: parseChoiceItems(result.match[1] || ''),
      original: result.match[0],
    }
  },
  serialize(node) {
    const items = (node.items || []).map((item) => `\\item ${item}`).join('\n')
    return `\\begin{choices}\n${items}\n\\end{choices}`
  },
}
