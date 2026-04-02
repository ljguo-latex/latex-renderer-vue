function toAlpha(index) {
  let value = index
  let result = ''

  while (value > 0) {
    value -= 1
    result = String.fromCharCode(97 + (value % 26)) + result
    value = Math.floor(value / 26)
  }

  return result
}

function toRoman(index) {
  const numerals = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]

  let value = index
  let result = ''

  for (const [number, numeral] of numerals) {
    while (value >= number) {
      result += numeral
      value -= number
    }
  }

  return result
}

export function formatEnumerateLabel(template = '(\\arabic*)', index) {
  return template
    .replace(/\\arabic\*/g, String(index))
    .replace(/\\alph\*/g, toAlpha(index).toLowerCase())
    .replace(/\\Alph\*/g, toAlpha(index).toUpperCase())
    .replace(/\\roman\*/g, toRoman(index).toLowerCase())
    .replace(/\\Roman\*/g, toRoman(index).toUpperCase())
}
