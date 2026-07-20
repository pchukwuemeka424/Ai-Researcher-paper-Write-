/**
 * Trailing debounce with a `flush()` to force any pending call immediately.
 * Used for autosave: keystrokes coalesce, but switching pages flushes at once
 * so nothing is lost.
 */
export interface Debounced<A extends unknown[]> {
  (...args: A): void
  flush: () => void
  cancel: () => void
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: A | null = null

  const debounced = ((...args: A) => {
    lastArgs = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const args2 = lastArgs
      lastArgs = null
      if (args2) fn(...args2)
    }, wait)
  }) as Debounced<A>

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (lastArgs) {
      const args = lastArgs
      lastArgs = null
      fn(...args)
    }
  }

  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    lastArgs = null
  }

  return debounced
}
