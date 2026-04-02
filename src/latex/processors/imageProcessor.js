import ImageNode from '../../components/nodes/ImageNode.vue'

const IMAGE_PATTERN =
  /\\begin\{(flushleft|center|flushright)\}\s*\\includegraphics(?:\[(.*?)\])?\{(.*?)\}\s*\\end\{\1\}|\\includegraphics(?:\[(.*?)\])?\{(.*?)\}/gs

const LATEX_ALIGNMENT_TO_UI = {
  flushleft: 'left',
  center: 'center',
  flushright: 'right',
}

const UI_ALIGNMENT_TO_LATEX = {
  left: 'flushleft',
  center: 'center',
  right: 'flushright',
}

function parseImageOptions(optionString = '') {
  if (!optionString.trim()) {
    return {}
  }

  return optionString
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((options, part) => {
      const separatorIndex = part.indexOf('=')

      if (separatorIndex === -1) {
        options[part] = true
        return options
      }

      const key = part.slice(0, separatorIndex).trim()
      const value = part.slice(separatorIndex + 1).trim()

      if (key) {
        options[key] = value
      }

      return options
    }, {})
}

function stringifyImageOptions(options = {}) {
  const entries = Object.entries(options).filter(([, value]) => value !== undefined && value !== '')

  if (!entries.length) {
    return ''
  }

  return entries
    .map(([key, value]) => (value === true ? key : `${key}=${value}`))
    .join(',')
}

export const imageProcessor = {
  name: 'image',
  type: 'image',
  block: true,
  priority: 100,
  component: ImageNode,
  isEditable: ({ editableImages }) => editableImages,
  find(input, from) {
    const pattern = new RegExp(IMAGE_PATTERN)
    pattern.lastIndex = from
    const match = pattern.exec(input)

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
