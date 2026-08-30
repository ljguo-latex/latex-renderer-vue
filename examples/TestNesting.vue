<script setup>
import { computed, ref, watch } from 'vue'
import { LatexRenderer, defaultProcessors, inlineCommandHandlers, parseLatex, serializeLatex } from '../src/index.js'
import { parseInlineContent } from '../src/latex/inline/core.js'
import { parseLatexLength } from '../src/latex/length.js'
import testImageSrc from './assets/image.png'

const CASE_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四']
const TEST_CASE_HEADING_PATTERN = /^测试用例\s+[^：:\n]+[：:]\s*(.*)$/gm

const testNesting = ref(String.raw`

帆船比赛中, 运动员可借助风力计测定风速的大小与方向, 测出的结果在航海学中称为视风风速, 视风风速对应的向量是真风风速对应的向量与船行风速对应的向量之和, 其中船行风速对应的向量与船速对应的向量大小相等, 方向相反.
图1给出了部分风力等级, 名称与风速大小的对应关系.
已知某帆船运动员在某时刻测得的视风风速对应的向量与船速对应的向量如图2所示(线段长度代表速度大小, 单位: $\mathrm{m/s}$), 则该时刻的真风为\paren{}.
\begin{center}
\begin{minipage}[t]{0.62\linewidth}
    \centering
    \begin{tabular}{|c|c|c|}
        \hline
        级数 & 名称 & 风速大小（单位：$\mathrm{m/s}$） \\
        \hline
        2 & 轻风 & $1.6\sim3.3$ \\
        \hline
        3 & 微风 & $3.4\sim5.4$ \\
        \hline
        4 & 和风 & $5.5\sim7.9$ \\
        \hline
        5 & 劲风 & $8.0\sim10.7$ \\
        \hline
    \end{tabular}
\end{minipage}
\hfill
\begin{minipage}[t]{0.32\linewidth}
    \centering
    \includegraphics[
        keepaspectratio,
        width=\linewidth
    ]{fantastic_idea_latex_ead907b18d2f23c302bae18f4423245b829a788c12483af459f690c97d5fceb2.png}
\end{minipage}
\end{center}


\begin{choices}
  \item 轻风
  \item 微风
  \item 和风
  \item 劲风
\end{choices}




测试：Enumerate 和 Choices 嵌套支持


水的化学式为 $\ce{H2O}$。在通电条件下，水会分解生成氢气和氧气：\paren{}


下列事实不能用勒夏特列原理解释的是 \paren{}

$$
\ce{2H2O(l) ->[\text{通电}] 2H2(g) ^ + O2(g) ^}
$$

硫酸钠与氯化钡反应会生成硫酸钡沉淀：

$$
\ce{Na2SO4(aq) + BaCl2(aq) -> BaSO4(s) v + 2NaCl(aq)}
$$

对应的离子方程式为：

$$
\ce{Ba^2+(aq) + SO4^2-(aq) -> BaSO4(s) v}
$$

实验温度为 $\pu{25 °C}$，加入的氯化钡溶液体积为 $\pu{10 mL}$，浓度为 $\pu{0.1 mol/L}$。


$q = \paren{}$

\textcolor{red}{\textbf{test}}
\textbf{\textcolor{red}{{test}}}


$a = \blank{} \text{m/s}^{2}$

$q = \blank{}$

将已知等式两边分别平方可得:
\begin{equation*}
|\vec{a} + 2\vec{b}|^2 = |\vec{a}|^2 + 4\vec{a} \cdot \vec{b} + 4|\vec{b}|^2 = 25 \quad \text{\circled{1}}
\end{equation*}
\begin{equation*}
|\vec{a} - 2\vec{b}|^2 = |\vec{a}|^2 - 4\vec{a} \cdot \vec{b} + 4|\vec{b}|^2 = 9 \quad \text{\circled{2}}
\end{equation*}
两式相减 \circled{1} - \circled{2} 可得:
\begin{equation*}
8\vec{a} \cdot \vec{b} = 16
\end{equation*}
所以 $\vec{a} \cdot \vec{b} = 2$.
故选 B.

测试用例 0：常见数学环境
\begin{equation}
E = mc^2
\end{equation}

\begin{equation*}
\int_0^1 x^2\,dx = \frac{1}{3}
\end{equation*}

\begin{align}
f(x) &= x^2 - 4x + 1 \\
f'(x) &= 2x - 4
\end{align}

\begin{align*}
a^2 + b^2 &= c^2 \\
(a+b)^2 &= a^2 + 2ab + b^2
\end{align*}

\begin{alignat*}{2}
x &= 1, \qquad & y &= 2 \\
u &= 3,        & v &= 4
\end{alignat*}

\begin{gather}
x + y = 1 \\
2x - y = 3
\end{gather}

\begin{multline*}
S = a_1 + a_2 + a_3 + a_4 + a_5 \\
+ a_6 + a_7 + a_8 + a_9 + a_{10}
\end{multline*}

\begin{equation*}
\begin{cases}
x + y = 1, \\
x - y = 3.
\end{cases}
\end{equation*}

测试用例 0.5：行内 left/right 包裹 array
$\left\{ \begin{array}{l}x = 1\\ y = 0 \end{array} \right.$


\begin{center}
aaaa
\end{center}

\begin{flushleft}
aaaa
\end{flushleft}

\begin{flushright}
aaaa
\end{flushright}
测试用例 0.6：center 包裹 tabular
\begin{center}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline
月份 & 1 & 2 & 3 & 4 & 5 & 6 \\
\hline
比去年同月增长/\% & $-1.8$ & $0$ & $0.2$ & $-1.5$ & $0.3$ & $0.4$ \\
\hline
\end{tabular}
\end{center}

测试用例 0.7：center 内并排 minipage、centering、hfill 和图注换行
\begin{center}
    \begin{minipage}{.49\linewidth}
        \centering
        \includegraphics[width=.5\linewidth]{image.png}\\
        图1
    \end{minipage}%
    \hfill
    \begin{minipage}{.49\linewidth}
        \centering
        \includegraphics[width=.5\linewidth]{image.png}\\
        图2
    \end{minipage}
\end{center}

测试用例 0.8：includegraphics 支持 keepaspectratio 和 linewidth 宽度
\includegraphics[keepaspectratio,width=0.432\linewidth]{image.png}

测试用例 1：Enumerate 嵌套 Choices
\begin{enumerate}
\item 第一题的题干
\begin{choices}
\item A选项
\item B选项
\item C选项
\end{choices}
\item 第二题的题干
\begin{choices}
\item D选项
\item E选项
\end{choices}
\end{enumerate}

a $a=\paren{}$

a $a=\blank{}$

aa=\blank{}

诗词是中华文化的瑰宝, 蕴含着丰富的文学内涵和美学价值.  某学校为了培养学生学习诗词的兴趣, 特别组织了一次关于诗词的知识竞赛, 竞赛分为初赛和决赛, 初赛通过后才能参加决赛.

\begin{enumerate}[label = (\arabic*)]
    \item 初赛采用选一题答一题的方式, 每位参赛学生最多有 5 次答题机会, 累计答对 3 道题或答错 3 道题即终止比赛, 答对 3 道题则进入决赛, 答错 3 道题则被淘汰.  已知学生甲答对每道题的概率均为 $\frac { 2 } { 3 }$, 且回答各题的结果相互独立.
    \begin{enumerate}[label = (\roman*)]
        \item 求甲至多回答了 4 道题被淘汰的概率; 
        \item 设甲在初赛答题的道数为 $X$, 求 $X$ 的分布列和数学期望.
    \end{enumerate}
    \item 决赛共答 3 道题, 若答对题目数量不少于 2 道, 则胜出.  已知学生甲进入了决赛, 他在决赛中前 2 道题答对的概率相等, 均为 $x$ ($0 < x < 1$), 3 道题全答对的概率为 $\frac { 1 } { 8 }$, 且回答各题的结果相互独立, 设他恰好答对 2 道题目胜出的概率为 $f ( x )$, 求 $f ( x )$ 的最小值.
\end{enumerate}


aa=\paren{}


测试用例 1.5：\circled{} 圆圈数字

aaa \circled{1}


\begin{align}
    adsa &= rhs \\

    \circled{1}
\end{align}

非数学模式：选 \circled{1}，答案是 \circled{2}，参考 \circled{3}\circled{4}\circled{5}。
行内数学模式：$y = \circled{1} \cdot x + \circled{2}$，$f(\circled{3}) = \circled{4}$
另一种行内数学模式：\(S_\circled{1} + S_\circled{2} = S_\circled{3}\)
块级数学模式：
$$
\circled{1} \to \circled{2} \to \circled{3}
$$
混合多位数字：\circled{10}，\circled{99}，$a_\circled{12} + b_\circled{34}$


测试用例 2：向后兼容性（简单列表）
\begin{enumerate}
\item 简单的文本项
\item 另一个简单项
\item 第三个简单项
\end{enumerate}

测试用例 3：混合内容
\begin{enumerate}
\item 题干文本在前
\begin{choices}
\item 选项1
\item 选项2
\end{choices}
后面还有文本
\item 纯文本项
\item 另一个题干
\begin{choices}
\item 选项A
\item 选项B
\item 选项C
\item 选项D
\end{choices}
\end{enumerate}

测试用例 4：Minipage 百分比和固定长度并排
\begin{minipage}{48%}
左侧百分比宽度，包含行内数学 $a^2+b^2=c^2$。
\begin{enumerate}
\item 左侧列表第一项
\item 左侧列表第二项
\end{enumerate}
\end{minipage}
\begin{minipage}{6cm}
右侧固定长度 6cm。
\begin{choices}
\item 固定宽度选项 A
\item 固定宽度选项 B
\end{choices}
\end{minipage}

测试用例 5：Minipage 支持 textwidth / linewidth 相对宽度
\begin{minipage}{0.5\textwidth}
0.5\textwidth 应渲染为 50%。
\end{minipage}
\begin{minipage}{.35\linewidth}
.35\linewidth 应渲染为 35%。
\end{minipage}

测试用例 6：Minipage 嵌套 Minipage
\begin{minipage}[t]{90%}
外层 minipage，带可选参数 [t]。
\begin{minipage}{45%}
内层左侧，固定在外层宽度内。
\end{minipage}
\begin{minipage}{45%}
内层右侧，包含嵌套 choices。
\begin{choices}
\item 内层选项一
\item 内层选项二
\item 内层选项三
\end{choices}
\end{minipage}
\end{minipage}

测试用例 7：Enumerate 中嵌套 Minipage
\begin{enumerate}
\item 题干中的两个小栏：
\begin{minipage}{42%}
第一栏内容 $x=1$。
\end{minipage}
\begin{minipage}{42%}
第二栏内容 $y=2$。
\end{minipage}
\item 后续普通题目保持原样。
\end{enumerate}

测试用例 8：间距命令
左侧\hspace{1.5em}右侧，星号左侧\hspace*{2em}星号右侧。
\vspace{0.4em}
\vspace*{1em}
间距后续文本。

测试用例 9：颜色命令
\textcolor{red}{红色文本}，\color{blue}{蓝色文本}，{\color{green} 绿色分组文本}。
颜色内嵌命令：\textcolor{#cc3300}{答案是 \paren{}，序号 \circled{7}}。
\color{purple}紫色声明文本。`)

const parsedNodes = computed(() => parseLatex(testNesting.value, defaultProcessors))

const testCaseSections = ref([])

watch(
  testNesting,
  (newVal) => {
    const reconstructed = testCaseSections.value
      .map((s) => (s.header ? `${s.header}\n${s.latex}` : s.latex))
      .join('\n\n')
    if (newVal !== reconstructed) {
      testCaseSections.value = splitTestCases(newVal)
    }
  },
  { immediate: true },
)

function handleCaseUpdate(index, newLatex) {
  testCaseSections.value[index].latex = newLatex
  testNesting.value = testCaseSections.value
    .map((s) => (s.header ? `${s.header}\n${s.latex}` : s.latex))
    .join('\n\n')
}

function imageSrcResolver({ src }) {
  return src === 'image.png' ? testImageSrc : src
}

function formatCaseTitle(index, title) {
  return `用例${CASE_NUMERALS[index] || index + 1}，${title || '基础内容'}`
}

function splitTestCases(latex = '') {
  const sections = []
  const pattern = new RegExp(TEST_CASE_HEADING_PATTERN)
  let cursor = 0
  let nextTitle = '基础推导与行内命令'
  let nextHeader = ''
  let match = pattern.exec(latex)

  while (match) {
    const content = latex.slice(cursor, match.index).trim()

    if (content || nextHeader) {
      sections.push({
        header: nextHeader,
        title: nextTitle,
        latex: content,
      })
    }

    nextHeader = match[0]
    nextTitle = match[1]?.trim() || match[0].trim()
    cursor = pattern.lastIndex
    match = pattern.exec(latex)
  }

  const trailingContent = latex.slice(cursor).trim()

  if (trailingContent || nextHeader) {
    sections.push({
      header: nextHeader,
      title: nextTitle,
      latex: trailingContent,
    })
  }

  return sections.map((section, index) => ({
    id: `case_${index + 1}`,
    title: formatCaseTitle(index, section.title),
    header: section.header,
    latex: section.latex,
  }))
}

function collectNodes(nodes = [], type) {
  return nodes.flatMap((node) => {
    if (!node || typeof node !== 'object') {
      return []
    }

    const nested = []

    if (Array.isArray(node.children)) {
      nested.push(...collectNodes(node.children, type))
    }

    if (Array.isArray(node.items)) {
      node.items.forEach((item) => {
        if (Array.isArray(item)) {
          nested.push(...collectNodes(item, type))
        }
      })
    }

    return node.type === type ? [node, ...nested] : nested
  })
}

const minipageNodes = computed(() => collectNodes(parsedNodes.value, 'minipage'))
const centerNodes = computed(() => collectNodes(parsedNodes.value, 'center'))
const imageNodes = computed(() => collectNodes(parsedNodes.value, 'image'))
const tabularNodes = computed(() => collectNodes(parsedNodes.value, 'tabular'))
const enumerateNodes = computed(() => collectNodes(parsedNodes.value, 'enumerate'))
const textNodes = computed(() => collectNodes(parsedNodes.value, 'text'))
const vspaceNodes = computed(() => collectNodes(parsedNodes.value, 'vspace'))
const serializedLatex = computed(() => serializeLatex(parsedNodes.value, defaultProcessors))
const inlineCommandNodes = computed(() =>
  textNodes.value.flatMap((node) =>
    parseInlineContent(node.previewContent ?? node.content ?? '', inlineCommandHandlers).filter(
      (inlineNode) => inlineNode.type === 'command',
    ),
  ),
)
const hspaceNodes = computed(() => inlineCommandNodes.value.filter((node) => node.name === 'hspace'))
const colorCommandNodes = computed(() =>
  inlineCommandNodes.value.filter((node) => node.name === 'textcolor' || node.name === 'color'),
)
const hasVisibleWhitespaceBetweenAdjacentMinipages = computed(() =>
  parsedNodes.value.some(
    (node, index, nodes) =>
      node.type === 'text' &&
      /^\s+$/.test(node.content || '') &&
      (node.previewContent || '') !== '' &&
      nodes[index - 1]?.type === 'minipage' &&
      nodes[index + 1]?.type === 'minipage',
  ),
)

const minipageAssertions = computed(() => [
  {
    label: '百分比宽度 48% 可解析为 CSS 百分比',
    passed: minipageNodes.value.some((node) => node.width?.raw === '48%' && node.width?.css === '48%'),
  },
  {
    label: '固定长度 6cm 可作为 CSS 固定宽度',
    passed: minipageNodes.value.some((node) => node.width?.raw === '6cm' && node.width?.css === '6cm'),
  },
  {
    label: '0.5\\textwidth 可转换为 50%',
    passed: minipageNodes.value.some((node) => node.width?.raw === '0.5\\textwidth' && node.width?.css === '50%'),
  },
  {
    label: '.35\\linewidth 可转换为 35%',
    passed: minipageNodes.value.some((node) => node.width?.raw === '.35\\linewidth' && node.width?.css === '35%'),
  },
  {
    label: 'minipage 可嵌套 minipage',
    passed: minipageNodes.value.some(
      (node) => node.optionArgs?.[0] === 't' && node.children?.some((child) => child.type === 'minipage'),
    ),
  },
  {
    label: 'enumerate 的 item 中可嵌套 minipage',
    passed: enumerateNodes.value.some((node) =>
      node.items?.some((item) => Array.isArray(item) && item.some((child) => child.type === 'minipage')),
    ),
  },
  {
    label: '相邻 minipage 中间的纯空白不会强制换行',
    passed: !hasVisibleWhitespaceBetweenAdjacentMinipages.value,
  },
  {
    label: '序列化保留 minipage 环境',
    passed: serializedLatex.value.includes('\\begin{minipage}{48%}') &&
      serializedLatex.value.includes('\\begin{minipage}[t]{90%}'),
  },
])

const tabularAssertions = computed(() => [
  {
    label: 'center 环境可解析为块级居中节点',
    passed: centerNodes.value.some((node) => node.environmentName === 'center'),
  },
  {
    label: 'flushleft 环境可解析为块级左对齐节点',
    passed: centerNodes.value.some((node) => node.environmentName === 'flushleft'),
  },
  {
    label: 'flushright 环境可解析为块级右对齐节点',
    passed: centerNodes.value.some((node) => node.environmentName === 'flushright'),
  },
  {
    label: 'tabular 可解析为表格节点',
    passed: tabularNodes.value.length >= 1,
  },
  {
    label: 'tabular 正确拆分 2 行 7 列',
    passed: tabularNodes.value.some(
      (node) => node.rows?.length === 2 && node.rows.every((row) => row.cells?.length === 7),
    ),
  },
  {
    label: '\\hline 可映射为表格横线',
    passed: tabularNodes.value.some(
      (node) => node.rows?.[0]?.topBorder && node.rows?.[0]?.bottomBorder && node.rows?.[1]?.bottomBorder,
    ),
  },
  {
    label: '表格文本中的 \\% 渲染为 %',
    passed: tabularNodes.value.some((node) =>
      node.rows?.some((row) =>
        row.cells?.some((cell) =>
          cell.children?.some(
            (child) =>
              child.type === 'text' &&
              child.content?.includes('\\%') &&
              child.previewContent?.includes('%') &&
              !child.previewContent?.includes('\\%'),
          ),
        ),
      ),
    ),
  },
  {
    label: 'minipage 内 \\centering 可转为居中样式',
    passed: minipageNodes.value.filter((node) => node.width?.raw === '.49\\linewidth' && node.alignment === 'center')
      .length >= 2,
  },
])

const imageAssertions = computed(() => [
  {
    label: 'includegraphics 可解析 keepaspectratio 选项',
    passed: imageNodes.value.some((node) => node.options?.keepaspectratio === true),
  },
  {
    label: 'includegraphics 的 0.432\\linewidth 可转换为 43.2%',
    passed: imageNodes.value.some((node) => {
      const width = parseLatexLength(node.options?.width)

      return width.raw === '0.432\\linewidth' && width.css === '43.2%'
    }),
  },
  {
    label: '序列化保留 keepaspectratio,width=0.432\\linewidth',
    passed: serializedLatex.value.includes(
      '\\includegraphics[keepaspectratio,width=0.432\\linewidth]{image.png}',
    ),
  },
])

const spacingAssertions = computed(() => [
  {
    label: '\\vspace{0.4em} 可解析为块级间距节点',
    passed: vspaceNodes.value.some(
      (node) => node.length?.raw === '0.4em' && node.length?.css === '0.4em' && node.starred === false,
    ),
  },
  {
    label: '\\vspace*{1em} 可解析并保留星号形式',
    passed: vspaceNodes.value.some(
      (node) => node.length?.raw === '1em' && node.length?.css === '1em' && node.starred === true,
    ),
  },
  {
    label: '\\hspace{1.5em} 可解析为行内间距命令',
    passed: hspaceNodes.value.some(
      (node) => node.param === '1.5em' && node.raw === '\\hspace{1.5em}' && node.starred === false,
    ),
  },
  {
    label: '\\hspace*{2em} 可解析并标记星号形式',
    passed: hspaceNodes.value.some(
      (node) => node.param === '2em' && node.raw === '\\hspace*{2em}' && node.starred === true,
    ),
  },
  {
    label: '序列化保留 vspace 与 hspace 命令',
    passed:
      serializedLatex.value.includes('\\vspace{0.4em}') &&
      serializedLatex.value.includes('\\vspace*{1em}') &&
      serializedLatex.value.includes('\\hspace{1.5em}') &&
      serializedLatex.value.includes('\\hspace*{2em}'),
  },
])

const colorAssertions = computed(() => [
  {
    label: '\\textcolor{red}{...} 可解析为双参数行内颜色命令',
    passed: colorCommandNodes.value.some(
      (node) => node.name === 'textcolor' && node.args?.[0] === 'red' && node.args?.[1] === '红色文本',
    ),
  },
  {
    label: '\\color{blue}{...} 可作为双参数颜色命令解析',
    passed: colorCommandNodes.value.some(
      (node) => node.name === 'color' && node.args?.[0] === 'blue' && node.args?.[1] === '蓝色文本',
    ),
  },
  {
    label: '{\\color{green} ...} 分组声明形式可解析',
    passed: colorCommandNodes.value.some(
      (node) =>
        node.name === 'color' &&
        node.args?.[0] === 'green' &&
        node.args?.[1]?.includes('绿色分组文本') &&
        node.raw?.startsWith('{\\color{green}'),
    ),
  },
  {
    label: '颜色命令内容可保留嵌套行内命令',
    passed: colorCommandNodes.value.some(
      (node) => node.name === 'textcolor' && node.args?.[0] === '#cc3300' && node.args?.[1]?.includes('\\circled{7}'),
    ),
  },
  {
    label: '\\color{purple} 后续文本声明形式可解析',
    passed: colorCommandNodes.value.some(
      (node) => node.name === 'color' && node.args?.[0] === 'purple' && node.args?.[1]?.includes('紫色声明文本'),
    ),
  },
  {
    label: '序列化保留 textcolor 与 color 命令',
    passed:
      serializedLatex.value.includes('\\textcolor{red}{红色文本}') &&
      serializedLatex.value.includes('\\color{blue}{蓝色文本}') &&
      serializedLatex.value.includes('{\\color{green} 绿色分组文本}'),
  },
])
</script>

<template>
  <main class="test-nesting">
    <header class="test-nesting__header">
      <h1>嵌套结构测试</h1>
      <p>按用例对照查看 LaTeX 代码与渲染预览，同时保留回归断言。</p>
    </header>

    <section class="test-nesting__cases">
      <article v-for="(testCase, index) in testCaseSections" :key="testCase.id" class="test-case">
        <h2>{{ testCase.title }}</h2>

        <section class="test-case__panel">
          <h3>代码</h3>
          <pre>{{ testCase.latex }}</pre>
        </section>

        <section class="test-case__panel">
          <h3>预览</h3>
          <div class="test-case__preview">
            <LatexRenderer
              :model-value="testCase.latex"
              :theme="{ color: '#1f5c8f', textColor: '#000' }"
              :image-src-resolver="imageSrcResolver"
              :editable-images="true"
              @update:model-value="handleCaseUpdate(index, $event)"
            />
          </div>
        </section>
      </article>
    </section>

    <section class="test-nesting__assertions">
      <h2>Minipage Assertions</h2>
      <ul>
        <li
          v-for="assertion in minipageAssertions"
          :key="assertion.label"
          :class="{ 'is-passed': assertion.passed, 'is-failed': !assertion.passed }"
        >
          <span>{{ assertion.passed ? 'PASS' : 'FAIL' }}</span>
          {{ assertion.label }}
        </li>
      </ul>
    </section>

    <section class="test-nesting__assertions">
      <h2>Tabular Assertions</h2>
      <ul>
        <li
          v-for="assertion in tabularAssertions"
          :key="assertion.label"
          :class="{ 'is-passed': assertion.passed, 'is-failed': !assertion.passed }"
        >
          <span>{{ assertion.passed ? 'PASS' : 'FAIL' }}</span>
          {{ assertion.label }}
        </li>
      </ul>
    </section>

    <section class="test-nesting__assertions">
      <h2>Image Assertions</h2>
      <ul>
        <li
          v-for="assertion in imageAssertions"
          :key="assertion.label"
          :class="{ 'is-passed': assertion.passed, 'is-failed': !assertion.passed }"
        >
          <span>{{ assertion.passed ? 'PASS' : 'FAIL' }}</span>
          {{ assertion.label }}
        </li>
      </ul>
    </section>

    <section class="test-nesting__assertions">
      <h2>Spacing Assertions</h2>
      <ul>
        <li
          v-for="assertion in spacingAssertions"
          :key="assertion.label"
          :class="{ 'is-passed': assertion.passed, 'is-failed': !assertion.passed }"
        >
          <span>{{ assertion.passed ? 'PASS' : 'FAIL' }}</span>
          {{ assertion.label }}
        </li>
      </ul>
    </section>

    <section class="test-nesting__assertions">
      <h2>Color Assertions</h2>
      <ul>
        <li
          v-for="assertion in colorAssertions"
          :key="assertion.label"
          :class="{ 'is-passed': assertion.passed, 'is-failed': !assertion.passed }"
        >
          <span>{{ assertion.passed ? 'PASS' : 'FAIL' }}</span>
          {{ assertion.label }}
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.test-nesting {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  gap: 1.5rem;
}

.test-nesting__header {
  display: grid;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
}

.test-nesting__header h1 {
  color: #162330;
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.test-nesting__header p {
  color: #66717c;
  margin: 0;
}

.test-nesting__cases {
  display: grid;
  gap: 1.2rem;
}

.test-case {
  display: grid;
  gap: 0.9rem;
  padding: 1.25rem;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 12px rgba(18, 27, 34, 0.06);
  overflow: visible;
}

.test-case h2 {
  color: #162330;
  font-size: 1.18rem;
  margin: 0;
}

.test-case__panel {
  display: grid;
  gap: 0.65rem;
  min-width: 0;
  overflow: visible;
}

.test-case__panel h3 {
  color: #526170;
  font-size: 0.92rem;
  font-weight: 700;
  margin: 0;
}

.test-case__panel pre {
  min-height: 12rem;
  max-height: 28rem;
  margin: 0;
  padding: 1rem;
  overflow: auto;
  border-radius: 8px;
  background: #17212b;
  color: #f5f1e8;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.88rem;
  line-height: 1.6;
}

.test-case__preview {
  min-height: 12rem;
  padding: 4.5rem 1rem 1rem;
  overflow: visible;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 8px;
  background: #ffffff;
}

.test-nesting__assertions {
  display: grid;
  gap: 0.8rem;
  padding: 1.5rem;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
}

.test-nesting__assertions h2 {
  color: #162330;
  font-size: 1.2rem;
  margin: 0;
}

.test-nesting__assertions ul {
  display: grid;
  gap: 0.45rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.test-nesting__assertions li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.6rem;
  align-items: center;
  color: #2e3a44;
  line-height: 1.5;
}

.test-nesting__assertions span {
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

.test-nesting__assertions .is-passed span {
  background: #d7f2e2;
  color: #17633a;
}

.test-nesting__assertions .is-failed span {
  background: #ffe0df;
  color: #9d241f;
}

</style>
