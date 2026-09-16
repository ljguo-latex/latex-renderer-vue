// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function tickUntil(check) {
  for (let i = 0; i < 50 && !check(); i++) await Promise.resolve()
  expect(check()).toBeTruthy()
}

let typesetMath, clearMath, waitForMathJax, runtime
beforeEach(async () => {
  vi.resetModules()
  document.body.innerHTML = ''
  runtime = {
    typesetClear: vi.fn(),
    typesetPromise: vi.fn().mockResolvedValue(),
    whenReady: vi.fn((action) => Promise.resolve().then(action)),
  }
  window.MathJax = runtime
  ;({ typesetMath, clearMath, waitForMathJax } = await import('../src/composables/useMathJax.js'))
})
afterEach(() => {
  delete window.MathJax
  document.body.innerHTML = ''
})
function element(text = '') {
  const el = document.createElement('div')
  el.textContent = text
  document.body.appendChild(el)
  return el
}

describe('MathJax rendering lifecycle', () => {
  it('clears old math before replacing DOM and batches containers in the same turn', async () => {
    const first = element('old first'), second = element('old second')
    const cleared = []
    runtime.typesetClear.mockImplementation(([el]) => cleared.push(el.textContent))
    await Promise.all([typesetMath(first, '$x$'), typesetMath(second, '$y$')])
    expect(cleared).toEqual(['old first', 'old second'])
    expect(runtime.typesetPromise).toHaveBeenCalledTimes(1)
    expect(runtime.typesetPromise).toHaveBeenCalledWith([first, second])
    expect(first.textContent).toBe('$x$')
  })

  it('coalesces rapid updates to the newest content', async () => {
    const el = element()
    await Promise.all([typesetMath(el, '$1$'), typesetMath(el, '$2$'), typesetMath(el, '$3$')])
    expect(runtime.typesetPromise).toHaveBeenCalledTimes(1)
    expect(el.textContent).toBe('$3$')
  })

  it('does not replace DOM during an in-flight render or expose its stale error', async () => {
    const active = deferred(), started = deferred()
    const el = element()
    runtime.typesetPromise.mockImplementationOnce(() => { started.resolve(); return active.promise })
    const old = typesetMath(el, '$old$')
    await started.promise
    const latest = typesetMath(el, '$latest$')
    expect(el.textContent).toBe('$old$')
    active.reject(new Error('stale failure'))
    await Promise.all([old, latest])
    expect(el.textContent).toBe('$latest$')
    expect(runtime.typesetPromise).toHaveBeenCalledTimes(2)
  })

  it('waits for host rendering before changing DOM', async () => {
    const host = deferred()
    const el = element('old')
    runtime.whenReady.mockImplementationOnce((action) => host.promise.then(action))
    const rendering = typesetMath(el, '$new$')
    await tickUntil(() => runtime.whenReady.mock.calls.length > 0)
    expect(el.textContent).toBe('old')
    host.resolve()
    await rendering
    expect(el.textContent).toBe('$new$')
  })

  it('clears partial output before restoring raw LaTeX on failure, then recovers', async () => {
    const el = element()
    const raw = '$\\text{\\paren{}}$'
    runtime.typesetPromise.mockImplementationOnce(() => {
      el.textContent = 'partial math'
      return Promise.reject(new Error('render failed'))
    })
    const cleared = []
    runtime.typesetClear.mockImplementation(([node]) => cleared.push(node.textContent))
    await expect(typesetMath(el, raw)).rejects.toThrow('render failed')
    expect(cleared).toContain('partial math')
    expect(el.textContent).toBe(raw)
    await typesetMath(el, '$ok$')
    expect(el.textContent).toBe('$ok$')
  })

  it('does not typeset an element disposed while startup is pending', async () => {
    const startup = deferred()
    runtime.startup = { promise: startup.promise }
    const el = element('original')
    const rendering = typesetMath(el, '$x$')
    await Promise.resolve()
    clearMath(el)
    el.remove()
    startup.resolve()
    await rendering
    await tickUntil(() => runtime.whenReady.mock.calls.length > 0)
    expect(runtime.typesetPromise).not.toHaveBeenCalled()
    expect(el.textContent).toBe('original')
  })

  it('clears immediately before unmount and again after an in-flight render finishes', async () => {
    const active = deferred(), started = deferred()
    const el = element()
    runtime.typesetPromise.mockImplementationOnce(() => { started.resolve(); return active.promise })
    const rendering = typesetMath(el, '$x$')
    await started.promise
    runtime.typesetClear.mockClear()
    clearMath(el)
    expect(runtime.typesetClear).toHaveBeenCalledWith([el])
    el.remove()
    active.resolve()
    await rendering
    await tickUntil(() => runtime.typesetClear.mock.calls.length === 2)
  })

  it('keeps requests settled when host synchronization rejects', async () => {
    runtime.whenReady.mockRejectedValue(new Error('host failed'))
    await expect(typesetMath(element(), '$x$')).rejects.toThrow('host failed')
  })
})

it('cleans up from the Vue component lifecycle and ignores completion after unmount', async () => {
  const { createApp, h, nextTick, ref } = await import('vue')
  const { default: MathJaxBlock } = await import('../src/components/MathJaxBlock.vue')
  const content = ref('$first$')
  const active = deferred(), started = deferred()
  runtime.typesetPromise.mockImplementationOnce(() => { started.resolve(); return active.promise })
  const app = createApp({ render: () => h(MathJaxBlock, { content: content.value }) })
  const host = element()
  app.mount(host)
  await started.promise
  const block = host.querySelector('.mathjax-block')
  content.value = '$second$'
  await nextTick()
  expect(block.textContent).toBe('$first$')
  runtime.typesetClear.mockClear()
  app.unmount()
  expect(runtime.typesetClear).toHaveBeenCalledWith([block])
  expect(host.innerHTML).toBe('')
  active.resolve()
  await tickUntil(() => runtime.typesetClear.mock.calls.length === 2)
  expect(runtime.typesetPromise).toHaveBeenCalledTimes(1)
})

it('falls back on startup failure and successfully renders a later update after recovery', async () => {
  const startup = deferred()
  runtime.startup = { promise: startup.promise }
  const el = element()
  const failed = expect(typesetMath(el, '$initial$')).rejects.toThrow('startup failed')
  await Promise.resolve()
  startup.reject(new Error('startup failed'))
  await failed
  expect(el.textContent).toBe('$initial$')
  runtime.startup.promise = Promise.resolve()
  await typesetMath(el, '$recovered$')
  expect(el.textContent).toBe('$recovered$')
  expect(runtime.typesetPromise).toHaveBeenCalledTimes(1)
})

describe('waitForMathJax', () => {
  it('waits for renderer work even when a host queue barrier has already completed', async () => {
    const host = deferred(), active = deferred(), started = deferred()
    let chain = host.promise
    function enqueue(action) {
      const promise = chain.then(action)
      chain = promise.catch(() => {})
      return promise
    }
    runtime.whenReady.mockImplementation(enqueue)
    runtime.typesetPromise.mockImplementation(elements => enqueue(async () => {
      if (!elements.length) return
      started.resolve()
      await active.promise
      elements[0].textContent = 'finished'
    }))
    const el = element()
    const render = typesetMath(el, '$x$')
    await tickUntil(() => runtime.whenReady.mock.calls.length > 0)
    const legacyBarrier = runtime.typesetPromise([])
    let complete = false
    const waiting = waitForMathJax(el).then(() => { complete = true })
    host.resolve()
    await legacyBarrier
    await started.promise
    expect(complete).toBe(false)
    active.resolve()
    await Promise.all([render, waiting])
    expect(el.textContent).toBe('finished')
  })

  it('follows replacements made while waiting instead of resolving on a superseded request', async () => {
    const el = element(), active = deferred(), started = deferred(), latest = deferred(), latestStarted = deferred()
    runtime.typesetPromise.mockImplementationOnce(() => { started.resolve(); return active.promise })
      .mockImplementationOnce(() => { latestStarted.resolve(); return latest.promise })
    const first = typesetMath(el, '$first$')
    await started.promise
    let complete = false
    const waiting = waitForMathJax(el).then(() => { complete = true })
    const second = typesetMath(el, '$second$')
    active.resolve()
    await latestStarted.promise
    expect(complete).toBe(false)
    latest.resolve()
    await Promise.all([first, second, waiting])
    expect(el.textContent).toBe('$second$')
  })

  it('includes pending Vue updates without requiring the caller to await nextTick', async () => {
    const { createApp, h, ref } = await import('vue')
    const { default: MathJaxBlock } = await import('../src/components/MathJaxBlock.vue')
    const content = ref('$old$'), host = element()
    const app = createApp({ render: () => h(MathJaxBlock, { content: content.value }) })
    app.mount(host)
    await waitForMathJax(host)
    content.value = '$new$'
    await waitForMathJax(host)
    expect(host.textContent).toBe('$new$')
    app.unmount()
  })

  it('rejects a failed render in scope but ignores a failed sibling', async () => {
    const good = element(), bad = element()
    await typesetMath(good, '$ok$')
    runtime.typesetPromise.mockRejectedValueOnce(new Error('failed formula'))
    await expect(typesetMath(bad, '$bad$')).rejects.toThrow('failed formula')
    await expect(waitForMathJax(good)).resolves.toBeUndefined()
    await expect(waitForMathJax(bad)).rejects.toThrow('failed formula')
  })

  it('resolves for an empty scope without starting the loader', async () => {
    delete window.MathJax
    await waitForMathJax(element())
    expect(document.getElementById('mathjax-script')).toBeNull()
  })

  it('stops waiting when a pending component is removed', async () => {
    const active = deferred(), started = deferred(), el = element()
    runtime.typesetPromise.mockImplementationOnce(() => { started.resolve(); return active.promise })
    const render = typesetMath(el, '$x$')
    await started.promise
    const waiting = waitForMathJax(el)
    clearMath(el)
    el.remove()
    await waiting
    active.resolve()
    await render
    await tickUntil(() => runtime.typesetClear.mock.calls.length === 3)
  })
})
