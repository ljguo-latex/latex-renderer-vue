import { parseInlineContentWithContext } from './core.js'

/** Resolve declarations in source order, before Vue mounts siblings independently.
 * Environments inherit the outer context and keep their declarations local.
 * Only renderer metadata is added; original source and serialization stay intact.
 */
export function resolveDocumentContexts(nodes, handlers, initialContext = {}) {
  let context = initialContext
  const visit = (children, seed) => resolveDocumentContexts(children, handlers, seed)
  const resolved = nodes.map((node) => {
    const result = { ...node, inlineContext: context }
    if (node.type === 'text') {
      const parsed = parseInlineContentWithContext(node.previewContent ?? node.content, handlers, context)
      result.inlineNodes = parsed.nodes
      context = parsed.context
    }
    if (Array.isArray(node.children)) result.children = visit(node.children, context).nodes
    if (Array.isArray(node.items)) {
      let itemContext = context
      result.items = node.items.map((item) => {
        if (!Array.isArray(item)) return item
        const resolvedItem = visit(item, itemContext)
        itemContext = resolvedItem.context
        return resolvedItem.nodes
      })
    }
    if (Array.isArray(node.rows)) {
      result.rows = node.rows.map((row) => ({ ...row, cells: row.cells.map((cell) => ({
        ...cell, children: visit(cell.children || [], context).nodes,
      })) }))
    }
    return result
  })
  return { nodes: resolved, context }
}
