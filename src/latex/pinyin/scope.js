import { readBalancedGroup, isEscaped, skipWhitespace } from '../utils/balance.js'
import { parsePinyinSetup, resolvePinyinOptions } from './options.js'
import { resolvePinyinTokens, tokenizePinyinText } from './tokens.js'

const SETUP_COMMAND = '\\xpinyinsetup'

/** Scope bodies contain text, manual readings, line breaks and setup declarations. */
export function createPinyinLines(body = '', initialOptions = {}) {
  let options = resolvePinyinOptions(initialOptions)
  const lines = [{ runs: [], align: options.align }]
  let start = 0
  let cursor = 0
  const flush = (end) => {
    if (end > start) lines.at(-1).runs.push({ tokens: tokenizePinyinText(body.slice(start, end)), options })
  }

  // Remove only the structural newline surrounding an environment, preserving empty lines inside.
  body = body.replace(/^[ \t]*\r?\n/, '').replace(/\r?\n[ \t]*$/, '')
  while (cursor < body.length) {
    if (!isEscaped(body, cursor) && body.startsWith(SETUP_COMMAND, cursor) && !/[A-Za-z]/.test(body[cursor + SETUP_COMMAND.length] || '')) {
      const argument = readBalancedGroup(body, skipWhitespace(body, cursor + SETUP_COMMAND.length))
      if (argument) {
        flush(cursor)
        options = parsePinyinSetup(argument.content, options)
        lines.at(-1).align = options.align
        cursor = argument.end
        start = cursor
        continue
      }
    }
    const breakLength = body.startsWith('\\\\', cursor) && !isEscaped(body, cursor)
      ? 2 : body.startsWith('\r\n', cursor) ? 2 : /[\r\n]/.test(body[cursor]) ? 1 : 0
    if (breakLength) {
      flush(cursor)
      lines.push({ runs: [], align: options.align })
      cursor += breakLength
      // A physical newline immediately following \\ describes the same break.
      if (body.slice(cursor - breakLength, cursor) === '\\\\') {
        const newline = body.slice(cursor).match(/^[ \t]*\r?\n/)
        if (newline) cursor += newline[0].length
      }
      start = cursor
      continue
    }
    cursor += 1
  }
  flush(body.length)
  return lines.map((line) => {
    // Style changes must not interrupt phrase-level polyphone recognition.
    const tokens = resolvePinyinTokens(line.runs.flatMap((run) => run.tokens))
    let offset = 0
    const runs = line.runs.map((run) => {
      const resolved = { ...run, tokens: tokens.slice(offset, offset + run.tokens.length) }
      offset += run.tokens.length
      return resolved
    })
    return { ...line, runs }
  })
}
