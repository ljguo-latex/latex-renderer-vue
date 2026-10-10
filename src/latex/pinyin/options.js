import { normalizeColorValue } from '../color.js'

export const DEFAULT_PINYIN_OPTIONS = Object.freeze({
  ratio: 0.65,
  color: 'inherit',
  fallback: true,
  align: 'center',
})

/** Invalid values leave the previous setting intact. Never mutate a caller's options. */
export function resolvePinyinOptions(values = {}, base = DEFAULT_PINYIN_OPTIONS) {
  const options = { ...base }
  const ratio = Number(values?.ratio)
  if (Number.isFinite(ratio) && ratio >= 0.2 && ratio <= 1) options.ratio = ratio
  const color = normalizeColorValue(values?.color)
  if (color) options.color = color
  if (values?.fallback === true || values?.fallback === 'true') options.fallback = true
  if (values?.fallback === false || values?.fallback === 'false') options.fallback = false
  if (['left', 'center', 'right'].includes(values?.align)) options.align = values.align
  return options
}

export function parsePinyinSetup(source = '', base = DEFAULT_PINYIN_OPTIONS) {
  const values = {}
  // Keep commas inside CSS color functions or braced values together.
  for (const pair of source.match(/(?:[^,({]|\([^)]*\)|\{[^}]*\})+/g) || []) {
    const equals = pair.indexOf('=')
    if (equals === -1) continue
    const key = pair.slice(0, equals).trim()
    const value = pair.slice(equals + 1).trim().replace(/^\{(.*)\}$/, '$1')
    values[key] = value
  }
  return resolvePinyinOptions(values, base)
}

export function serializePinyinOptions(options) {
  const value = resolvePinyinOptions(options)
  return `ratio=${value.ratio},color={${value.color}},fallback=${value.fallback},align=${value.align}`
}
