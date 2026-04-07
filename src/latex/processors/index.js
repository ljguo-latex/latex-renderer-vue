import TextNode from '../../components/nodes/TextNode.vue'
import { choicesProcessor } from './choicesProcessor.js'
import { enumerateProcessor } from './enumerateProcessor.js'
import { imageProcessor } from './imageProcessor.js'

export const textProcessor = {
  name: 'text',
  type: 'text',
  component: TextNode,
  isEditable: () => false,
}

export const defaultProcessors = [imageProcessor, choicesProcessor, enumerateProcessor]

export function createProcessorRegistry(processors = defaultProcessors) {
  return new Map([textProcessor, ...processors].map((processor) => [processor.type, processor]))
}
