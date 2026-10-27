export const IMAGE_SRC_RESOLVER_KEY = Symbol('image-src-resolver')
export const IMAGE_REPLACER_KEY = Symbol('image-replacer')

export const IDENTITY_IMAGE_SRC_RESOLVER = ({ src }) => src

export const IMAGE_EDITOR_KEY = Symbol('image-editor')
export const IMAGE_ENHANCER_KEY = Symbol('image-enhancer')

// Keep relative image widths stable while choices switch between 1, 2 and 4 columns.
export const CHOICE_IMAGE_WIDTH_KEY = Symbol('choice-image-width')

// LatexRenderer 提供的结构性编辑入口：把图片包成图文组、拆分与调整文字栏范围
export const LAYOUT_EDITOR_KEY = Symbol('layout-editor')
// 图文组的图栏提供给其中图片的版式上下文（文字栏内为 null）
export const TEXT_FIGURE_SLOT_KEY = Symbol('text-figure-slot')
