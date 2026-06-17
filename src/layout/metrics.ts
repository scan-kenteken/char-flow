/** Sync layout CSS variables from computed host styles. */
export function syncMetrics(host: HTMLElement): void {
  const { letterSpacing } = getComputedStyle(host)
  host.style.setProperty('--cf-letter-gap', letterSpacing === 'normal' ? '0px' : letterSpacing)
}

export function observeMetrics(host: HTMLElement): () => void {
  const run = (): void => syncMetrics(host)

  run()

  const ro = new ResizeObserver(run)
  ro.observe(host)

  document.fonts?.ready.then(run).catch(() => undefined)

  return () => ro.disconnect()
}
