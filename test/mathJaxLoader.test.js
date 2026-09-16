// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

let configureMathJax, loadMathJax
beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  document.head.innerHTML = ''
  delete window.MathJax
  ;({ configureMathJax, loadMathJax } = await import('../src/composables/mathJaxLoader.js'))
})
afterEach(() => {
  vi.useRealTimers()
  delete window.MathJax
  document.head.innerHTML = ''
})

function readyOwnedRuntime() {
  Object.assign(window.MathJax, { typesetPromise: vi.fn().mockResolvedValue(), startup: { promise: Promise.resolve() } })
  document.getElementById('mathjax-script').dispatchEvent(new Event('load'))
  return window.MathJax
}

describe('MathJax loading', () => {
  it('shares one pinned script and disables automatic page typesetting', async () => {
    const first = loadMathJax()
    expect(loadMathJax()).toBe(first)
    expect(document.scripts).toHaveLength(1)
    expect(document.scripts[0].src).toBe('https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js')
    expect(window.MathJax.startup.typeset).toBe(false)
    const runtime = readyOwnedRuntime()
    expect(await first).toBe(runtime)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('waits for full startup even when typesetPromise already exists', async () => {
    const startup = deferred()
    const runtime = { typesetPromise: vi.fn(), startup: { promise: startup.promise } }
    window.MathJax = runtime
    const loaded = vi.fn()
    const promise = loadMathJax().then(loaded)
    await vi.advanceTimersByTimeAsync(50)
    expect(loaded).not.toHaveBeenCalled()
    expect(document.scripts).toHaveLength(0)
    startup.resolve()
    await promise
    expect(loaded).toHaveBeenCalledWith(runtime)
  })

  it('reuses a host script still loading without overwriting its configuration', async () => {
    const script = document.createElement('script')
    script.src = '/vendor/mathjax/tex-chtml.js'
    document.head.appendChild(script)
    const hostConfig = { tex: { macros: { host: 'x' } } }
    window.MathJax = hostConfig
    const promise = loadMathJax()
    expect(window.MathJax).toBe(hostConfig)
    expect(document.scripts).toHaveLength(1)
    const runtime = { typesetPromise: vi.fn(), startup: { promise: Promise.resolve() } }
    window.MathJax = runtime
    await vi.advanceTimersByTimeAsync(25)
    expect(await promise).toBe(runtime)
    expect(document.scripts[0]).toBe(script)
  })

  it('cleans up failed owned scripts and permits a successful retry', async () => {
    const first = loadMathJax()
    const failed = expect(first).rejects.toThrow('failed to load')
    document.scripts[0].dispatchEvent(new Event('error'))
    await failed
    expect(document.scripts).toHaveLength(0)
    expect(window.MathJax).toBeUndefined()
    const second = loadMathJax()
    const runtime = readyOwnedRuntime()
    expect(await second).toBe(runtime)
  })

  it('times out without leaving a cached rejection or timers', async () => {
    configureMathJax({ timeout: 100 })
    const failed = expect(loadMathJax()).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(100)
    await failed
    expect(document.scripts).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
    const retry = loadMathJax()
    readyOwnedRuntime()
    await retry
  })

  it('propagates startup failure and retries owned loading', async () => {
    const first = loadMathJax()
    const failed = expect(first).rejects.toThrow('extension failed')
    window.MathJax.startup.promise = Promise.reject(new Error('extension failed'))
    document.scripts[0].dispatchEvent(new Event('load'))
    await failed
    expect(window.MathJax).toBeUndefined()
    const retry = loadMathJax()
    readyOwnedRuntime()
    await retry
  })

  it('never removes or replaces a failed host runtime and script', async () => {
    const script = document.createElement('script')
    script.id = 'mathjax-script'
    document.head.appendChild(script)
    const hostConfig = { tex: { macros: { host: 'x' } } }
    window.MathJax = hostConfig
    const failed = expect(loadMathJax()).rejects.toThrow('failed to load')
    script.dispatchEvent(new Event('error'))
    await failed
    expect(window.MathJax).toBe(hostConfig)
    expect(document.scripts[0]).toBe(script)
    const runtime = { typesetPromise: vi.fn() }
    window.MathJax = runtime
    expect(await loadMathJax()).toBe(runtime)
  })

  it('merges application config with built-in macros and extensions', async () => {
    configureMathJax({
      src: '/vendor/tex-chtml.js', timeout: 500,
      config: { tex: { macros: { RR: '\\mathbb{R}' }, packages: { '[+]': ['bbox'] } }, loader: { load: ['[tex]/bbox'] }, startup: { typeset: true } },
    })
    const promise = loadMathJax()
    expect(document.scripts[0].getAttribute('src')).toBe('/vendor/tex-chtml.js')
    expect(window.MathJax.tex.macros).toHaveProperty('blank')
    expect(window.MathJax.tex.macros.RR).toBe('\\mathbb{R}')
    expect(window.MathJax.loader.load).toEqual(expect.arrayContaining(['[tex]/enclose', '[tex]/bbox']))
    expect(window.MathJax.tex.packages['[+]']).toEqual(expect.arrayContaining(['color', 'bbox']))
    expect(window.MathJax.startup.typeset).toBe(false)
    expect(() => configureMathJax({ src: '/other.js' })).toThrow('before the first')
    readyOwnedRuntime()
    await promise
  })

  it('rejects invalid configuration before changing the page', () => {
    expect(() => configureMathJax({ timeout: 0 })).toThrow(TypeError)
    expect(() => configureMathJax({ src: '' })).toThrow(TypeError)
    expect(() => configureMathJax({ config: null })).toThrow(TypeError)
    expect(document.scripts).toHaveLength(0)
  })

  it('is safe to call during SSR without locking browser configuration', async () => {
    vi.stubGlobal('window', undefined)
    try {
      expect(await loadMathJax()).toBeNull()
      expect(() => configureMathJax({ timeout: 1000 })).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

it('does not mistake an unrelated startup script for MathJax', async () => {
  const unrelated = document.createElement('script')
  unrelated.src = '/app/startup.js'
  document.head.appendChild(unrelated)
  const promise = loadMathJax()
  expect(document.scripts).toHaveLength(2)
  readyOwnedRuntime()
  await promise
})
