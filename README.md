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
- Native ruby annotations with `\pinyin`, `\xpinyinsetup`, and `pinyinscope`
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
- `pinyinOptions?: { ratio?: number, color?: string, fallback?: boolean, align?: 'left' | 'center' | 'right' }`
- `imageSrcResolver?: ({ src, node }) => string | Promise<string>`
- `imageReplacer?: ({ src, node, file }) => void | Promise<void>`: enables a “替换图片” file picker in editable image toolbars. The host owns validation, preview, upload and save timing. The renderer keeps the original LaTeX filename, width and alignment; replacement errors appear next to the image. Update `imageSrcResolver` to show a local preview or a versioned URL after saving. Omit this prop for existing behavior.

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
  // src: '/vendor/mathjax/tex-chtml-nofont.js',
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
  `https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml-nofont.js`.
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
- The default `-nofont` component avoids downloading bundled NewCM because the
  renderer explicitly uses STIX2. Self-hosting requires the distribution's
  extensions and STIX2 font resources as well as the entry script; copying only
  `tex-chtml-nofont.js` is not enough for an offline deployment.

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

### 汉字注音

正文、整段诗词和公式内部均可使用注音。自动读音由本地 npm 依赖
`pinyin-pro` 提供，不需要额外的拼音 CDN。手动指定读音优先于自动识别：

```tex
正文：\pinyin{音乐与快乐，中国 and (China)}
纠音：\pinyin{重(chóng)复，重(zhòng)量，重阳(yáng)}
组合：\textbf{\pinyin{长城}}

\xpinyinsetup{ratio=0.7,color=#0d9488,fallback=true}
\begin{pinyinscope}[align=left]
床前明月光
疑是地上霜

举头望明月\\
低头思故乡
\end{pinyinscope}

$E=mc^2 \implies \pinyin{质能方程}$
```

`pinyinOptions` 设置当前 `LatexRenderer` 实例的默认值：

```vue
<LatexRenderer
  :model-value="latex"
  :pinyin-options="{ ratio: 0.65, color: '#0284c7', fallback: true, align: 'center' }"
/>
```

| 选项 | 默认值 | 规则 |
| --- | --- | --- |
| `ratio` | `0.65` | 拼音相对汉字的字号；有效范围为 `0.2` 到 `1` |
| `color` | `#0284c7` | 沿用正文颜色校验；支持颜色名、十六进制、RGB/HSL；`inherit` 跟随汉字颜色 |
| `fallback` | `true` | 生成 `<rp>` 回退括号；不承诺剪贴板的复制格式 |
| `align` | `center` | 整段环境的行对齐；支持 `left`、`center`、`right` |

无效选项保留前一个有效值。正文中的 `\xpinyinsetup` 从声明位置起生效；
行内大括号、样式命令的参数和块环境形成局部作用域。公式里的声明只影响该公式。
同一列表环境中，某项的声明可传给后续项；表格单元格的声明保持局部。
修改源码会重新计算配置，不保留上一次渲染的声明，也不影响其他实例。

`\pinyin{...}` 的参数是纯文本，支持 `汉(hàn)` 形式的单字读音覆盖。
普通括号、中英文标点和未知字符保留；无法识别的汉字保持原字。
自动注音先处理去除手动标记后的完整文本，再覆盖指定读音，因此手动标记
不会切断词语上下文。整段环境按行处理，样式变化也不会切断该行的读音上下文。
多音字仍可能识别错误，教学材料应保留人工校对。

`pinyinscope` 的正文支持纯文本、手动读音、`\xpinyinsetup`、原始换行和
`\\`。保留内部空行；`\\` 后紧跟的物理换行视为同一次换行。
嵌套环境或参数内部的 LaTeX 样式命令不属于此 MVP 的注音语法。
跨越块节点的大括号不作为完整 TeX 分组解析。
需要加粗或着色时，把样式命令放在 `\pinyin` 外层。
这是本文约定的注音语法，不表示完整实现 LaTeX 的 `xpinyin` 宏包。

正文由 Vue 生成 ruby；公式通过 MathJax 4 的原生 `HtmlNode` 输出相同结构，
不会启用 `allowTexHTML` 或把用户文本作为 HTML 解析。默认验证目标为浏览器
CommonHTML 排版；SVG 导出、服务端数学排版和屏幕阅读器行为需另外验证。
打印或测量前仍应等待 `waitForMathJax(root)` 和 `document.fonts.ready`。

库自行加载 MathJax 时自动注册注音扩展。如果宿主自行加载 MathJax 4，
需要在宿主初始化时注册本地包；库不会事后改写宿主配置：

```js
import { registerPinyinExtension } from 'latex-renderer-vue'

window.MathJax = {
  tex: { packages: { '[+]': ['xpinyin-ruby'] } },
  startup: {
    ready() {
      registerPinyinExtension(window.MathJax)
      window.MathJax.startup.defaultReady()
    },
  },
}
// Then load the host's MathJax 4 TeX/CommonHTML browser component.
// Do not add [tex]/xpinyin-ruby to loader.load: this package is registered locally.
```

可单独复用注音模型，或传入项目自己的同步词典：

```js
import { createPinyinTokens } from 'latex-renderer-vue'

createPinyinTokens('音乐')
// [{ text: '音', pinyin: 'yīn' }, { text: '乐', pinyin: 'yuè' }]

// resolver 接收去掉手动注音标记的完整文本，返回每个 Unicode 字符的读音。
// 非汉字或未知字返回空字符串；数组长度不匹配会报错，避免读音错位。
createPinyinTokens('中(zhōng)国', text => ['zhōng', 'guó'])
```

维护入口：`src/latex/pinyin/` 负责文本模型、配置、整段解析和 DOM 构造；
`src/components/pinyin/PinyinText.vue` 负责 Vue 输出与共享 CSS；
`src/composables/mathJaxPinyin.js` 集中封装 MathJax 内部 API。
行内命令和整段环境沿用现有注册表，配置通过通用的行内上下文传递，
不使用全局可变配置。原始源码及序列化不包含预览配置快照。

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
- `createPinyinTokens`
- `DEFAULT_PINYIN_OPTIONS`
- `resolvePinyinOptions`
- `pinyinScopeProcessor`
- `registerPinyinExtension`

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

声明型命令可以实现 `updateContext(context, node)`，返回新的上下文快照。
后续节点获得 `node.context`；递归渲染的命令应把该上下文传给
`InlineChildren`。不要原地修改上下文，否则会影响前面节点的配置。

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

### Image processing toolbar

Pass `imageEditor({ src, node, url })` with `editableImages` to show the optional
“抠图 / 线稿” action. `src` is the original LaTeX key and `url` is the resolved
preview URL. The host opens its processing UI and owns pending files, upload
and persistence. No callback is invoked in read-only mode.
