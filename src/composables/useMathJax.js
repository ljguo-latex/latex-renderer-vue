import { rewriteInlineCommandsInText } from '../latex/mathTextCommands.js'

let mathJaxPromise

function createMathJaxConfig(resolve) {
  return {
    output: {
      font: 'mathjax-stix2',
    },
    chtml: {
      scale: 1.0,
      minScale: 0.5,
      mathmlSpacing: false,
      mtextInheritFont: true,
    },
    loader: {
      load: ['[tex]/mhchem', '[tex]/extpfeil', '[tex]/enclose', '[tex]/color', '[tex]/html'],
    },
    tex: {
      inlineMath: [
        ['$', '$'],
        ['\\(', '\\)'],
      ],
      displayMath: [
        ['$$', '$$'],
        ['\\[', '\\]'],
      ],
      packages: { '[+]': ['mhchem', 'extpfeil', 'enclose', 'color', 'html'] },
      macros: {
        overarc: ['\\overset{\\Large\\frown}{#1}', 1],
        circled: ['\\class{math-circled}{\\enclose{circle}{#1}}', 1],
        paren: ['\\style{color: var(--latex-renderer-theme-color); font-size: 1.15em;}{\\text{\\textbf{(}}\\qquad\\text{\\textbf{)}}}', 0],
        blank: ['\\class{math-blank-rule}{\\rule[-0.15em]{4.5em}{2px}}', 0],
        frac: ['{\\displaystyle{#1\\over#2}}', 2],
      },
      processEscapes: true,
      processEnvironments: true,
      processRefs: true,
      digits: /^(?:[0-9]+(?:\{,\}[0-9]{3})*(?:\.[0-9]*)?|\.[0-9]+)/,
      tags: 'none',
      tagSide: 'right',
      tagIndent: '0.8em',
      useLabelIds: true,
      maxMacros: 1000,
      maxBuffer: 5 * 1024,
      formatError: (jax, error) => jax.formatError(error),
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'input', 'pre', 'head'],
      includeHtmlTags: {
        br: '\n',
        wbr: '',
        '#comment': '',
      },
    },
    enableMenu: false,
    startup: {
      ready: () => {
        const mathJax = window.MathJax

        mathJax.startup.defaultReady()
        resolve(mathJax)
      },
    },
  }
}

export function loadMathJax() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  if (window.MathJax?.typesetPromise) {
    return Promise.resolve(window.MathJax)
  }

  if (!mathJaxPromise) {
    mathJaxPromise = new Promise((resolve, reject) => {
      window.MathJax = createMathJaxConfig(resolve)

      const existingScript = document.getElementById('mathjax-script')

      if (existingScript) {
        existingScript.addEventListener('error', () => reject(new Error('MathJax failed to load.')), {
          once: true,
        })
        return
      }

      const script = document.createElement('script')
      script.id = 'mathjax-script'
      script.async = true
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js'
      script.addEventListener('error', () => reject(new Error('MathJax failed to load.')), { once: true })
      document.head.appendChild(script)
    })
  }

  return mathJaxPromise
}

export async function typesetMath(element, latex) {
  if (!element) {
    return
  }

  element.textContent = rewriteInlineCommandsInText(latex || '')

  const mathJax = await loadMathJax()

  if (!mathJax?.typesetPromise) {
    return
  }

  mathJax.typesetClear?.([element])
  await mathJax.typesetPromise([element])
}
