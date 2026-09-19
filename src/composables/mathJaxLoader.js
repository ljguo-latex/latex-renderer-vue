// The renderer selects STIX2 explicitly, so avoid downloading the NewCM font
// bundled in the regular combined component before loading STIX2.
const DEFAULT_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml-nofont.js'

let options = { src: DEFAULT_SRC, timeout: 30000, config: {} }
let loadingStarted = false
let mathJaxPromise

function createMathJaxConfig() {
  return {
    output: {
      font: 'mathjax-stix2',
      fontPath: '[fonts]/%%FONT%%-font@4.1.3',
    },
    chtml: {
      scale: 1.0,
      minScale: 0.5,
      mathmlSpacing: false,
      mtextInheritFont: true,
    },
    loader: {
      paths: {
        'mathjax-mhchem-extension': '[fonts]/mathjax-mhchem-font-extension@4.1.3',
      },
      load: [
        '[tex]/mhchem',
        '[tex]/extpfeil',
        '[tex]/enclose',
        '[tex]/color',
        '[tex]/html',
        '[tex]/mathtools',
        '[tex]/cancel',
        '[tex]/physics',
        '[tex]/boldsymbol',
        '[tex]/upgreek',
      ],
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
      packages: { '[+]': [
          'mhchem',
          'extpfeil',
          'enclose',
          'color',
          'html',
          'mathtools',
          'cancel',
          'physics',
          'boldsymbol',
          'upgreek',
        ]
      },
      macros: {
        div: '\\divisionsymbol',
        overarc: ['\\overset{\\Large\\frown}{#1}', 1],
        circled: ['\\class{math-circled}{\\enclose{circle}{#1}}', 1],
        paren: ['\\style{font-size: 1.15em;}{\\text{(}\\qquad\\text{)}}', 0],
        blank: ['\\class{math-blank-rule}{\\rule[-0.15em]{4.5em}{1px}}', 0],
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
    startup: { typeset: false },
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
}

function mergeConfig(base, extra) {
  const result = { ...base }
  for (const [key, value] of Object.entries(extra)) {
    result[key] = isRecord(value)
      ? mergeConfig(isRecord(base[key]) ? base[key] : {}, value)
      : Array.isArray(value) ? [...value] : value
  }
  return result
}

/** Configure once at application startup, before any renderer mounts. */
export function configureMathJax(next = {}) {
  if (loadingStarted) {
    throw new Error('Configure MathJax before the first loadMathJax() call or renderer mount.')
  }
  if (next.src !== undefined && (typeof next.src !== 'string' || !next.src.trim())) {
    throw new TypeError('MathJax src must be a non-empty string.')
  }
  if (next.timeout !== undefined && (!Number.isFinite(next.timeout) || next.timeout <= 0)) {
    throw new TypeError('MathJax timeout must be a positive number in milliseconds.')
  }
  if (next.config !== undefined && !isRecord(next.config)) {
    throw new TypeError('MathJax config must be an object.')
  }
  options = {
    src: next.src ?? options.src,
    timeout: next.timeout ?? options.timeout,
    config: mergeConfig(options.config, next.config ?? {}),
  }
}

function configuredMathJax() {
  const defaults = createMathJaxConfig()
  const config = mergeConfig(defaults, options.config)
  // Keep built-in extensions when adding application-specific extensions.
  config.loader.load = [...new Set([...defaults.loader.load, ...(config.loader.load ?? [])])]
  if (isRecord(config.tex.packages)) {
    config.tex.packages['[+]'] = [...new Set([
      ...defaults.tex.packages['[+]'], ...(config.tex.packages['[+]'] ?? []),
    ])]
  }
  // Only explicitly requested component containers should be typeset.
  config.startup.typeset = false
  return config
}

function findHostScript() {
  const configuredSrc = new URL(options.src, document.baseURI).href
  return document.getElementById('mathjax-script') || [...document.scripts].find((script) =>
    script.src === configuredSrc ||
    /(?:^|\/)(?:tex|mml|tex-mml)-(?:chtml|svg)(?:-full|-nofont)?\.js(?:[?#]|$)/i.test(script.src) ||
    /\/mathjax(?:@[^/]+)?\/startup\.js(?:[?#]|$)/i.test(script.src),
  )
}

function startLoading() {
  return new Promise((resolve, reject) => {
    let script = findHostScript()
    // A pre-existing global (even configuration only) belongs to the host.
    const owned = !window.MathJax && !script
    const initialConfig = owned ? configuredMathJax() : null
    let observedRuntime = initialConfig
    let observedStartup
    let startupReady = false
    let settled = false
    let interval
    let timeout

    function finish(error, mathJax) {
      if (settled) return
      settled = true
      clearInterval(interval)
      clearTimeout(timeout)
      script?.removeEventListener('error', onError)
      script?.removeEventListener('load', inspect)
      if (error) {
        if (owned) {
          script?.remove()
          if (window.MathJax === observedRuntime || window.MathJax === initialConfig) {
            delete window.MathJax
          }
        }
        reject(error)
      } else {
        resolve(mathJax)
      }
    }

    function onError() {
      finish(new Error(`MathJax failed to load: ${script?.src || options.src}`))
    }

    function inspect() {
      if (settled) return
      const mathJax = window.MathJax
      if (!mathJax) return
      if (mathJax !== observedRuntime) {
        observedRuntime = mathJax
        observedStartup = undefined
        startupReady = false
      }
      const startup = mathJax.startup?.promise
      if (startup?.then && startup !== observedStartup) {
        observedStartup = startup
        startupReady = false
        Promise.resolve(startup).then(() => {
          if (window.MathJax !== mathJax || observedStartup !== startup) return
          startupReady = true
          inspect()
        }, (error) => {
          if (window.MathJax === mathJax && observedStartup === startup) finish(error)
        })
      }
      if (typeof mathJax.typesetPromise === 'function' && (!startup?.then || startupReady)) {
        finish(null, mathJax)
      }
    }

    if (owned) {
      window.MathJax = initialConfig
      script = document.createElement('script')
      script.id = 'mathjax-script'
      script.async = true
      script.src = options.src
    }
    script?.addEventListener('error', onError, { once: true })
    script?.addEventListener('load', inspect)
    timeout = setTimeout(() => finish(new Error(`MathJax loading timed out after ${options.timeout} ms.`)), options.timeout)
    interval = setInterval(inspect, 25)
    if (owned) document.head.appendChild(script)
    inspect()
  })
}

export function loadMathJax() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  loadingStarted = true
  if (!mathJaxPromise) {
    mathJaxPromise = startLoading().catch((error) => {
      // Failed attempts must not permanently poison subsequent loads.
      mathJaxPromise = undefined
      throw error
    })
  }
  return mathJaxPromise
}
