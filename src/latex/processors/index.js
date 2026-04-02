import TextNode from '../../components/nodes/TextNode.vue'
import { choicesProcessor } from './choicesProcessor'
import { enumerateProcessor } from './enumerateProcessor'
import { imageProcessor } from './imageProcessor'

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
