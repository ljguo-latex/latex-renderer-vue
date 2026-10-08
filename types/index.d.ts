import type { Component, DefineComponent, InjectionKey, Ref } from 'vue'

/* ============================================================
 * Node shapes produced by parseLatex
 * ============================================================ */

export interface TextNode {
  id: string
  type: 'text'
  content: string
  previewContent?: string
}

export interface ImageAlignmentMap {
  default: 'default'
  left: 'left'
  center: 'center'
  right: 'right'
}

export type ImageAlignment = keyof ImageAlignmentMap

export interface ImageNode {
  id: string
  type: 'image'
  src: string
  options: Record<string, string | true>
  alignment: ImageAlignment
  original?: string
}

export interface CenterNode {
  id: string
  type: 'center'
  environmentName: 'center' | 'flushleft' | 'flushright'
  children: LatexNode[]
  original?: string
}

export interface VspaceNode {
  id: string
  type: 'vspace'
  starred: boolean
  lengthString: string
  length: LatexLength
  original?: string
}

export interface EnumerateOptions {
  label: string | null
}

export interface EnumerateNode {
  id: string
  type: 'enumerate'
  items: LatexNode[][]
  options: EnumerateOptions
  original?: string
}

export interface ChoicesNode {
  id: string
  type: 'choices'
  items: LatexNode[][]
  original?: string
}

export interface MinipageNode {
  id: string
  type: 'minipage'
  optionArgs: string[]
  widthString: string
  width: LatexLength
  alignment: ImageAlignment
  children: LatexNode[]
  original?: string
}

export interface TabularColumn {
  align: 'left' | 'center' | 'right'
  leftBorder: boolean
  rightBorder: boolean
  spec: string
}

export interface TabularCell {
  id: string
  content: string
  children: LatexNode[]
}

export interface TabularRow {
  id: string
  cells: TabularCell[]
  topBorder: boolean
  bottomBorder: boolean
}

export interface TabularNode {
  id: string
  type: 'tabular'
  optionString: string
  columnSpec: string
  columns: TabularColumn[]
  rows: TabularRow[]
  original?: string
}

export interface MathEnvironmentNode {
  id: string
  type: 'mathEnvironment'
  environmentName: string
  body: string
  optionString: string
  original?: string
}

export interface PinyinScopeNode {
  id: string
  type: 'pinyinscope'
  body: string
  optionString: string
  original?: string
}

export type LatexNode =
  | TextNode
  | ImageNode
  | CenterNode
  | VspaceNode
  | EnumerateNode
  | ChoicesNode
  | MinipageNode
  | TabularNode
  | MathEnvironmentNode
  | PinyinScopeNode

/* ============================================================
 * Length parsing
 * ============================================================ */

export interface LatexLength {
  raw: string
  css: string | null
  kind: 'fixed' | 'percent' | 'relative' | 'unknown'
}

/* ============================================================
 * Processor extension point
 * ============================================================ */

export interface ProcessorMatch {
  start: number
  end: number
  [key: string]: unknown
}

export interface ProcessorParseContext {
  id: string
  processors: Processor[]
}

export interface ProcessorSerializeContext {
  processors: Processor[]
}

export interface ProcessorIsEditableContext {
  editableImages: boolean
  node: LatexNode
}

export interface Processor<Node extends LatexNode = LatexNode> {
  name: string
  type: Node['type']
  component: Component
  priority?: number
  block?: boolean
  inlineBox?: boolean
  find?: (input: string, from: number) => ProcessorMatch | null
  parse?: (match: ProcessorMatch, context: ProcessorParseContext) => Node
  serialize?: (node: Node, context?: ProcessorSerializeContext) => string
  isEditable?: (context: ProcessorIsEditableContext) => boolean
}

/* ============================================================
 * Inline command extension point
 * ============================================================ */

export interface InlineCommandNode {
  id: string
  type: 'command'
  name: string
  starred: boolean
  param: string | null
  args: string[]
  raw: string
  start: number
  end: number
  context?: InlineContext
}

/** Immutable snapshots carried through commands; declarations return a new context. */
export interface InlineContext {
  pinyinOptions?: PinyinOptions
  [key: string]: unknown
}

export interface InlineCommandHandler {
  name: string
  component: Component
  args?: number
  minArgs?: number
  maxArgs?: number
  declarationGroup?: boolean
  declarationRest?: boolean
  toMath?: (node: InlineCommandNode) => string
  updateContext?: (context: InlineContext, node: InlineCommandNode) => InlineContext
}

export type InlineCommandHandlers = Record<string, InlineCommandHandler>

/* ============================================================
 * Public API
 * ============================================================ */

export interface ImageSrcResolverContext {
  src: string
  node: ImageNode
}

export type ImageSrcResolver = (context: ImageSrcResolverContext) => string | Promise<string>
export interface ImageReplacementContext extends ImageSrcResolverContext {
  file: File
}
/** The host owns preview, upload and persistence. Does not change LaTeX or image options. */
export type ImageReplacer = (context: ImageReplacementContext) => void | Promise<void>

export interface ImageEditorContext extends ImageSrcResolverContext { url: string }
/** Opens a host-owned image processing tool. Does not update LaTeX automatically. */
export type ImageEditor = (context: ImageEditorContext) => void | Promise<void>

export interface LatexRendererProps {
  modelValue?: string
  editableImages?: boolean
  processors?: Processor[]
  inlineCommands?: InlineCommandHandlers
  pinyinOptions?: PinyinOptions
  imageSrcResolver?: ImageSrcResolver
  imageReplacer?: ImageReplacer
  imageEditor?: ImageEditor
}

export interface LatexRendererEmits {
  (event: 'update:modelValue', value: string): void
}

export const LatexRenderer: DefineComponent<LatexRendererProps, {}, {}, {}, {}, {}, {}, LatexRendererEmits>

export interface MathJaxOptions {
  /** Pinned CDN URL by default; may point to a self-hosted MathJax 4 distribution. */
  src?: string
  /** Startup timeout in milliseconds. Default: 30000. */
  timeout?: number
  /** MathJax configuration merged with the built-in defaults before startup. */
  config?: Record<string, unknown>
}

export interface MathJaxInstance {
  typesetPromise(elements?: HTMLElement[]): Promise<unknown>
  typesetClear?(elements?: HTMLElement[]): void
  whenReady?(action: () => unknown): Promise<unknown>
  startup?: { promise?: Promise<unknown>; [key: string]: unknown }
  [key: string]: unknown
}

export function configureMathJax(options?: MathJaxOptions): void
export function loadMathJax(): Promise<MathJaxInstance | null>
/** Wait for current Vue updates and latest renders in root (the document by default).
 * Rejects if a current render failed. Does not wait for images or document fonts.
 */
export function waitForMathJax(root?: ParentNode): Promise<void>

export function parseLatex(input: string, processors?: Processor[]): LatexNode[]
export function serializeLatex(nodes: LatexNode[], processors?: Processor[]): string
export function replaceNode<T extends LatexNode>(nodes: LatexNode[], nextNode: T): LatexNode[]
export function replaceNodeDeep<T extends LatexNode>(nodes: LatexNode[], nextNode: T): LatexNode[]
export function prefixNodeIds(nodes: LatexNode[], prefix?: string): LatexNode[]

export function createProcessorRegistry(processors?: Processor[]): Map<string, Processor>
export const defaultProcessors: Processor[]
export const textProcessor: Processor<TextNode>

export const inlineCommandHandlers: InlineCommandHandlers
export function normalizeInlineNode(
  node: InlineCommandNode | TextNode,
  handlers?: InlineCommandHandlers,
): InlineCommandNode & { component: Component }

export const IMAGE_SRC_RESOLVER_KEY: InjectionKey<Ref<ImageSrcResolver>>

export interface PinyinOptions {
  /** Annotation size relative to the base text, from 0.2 to 1. Default: 0.65. */
  ratio?: number
  /** Uses the same validated CSS color syntax as textcolor. Default: #0284c7. */
  color?: string
  /** Include rp parentheses for browsers without ruby layout. Default: true. */
  fallback?: boolean
  /** Alignment of scope lines. Default: center. */
  align?: 'left' | 'center' | 'right'
}

export interface PinyinToken { text: string; pinyin?: string }
/** Returns one reading (or an empty string) per Unicode code point. */
export type PinyinResolver = (text: string) => string[]
export const DEFAULT_PINYIN_OPTIONS: Readonly<Required<PinyinOptions>>
export function resolvePinyinOptions(values?: PinyinOptions): Required<PinyinOptions>
export function createPinyinTokens(source?: string, resolver?: PinyinResolver): PinyinToken[]
export const pinyinScopeProcessor: Processor<PinyinScopeNode>
/** For a host-owned MathJax 4 runtime: call inside startup.ready before defaultReady. */
export function registerPinyinExtension(mathJax: object): void

export default LatexRenderer
