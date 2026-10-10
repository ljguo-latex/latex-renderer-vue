// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import LatexRenderer from '../src/components/LatexRenderer.vue'
import { waitForMathJax } from '../src/composables/useMathJax.js'
import { createPinyinDOM } from '../src/latex/pinyin/dom.js'
import { resolvePinyinOptions } from '../src/latex/pinyin/options.js'

const apps = []
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => {
  apps.splice(0).forEach((app) => app.unmount())
  document.body.replaceChildren()
  delete window.MathJax
  vi.unstubAllGlobals()
})

function mount(render) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({ render })
  apps.push(app)
  app.mount(root)
  return root
}

describe('pinyin components', () => {
  it('isolates renderer instances, composes wrappers and resets declarations on editing', async () => {
    const source = ref(String.raw`\xpinyinsetup{color=red}\textbf{\pinyin{音乐}}\begin{pinyinscope}中国\end{pinyinscope}`)
    const first = mount(() => h(LatexRenderer, { modelValue: source.value }))
    const second = mount(() => h(LatexRenderer, { modelValue: String.raw`\pinyin{快乐}`, pinyinOptions: { color: 'blue', ratio: 0.5, fallback: false } }))
    expect(first.querySelector('rt').style.color).toBe('red')
    expect(first.querySelector('.inline-style-command--bold ruby')).not.toBeNull()
    expect(first.querySelector('.latex-pinyin-scope rt').style.color).toBe('red')
    expect(second.querySelector('rt').style.color).toBe('blue')
    expect(second.querySelector('rt').style.fontSize).toBe('0.5em')
    expect(second.querySelector('rp')).toBeNull()
    source.value = String.raw`\pinyin{中国}`
    await nextTick()
    expect(first.querySelector('rt').style.color).toBe('inherit')
    expect(second.querySelector('rt').style.color).toBe('blue')
  })

  it('inherits setup through lists and tables while keeping local changes scoped', () => {
    const source = String.raw`\xpinyinsetup{color=red}\begin{enumerate}\item \pinyin{中}\item \begin{choices}\item \pinyin{国}\end{choices}\end{enumerate}\begin{tabular}{ll}\xpinyinsetup{color=blue}\pinyin{音} & \pinyin{乐}\end{tabular}\pinyin{文}`
    const root = mount(() => h(LatexRenderer, { modelValue: source }))
    const annotations = Array.from(root.querySelectorAll('rt')).filter((rt) => !rt.closest('[aria-hidden="true"]'))
    expect(annotations.map((rt) => rt.style.color)).toEqual(['red', 'red', 'blue', 'red', 'red'])
  })

  it('renders markup-like input as text in both DOM adapters', () => {
    const input = '<img src=x onerror=alert(1)> 字(<script>) & (test)'
    const root = mount(() => h(LatexRenderer, { modelValue: `\\pinyin{${input}}` }))
    expect(root.querySelector('img, script')).toBeNull()
    expect(root.textContent).toContain('<img src=x onerror=alert(1)>')
    const dom = createPinyinDOM(document, [{ text: '<img>', pinyin: '<script>' }], resolvePinyinOptions())
    expect(dom.querySelector('img, script')).toBeNull()
    expect(dom.textContent).toBe('<img>(<script>)')
  })

  it('passes instance options into queued math renders and follows option changes', async () => {
    const runtime = { typesetClear: vi.fn(), typesetPromise: vi.fn().mockResolvedValue() }
    window.MathJax = runtime
    const options = ref({ color: 'red', ratio: 0.5 })
    const root = mount(() => h(LatexRenderer, { modelValue: String.raw`\pinyin{中} $\pinyin{国}$`, pinyinOptions: options.value }))
    await waitForMathJax(root)
    expect(root.querySelector('.mathjax-block').textContent).toContain('ratio=0.5,color={red}')
    options.value.color = 'blue'
    await waitForMathJax(root)
    expect(root.querySelector('rt').style.color).toBe('blue')
    expect(root.querySelector('.mathjax-block').textContent).toContain('color={blue}')
    expect(runtime.typesetPromise).toHaveBeenCalledTimes(2)
    apps.pop().unmount()
    expect(root.textContent).toBe('')
    expect(runtime.typesetClear).toHaveBeenCalledTimes(3)
  })
})
