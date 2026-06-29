import TextNode from '../../components/nodes/TextNode.vue'
import { centerProcessor } from './centerProcessor.js'
import { choicesProcessor } from './choicesProcessor.js'
import { enumerateProcessor } from './enumerateProcessor.js'
import { imageProcessor } from './imageProcessor.js'
import { mathEnvironmentProcessor } from './mathEnvironmentProcessor.js'
import { minipageProcessor } from './minipageProcessor.js'
import { tabularProcessor } from './tabularProcessor.js'
import { vspaceProcessor } from './vspaceProcessor.js'

export const textProcessor = {
  name: 'text',
  type: 'text',
  component: TextNode,
  isEditable: () => false,
}

export const defaultProcessors = [
  imageProcessor,
  centerProcessor,
  choicesProcessor,
  enumerateProcessor,
  minipageProcessor,
  vspaceProcessor,
  tabularProcessor,
  mathEnvironmentProcessor,
]

export function createProcessorRegistry(processors = defaultProcessors) {
  return new Map([textProcessor, ...processors].map((processor) => [processor.type, processor]))
}

export { minipageProcessor, vspaceProcessor }
