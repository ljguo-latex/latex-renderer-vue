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

export interface Theme {
  color?: string
  textColor?: string
  fontFamily?: string
  fontSize?: string
}

export interface LatexRendererProps {
  modelValue?: string
  editableImages?: boolean
  processors?: Processor[]
  inlineCommands?: InlineCommandHandlers
  imageSrcResolver?: ImageSrcResolver
  theme?: Theme
}

export interface LatexRendererEmits {
  (event: 'update:modelValue', value: string): void
}

export const LatexRenderer: DefineComponent<LatexRendererProps, {}, {}, {}, {}, {}, {}, LatexRendererEmits>

export function loadMathJax(): Promise<unknown>

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

export default LatexRenderer
