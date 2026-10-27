import { normalizeLatexTextForPreview } from '../utils/latex.js'

export function createTextNode(content, id) {
  return {
    id,
    type: 'text',
    content,
    previewContent: content,
  }
}

function isBlockNode(node, processorMap) {
  if (!node || node.type === 'text') {
    return false
  }

  return processorMap.get(node.type)?.block === true
}

function isInlineBoxNode(node, processorMap) {
  if (!node || node.type === 'text') {
    return false
  }

  return processorMap.get(node.type)?.inlineBox === true
}

function normalizeBlockWhitespace(nodes, processors) {
  const processorMap = new Map(processors.map((processor) => [processor.type, processor]))

  return nodes.map((node, index) => {
    if (node.type !== 'text') {
      return node
    }

    const previousNode = nodes[index - 1]
    const nextNode = nodes[index + 1]
    let previewContent = normalizeLatexTextForPreview(node.content ?? '')

    if (
      isInlineBoxNode(previousNode, processorMap) &&
      isInlineBoxNode(nextNode, processorMap) &&
      /^\s*$/.test(previewContent)
    ) {
      previewContent = ''
    }

    if (isBlockNode(previousNode, processorMap)) {
      previewContent = previewContent.replace(/^\s+/, '')
    }

    if (isBlockNode(nextNode, processorMap)) {
      previewContent = previewContent.replace(/\s+$/, '')
    }

    return {
      ...node,
      previewContent,
    }
  })
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
      processors: orderedProcessors,
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

      return processor.serialize(node, { processors })
    })
    .join('')
}

export function replaceNode(nodes, nextNode) {
  return nodes.map((node) => (node.id === nextNode.id ? nextNode : node))
}

function prefixNodeId(node, prefix) {
  let nextNode = {
    ...node,
    id: `${prefix}_${node.id}`,
  }

  if (Array.isArray(nextNode.children)) {
    nextNode = {
      ...nextNode,
      children: prefixNodeIds(nextNode.children, prefix),
    }
  }

  if (Array.isArray(nextNode.items)) {
    nextNode = {
      ...nextNode,
      items: nextNode.items.map((item, index) =>
        Array.isArray(item) ? prefixNodeIds(item, `${prefix}_item_${index + 1}`) : item,
      ),
    }
  }

  if (Array.isArray(nextNode.rows)) {
    nextNode = {
      ...nextNode,
      rows: nextNode.rows.map((row, rowIndex) => ({
        ...row,
        id: `${prefix}_${row.id || `row_${rowIndex + 1}`}`,
        cells: (row.cells || []).map((cell, cellIndex) => ({
          ...cell,
          id: `${prefix}_${cell.id || `cell_${rowIndex + 1}_${cellIndex + 1}`}`,
          children: prefixNodeIds(cell.children || [], `${prefix}_cell_${rowIndex + 1}_${cellIndex + 1}`),
        })),
      })),
    }
  }

  return nextNode
}

export function prefixNodeIds(nodes = [], prefix = '') {
  if (!prefix) {
    return nodes
  }

  return nodes.map((node) => prefixNodeId(node, prefix))
}

function replaceInNodeList(nodes = [], nextNode) {
  let changed = false
  const nextNodes = nodes.map((node) => {
    const replacedNode = replaceNodeDeepInNode(node, nextNode)

    if (replacedNode !== node) {
      changed = true
    }

    return replacedNode
  })

  return changed ? nextNodes : nodes
}

function replaceInItemList(items = [], nextNode) {
  let changed = false
  const nextItems = items.map((item) => {
    if (!Array.isArray(item)) {
      return item
    }

    const nextItem = replaceInNodeList(item, nextNode)

    if (nextItem !== item) {
      changed = true
    }

    return nextItem
  })

  return changed ? nextItems : items
}

function replaceInRows(rows = [], nextNode) {
  let changed = false
  const nextRows = rows.map((row) => {
    let rowChanged = false
    const nextCells = (row.cells || []).map((cell) => {
      const originalChildren = cell.children || []
      const nextChildren = replaceInNodeList(originalChildren, nextNode)

      if (nextChildren !== originalChildren) {
        rowChanged = true
        return {
          ...cell,
          children: nextChildren,
        }
      }

      return cell
    })

    if (rowChanged) {
      changed = true
      return {
        ...row,
        cells: nextCells,
      }
    }

    return row
  })

  return changed ? nextRows : rows
}

function clearOriginal(node) {
  if (!node.original) {
    return node
  }

  const { original, ...rest } = node
  return rest
}

function replaceNodeDeepInNode(node, nextNode) {
  if (node.id === nextNode.id) {
    return nextNode
  }

  let changed = false
  let replacedNode = node

  if (Array.isArray(node.children)) {
    const nextChildren = replaceInNodeList(node.children, nextNode)

    if (nextChildren !== node.children) {
      changed = true
      replacedNode = {
        ...replacedNode,
        children: nextChildren,
      }
    }
  }

  if (Array.isArray(node.items)) {
    const nextItems = replaceInItemList(node.items, nextNode)

    if (nextItems !== node.items) {
      changed = true
      replacedNode = {
        ...replacedNode,
        items: nextItems,
      }
    }
  }

  if (Array.isArray(node.rows)) {
    const nextRows = replaceInRows(node.rows, nextNode)

    if (nextRows !== node.rows) {
      changed = true
      replacedNode = {
        ...replacedNode,
        rows: nextRows,
      }
    }
  }

  return changed ? clearOriginal(replacedNode) : node
}

export function replaceNodeDeep(nodes = [], nextNode) {
  return replaceInNodeList(nodes, nextNode)
}

function transformInNode(node, targetId, transform) {
  let nextNode = node

  if (Array.isArray(node.children)) {
    const nextChildren = transformNodeListDeep(node.children, targetId, transform)

    if (nextChildren !== node.children) {
      nextNode = { ...nextNode, children: nextChildren }
    }
  }

  if (Array.isArray(node.items)) {
    let itemsChanged = false
    const nextItems = node.items.map((item) => {
      if (!Array.isArray(item)) {
        return item
      }

      const nextItem = transformNodeListDeep(item, targetId, transform)

      if (nextItem !== item) {
        itemsChanged = true
      }

      return nextItem
    })

    if (itemsChanged) {
      nextNode = { ...nextNode, items: nextItems }
    }
  }

  if (Array.isArray(node.rows)) {
    let rowsChanged = false
    const nextRows = node.rows.map((row) => {
      let rowChanged = false
      const nextCells = (row.cells || []).map((cell) => {
        const originalChildren = cell.children || []
        const nextChildren = transformNodeListDeep(originalChildren, targetId, transform)

        if (nextChildren === originalChildren) {
          return cell
        }

        rowChanged = true
        return { ...cell, children: nextChildren }
      })

      if (!rowChanged) {
        return row
      }

      rowsChanged = true
      return { ...row, cells: nextCells }
    })

    if (rowsChanged) {
      nextNode = { ...nextNode, rows: nextRows }
    }
  }

  return nextNode === node ? node : clearOriginal(nextNode)
}

/**
 * 在节点树中找到包含 targetId 的兄弟列表，交给 transform(list, index) 生成新列表。
 * 用于需要改动兄弟节点的结构性编辑（如把图片和前文合并为图文组）；
 * transform 返回 null 表示不修改。受影响的祖先节点会清除 original，按子节点重新序列化。
 */
export function transformNodeListDeep(nodes = [], targetId, transform) {
  const index = nodes.findIndex((node) => node.id === targetId)

  if (index !== -1) {
    return transform(nodes, index) || nodes
  }

  let changed = false
  const nextNodes = nodes.map((node) => {
    const nextNode = transformInNode(node, targetId, transform)

    if (nextNode !== node) {
      changed = true
    }

    return nextNode
  })

  return changed ? nextNodes : nodes
}

function nodeChildLists(node) {
  const lists = []

  if (Array.isArray(node.children)) {
    lists.push(node.children)
  }

  if (Array.isArray(node.items)) {
    lists.push(...node.items.filter(Array.isArray))
  }

  if (Array.isArray(node.rows)) {
    node.rows.forEach((row) => (row.cells || []).forEach((cell) => lists.push(cell.children || [])))
  }

  return lists
}

/** 返回目标节点的祖先链（由外到内，不含目标本身）；找不到时返回 null。 */
export function findNodeAncestors(nodes = [], targetId, ancestors = []) {
  for (const node of nodes) {
    if (node.id === targetId) {
      return ancestors
    }

    for (const list of nodeChildLists(node)) {
      const found = findNodeAncestors(list, targetId, [...ancestors, node])

      if (found) {
        return found
      }
    }
  }

  return null
}
