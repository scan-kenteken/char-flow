import { animForChar, animForReplace, classify } from './classify'
import { diff } from './diff'
import type { DiffOp, RenderSegment } from './types'

let keySeq = 0
function nextKey(prefix: string): string {
  return `${prefix}-${++keySeq}`
}

function keyForPrev(prevKeys: string[], prevKey: number, fallback: string): string {
  return prevKeys[prevKey] ?? nextKey(fallback)
}

function assignEnteringRuns(segments: RenderSegment[]): RenderSegment[] {
  const out = segments.map((s) => ({ ...s }))
  let i = 0

  while (i < out.length) {
    const seg = out[i]!
    if (!seg.entering) {
      i++
      continue
    }
    let j = i + 1
    while (j < out.length && out[j]!.entering) j++
    const len = j - i
    for (let k = i; k < j; k++) {
      out[k] = { ...out[k]!, runIndex: k - i, runLength: len }
    }
    i = j
  }

  return out
}

function makeSegment(
  char: string,
  key: string,
  extra: Partial<RenderSegment> = {},
): RenderSegment {
  return {
    key,
    char,
    kind: classify(char),
    anim: extra.anim ?? animForChar(char),
    ...extra,
  }
}

function opsToSegments(ops: DiffOp[], prevKeys: string[]): RenderSegment[] {
  const segments: RenderSegment[] = []

  for (const op of ops) {
    if (op.type === 'keep') {
      segments.push(makeSegment(op.char, keyForPrev(prevKeys, op.prevKey, 'k')))
      continue
    }

    if (op.type === 'replace') {
      segments.push(
        makeSegment(op.to, keyForPrev(prevKeys, op.prevKey, 'r'), {
          anim: animForReplace(op.from, op.to),
          fromChar: op.from,
          fromKind: classify(op.from),
        }),
      )
      continue
    }

    if (op.type === 'insert') {
      segments.push(makeSegment(op.char, nextKey('i'), { entering: true }))
    }
  }

  return assignEnteringRuns(segments)
}

export function buildSegments(
  prev: string,
  next: string,
  prevSegmentKeys: string[],
): { segments: RenderSegment[]; keys: string[] } {
  const segments = opsToSegments(diff(prev, next), prevSegmentKeys)
  return { segments, keys: segments.map((s) => s.key) }
}

export function initialSegments(value: string): {
  segments: RenderSegment[]
  keys: string[]
} {
  const segments = [...value].map((char, i) => makeSegment(char, nextKey(`s${i}`)))
  return { segments, keys: segments.map((s) => s.key) }
}
