<script setup>
import { ref } from 'vue'

import { LatexRenderer } from '../src/index.js'

const demoImageSrc = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="520" height="240" viewBox="0 0 520 240">
  <rect width="520" height="240" fill="#fffdf8"/>
  <path d="M48 196h420" stroke="#9aa9b5" stroke-width="3"/>
  <path d="M48 196V48" stroke="#9aa9b5" stroke-width="3"/>
  <polyline points="48,180 112,128 168,146 234,88 292,118 360,62 428,96 474,54"
    fill="none" stroke="#c86b35" stroke-linecap="round" stroke-linejoin="round" stroke-width="12"/>
  <circle cx="48" cy="180" r="11" fill="#1f3b57"/>
  <circle cx="112" cy="128" r="11" fill="#1f3b57"/>
  <circle cx="168" cy="146" r="11" fill="#1f3b57"/>
  <circle cx="234" cy="88" r="11" fill="#1f3b57"/>
  <circle cx="292" cy="118" r="11" fill="#1f3b57"/>
  <circle cx="360" cy="62" r="11" fill="#1f3b57"/>
  <circle cx="428" cy="96" r="11" fill="#1f3b57"/>
  <circle cx="474" cy="54" r="11" fill="#1f3b57"/>
  <text x="78" y="66" fill="#1f3b57" font-family="Arial, sans-serif" font-size="24">Data Chart</text>
</svg>
`)}`

const latex = ref(String.raw`内联命令兼容性验证

非数学模式：\paren{}，\blank{}
行内数学模式：$a=\paren{}$，$f(x)=\blank{}+1$
另一种行内数学模式：\(x=\paren{}\)
块级数学模式：
$$
y=\blank{}
$$

2026 年普通高中招生统一考试模拟卷
数学试题

本试卷共 4 题，满分 50 分，考试时间 40 分钟。
注意事项：
1. 答卷前，考生务必将姓名、准考证号填写在指定位置；
2. 选择题答案填在题后的括号内，填空题直接写出结果，解答题写出必要过程。

一、选择题：本题共 2 小题，每小题 5 分，共 10 分。

1. 已知集合 $A=\{x \mid x^2-3x+2=0\}$，则集合 $A$ 中元素的个数为 \paren{}。
\begin{choices}
\item $1$
\item $2$
\item $3$
\item $4$
\end{choices}

2. 某校高一年级五个班参加“劳动教育周”实践活动，完成任务人数统计如图：

\includegraphics[width=8cm]{${demoImageSrc}}





根据图中信息，下列说法正确的是 \paren{}。
\begin{choices}
\item 第三个班完成任务的人数最多
\item 五个班完成任务人数的平均数为 $55$
\item 后三个班完成任务人数逐班递增
\item 第一班与第五班完成任务人数相差不超过 $2$
\end{choices}

二、填空题：本题共 1 小题，共 8 分。

3. 若函数 $f(x)=x^2-4x+1$ 在区间 $[0,3]$ 上的最小值为 \blank{}。

三、解答题：本题共 1 小题，共 32 分。

4. 已知函数 $f(x)=\dfrac{x^2}{2}-a\ln x-(a-1)x-\dfrac{a}{2}$。
\begin{enumerate}[label = (\arabic*)]
\item 当 $a=-1$ 时，求曲线 $y=f(x)$ 在点 $(1,f(1))$ 处的切线方程；
\item 讨论 $f(x)$ 的单调性；
\item 若 $f(x)$ 有极小值，且 $f(x)\geq0$，求 $a$ 的取值范围。
\end{enumerate}

请在答题卡指定区域内作答。`)
</script>

<template>
  <main class="exam-demo">
    <header class="exam-demo__header">
      <p class="exam-demo__eyebrow">Example</p>
      <h1>正式试卷示例</h1>
      <p>这一页用于模拟一份完整数学试卷，同时保留图片编辑能力，便于验证真实使用效果。</p>
    </header>

    <section class="exam-demo__paper">
      <LatexRenderer v-model="latex" :editable-images="true" :theme="{ color: '#1f5c8f' }" :imageSrcResolver="src => src" />
    </section>

    <section class="exam-demo__source">
      <h2>LaTeX Source</h2>
      <pre>{{ latex }}</pre>
    </section>
  </main>
</template>

<style scoped>
.exam-demo {
  width: min(1100px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 1.5rem;
}

.exam-demo__header {
  display: grid;
  gap: 0.45rem;
  padding: 1.35rem 1.5rem;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
}

.exam-demo__eyebrow {
  color: #9f542d;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.exam-demo__header h1 {
  color: #162330;
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 0.95;
  font-weight: 700;
}

.exam-demo__header p {
  color: #66717c;
}

.exam-demo__paper,
.exam-demo__source {
  padding: 1.4rem;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 40px rgba(18, 27, 34, 0.06);
}

.exam-demo__source {
  display: grid;
  gap: 0.8rem;
}

.exam-demo__source h2 {
  color: #162330;
  font-size: 1rem;
}

.exam-demo__source pre {
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
</style>
