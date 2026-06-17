import type { RenderSegment } from '../types'
import { STAGGER_STEP_MS } from '../types'
import { formatChar } from './format'
import { isWheel, planFor } from './stack'

export interface AnimContext {
  /** Measured cell height in px (one line of text). */
  cellHeight: number
  spin: { duration: number; easing: string }
  slide: { duration: number; easing: string }
}

/** Deferred animation: queued during build, launched once after layout. */
export type Pending = (ctx: AnimContext) => void

function glyph(char: string): HTMLElement {
  const g = document.createElement('span')
  g.className = 'cf-glyph'
  g.setAttribute('part', 'glyph')
  g.textContent = formatChar(char)
  return g
}

function makeCell(seg: RenderSegment, extraClass = ''): HTMLElement {
  const cell = document.createElement('span')
  cell.className = extraClass ? `cf-cell ${extraClass}` : 'cf-cell'
  cell.dataset.key = seg.key
  cell.dataset.char = seg.char
  cell.setAttribute('part', 'segment')
  return cell
}

function staticCell(seg: RenderSegment): HTMLElement {
  const cell = makeCell(seg)
  cell.appendChild(glyph(seg.char))
  return cell
}

function enteringCell(seg: RenderSegment, pending: Pending[]): HTMLElement {
  const cell = staticCell(seg)
  const delay =
    seg.runLength && seg.runLength > 1 ? (seg.runIndex ?? 0) * STAGGER_STEP_MS : 0

  pending.push((ctx) => {
    cell.animate(
      [
        { opacity: 0, transform: 'translateY(0.25em)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: ctx.slide.duration, easing: ctx.slide.easing, delay, fill: 'backwards' },
    )
  })
  return cell
}

function rollingCell(seg: RenderSegment, pending: Pending[]): HTMLElement {
  const plan = planFor(seg)!
  const wheel = isWheel(seg)
  const cell = makeCell(seg, wheel ? 'cf-cell--rolling' : '')

  // A normal-flow sizer (the resting glyph) owns the cell's width so it stays
  // constant; the multi-glyph stack floats above it and never affects layout.
  const sizer = glyph(seg.char)
  sizer.style.visibility = 'hidden'
  const stack = document.createElement('span')
  stack.className = 'cf-stack'
  for (const c of plan.chars) stack.appendChild(glyph(c))
  cell.append(sizer, stack)

  pending.push((ctx) => {
    const startY = -plan.startIdx * ctx.cellHeight
    const endY = -plan.endIdx * ctx.cellHeight
    const timing = wheel ? ctx.spin : ctx.slide

    stack.style.transform = `translateY(${startY}px)`
    const anim = stack.animate(
      [{ transform: `translateY(${startY}px)` }, { transform: `translateY(${endY}px)` }],
      { duration: timing.duration, easing: timing.easing, fill: 'forwards' },
    )
    // Drop the stack and reveal the resting sizer once the roll lands.
    anim.onfinish = () => {
      anim.cancel()
      stack.remove()
      sizer.style.visibility = ''
      cell.classList.remove('cf-cell--rolling')
    }
  })

  return cell
}

export function buildCell(
  seg: RenderSegment,
  animated: boolean,
  pending: Pending[],
): HTMLElement {
  if (seg.entering) {
    return animated ? enteringCell(seg, pending) : staticCell(seg)
  }
  if (animated && planFor(seg)) {
    return rollingCell(seg, pending)
  }
  return staticCell(seg)
}

export function reuseCell(
  seg: RenderSegment,
  animated: boolean,
  existing: Map<string, HTMLElement>,
  pending: Pending[],
): HTMLElement {
  const cell = existing.get(seg.key)
  // Unchanged, resting cells are reused untouched; anything that moves is rebuilt.
  if (cell && !seg.entering && seg.fromChar == null && cell.dataset.char === seg.char) {
    return cell
  }
  return buildCell(seg, animated, pending)
}

export function existingCellMap(root: HTMLElement): Map<string, HTMLElement> {
  const map = new Map<string, HTMLElement>()
  for (const el of root.querySelectorAll('.cf-cell[data-key]')) {
    if (el instanceof HTMLElement && el.dataset.key) map.set(el.dataset.key, el)
  }
  return map
}
