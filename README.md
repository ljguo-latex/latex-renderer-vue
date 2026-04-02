# latex-renderer-vue

A Vue 3 LaTeX renderer component with extensible block processors and inline command handlers.

This repository is set up for direct GitHub installation in Vue 3 + Vite projects.

## What It Supports

- MathJax text rendering
- `\includegraphics[...]` image blocks with optional in-place editing
- `choices` environment rendering
- `enumerate` environment rendering with label template mapping
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

## Basic Usage

```vue
<script setup>
import { ref } from 'vue'
import LatexRenderer from 'latex-renderer-vue'

const latex = ref(String.raw`
这是公式：$E=mc^2$
\includegraphics[width=5cm]{/image.png}
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

Emits:

- `update:modelValue`

### Named Exports

- `LatexRenderer`
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

- `\blank`
- `\blank{}`
- `\paren`
- `\paren{}`

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
```

The demo page lives in `src/views/HomeView.vue`.
