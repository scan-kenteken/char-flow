import { spinDirection, wheelIndex } from '../classify'
import { DIGITS, LETTERS } from '../types'
import type { FlowDirection, RenderSegment, RollDirection } from '../types'
import { displayLetter, formatChar } from './format'

/**
 * A vertical column of glyphs plus the start/end positions to slide between.
 * Every animated transition — digit roll, letter roll, or text replacement —
 * is expressed as this one primitive: a stack translated along Y.
 */
export interface StackPlan {
  /** Glyphs in visual order, top to bottom. */
  chars: string[]
  /** Index showing at the start of the animation. */
  startIdx: number
  /** Index showing at the end of the animation. */
  endIdx: number
}

function charForIndex(i: number, kind: 'digit' | 'letter', target: string): string {
  if (kind === 'digit') return DIGITS[i]!
  return displayLetter(LETTERS[i]!, target)
}

/** Glyphs along the shortest path from `from` to `to` around the alphabet. */
function wheelPlan(
  from: string,
  to: string,
  kind: 'digit' | 'letter',
  direction: FlowDirection,
): StackPlan {
  const n = kind === 'letter' ? LETTERS.length : DIGITS.length
  const a = wheelIndex(from, kind)
  const b = wheelIndex(to, kind)
  const dir = spinDirection(from, to, kind, direction)

  const path: string[] = []
  for (let i = a; ; i = (i + dir + n) % n) {
    path.push(charForIndex(i, kind, to))
    if (i === b) break
  }

  // dir +1: endIdx > startIdx (stack moves up). dir -1: rolls down.
  if (dir === 1) return { chars: path, startIdx: 0, endIdx: path.length - 1 }
  return { chars: [...path].reverse(), startIdx: path.length - 1, endIdx: 0 }
}

export function rollsUp(plan: StackPlan): boolean {
  return plan.endIdx > plan.startIdx
}

export function invertVisual(plan: StackPlan): StackPlan {
  const max = plan.chars.length - 1
  return {
    chars: [...plan.chars].reverse(),
    startIdx: max - plan.startIdx,
    endIdx: max - plan.endIdx,
  }
}

/** Flip glyph order and indices so the same wheel path scrolls the other way. */
export function applyRoll(plan: StackPlan, roll: RollDirection): StackPlan {
  if (roll === 'auto') return plan
  const up = rollsUp(plan)
  if (roll === 'up' && !up) return invertVisual(plan)
  if (roll === 'down' && up) return invertVisual(plan)
  return plan
}

/** A single-step slide between two arbitrary glyphs (text replacement / morph). */
function slidePlan(from: string, to: string): StackPlan {
  return { chars: [formatChar(from), formatChar(to)], startIdx: 0, endIdx: 1 }
}

/** Build the plan for a segment, or null if there is nothing to animate. */
export function planFor(
  seg: RenderSegment,
  direction: FlowDirection = 'auto',
  roll: RollDirection = 'auto',
): StackPlan | null {
  if (seg.fromChar == null || seg.fromChar === seg.char) return null
  if (seg.anim === 'wheel-digit') {
    return applyRoll(wheelPlan(seg.fromChar, seg.char, 'digit', direction), roll)
  }
  if (seg.anim === 'wheel-letter') {
    return applyRoll(wheelPlan(seg.fromChar, seg.char, 'letter', direction), roll)
  }
  return slidePlan(seg.fromChar, seg.char)
}

export function isWheel(seg: RenderSegment): boolean {
  return seg.anim === 'wheel-digit' || seg.anim === 'wheel-letter'
}
