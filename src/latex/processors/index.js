import TextNode from '../../components/nodes/TextNode.vue'
import { choicesProcessor } from './choicesProcessor.js'
import { enumerateProcessor } from './enumerateProcessor.js'
import { imageProcessor } from './imageProcessor.js'
import { mathEnvironmentProcessor } from './mathEnvironmentProcessor.js'

export const textProcessor = {
  name: 'text',
  type: 'text',
  component: TextNode,
  isEditable: () => false,
}

export const defaultProcessors = [imageProcessor, choicesProcessor, enumerateProcessor, mathEnvironmentProcessor]

export function createProcessorRegistry(processors = defaultProcessors) {
  return new Map([textProcessor, ...processors].map((processor) => [processor.type, processor]))
}
