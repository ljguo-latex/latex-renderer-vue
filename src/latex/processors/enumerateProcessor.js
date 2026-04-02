import EnumerateNode from '../../components/nodes/EnumerateNode.vue'

const ENUMERATE_PATTERN = /\\begin\{enumerate\}(?:\[(.*?)\])?([\s\S]*?)\\end\{enumerate\}/g
const ITEM_INDENT = '    '

function parseItems(body = '') {
  return body
    .split(/\\item\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
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
  parse(result, { id }) {
    return {
      id,
      type: 'enumerate',
      items: parseItems(result.match[2] || ''),
      options: parseOptions(result.match[1] || ''),
      original: result.match[0],
    }
  },
  serialize(node) {
    const label = node.options?.label
    const optionBlock = label ? `[label = ${label}]` : ''
    const items = (node.items || [])
      .map((item) => `${ITEM_INDENT}\\item ${String(item ?? '').replace(/\n/g, `\n${ITEM_INDENT}`)}`)
      .join('\n')

    return `\\begin{enumerate}${optionBlock}\n${items}\n\\end{enumerate}`
  },
}
