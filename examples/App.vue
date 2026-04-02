<script setup>
import { ref } from 'vue'

import LatexRenderer from '../src/index.js'

const readonlyLatex = String.raw`这是只读渲染示例：$a^2 + b^2 = c^2$，括号题：\paren，填空题：\blank。
\begin{center}
\includegraphics[width=4.2cm]{/image.png}
\end{center}
\begin{enumerate}[label = (啊啊啊\arabic*)]
\item 当 $a = -1$ 时, 求曲线 $y = f(x)$ 在点 $(1, f(1))$ 处的切线方程;
\item 讨论 $f(x)$ 的单调性;
\item 若 $f(x)$ 有极小值, 且 $f(x) \geq 0$, 求 $a$ 的取值范围.
\end{enumerate}
\begin{choices}
\item $x^2$
\item $x^3$
\item $\sqrt{x}$
\item $\frac{1}{x}$
\end{choices}`

const editableLatex = ref(String.raw`这是可编辑示例，点击图片后会出现工具条：
\includegraphics[width=5cm]{/image.png}
现有 $10$ 个数据为: $3, 3, 3, 3, 4, 4, 4, 5, 5, 6$, 对于该组数据, 下列说法中正确的有 \paren{}，并请在横线上填写中位数 \blank{}
    \begin{choices}
        \item 众数是 $4$
        \item 平均数是 $4$
        \item 极差是 $3$
        \item 中位数是 $4.5$
    \end{choices}`)

const readonlySnippet = `<script setup>
import LatexRenderer from 'latex-renderer-vue'

const latex = String.raw\`这是公式：$E=mc^2$，括号题：\\paren，填空题：\\blank。

\\includegraphics[width=5cm]{/image.png}
\\begin{enumerate}[label = (【\\arabic*)]
\\item 第一问啊
\\item 第二问
\\item 第三问
\\end{enumerate}
\\begin{choices}
\\item $x^2$
\\item $x^3$
\\item $\\sqrt{x}$
\\item $\\frac{1}{x}$
\\end{choices}\`
<\/script>

<template>
  <LatexRenderer :model-value="latex" />
</template>`

const editableSnippet = `<script setup>
import { ref } from 'vue'
import LatexRenderer from 'latex-renderer-vue'

const latex = ref(String.raw\`点击图片后可调整宽度

\\includegraphics[width=5cm]{/image.png}

请填写答案：\\blank{}\`)
<\/script>

<template>
  <LatexRenderer v-model="latex" :editable-images="true" />
</template>`
</script>

<template>
  <main class="demo-view">
    <section class="demo">
      <header class="demo__header">
        <p class="demo__eyebrow">Examples</p>
        <h1>latex-renderer-vue Demo</h1>
        <p>这个页面只用于本地开发验证。包源码本身都放在 <code>src/</code>。</p>
      </header>

      <div class="demo__grid">
        <article class="demo-card">
          <div class="demo-card__header">
            <h2>只读渲染</h2>
            <p>图片、enumerate、choices 和行内命令都会走处理器。</p>
          </div>

          <pre class="demo-card__code">{{ readonlySnippet }}</pre>

          <div class="demo-card__preview">
            <LatexRenderer :model-value="readonlyLatex" />
          </div>
        </article>

        <article class="demo-card">
          <div class="demo-card__header">
            <h2>图片可编辑</h2>
            <p>通过 <code>v-model</code> 回写整段 LaTeX，点击图片后可调整宽度和对齐。</p>
          </div>

          <pre class="demo-card__code">{{ editableSnippet }}</pre>

          <div class="demo-card__preview">
            <LatexRenderer v-model="editableLatex" :editable-images="true" />
          </div>

          <pre class="demo-card__output">{{ editableLatex }}</pre>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.demo-view {
  width: min(1400px, 100%);
  margin: 0 auto;
}

.demo {
  display: grid;
  gap: 1.5rem;
}

.demo__header {
  display: grid;
  gap: 0.45rem;
  padding: 1.35rem 1.5rem;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
}

.demo__eyebrow {
  color: #9f542d;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.demo__header h1 {
  color: #162330;
  font-size: clamp(2rem, 5vw, 3.4rem);
  line-height: 0.95;
  font-weight: 700;
}

.demo__header p {
  color: #66717c;
}

.demo__grid {
  display: grid;
  gap: 1.5rem;
}

.demo-card {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 40px rgba(18, 27, 34, 0.06);
}

.demo-card__header {
  display: grid;
  gap: 0.35rem;
}

.demo-card__header h2 {
  color: #162330;
  font-size: 1.05rem;
  font-weight: 700;
}

.demo-card__header p {
  color: #66717c;
  font-size: 0.92rem;
}

.demo-card__code,
.demo-card__output {
  margin: 0;
  padding: 1rem;
  border-radius: 14px;
  background: #17212b;
  color: #f5f1e8;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.88rem;
  line-height: 1.7;
}

.demo-card__preview {
  padding: 0.25rem 0;
}

@media (min-width: 980px) {
  .demo__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
</style>
