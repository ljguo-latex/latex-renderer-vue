<script setup>
import { ref } from 'vue'
import { LatexRenderer } from '../src/index.js'

const testNesting = ref(String.raw`测试：Enumerate 和 Choices 嵌套支持

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
\end{enumerate}`)
</script>

<template>
  <main class="test-nesting">
    <header class="test-nesting__header">
      <h1>嵌套结构测试</h1>
      <p>验证 Enumerate 和 Choices 的嵌套支持及向后兼容性</p>
    </header>

    <section class="test-nesting__content">
      <LatexRenderer v-model="testNesting" :theme="{ color: '#1f5c8f' }" />
    </section>

    <section class="test-nesting__source">
      <h2>LaTeX Source</h2>
      <pre>{{ testNesting }}</pre>
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

.test-nesting__content {
  padding: 2rem;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 12px rgba(18, 27, 34, 0.06);
}

.test-nesting__source {
  display: grid;
  gap: 0.8rem;
  padding: 1.5rem;
  border: 1px solid rgba(17, 29, 40, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
}

.test-nesting__source h2 {
  color: #162330;
  font-size: 1.2rem;
  margin: 0;
}

.test-nesting__source pre {
  margin: 0;
  padding: 1rem;
  border-radius: 8px;
  background: #17212b;
  color: #f5f1e8;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  line-height: 1.6;
}
</style>
