export const INCLUDE_GRAPHICS_PATTERN =
  /\\begin\{(flushleft|center|flushright)\}\s*\\includegraphics(?:\[(.*?)\])?\{(.*?)\}\s*\\end\{\1\}|\\includegraphics(?:\[(.*?)\])?\{(.*?)\}/gs

export const LATEX_ALIGNMENT_TO_UI = {
  flushleft: 'left',
  center: 'center',
  flushright: 'right',
}

export const UI_ALIGNMENT_TO_LATEX = {
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
