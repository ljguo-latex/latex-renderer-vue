const INCLUDE_GRAPHICS_PATTERN =
  /\\begin\{(flushleft|center|flushright)\}\s*\\includegraphics(?:\[(.*?)\])?\{(.*?)\}\s*\\end\{\1\}|\\includegraphics(?:\[(.*?)\])?\{(.*?)\}/gs

export const PX_PER_CM = 37.79527559
export const MIN_WIDTH_CM = 1
export const MIN_WIDTH_PX = MIN_WIDTH_CM * PX_PER_CM
export const MAX_WIDTH_CM = 18
export const MAX_WIDTH_PX = MAX_WIDTH_CM * PX_PER_CM
export const IMAGE_ALIGNMENTS = ['default', 'left', 'center', 'right']

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

export function parseImageOptions(optionString = '') {
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

export function stringifyImageOptions(options = {}) {
  const entries = Object.entries(options).filter(([, value]) => value !== undefined && value !== '')

  if (!entries.length) {
    return ''
  }

  return entries
    .map(([key, value]) => (value === true ? key : `${key}=${value}`))
    .join(',')
}

export function parseLatexWithImages(latex = '') {
  const segments = []
  let lastIndex = 0
  let imageCount = 0

  for (const match of latex.matchAll(INCLUDE_GRAPHICS_PATTERN)) {
    const [fullMatch, alignedEnvironment, alignedOptions, alignedSrc, rawOptions, rawSrc] = match
    const matchIndex = match.index ?? 0
    const textBefore = latex.slice(lastIndex, matchIndex)
    const alignment = LATEX_ALIGNMENT_TO_UI[alignedEnvironment] || 'default'
    const options = alignedOptions ?? rawOptions ?? ''
    const src = alignedSrc ?? rawSrc ?? ''

    if (textBefore) {
      segments.push({
        type: 'text',
        id: `text_${segments.length + 1}`,
        content: textBefore,
      })
    }

    imageCount += 1
    segments.push({
      type: 'image',
      id: `img_${imageCount}`,
      src: src.trim(),
      options: parseImageOptions(options),
      alignment,
      original: fullMatch,
    })

    lastIndex = matchIndex + fullMatch.length
  }

  const trailingText = latex.slice(lastIndex)

  if (trailingText || segments.length === 0) {
    segments.push({
      type: 'text',
      id: `text_${segments.length + 1}`,
      content: trailingText,
    })
  }

  return segments
}

export function serializeLatex(segments = []) {
  return segments
    .map((segment) => {
      if (segment.type === 'text') {
        return segment.content ?? ''
      }

      const optionString = stringifyImageOptions(segment.options)
      const optionBlock = optionString ? `[${optionString}]` : ''
      const imageLatex = `\\includegraphics${optionBlock}{${segment.src}}`
      const environment = UI_ALIGNMENT_TO_LATEX[segment.alignment]

      if (!environment) {
        return imageLatex
      }

      return `\\begin{${environment}}\n${imageLatex}\n\\end{${environment}}`
    })
    .join('')
}

export function pxToCm(px) {
  return px / PX_PER_CM
}

export function cmToPx(cm) {
  return cm * PX_PER_CM
}

export function trimNumber(value, digits = 2) {
  return Number(value.toFixed(digits)).toString()
}

export function formatWidthInCm(px) {
  return `${trimNumber(pxToCm(px))}cm`
}

export function clampImageWidthPx(px) {
  return Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, px))
}

export function parseLengthToPx(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') {
    return null
  }

  const match = rawValue.trim().match(/^(-?\d+(?:\.\d+)?)(cm|px)?$/i)

  if (!match) {
    return null
  }

  const numericValue = Number(match[1])
  const unit = (match[2] || 'px').toLowerCase()

  if (!Number.isFinite(numericValue)) {
    return null
  }

  if (unit === 'cm') {
    return cmToPx(numericValue)
  }

  return numericValue
}

export function updateImageSegmentWidth(segment, widthPx) {
  const nextOptions = {
    ...segment.options,
    width: formatWidthInCm(clampImageWidthPx(widthPx)),
  }

  delete nextOptions.height

  return {
    ...segment,
    options: nextOptions,
  }
}

export function updateImageSegmentAlignment(segment, alignment) {
  return {
    ...segment,
    alignment: IMAGE_ALIGNMENTS.includes(alignment) ? alignment : 'default',
  }
}

export function normalizeLatexTextForPreview(content = '') {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
}
