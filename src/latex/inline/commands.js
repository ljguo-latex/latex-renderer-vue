import BlankCommand from '../../components/inline/BlankCommand.vue'
import CircledCommand from '../../components/inline/CircledCommand.vue'
import ColorCommand from '../../components/inline/ColorCommand.vue'
import HspaceCommand from '../../components/inline/HspaceCommand.vue'
import InlineMathText from '../../components/inline/InlineMathText.vue'
import InlineText from '../../components/inline/InlineText.vue'
import ParenCommand from '../../components/inline/ParenCommand.vue'
import TextStyleCommand from '../../components/inline/TextStyleCommand.vue'

function textStyle(name, style) {
  return {
    name,
    component: TextStyleCommand,
    args: 1,
    style,
    toMath: (node) => node.raw,
  }
}

export const inlineCommandHandlers = {
  blank: {
    name: 'blank',
    component: BlankCommand,
    minArgs: 0,
    maxArgs: 1,
    toMath: () => '\\class{math-blank-rule}{\\rule[-0.15em]{4.5em}{2px}}',
  },
  paren: {
    name: 'paren',
    component: ParenCommand,
    minArgs: 0,
    maxArgs: 1,
    toMath: () => '\\style{color: var(--latex-renderer-theme-color); font-size: 1.15em;}{\\text{\\textbf{(}}\\qquad\\text{\\textbf{)}}}',
  },
  circled: {
    name: 'circled',
    component: CircledCommand,
    args: 1,
    toMath: (node) => `\\class{math-circled}{\\enclose{circle}{${node.param ?? ''}}}`,
  },
  hspace: {
    name: 'hspace',
    component: HspaceCommand,
    args: 1,
    toMath: (node) => node.raw,
  },
  textcolor: {
    name: 'textcolor',
    component: ColorCommand,
    args: 2,
    toMath: (node) => node.raw,
  },
  color: {
    name: 'color',
    component: ColorCommand,
    args: 2,
    declarationGroup: true,
    declarationRest: true,
    toMath: (node) => node.raw,
  },
  textbf: textStyle('textbf', 'bold'),
  textit: textStyle('textit', 'italic'),
  emph: textStyle('emph', 'italic'),
  underline: textStyle('underline', 'underline'),
  uline: textStyle('uline', 'underline'),
  sout: textStyle('sout', 'strike'),
  uwave: textStyle('uwave', 'underline'),
  overline: textStyle('overline', 'overline'),
  texttt: textStyle('texttt', 'mono'),
  textrm: textStyle('textrm', 'serif'),
  textsf: textStyle('textsf', 'sans'),
  textsuperscript: textStyle('textsuperscript', 'sup'),
  textsubscript: textStyle('textsubscript', 'sub'),
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
    handler,
  }
}
