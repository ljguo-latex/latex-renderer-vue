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
