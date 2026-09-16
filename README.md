# latex-renderer-vue

A Vue 3 LaTeX renderer component library with extensible block processors and inline command handlers.

This repository now uses a real library build:

- source entry: `src/index.js`
- package entry: `dist/index.js`
- CommonJS entry: `dist/index.cjs`
- demo entry: `examples/main.js`
- Git installs build the package through `prepare`

## What It Supports

- MathJax text rendering
- `\includegraphics[...]` image blocks with optional in-place editing and `\linewidth` / `\textwidth` relative widths
- `choices` environment rendering
- `enumerate` environment rendering with label template mapping
- `\vspace{...}` vertical spacing and `\hspace{...}` inline spacing
- `\textcolor{...}{...}`, `\color{...}{...}`, and grouped `{\color{...} ...}` inline text color commands
- Inline business commands such as `\blank` and `\paren`
- Custom processors and custom inline command handlers

## Install From GitHub

```sh
pnpm add github:<your-github-name>/latex-renderer-vue
```

If your project uses npm:

```sh
npm install github:<your-github-name>/latex-renderer-vue
```

The Git dependency will run `prepare`, generate `dist/`, and then expose the compiled package entry.

## Basic Usage

```vue
<script setup>
import { ref } from 'vue'
import LatexRenderer from 'latex-renderer-vue'

const latex = ref(String.raw`
这是公式：$E=mc^2$
\includegraphics[width=5cm]{/path/to/image.png}
\begin{choices}
\item $x^2$
\item $x^3$
\item $\sqrt{x}$
\item $\frac{1}{x}$
\end{choices}
`)
</script>

<template>
  <LatexRenderer v-model="latex" :editable-images="true" />
</template>
```

Readonly rendering:

```vue
<template>
  <LatexRenderer :model-value="latex" />
</template>
```

## Public API

### Component

`LatexRenderer` props:

- `modelValue?: string`
- `editableImages?: boolean`
- `processors?: Array`
- `inlineCommands?: Record<string, { name: string, component: Component }>`
- `imageSrcResolver?: ({ src, node }) => string | Promise<string>`

Emits:

- `update:modelValue`

Image source resolution example:

```vue
<script setup>
import LatexRenderer from 'latex-renderer-vue'

function imageSrcResolver({ src }) {
  if (src.startsWith('app/')) {
    return `https://your-oss.example.com/${src}`
  }

  return src
}
</script>

<template>
  <LatexRenderer
    :model-value="latex"
    :image-src-resolver="imageSrcResolver"
  />
</template>
```

### Colors and typography

The renderer inherits text color from its parent. Set `color` on a wrapper or
pass a standard `class` / `style` to `LatexRenderer`. Text, math, list labels,
brackets, blank underlines, and circled numbers follow that color; borders and
image editing accents use `currentColor`. Explicit LaTeX color commands such as
`\textcolor{red}{...}` and `\color{blue}` retain their specified colors, including
nested text and formulas.

```vue
<template>
  <div style="color: #182025">
    <LatexRenderer :model-value="latex" />
  </div>
</template>
```

The `theme` prop and its color variables have been removed. Migrate `theme.color`
and `theme.textColor` to CSS `color`, and `theme.fontFamily` / `theme.fontSize` to
CSS `font-family` / `font-size`. The existing `--latex-renderer-font-family` and
`--latex-renderer-font-size` CSS variables remain available.

### MathJax loading

MathJax is loaded on demand from the pinned MathJax **4.1.3** CDN distribution,
with matching pinned STIX2 and chemistry font resources.
Multiple renderer instances share one loading promise. Initialization waits for
`startup.promise`, times out after 30 seconds, and allows a later load to retry
if loading fails. Failed scripts created by this library are removed; host-owned
scripts and configuration are never removed or overwritten.

For application-wide configuration, call `configureMathJax()` **before** mounting
any renderer or calling `loadMathJax()`:

```js
import { configureMathJax, loadMathJax } from 'latex-renderer-vue'

configureMathJax({
  // Optional: use your own complete MathJax 4 distribution.
  // src: '/vendor/mathjax/tex-chtml.js',
  timeout: 30000,
  config: {
    tex: {
      macros: { RR: '\\mathbb{R}' },
      packages: { '[+]': ['bbox'] },
    },
    loader: { load: ['[tex]/bbox'] },
  },
})

// Optional preloading. Without this call, the first formula triggers loading.
await loadMathJax()
```

- `src`: script URL; defaults to
  `https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js`.
- `timeout`: positive startup timeout in milliseconds; defaults to `30000`.
- `config`: MathJax configuration. Objects are merged recursively, including
  custom macros. `loader.load` and `tex.packages['[+]']` extend built-in lists;
  other arrays replace defaults. `startup.typeset` is always `false` for a
  library-owned runtime, so only component containers are typeset.
- Configuration is locked after the first browser-side loading attempt, including
  a failed attempt. To retry loading, call `loadMathJax()` again; a new render or
  content update also retries. No automatic retry loop runs in the background.
- If the page already has `window.MathJax` or a recognized MathJax script, the
  library waits for and reuses it. A host configuration alone does **not** cause
  this library to inject a script: the host must load its runtime. Use
  `id="mathjax-script"` to identify a host script with a custom filename.
- Reused runtimes keep the host's configuration, including its automatic
  typesetting policy. `configureMathJax().config` is only applied to a runtime
  loaded by this library. The host is responsible for required extensions and
  macros such as `enclose`, `html`, `color`, `blank`, `paren`, and `circled`.
- Self-hosting requires the distribution's extensions and font resources as well
  as the entry script. Configure their paths as needed; copying only
  `tex-chtml.js` is not enough for an offline deployment.

Rendering batches pending containers, coalesces updates to the same container,
and clears old MathJax records before replacing content or unmounting. A rendering
failure falls back to the original LaTeX text. `loadMathJax()` returns `null`
during SSR; actual typesetting occurs in the browser.

### Waiting before measuring or printing

Use `waitForMathJax(root)` after changing renderer content and before measuring,
exporting, or printing the DOM. It waits for Vue updates and the latest component
render requests within `root` (the whole document when omitted), including edits
queued while it is waiting. A failed current render rejects the promise. Removed
components and superseded requests do not block it. A subtree without formula
components resolves without loading MathJax.

```js
import { waitForMathJax } from 'latex-renderer-vue'

await waitForMathJax(previewElement)
await document.fonts.ready
// Wait for images separately, then measure or print previewElement.
```

`loadMathJax()` only waits for the engine to initialize. Neither it nor
`mathJax.typesetPromise([])` waits for component work that has not yet reached
MathJax's own queue. Use the renderer-level wait above for layout-sensitive work.
Call it again after subsequent edits; it does not freeze the document.

### Named Exports

- `LatexRenderer`
- `configureMathJax`
- `loadMathJax`
- `waitForMathJax`
- `parseLatex`
- `serializeLatex`
- `replaceNode`
- `defaultProcessors`
- `createProcessorRegistry`
- `textProcessor`
- `inlineCommandHandlers`
- `normalizeInlineNode`

## Extending Block Processors

Each block processor can provide:

```js
{
  type: 'choices',
  priority: 10,
  block: true,
  component: ChoicesNode,
  find(input, from) {},
  parse(match, context) {},
  serialize(node) {},
  isEditable(context) {},
}
```

Then pass a custom processor list:

```vue
<script setup>
import LatexRenderer, { defaultProcessors } from 'latex-renderer-vue'
import { myProcessor } from './myProcessor'

const processors = [...defaultProcessors, myProcessor]
</script>

<template>
  <LatexRenderer :model-value="latex" :processors="processors" />
</template>
```

## Extending Inline Commands

Inline commands are parsed into `{ type, name, param, raw }`.

Current built-in commands:

- `\blank`, `\blank{}`
- `\paren`, `\paren{}`
- `\circled{...}`
- `\hspace{...}`
- `\textcolor{...}{...}`, `\color{...}{...}`, `{\color{...} ...}`
- `\textbf{...}`, `\textit{...}`, `\emph{...}`
- `\underline{...}`, `\uline{...}`, `\uwave{...}`, `\sout{...}`, `\overline{...}`
- `\texttt{...}`, `\textrm{...}`, `\textsf{...}`
- `\textsuperscript{...}`, `\textsubscript{...}`

Text-mode typography is normalized for preview: `~` (non-breaking space),
`\quad` / `\qquad` / `\enspace` / `\,` / `\;` (spacing), `\ldots` / `\dots`
(ellipsis), `\newline` (line break), and escaped braces `\{` `\}` render as
literal braces. Bare groups `{...}` are transparent, matching LaTeX scoping
semantics.

### Nested Commands

Wrapping commands (`\textcolor`, `\textbf`, `\textit`, …) are parsed recursively —
their argument body is re-fed through the same inline-command pipeline. This means
`\textcolor{pink}{\textbf{xxx}}`, `\textbf{\textit{x}}`, or any deeper combination
composes automatically, as long as every command in the chain has a handler
registered. Unknown commands fall through to their raw literal, so you can drop
them in as needed.

To extend them in your own project:

```vue
<script setup>
import LatexRenderer, { inlineCommandHandlers } from 'latex-renderer-vue'
import MyCommand from './MyCommand.vue'

const nextInlineCommands = {
  ...inlineCommandHandlers,
  keyword: {
    name: 'keyword',
    component: MyCommand,
  },
}
</script>

<template>
  <LatexRenderer :model-value="latex" :inline-commands="nextInlineCommands" />
</template>
```

If you only need the handler object:

```js
import { inlineCommandHandlers } from 'latex-renderer-vue'

const nextInlineCommands = {
  ...inlineCommandHandlers,
  keyword: {
    name: 'keyword',
    component: MyCommand,
  },
}
```

## Development

```sh
pnpm install
pnpm dev
pnpm build
pnpm build:demo
```

- `pnpm build` builds the package library
- `pnpm build:demo` builds the local demo page
- the demo page lives in `examples/App.vue`
