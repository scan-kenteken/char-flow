import type { FlowDirection, RenderSegment, RollDirection } from '../types'
import { existingCellMap, reuseCell, type AnimContext, type Pending } from './cell'

function ms(value: string): number {
  const n = parseFloat(value)
  if (!Number.isFinite(n)) return 0
  return value.trim().endsWith('ms') ? n : n * 1000
}

function readContext(visual: HTMLElement): AnimContext {
  const cs = getComputedStyle(visual)
  const sample = visual.querySelector('.cf-glyph')
  return {
    cellHeight: sample instanceof HTMLElement ? sample.offsetHeight : 0,
    spin: {
      duration: ms(cs.getPropertyValue('--cf-spin-duration')),
      easing: cs.getPropertyValue('--cf-spin-easing').trim(),
    },
    slide: {
      duration: ms(cs.getPropertyValue('--cf-slide-duration')),
      easing: cs.getPropertyValue('--cf-slide-easing').trim(),
    },
  }
}

/** x offset (relative to the visual box) of each existing cell, keyed by data-key. */
function measureX(visual: HTMLElement, cells: Iterable<HTMLElement>): Map<string, number> {
  const base = visual.getBoundingClientRect().left
  const out = new Map<string, number>()
  for (const el of cells) {
    if (el.dataset.key) out.set(el.dataset.key, el.getBoundingClientRect().left - base)
  }
  return out
}

export function mountVisual(
  visual: HTMLElement,
  segments: RenderSegment[],
  animated: boolean,
  direction: FlowDirection = 'auto',
  roll: RollDirection = 'auto',
): void {
  const existing = existingCellMap(visual)

  // FLIP "First": record where every current cell sits before we touch the DOM.
  const firstX = animated ? measureX(visual, existing.values()) : new Map<string, number>()

  const pending: Pending[] = []
  const nodes: HTMLElement[] = []
  const survivors = new Set<string>()

  for (const seg of segments) {
    const node = reuseCell(seg, animated, existing, pending, direction, roll)
    survivors.add(seg.key)
    nodes.push(node)
  }

  // Cells present before but gone now: animate them out instead of popping.
  const exiting: HTMLElement[] = []
  if (animated) {
    for (const [key, el] of existing) {
      if (!survivors.has(key)) exiting.push(el)
    }
  }

  // Exiting cells stay in the DOM (absolutely positioned) so they don't affect width.
  visual.replaceChildren(...nodes, ...exiting)

  if (!pending.length && !exiting.length) return

  const ctx = readContext(visual)

  if (animated) {
    // FLIP "Last/Invert/Play": slide survivors from their old x back to the new one.
    const lastX = measureX(visual, nodes)
    for (const node of nodes) {
      const key = node.dataset.key
      if (!key) continue
      const before = firstX.get(key)
      const after = lastX.get(key)
      if (before === undefined || after === undefined) continue
      const dx = before - after
      if (Math.abs(dx) < 0.5) continue
      node.animate(
        [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }],
        { duration: ctx.slide.duration, easing: ctx.slide.easing },
      )
    }

    for (const el of exiting) {
      const x = firstX.get(el.dataset.key!)
      const width = el.offsetWidth
      el.style.position = 'absolute'
      el.style.top = '0'
      el.style.left = `${x ?? 0}px`
      el.style.width = `${width}px`
      el.style.pointerEvents = 'none'
      const out = el.animate(
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-0.25em)' },
        ],
        { duration: ctx.slide.duration, easing: ctx.slide.easing, fill: 'forwards' },
      )
      out.onfinish = () => el.remove()
    }
  }

  for (const run of pending) run(ctx)
}
