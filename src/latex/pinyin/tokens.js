import { pinyin } from 'pinyin-pro'

const HAN = /^\p{Script=Han}$/u
const READING = /^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]+[1-5]?$/iu

export function defaultPinyinResolver(text) {
  return pinyin(text, { type: 'all', toneType: 'symbol' }).map((entry) =>
    entry.isZh ? entry.pinyin : '',
  )
}

/** Extract manual readings without losing plain text or Unicode code points. */
export function tokenizePinyinText(source = '') {
  const tokens = []
  for (let offset = 0; offset < source.length;) {
    const text = String.fromCodePoint(source.codePointAt(offset))
    offset += text.length
    let reading
    if (HAN.test(text) && source[offset] === '(') {
      const end = source.indexOf(')', offset + 1)
      const candidate = end === -1 ? '' : source.slice(offset + 1, end).trim().normalize('NFC')
      if (READING.test(candidate)) {
        reading = candidate
        offset = end + 1
      }
    }
    tokens.push({ text, ...(reading ? { pinyin: reading } : {}) })
  }
  return tokens
}

export function resolvePinyinTokens(tokens, resolver = defaultPinyinResolver) {
  const text = tokens.map((token) => token.text).join('')
  const readings = resolver(text)
  if (!Array.isArray(readings) || readings.length !== tokens.length) {
    throw new Error('Pinyin resolver must return one reading per Unicode character.')
  }
  return tokens.map((token, index) => {
    const reading = token.pinyin || (HAN.test(token.text) ? readings[index] : '')
    return reading ? { ...token, pinyin: reading } : token
  })
}

/** Plain text model shared by Vue and MathJax. Manual readings do not split context. */
export function createPinyinTokens(source = '', resolver = defaultPinyinResolver) {
  return resolvePinyinTokens(tokenizePinyinText(source), resolver)
}
