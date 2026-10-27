import { createTextNode, findNodeAncestors, serializeLatex, transformNodeListDeep } from './core.js'
import { parseLatexLength } from './length.js'
import { readBalancedGroup, skipWhitespace } from './utils/balance.js'
import { formatWidthAsLinewidth, trimNumber } from '../utils/latex.js'

/**
 * exam-zh-textfigure 的 \textfigure[options]{text}{figure}，版式语义以模板中的
 * fil_textfigure.sty 为准（在 exam-zh-textfigure v0.2.5 上改为固定两栏）：
 * - 文字栏固定为 text-ratio × 行宽；
 * - 左右方位时文字与图间隔 1em，图栏是剩下的宽度，图里的 \linewidth 指图栏宽度；
 *   上下方位时图栏占满整行；
 * - right / left 等同于 right-center / left-center；未指定方位时为 bottom-right。
 */
const COMMAND = '\\textfigure'
const POSITION_KEYS = ['fig-pos', 'pos']
const RATIO_KEYS = ['text-ratio', 'ratio']
const SIDE_POSITIONS = {
  right: { top: 'right-top', center: 'right', bottom: 'right-bottom' },
  left: { top: 'left-top', center: 'left', bottom: 'left-bottom' },
}
const PARAGRAPH_BREAK = /\n[ \t]*\n\s*|\\par(?![a-zA-Z])\s*/g
// 这些节点自成一段，不会被合并进图文组的文字栏
const BARRIER_TYPES = new Set(['image', 'textfigure', 'vspace'])
// 只允许在正文、小题和 minipage 中把图片转为图文组
const WRAPPABLE_ANCESTOR_TYPES = new Set(['enumerate', 'minipage'])

export const TEXT_FIGURE_DEFAULT_POSITION = 'bottom-right'
export const TEXT_FIGURE_DEFAULT_RATIO = 0.65
export const TEXT_FIGURE_MIN_RATIO = 0.3
export const TEXT_FIGURE_MAX_RATIO = 0.85
// 1em 间距约占 A4 版心宽度的 3%~4%，用于在整行宽与图栏宽之间换算图片宽度
export const TEXT_FIGURE_GAP_RATIO = 0.04
// 图片占图栏 95% 以上时直接写成 \linewidth（占满图栏）
const FULL_COLUMN_THRESHOLD = 0.95
export const TEXT_FIGURE_ADJUST_ACTIONS = ['expand-before', 'expand-after', 'shrink-first', 'shrink-last']

function splitTopLevel(input = '', separator = ',') {
  const parts = []
  let depth = 0
  let start = 0

  for (let index = 0; index < input.length; index++) {
    const char = input[index]

    if (char === '{') depth++
    else if (char === '}') depth--
    else if (char === separator && depth === 0) {
      parts.push(input.slice(start, index))
      start = index + 1
    }
  }

  parts.push(input.slice(start))
  return parts
}

export function parseTextFigureOptions(optionString = '') {
  return splitTopLevel(optionString)
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((options, part) => {
      const separatorIndex = part.indexOf('=')

      if (separatorIndex === -1) {
        options[part] = true
      } else {
        const key = part.slice(0, separatorIndex).trim()

        if (key) {
          options[key] = part.slice(separatorIndex + 1).trim()
        }
      }

      return options
    }, {})
}

export function stringifyTextFigureOptions(options = {}) {
  return Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== '' && value !== false)
    .map(([key, value]) => (value === true ? key : `${key}=${value}`))
    .join(', ')
}

function readOption(options, keys) {
  const key = keys.find((name) => options[name] !== undefined)
  return key ? { key, value: options[key] } : null
}

function writeOption(options, keys, value) {
  const existing = readOption(options, keys)
  return { ...options, [existing?.key || keys[0]]: value }
}

export function clampTextFigureRatio(ratio) {
  return Math.min(TEXT_FIGURE_MAX_RATIO, Math.max(TEXT_FIGURE_MIN_RATIO, ratio))
}

/** 把 options 归纳为预览需要的版式：side、垂直/水平对齐与文字栏比例。 */
export function getTextFigureLayout(options = {}) {
  const position = String(readOption(options, POSITION_KEYS)?.value || TEXT_FIGURE_DEFAULT_POSITION).trim()
  const [side, suffix = ''] = position.split(/-(.*)/s)
  const explicitRatio = Number.parseFloat(readOption(options, RATIO_KEYS)?.value)
  let ratio = Number.isFinite(explicitRatio) && explicitRatio > 0 ? Math.min(explicitRatio, 1) : 1

  // 与宏包一致：bottom-* 方位强制文字栏占满整行
  if (side === 'bottom' && suffix) {
    ratio = 1
  }

  if (side === 'left' || side === 'right') {
    return {
      position,
      side,
      vertical: suffix === 'top' || suffix === 'bottom' ? suffix : 'center',
      horizontal: null,
      ratio,
    }
  }

  return {
    position,
    side: side === 'top' ? 'top' : 'bottom',
    vertical: null,
    horizontal: { left: 'left', right: 'right', flushright: 'right' }[suffix] || 'center',
    ratio,
  }
}

export function setTextFigureSide(options = {}, side, vertical) {
  const layout = getTextFigureLayout(options)
  const nextVertical = vertical || layout.vertical || 'top'
  const position = SIDE_POSITIONS[side]?.[nextVertical]

  if (!position) {
    return options
  }

  let nextOptions = writeOption(options, POSITION_KEYS, position)

  if (!readOption(options, RATIO_KEYS)) {
    nextOptions = writeOption(nextOptions, RATIO_KEYS, String(TEXT_FIGURE_DEFAULT_RATIO))
  }

  return nextOptions
}

export function setTextFigureRatio(options = {}, ratio) {
  return writeOption(options, RATIO_KEYS, trimNumber(clampTextFigureRatio(ratio)))
}

export function findTextFigure(input = '', from = 0) {
  let start = input.indexOf(COMMAND, from)

  while (start !== -1) {
    const afterName = start + COMMAND.length

    if (!/[a-zA-Z@*]/.test(input[afterName] || '')) {
      let cursor = skipWhitespace(input, afterName)
      const optionGroup = readBalancedGroup(input, cursor, '[', ']')

      if (optionGroup) {
        cursor = skipWhitespace(input, optionGroup.end)
      }

      const textGroup = readBalancedGroup(input, cursor)
      const figureGroup = textGroup ? readBalancedGroup(input, skipWhitespace(input, textGroup.end)) : null

      if (figureGroup) {
        return {
          start,
          end: figureGroup.end,
          optionString: optionGroup ? optionGroup.content : null,
          text: textGroup.content,
          figure: figureGroup.content,
          original: input.slice(start, figureGroup.end),
        }
      }
    }

    start = input.indexOf(COMMAND, afterName)
  }

  return null
}

export function splitOuterWhitespace(value = '') {
  const lead = value.match(/^\s*/)[0]
  const body = value.slice(lead.length)
  const trail = body.match(/\s*$/)[0]

  return { lead, body: body.slice(0, body.length - trail.length), trail }
}

/** 选项未被修改时（optionString 仍为字符串）原样保留源码写法。 */
export function formatTextFigureOptionBlock({ options = {}, optionString = null } = {}) {
  if (typeof optionString === 'string') {
    return `[${optionString}]`
  }

  const serialized = stringifyTextFigureOptions(options)
  return serialized ? `[${serialized}]` : ''
}

export function buildTextFigureLatex(optionBlock, text, figure) {
  return `${COMMAND}${optionBlock}{\n${text.trim()}\n}{\n${figure.trim()}\n}`
}

function findBreaks(content = '') {
  return [...content.matchAll(PARAGRAPH_BREAK)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }))
}

/**
 * 从 index 往前收集一个段落：先跳过紧邻的空白（段落分隔），再收集到上一个段落分隔为止。
 * 返回 { start, head, body }：list[start] 若是被拆开的文本节点，head 为留在原处的前半段。
 */
function collectParagraphBefore(list, index, processors) {
  const parts = []
  let started = false

  for (let cursor = index - 1; cursor >= 0; cursor--) {
    const node = list[cursor]

    if (node.type !== 'text') {
      if (BARRIER_TYPES.has(node.type)) {
        return { start: cursor + 1, head: null, body: parts.join('') }
      }

      parts.unshift(serializeLatex([node], processors))
      started = true
      continue
    }

    let content = node.content ?? ''

    if (!started) {
      content = content.replace(/\s+$/, '')

      if (!content) {
        continue
      }

      started = true
    }

    const breaks = findBreaks(content)
    const lastBreak = breaks[breaks.length - 1]

    if (lastBreak) {
      parts.unshift(content.slice(lastBreak.end))
      return { start: cursor, head: content.slice(0, lastBreak.end), body: parts.join('') }
    }

    parts.unshift(content)
  }

  return { start: 0, head: null, body: parts.join('') }
}

/** collectParagraphBefore 的镜像：返回 { end, tail, body }，tail 保留段落分隔本身。 */
function collectParagraphAfter(list, index, processors) {
  const parts = []
  let started = false

  for (let cursor = index + 1; cursor < list.length; cursor++) {
    const node = list[cursor]

    if (node.type !== 'text') {
      if (BARRIER_TYPES.has(node.type)) {
        return { end: cursor - 1, tail: null, body: parts.join('') }
      }

      parts.push(serializeLatex([node], processors))
      started = true
      continue
    }

    let content = node.content ?? ''

    if (!started) {
      content = content.replace(/^\s+/, '')

      if (!content) {
        continue
      }

      started = true
    }

    const firstBreak = findBreaks(content)[0]

    if (firstBreak) {
      parts.push(content.slice(0, firstBreak.start))
      return { end: cursor, tail: content.slice(firstBreak.start), body: parts.join('') }
    }

    parts.push(content)
  }

  return { end: list.length - 1, tail: null, body: parts.join('') }
}

let layoutNodeCount = 0

function layoutTextNode(content, id) {
  return createTextNode(content, `${id}_layout_${++layoutNodeCount}`)
}

/** 图文组之后若紧跟同段文字，补一个空行分段：\textfigure 结束时不会自动 \par。 */
function separateFollowing(list, fromIndex) {
  const next = list[fromIndex]

  if (!next || next.type !== 'text') {
    return list
  }

  const content = next.content ?? ''

  if (!content.trim() || /^[ \t]*\n[ \t]*\n/.test(content)) {
    return list
  }

  const nextList = [...list]
  nextList[fromIndex] = { ...next, content: `\n\n${content.replace(/^\s+/, '')}` }
  return nextList
}

/** 图栏占整行的比例：左右方位为行宽减去文字栏和间隔，上下方位为整行。 */
export function getTextFigureColumnRatio(options = {}) {
  const { side, ratio } = getTextFigureLayout(options)
  return side === 'left' || side === 'right' ? Math.max(0, 1 - ratio - TEXT_FIGURE_GAP_RATIO) : 1
}

function relativeWidthRatio(options = {}) {
  const width = parseLatexLength(options.width)
  return width.kind === 'relative' || width.kind === 'percent' ? Number.parseFloat(width.css) / 100 : null
}

function formatColumnWidth(columnShare) {
  return columnShare >= FULL_COLUMN_THRESHOLD ? '\\linewidth' : formatWidthAsLinewidth(columnShare * 100)
}

/** 由图片原来占整行的比例推出文字栏比例，并把图片宽度换算为占图栏的比例，保持图片大小不变。 */
function prepareFigure(imageNode) {
  const options = { ...(imageNode.options || {}) }
  const widthRatio = relativeWidthRatio(options)
  let ratio = TEXT_FIGURE_DEFAULT_RATIO

  if (widthRatio !== null) {
    const steppedRatio = Math.round((1 - widthRatio - TEXT_FIGURE_GAP_RATIO) * 20) / 20
    ratio = Math.min(0.75, Math.max(0.5, steppedRatio))
    options.width = formatColumnWidth(Math.min(1, widthRatio / (1 - ratio - TEXT_FIGURE_GAP_RATIO)))
    delete options.height
  } else if (!options.width && !options.height) {
    options.width = '\\linewidth'
  }

  return { image: { ...imageNode, options, alignment: 'default', original: undefined }, ratio }
}

function textFigureParts(node, processors) {
  const [textNodes = [], figureNodes = []] = node.items || []

  return {
    text: serializeLatex(textNodes, processors),
    figure: serializeLatex(figureNodes, processors),
    textNodes,
  }
}

function rebuildTextFigure(node, text, processors) {
  const { figure } = textFigureParts(node, processors)
  return buildTextFigureLatex(formatTextFigureOptionBlock(node), text, figure)
}

/** 把图片与其前一段（前面没有内容时取后一段）合并为 \textfigure，返回新列表或 null。 */
export function wrapImageInList(list, index, { side = 'right', processors = [] } = {}) {
  const imageNode = list[index]

  if (imageNode?.type !== 'image') {
    return null
  }

  const { image, ratio } = prepareFigure(imageNode)
  const figure = serializeLatex([image], processors)
  const optionBlock = formatTextFigureOptionBlock({
    options: { 'fig-pos': SIDE_POSITIONS[side]?.top || SIDE_POSITIONS.right.top, 'text-ratio': String(ratio) },
  })
  const before = collectParagraphBefore(list, index, processors)

  if (before.body.trim()) {
    const textFigure = layoutTextNode(buildTextFigureLatex(optionBlock, before.body, figure), imageNode.id)
    const head = before.head !== null ? [layoutTextNode(before.head, imageNode.id)] : []
    const nextList = [...list.slice(0, before.start), ...head, textFigure, ...list.slice(index + 1)]

    return separateFollowing(nextList, before.start + head.length + 1)
  }

  const after = collectParagraphAfter(list, index, processors)

  if (!after.body.trim()) {
    return null
  }

  const textFigure = layoutTextNode(buildTextFigureLatex(optionBlock, after.body, figure), imageNode.id)
  const tail = after.tail !== null ? [layoutTextNode(after.tail, imageNode.id)] : []

  return [...list.slice(0, index), textFigure, ...tail, ...list.slice(after.end + 1)]
}

/** 图栏中的相对宽度换算回整行宽度，拆开后图片大小不变。 */
function unwrapImage(imageNode, columnRatio) {
  const options = { ...(imageNode.options || {}) }
  const widthRatio = relativeWidthRatio(options)

  if (widthRatio !== null && columnRatio < 1) {
    options.width = formatWidthAsLinewidth(widthRatio * columnRatio * 100)
  }

  return { ...imageNode, options, alignment: 'center', original: undefined }
}

/** 拆回原样：文字在前、图片居中独占一行（图在左/上时图片在前）。 */
export function unwrapTextFigureInList(list, index, { processors = [] } = {}) {
  const node = list[index]

  if (node?.type !== 'textfigure') {
    return null
  }

  const { text } = textFigureParts(node, processors)
  const [, figureNodes = []] = node.items || []
  const visibleFigureNodes = figureNodes.filter((child) => child.type !== 'text' || (child.content ?? '').trim())
  const figure = visibleFigureNodes.length === 1 && visibleFigureNodes[0].type === 'image'
    ? serializeLatex([unwrapImage(visibleFigureNodes[0], getTextFigureColumnRatio(node.options))], processors)
    : `\\begin{center}\n${serializeLatex(figureNodes, processors).trim()}\n\\end{center}`
  const { side } = getTextFigureLayout(node.options)
  const blocks = side === 'left' || side === 'top' ? [figure, text.trim()] : [text.trim(), figure]

  return [
    ...list.slice(0, index),
    layoutTextNode(blocks.filter(Boolean).join('\n'), node.id),
    ...list.slice(index + 1),
  ]
}

/** 调整文字栏范围：并入前/后一段，或把文字栏的首/末段移出。 */
export function adjustTextFigureInList(list, index, action, { processors = [] } = {}) {
  const node = list[index]

  if (node?.type !== 'textfigure') {
    return null
  }

  const { text, textNodes } = textFigureParts(node, processors)

  if (action === 'expand-before') {
    const before = collectParagraphBefore(list, index, processors)

    if (!before.body.trim()) return null

    const head = before.head !== null ? [layoutTextNode(before.head, node.id)] : []
    const merged = layoutTextNode(rebuildTextFigure(node, `${before.body.trim()}\n\n${text.trim()}`, processors), node.id)

    return [...list.slice(0, before.start), ...head, merged, ...list.slice(index + 1)]
  }

  if (action === 'expand-after') {
    const after = collectParagraphAfter(list, index, processors)

    if (!after.body.trim()) return null

    const tail = after.tail !== null ? [layoutTextNode(after.tail, node.id)] : []
    const merged = layoutTextNode(rebuildTextFigure(node, `${text.trim()}\n\n${after.body.trim()}`, processors), node.id)

    return [...list.slice(0, index), merged, ...tail, ...list.slice(after.end + 1)]
  }

  if (action === 'shrink-first') {
    const first = collectParagraphAfter(textNodes, -1, processors)
    const rest = `${first.tail ?? ''}${serializeLatex(textNodes.slice(first.end + 1), processors)}`

    if (!first.body.trim() || !rest.trim()) return null

    return [
      ...list.slice(0, index),
      layoutTextNode(`${first.body.trim()}\n\n`, node.id),
      layoutTextNode(rebuildTextFigure(node, rest, processors), node.id),
      ...list.slice(index + 1),
    ]
  }

  if (action === 'shrink-last') {
    const last = collectParagraphBefore(textNodes, textNodes.length, processors)
    const rest = `${serializeLatex(textNodes.slice(0, last.start), processors)}${last.head ?? ''}`

    if (!last.body.trim() || !rest.trim()) return null

    return separateFollowing([
      ...list.slice(0, index),
      layoutTextNode(rebuildTextFigure(node, rest, processors), node.id),
      layoutTextNode(`\n\n${last.body.trim()}`, node.id),
      ...list.slice(index + 1),
    ], index + 2)
  }

  return null
}

export function canWrapImage(nodes, imageId) {
  const ancestors = findNodeAncestors(nodes, imageId)
  return Boolean(ancestors) && ancestors.every((ancestor) => WRAPPABLE_ANCESTOR_TYPES.has(ancestor.type))
}

/** 在整棵节点树上执行图文组的结构性编辑；不可执行时返回 null。 */
export function applyTextFigureEdit(nodes, targetId, edit, processors = []) {
  if (edit.type === 'wrap' && !canWrapImage(nodes, targetId)) {
    return null
  }

  let applied = false
  const nextNodes = transformNodeListDeep(nodes, targetId, (list, index) => {
    let nextList = null

    if (edit.type === 'wrap') nextList = wrapImageInList(list, index, { side: edit.side, processors })
    else if (edit.type === 'unwrap') nextList = unwrapTextFigureInList(list, index, { processors })
    else if (edit.type === 'adjust') nextList = adjustTextFigureInList(list, index, edit.action, { processors })

    applied = Boolean(nextList)
    return nextList
  })

  return applied ? nextNodes : null
}
