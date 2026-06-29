import type { AnimKind, CharKind, FlowDirection } from './types'

export function classify(char: string): CharKind {
  if (!char) return 'other'
  const code = char.charCodeAt(0)
  if (code >= 48 && code <= 57) return 'digit'
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return 'letter'
  return 'other'
}

export function wheelIndex(char: string, kind: CharKind): number {
  if (kind === 'digit') return char.charCodeAt(0) - 48
  const upper = char.toUpperCase()
  return upper.charCodeAt(0) - 65
}

/** Resting animation tag for an unchanged character. */
export function animForChar(char: string): AnimKind {
  const k = classify(char)
  if (k === 'digit') return 'wheel-digit'
  if (k === 'letter') return 'wheel-letter'
  return 'static'
}

/**
 * Same alphabet (digit→digit, letter→letter) rolls through that alphabet.
 * Everything else (cross-kind, or any change involving punctuation) is a
 * direct two-glyph roll: old slides out, new slides in, no in-betweens.
 */
export function animForReplace(from: string, to: string): AnimKind {
  const fk = classify(from)
  const tk = classify(to)
  if (fk === 'digit' && tk === 'digit') return 'wheel-digit'
  if (fk === 'letter' && tk === 'letter') return 'wheel-letter'
  return 'slide'
}

export function spinDirection(
  from: string,
  to: string,
  kind: CharKind,
  direction: FlowDirection = 'auto',
): 1 | -1 {
  const a = wheelIndex(from, kind)
  const b = wheelIndex(to, kind)
  if (a === b) return 1
  if (direction === 'forward') return 1
  if (direction === 'backward') return -1
  const n = kind === 'letter' ? 26 : 10
  const up = (b - a + n) % n
  const down = (a - b + n) % n
  return up <= down ? 1 : -1
}
