import MathEnvironmentNode from '../../components/nodes/MathEnvironmentNode.vue'
import { findEnvironmentBlock } from '../environment'
import { findContainingMathSegment } from '../mathDelimiters.js'

export const mathEnvironmentNames = [
  'equation',
  'equation*',
  'align',
  'align*',
  'alignat',
  'alignat*',
  'xalignat',
  'xalignat*',
  'xxalignat',
  'flalign',
  'flalign*',
  'gather',
  'gather*',
  'multline',
  'multline*',
  'subequations',
  'split',
  'aligned',
  'alignedat',
  'gathered',
  'cases',
  'dcases',
  'matrix',
  'pmatrix',
  'bmatrix',
  'Bmatrix',
  'vmatrix',
  'Vmatrix',
  'smallmatrix',
  'array',
]

function findNextMathEnvironment(input = '', from = 0) {
  let bestMatch = null

  for (const environmentName of mathEnvironmentNames) {
    let cursor = from
    let match = findEnvironmentBlock(input, cursor, environmentName)

    while (match) {
      const containingMathSegment = findContainingMathSegment(input, match.start)

      if (!containingMathSegment) {
        break
      }

      cursor = containingMathSegment.end
      match = findEnvironmentBlock(input, cursor, environmentName)
    }

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

export const mathEnvironmentProcessor = {
  name: 'mathEnvironment',
  type: 'mathEnvironment',
  block: true,
  priority: 70,
  component: MathEnvironmentNode,
  find(input, from) {
    return findNextMathEnvironment(input, from)
  },
  parse(result, { id }) {
    return {
      id,
      type: 'mathEnvironment',
      environmentName: result.environmentName,
      body: result.body || '',
      optionString: result.optionString || '',
      original: result.original,
    }
  },
  serialize(node) {
    if (node.original) {
      return node.original
    }

    const optionBlock = node.optionString ? `[${node.optionString}]` : ''
    return `\\begin{${node.environmentName}}${optionBlock}${node.body || ''}\\end{${node.environmentName}}`
  },
}
