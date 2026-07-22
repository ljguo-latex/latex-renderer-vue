import ImageNode from '../../components/nodes/ImageNode.vue'
import {
  INCLUDE_GRAPHICS_PATTERN,
  LATEX_ALIGNMENT_TO_UI,
  UI_ALIGNMENT_TO_LATEX,
  parseImageOptions,
  stringifyImageOptions,
} from '../imageOptions.js'

export const imageProcessor = {
  name: 'image',
  type: 'image',
  block: true,
  priority: 100,
  component: ImageNode,
  isEditable: ({ editableImages }) => editableImages,
  find(input, from) {
    INCLUDE_GRAPHICS_PATTERN.lastIndex = from
    const match = INCLUDE_GRAPHICS_PATTERN.exec(input)

    if (!match) {
      return null
    }

    return {
      start: match.index,
      end: match.index + match[0].length,
      match,
    }
  },
  parse(result, { id }) {
    const [, alignedEnvironment, alignedOptions, alignedSrc, rawOptions, rawSrc] = result.match
    const options = alignedOptions ?? rawOptions ?? ''
    const src = alignedSrc ?? rawSrc ?? ''

    return {
      id,
      type: 'image',
      src: src.trim(),
      options: parseImageOptions(options),
      alignment: LATEX_ALIGNMENT_TO_UI[alignedEnvironment] || 'default',
      original: result.match[0],
    }
  },
  serialize(node) {
    const optionString = stringifyImageOptions(node.options)
    const optionBlock = optionString ? `[${optionString}]` : ''
    const imageLatex = `\\includegraphics${optionBlock}{${node.src}}`
    const environment = UI_ALIGNMENT_TO_LATEX[node.alignment]

    if (!environment) {
      return imageLatex
    }

    return `\\begin{${environment}}\n${imageLatex}\n\\end{${environment}}`
  },
}
