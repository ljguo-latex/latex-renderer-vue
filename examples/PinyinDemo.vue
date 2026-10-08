<script setup>
import { ref } from 'vue'
import { LatexRenderer } from '../src/index.js'

const source = ref(String.raw`自动注音：\pinyin{音乐和快乐，中国 and (China)}
手动纠音：\pinyin{重(chóng)复，重(zhòng)量，重阳(yáng)}
组合样式：\textbf{\pinyin{长城}}，\textcolor{purple}{\pinyin{中华}}

\xpinyinsetup{ratio=0.7,color=#0d9488}
\begin{pinyinscope}[align=left]
床前明月光
疑是地上霜

举头望明月\\
低头思故乡
\end{pinyinscope}

公式混排：$E=mc^2 \implies \pinyin{质(zhì)能(néng)方程}$
$$\begin{pinyinscope}
白日依山尽\\
黄河入海流
\end{pinyinscope}$$
\begin{equation}
\frac{\pinyin{速度}}{t}=v
\end{equation}`)
</script>

<template>
  <section class="pinyin-demo">
    <h2>汉字注音示例</h2>
    <LatexRenderer :model-value="source" />
    <p>独立实例：<LatexRenderer class="pinyin-demo__sibling" :model-value="String.raw`\pinyin{音乐和快乐}`" :pinyin-options="{ color: '#b45309', ratio: 0.55 }" /></p>
    <label for="pinyin-source">编辑注音源码</label>
    <textarea id="pinyin-source" v-model="source" rows="10" spellcheck="false" />
  </section>
</template>

<style scoped>
.pinyin-demo {
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: white;
  color: #1e293b;
  font-size: 18px;
}
.pinyin-demo h2 { margin-bottom: 1rem; }
.pinyin-demo__sibling { display: inline; }
.pinyin-demo label { display: block; margin-top: 1rem; }
.pinyin-demo textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 0.75rem;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
}
</style>
