/** DOM adapter for MathJax. User text never passes through innerHTML. */
export function createPinyinDOM(document, tokens, options) {
  const span = document.createElement('span')
  span.className = 'latex-pinyin-text'
  for (const token of tokens) {
    if (!token.pinyin) {
      span.appendChild(document.createTextNode(token.text))
      continue
    }
    const ruby = document.createElement('ruby')
    ruby.appendChild(document.createTextNode(token.text))
    const appendText = (tag, text) => {
      const element = document.createElement(tag)
      element.textContent = text
      ruby.appendChild(element)
      return element
    }
    if (options.fallback) appendText('rp', '(')
    const rt = appendText('rt', token.pinyin)
    rt.style.color = options.color
    rt.style.fontSize = `${options.ratio}em`
    if (options.fallback) appendText('rp', ')')
    span.appendChild(ruby)
  }
  return span
}

export function createPinyinScopeDOM(document, lines, options) {
  const scope = document.createElement('span')
  scope.className = 'latex-pinyin-scope'
  scope.style.display = 'inline-block'
  scope.style.textAlign = options.align
  for (const line of lines) {
    const row = document.createElement('span')
    row.className = 'latex-pinyin-line'
    row.style.textAlign = line.align
    for (const run of line.runs) row.appendChild(createPinyinDOM(document, run.tokens, run.options))
    scope.appendChild(row)
  }
  return scope
}
