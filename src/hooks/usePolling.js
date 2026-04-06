import { useEffect, useRef } from 'react'

/**
 * Generic polling hook — calls callback immediately then every intervalMs.
 * Stops when enabled is false or component unmounts.
 */
export function usePolling(callback, intervalMs, enabled = true) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return
    savedCallback.current()
    const id = setInterval(() => savedCallback.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
