import CenterNode from '../../components/nodes/CenterNode.vue'
import { parseLatex, serializeLatex } from '../core'
import { findEnvironmentBlock } from '../environment'

const ALIGNMENT_ENVIRONMENTS = ['center', 'flushleft', 'flushright']

function findNextAlignmentEnvironment(input = '', from = 0) {
  let bestMatch = null

  for (const environmentName of ALIGNMENT_ENVIRONMENTS) {
    const match = findEnvironmentBlock(input, from, environmentName)

    if (!match) {
      continue
    }

    if (!bestMatch || match.start < bestMatch.start) {
      bestMatch = {
        ...match,
        environmentName,
      }
    }
  }

  return bestMatch
}

export const centerProcessor = {
  name: 'center',
  type: 'center',
  block: true,
  priority: 80,
  component: CenterNode,
  find(input, from) {
    return findNextAlignmentEnvironment(input, from)
  },
  parse(result, { id, processors = [] }) {
    return {
      id,
      type: 'center',
      environmentName: result.environmentName || 'center',
      children: parseLatex((result.body || '').trim(), processors),
      original: result.original,
    }
  },
  serialize(node, { processors = [] } = {}) {
    if (node.original) {
      return node.original
    }

    const environmentName = node.environmentName || 'center'

    return `\\begin{${environmentName}}\n${serializeLatex(node.children || [], processors)}\n\\end{${environmentName}}`
  },
}
