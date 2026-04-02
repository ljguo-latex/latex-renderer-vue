export function createTextNode(content, id) {
  return {
    id,
    type: 'text',
    content,
  }
}

function isBlockNode(node, processorMap) {
  if (!node || node.type === 'text') {
    return false
  }

  return processorMap.get(node.type)?.block === true
}

function normalizeBlockWhitespace(nodes, processors) {
  const processorMap = new Map(processors.map((processor) => [processor.type, processor]))

  return nodes
    .map((node, index) => {
      if (node.type !== 'text') {
        return node
      }

      const previousNode = nodes[index - 1]
      const nextNode = nodes[index + 1]
      let content = node.content ?? ''

      if (isBlockNode(previousNode, processorMap)) {
        content = content.replace(/^\s+/, '')
      }

      if (isBlockNode(nextNode, processorMap)) {
        content = content.replace(/\s+$/, '')
      }

      return {
        ...node,
        content,
      }
    })
    .filter((node, index, list) => node.type !== 'text' || node.content !== '' || list.length === 1)
}

function sortProcessors(processors = []) {
  return [...processors].sort((left, right) => (right.priority || 0) - (left.priority || 0))
}

function findNextMatch(input, from, processors) {
  let bestMatch = null

  for (const processor of processors) {
    const match = processor.find?.(input, from)

    if (!match) {
      continue
    }

    if (
      !bestMatch ||
      match.start < bestMatch.start ||
      (match.start === bestMatch.start && (processor.priority || 0) > (bestMatch.processor.priority || 0))
    ) {
      bestMatch = {
        ...match,
        processor,
      }
    }
  }

  return bestMatch
}

export function parseLatex(input = '', processors = []) {
  const orderedProcessors = sortProcessors(processors)
  const nodes = []
  let cursor = 0
  let nodeCount = 0

  while (cursor < input.length) {
    const nextMatch = findNextMatch(input, cursor, orderedProcessors)

    if (!nextMatch) {
      nodes.push(createTextNode(input.slice(cursor), `text_${++nodeCount}`))
      break
    }

    if (nextMatch.start > cursor) {
      nodes.push(createTextNode(input.slice(cursor, nextMatch.start), `text_${++nodeCount}`))
    }

    const parsedNode = nextMatch.processor.parse(nextMatch, {
      id: `${nextMatch.processor.type}_${++nodeCount}`,
    })

    nodes.push(parsedNode)
    cursor = nextMatch.end
  }

  if (input.length === 0) {
    nodes.push(createTextNode('', 'text_1'))
  }

  return normalizeBlockWhitespace(nodes, orderedProcessors)
}

export function serializeLatex(nodes = [], processors = []) {
  const processorMap = new Map(processors.map((processor) => [processor.type, processor]))

  return nodes
    .map((node) => {
      if (node.type === 'text') {
        return node.content ?? ''
      }

      const processor = processorMap.get(node.type)

      if (!processor?.serialize) {
        return ''
      }

      return processor.serialize(node)
    })
    .join('')
}

export function replaceNode(nodes, nextNode) {
  return nodes.map((node) => (node.id === nextNode.id ? nextNode : node))
}
