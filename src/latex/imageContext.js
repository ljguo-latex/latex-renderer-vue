export const IMAGE_SRC_RESOLVER_KEY = Symbol('image-src-resolver')
export const IMAGE_REPLACER_KEY = Symbol('image-replacer')

export const IDENTITY_IMAGE_SRC_RESOLVER = ({ src }) => src

export const IMAGE_EDITOR_KEY = Symbol('image-editor')
export const IMAGE_ENHANCER_KEY = Symbol('image-enhancer')

// Keep relative image widths stable while choices switch between 1, 2 and 4 columns.
export const CHOICE_IMAGE_WIDTH_KEY = Symbol('choice-image-width')
