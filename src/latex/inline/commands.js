import BlankCommand from '../../components/inline/BlankCommand.vue'
import InlineMathText from '../../components/inline/InlineMathText.vue'
import InlineText from '../../components/inline/InlineText.vue'
import ParenCommand from '../../components/inline/ParenCommand.vue'

export const inlineCommandHandlers = {
  blank: {
    name: 'blank',
    component: BlankCommand,
    toMath: () => '\\underline{\\qquad\\qquad}',
  },
  paren: {
    name: 'paren',
    component: ParenCommand,
    toMath: () => '\\left(\\qquad\\right)',
  },
}

export function normalizeInlineNode(node, handlers = inlineCommandHandlers) {
  if (node.type === 'text') {
    return {
      ...node,
      component: InlineText,
    }
  }

  if (node.type === 'math') {
    return {
      ...node,
      component: InlineMathText,
    }
  }

  const handler = handlers[node.name]

  if (!handler) {
    return {
      id: `${node.id}_fallback`,
      type: 'text',
      content: node.raw,
      component: InlineText,
    }
  }

  return {
    ...node,
    component: handler.component,
  }
}
