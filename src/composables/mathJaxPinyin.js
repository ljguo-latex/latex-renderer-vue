import { findEnvironmentBlock } from '../latex/environment.js'
import { findNextMathSegment } from '../latex/mathDelimiters.js'
import { createPinyinDOM, createPinyinScopeDOM } from '../latex/pinyin/dom.js'
import { createPinyinLines } from '../latex/pinyin/scope.js'
import { createPinyinTokens } from '../latex/pinyin/tokens.js'
import { parsePinyinSetup, resolvePinyinOptions, serializePinyinOptions } from '../latex/pinyin/options.js'

export const PINYIN_PACKAGE = 'xpinyin-ruby'
const registered = new WeakSet()

/** Register before startup.defaultReady(), for the MathJax 4 browser runtime.
 * Use v4's HtmlNode directly: no texhtml package or arbitrary HTML input is enabled.
 * All MathJax internals are confined to this adapter.
 */
export function registerPinyinExtension(mathJax) {
  const tex = mathJax?._?.input?.tex
  const Configuration = tex?.Configuration?.Configuration
  const maps = tex?.TokenMap
  const environment = tex?.ParseMethods?.default?.environment
  if (!Configuration || !maps?.CommandMap || !maps?.EnvironmentMap || !environment) {
    throw new Error('The pinyin extension requires a MathJax 4 TeX browser component.')
  }
  if (registered.has(Configuration)) return

  function optionsFor(parser) {
    return resolvePinyinOptions(parser.stack.env.pinyinOptions)
  }
  function htmlNode(parser, dom) {
    const adaptor = parser.configuration.packageData.get(PINYIN_PACKAGE).adaptor
    const html = parser.create('node', 'html').setHTML(dom, adaptor)
    return parser.create('node', 'mtext', [html], { mathvariant: 'normal' })
  }

  new maps.CommandMap('xpinyin-ruby-commands', {
    pinyin(parser, name) {
      const tokens = createPinyinTokens(parser.GetArgument(name))
      parser.Push(htmlNode(parser, createPinyinDOM(document, tokens, optionsFor(parser))))
    },
    xpinyinsetup(parser, name) {
      parser.stack.env.pinyinOptions = parsePinyinSetup(parser.GetArgument(name), optionsFor(parser))
    },
  })
  new maps.EnvironmentMap('xpinyin-ruby-environments', environment, {
    pinyinscope(parser) {
      const opening = '\\begin{pinyinscope}'
      const match = findEnvironmentBlock(opening + parser.string.slice(parser.i), 0, 'pinyinscope')
      if (!match) throw new Error('Missing \\end{pinyinscope}.')
      parser.i += match.end - opening.length
      const options = parsePinyinSetup(match.optionString, optionsFor(parser))
      return htmlNode(parser, createPinyinScopeDOM(document, createPinyinLines(match.body, options), options))
    },
  })
  Configuration.create(PINYIN_PACKAGE, {
    handler: { macro: ['xpinyin-ruby-commands'], environment: ['xpinyin-ruby-environments'] },
    preprocessors: [(data) => {
      data.data.packageData.set(PINYIN_PACKAGE, { adaptor: data.document.adaptor })
    }],
    postprocessors: [(data) => {
      data.data.packageData.delete(PINYIN_PACKAGE)
    }],
  })
  registered.add(Configuration)
}

/** Carry the owning component's options into each independent TeX parse.
 * Seeds stay inside math delimiters/environments and never modify stored LaTeX.
 */
export function seedPinyinMath(latex, options) {
  if (!/\\(?:pinyin|xpinyinsetup)(?![A-Za-z])|\\begin\{pinyinscope\}/.test(latex)) return latex
  const setup = `\\xpinyinsetup{${serializePinyinOptions(options)}}`
  let cursor = 0
  let output = ''
  let segment
  while ((segment = findNextMathSegment(latex, cursor))) {
    output += latex.slice(cursor, segment.bodyStart) + setup + latex.slice(segment.bodyStart, segment.end)
    cursor = segment.end
  }
  if (cursor) return output + latex.slice(cursor)
  // MathEnvironmentNode passes an undelimited environment directly to MathJax.
  return latex.replace(/\\begin\{[^}]+\}(?:\[[^\]]*\])?/, (opening) => opening + setup)
}
