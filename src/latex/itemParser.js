import { parseLatex } from './core'

/**
 * 递归解析列表项内容，支持嵌套块结构
 * @param {string} content - 原始项目内容
 * @param {Array} processors - 可用的处理器列表
 * @returns {Array} 解析后的节点数组（可以是文本或块节点）
 */
export function parseItemContent(content, processors) {
  if (!content || typeof content !== 'string') {
    return []
  }

  return parseLatex(content.trim(), processors)
}

/**
 * 检查项目内容是否只包含文本节点（无块结构）
 */
export function isSimpleTextItem(nodes) {
  return nodes.length === 1 && nodes[0].type === 'text'
}
