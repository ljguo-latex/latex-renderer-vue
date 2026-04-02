<script setup>
import { LatexRenderer } from '../src/index.js';
import { ref } from 'vue';



const latex = ref(String.raw`
这是公式：$E=mc^2$ \paren{}.


这是公式：$E=mc^2$ \blank{}.

\begin{enumerate}[label = \alph*]
\item $x^2$
\item ddsfsd
\item 我的
\end{enumerate}

\includegraphics[width=5cm,xxx]{/image.png}
\begin{choices}
\item $x^2$
\item $x^3$
\item $\sqrt{x}$
\item $\frac{1}{x}$
\item $x^2$
\item ddsfsd
\item AAAA
\end{choices}
`)
</script>

<template>
  <div class="ddd">
  <LatexRenderer v-model="latex" :editableImages="true" :theme="{color: 'pink'}" />
  </div>

  <pre>
    {{ latex }}
  </pre>

</template>

<style scoped>

.ddd {
  width: 100%;
  height: 100%;
}

</style>
