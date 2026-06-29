export type CharKind = 'digit' | 'letter' | 'other'

export type Preset = 'plate' | 'alnum'

export type FlowDirection = 'auto' | 'forward' | 'backward'

/** How a changed character moves: roll through an alphabet, or a direct swap. */
export type AnimKind = 'wheel-digit' | 'wheel-letter' | 'slide' | 'static'

export interface EffectTiming {
  duration?: number
  easing?: string
  delay?: number
}

export interface CharFlowOptions {
  preset?: Preset
  animated?: boolean
  direction?: FlowDirection
  spinTiming?: EffectTiming
  slideTiming?: EffectTiming
}

export type DiffOp =
  | { type: 'keep'; index: number; char: string; prevKey: number; region?: 'suffix' }
  | { type: 'replace'; index: number; from: string; to: string; prevKey: number }
  | { type: 'insert'; index: number; char: string }

export interface RenderSegment {
  key: string
  char: string
  kind: CharKind
  anim: AnimKind
  fromChar?: string
  fromKind?: CharKind
  entering?: boolean
  /** Index inside a consecutive insert run (for stagger). */
  runIndex?: number
  /** Length of the current insert run. */
  runLength?: number
}

export const DIGITS = '0123456789' as const
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' as const

export const DEFAULT_SPIN: Required<EffectTiming> = {
  duration: 520,
  easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
  delay: 0,
}

/** Used for direct swaps (non-roll) and for entering/exiting/shifting cells. */
export const DEFAULT_SLIDE: Required<EffectTiming> = {
  duration: 340,
  easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
  delay: 0,
}

/** Delay between cells in an insert run. */
export const STAGGER_STEP_MS = 16
