const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const NAMED_COLOR_PATTERN = /^[a-z][a-z0-9-]*$/i
const COLOR_FUNCTION_PATTERN = /^(?:rgb|rgba|hsl|hsla)\([\d\s,%.+-/]+\)$/i

export function normalizeColorValue(value = '') {
  const color = String(value || '').trim()

  if (!color) {
    return null
  }

  if (
    HEX_COLOR_PATTERN.test(color) ||
    NAMED_COLOR_PATTERN.test(color) ||
    COLOR_FUNCTION_PATTERN.test(color)
  ) {
    return color
  }

  return null
}
