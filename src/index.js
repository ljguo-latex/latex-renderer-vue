import LatexRenderer from './components/LatexRenderer.vue'
import { loadMathJax } from './composables/useMathJax'

export { LatexRenderer, loadMathJax }
export { parseLatex, prefixNodeIds, replaceNode, replaceNodeDeep, serializeLatex } from './latex/core'
export { createProcessorRegistry, defaultProcessors, textProcessor } from './latex/processors'
export { IMAGE_SRC_RESOLVER_KEY } from './latex/imageContext'
export { inlineCommandHandlers, normalizeInlineNode } from './latex/inline/commands'

export default LatexRenderer
