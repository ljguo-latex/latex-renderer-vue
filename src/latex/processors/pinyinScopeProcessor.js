import PinyinScopeNode from '../../components/nodes/PinyinScopeNode.vue'
import { findEnvironmentBlock } from '../environment.js'
import { findContainingMathSegment } from '../mathDelimiters.js'

export const pinyinScopeProcessor = {
  name: 'pinyinscope',
  type: 'pinyinscope',
  block: true,
  priority: 75,
  component: PinyinScopeNode,
  find(input, from) {
    let match = findEnvironmentBlock(input, from, 'pinyinscope')
    while (match) {
      const math = findContainingMathSegment(input, match.start)
      if (!math) return match
      match = findEnvironmentBlock(input, math.end, 'pinyinscope')
    }
    return null
  },
  parse(match, { id }) {
    return { id, type: 'pinyinscope', body: match.body, optionString: match.optionString, original: match.original }
  },
  serialize(node) {
    const option = node.optionString ? `[${node.optionString}]` : ''
    return node.original ?? `\\begin{pinyinscope}${option}${node.body || ''}\\end{pinyinscope}`
  },
}
