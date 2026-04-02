import BlankCommand from '../../components/inline/BlankCommand.vue'
import InlineMathText from '../../components/inline/InlineMathText.vue'
import ParenCommand from '../../components/inline/ParenCommand.vue'

export const inlineCommandHandlers = {
  blank: {
    name: 'blank',
    component: BlankCommand,
  },
  paren: {
    name: 'paren',
    component: ParenCommand,
  },
}

export function normalizeInlineNode(node, handlers = inlineCommandHandlers) {
  if (node.type === 'math-text') {
    return {
      ...node,
      component: InlineMathText,
    }
  }

  const handler = handlers[node.name]

  if (!handler) {
    return {
      id: `${node.id}_fallback`,
      type: 'math-text',
      content: node.raw,
      component: InlineMathText,
    }
  }

  return {
    ...node,
    component: handler.component,
  }
}
