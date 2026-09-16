import LatexRenderer from './components/LatexRenderer.vue'
import { configureMathJax, loadMathJax, waitForMathJax } from './composables/useMathJax'

export { LatexRenderer, configureMathJax, loadMathJax, waitForMathJax }
export { parseLatex, prefixNodeIds, replaceNode, replaceNodeDeep, serializeLatex } from './latex/core'
export { createProcessorRegistry, defaultProcessors, textProcessor } from './latex/processors'
export { IMAGE_SRC_RESOLVER_KEY } from './latex/imageContext'
export { inlineCommandHandlers, normalizeInlineNode } from './latex/inline/commands'

export default LatexRenderer
