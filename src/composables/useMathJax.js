import { nextTick } from 'vue'
import { rewriteInlineCommandsInText } from '../latex/mathTextCommands.js'
import { loadMathJax } from './mathJaxLoader.js'

export { configureMathJax, loadMathJax } from './mathJaxLoader.js'

const states = new WeakMap()
const pending = new Set()
let scheduled = false
let running = false

function whenReady(mathJax, action) {
  // v4 coordinates DOM changes with host-side typesetting, too.
  return Promise.resolve().then(() => mathJax?.whenReady ? mathJax.whenReady(action) : action())
}

function takePending() {
  const jobs = [...pending].filter((state) => !state.disposed)
    .map((state) => ({ state, request: state.latest }))
  pending.clear()
  return jobs
}

async function flush() {
  scheduled = false
  if (running) return
  running = true
  try {
    while (pending.size) {
      let mathJax
      let jobs = []
      let failure
      try {
        mathJax = await loadMathJax()
        await whenReady(mathJax, () => {
          // Capture after startup, so edits during loading collapse to the latest content.
          jobs = takePending()
          for (const { state, request } of jobs) {
            state.mathJax = mathJax
            mathJax?.typesetClear?.([state.element])
            state.element.textContent = rewriteInlineCommandsInText(request.latex)
          }
        })
        if (jobs.length) {
          await mathJax?.typesetPromise(jobs.map(({ state }) => state.element))
        }
      } catch (error) {
        failure = error
        // A load failure occurs before the pending elements have been captured.
        if (!jobs.length) jobs = takePending()
      }

      // Do not mutate a container while MathJax (including host calls) is rendering it.
      await whenReady(mathJax, () => {
        for (const { state, request } of jobs) {
          try {
            if (state.disposed) {
              // An in-flight typeset may register new MathItems after unmount cleanup.
              mathJax?.typesetClear?.([state.element])
            } else if (request === state.latest && failure) {
              mathJax?.typesetClear?.([state.element])
              state.element.textContent = request.latex
            }
            if (!state.disposed && request === state.latest && failure) request.reject(failure)
            else request.resolve()
          } catch (error) {
            request.reject(error)
          }
        }
      }).catch((error) => {
        for (const { state, request } of jobs) {
          if (!state.disposed && request === state.latest) request.reject(error)
          else request.resolve()
        }
      })
    }
  } finally {
    running = false
  }
}

export function typesetMath(element, latex = '') {
  if (!element) return Promise.resolve()
  let state = states.get(element)
  if (!state) {
    state = { element, disposed: false, latest: null, mathJax: null }
    states.set(element, state)
  }
  if (state.disposed) return Promise.resolve()
  // Superseded callers finish quietly; only the current request can report an error.
  state.latest?.resolve()
  const promise = new Promise((resolve, reject) => {
    state.latest = { latex: latex || '', resolve, reject }
  })
  state.latest.promise = promise
  pending.add(state)
  if (!scheduled && !running) {
    scheduled = true
    queueMicrotask(() => {
      void flush()
    })
  }
  return promise
}

export function clearMath(element) {
  const state = states.get(element)
  if (!state) return
  state.disposed = true
  pending.delete(state)
  state.latest?.resolve()
  // Called from onBeforeUnmount while the old DOM is still present.
  state.mathJax?.typesetClear?.([element])
}

function requestsWithin(root) {
  const elements = [root, ...root.querySelectorAll('.mathjax-block')]
  return elements.map((element) => states.get(element))
    .filter((state) => state && !state.disposed && state.latest)
    .map((state) => state.latest)
}

/** Wait for current Vue updates and the latest renderer requests in this subtree. */
export async function waitForMathJax(root) {
  if (typeof document === 'undefined') return
  const scope = root ?? document
  await nextTick()
  let requests = requestsWithin(scope)
  while (true) {
    await Promise.all(requests.map((request) => request.promise))
    // Rendering or a concurrent edit can enqueue another Vue update / math request.
    await nextTick()
    const current = requestsWithin(scope)
    if (current.length === requests.length && current.every((request, index) => request === requests[index])) return
    requests = current
  }
}
