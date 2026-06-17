import type { DiffOp } from './types'

function levenshteinMatrix(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  )
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!
      } else {
        dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!)
      }
    }
  }

  return dp
}

function backtrackOps(dp: number[][], a: string[], b: string[], keyOffset: number): DiffOp[] {
  const raw: Array<'M' | 'I' | 'D' | 'R'> = []
  let i = a.length
  let j = b.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      raw.push('M')
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      raw.push('R')
      i--
      j--
    } else if (j > 0 && dp[i]![j] === dp[i]![j - 1]! + 1) {
      raw.push('I')
      j--
    } else {
      raw.push('D')
      i--
    }
  }
  raw.reverse()

  const ops: DiffOp[] = []
  let ai = 0
  let bi = 0
  for (const step of raw) {
    if (step === 'M') {
      ops.push({ type: 'keep', index: bi, char: b[bi]!, prevKey: keyOffset + ai })
      ai++
      bi++
    } else if (step === 'R') {
      ops.push({
        type: 'replace',
        index: bi,
        from: a[ai]!,
        to: b[bi]!,
        prevKey: keyOffset + ai,
      })
      ai++
      bi++
    } else if (step === 'I') {
      ops.push({ type: 'insert', index: bi, char: b[bi]! })
      bi++
    } else {
      ai++
    }
  }
  return ops
}

/** Shortest edit script via Wagner-Fischer. Deletes are omitted (cells simply disappear). */
export function diffChars(prev: string, next: string, keyOffset = 0): DiffOp[] {
  const a = [...prev]
  const b = [...next]
  const dp = levenshteinMatrix(a, b)
  return backtrackOps(dp, a, b, keyOffset)
}

function reindexOps(ops: DiffOp[], startIdx: number): DiffOp[] {
  let outIdx = startIdx
  const result: DiffOp[] = []
  for (const op of ops) {
    if (op.type === 'insert') {
      result.push({ type: 'insert', index: outIdx++, char: op.char })
    } else if (op.type === 'keep') {
      const keep: DiffOp = {
        type: 'keep',
        index: outIdx++,
        char: op.char,
        prevKey: op.prevKey,
      }
      if (op.region) keep.region = op.region
      result.push(keep)
    } else if (op.type === 'replace') {
      result.push({
        type: 'replace',
        index: outIdx++,
        from: op.from,
        to: op.to,
        prevKey: op.prevKey,
      })
    }
  }
  return result
}

/**
 * Slot-by-slot alignment for same-length values (e.g. license plates). Every
 * position rolls from its old char to its new one, so a dash moving from one
 * group to another rolls in place instead of being deleted and re-inserted.
 */
function diffAligned(prev: string, next: string): DiffOp[] {
  const ops: DiffOp[] = []
  for (let i = 0; i < next.length; i++) {
    const from = prev[i]!
    const to = next[i]!
    if (from === to) {
      ops.push({ type: 'keep', index: i, char: to, prevKey: i })
    } else {
      ops.push({ type: 'replace', index: i, from, to, prevKey: i })
    }
  }
  return ops
}

export function diff(prev: string, next: string): DiffOp[] {
  if (prev.length === next.length) return diffAligned(prev, next)

  let pre = 0
  while (pre < prev.length && pre < next.length && prev[pre] === next[pre]) pre++

  let suf = 0
  while (
    suf < prev.length - pre &&
    suf < next.length - pre &&
    prev[prev.length - 1 - suf] === next[next.length - 1 - suf]
  ) {
    suf++
  }

  const ops: DiffOp[] = []
  let outIdx = 0

  for (let i = 0; i < pre; i++) {
    ops.push({ type: 'keep', index: outIdx++, char: next[i]!, prevKey: i })
  }

  const midPrev = prev.slice(pre, prev.length - suf)
  const midNext = next.slice(pre, next.length - suf)
  const midMax = Math.max(midPrev.length, midNext.length)

  if (midMax > 0) {
    const midDist = levenshteinMatrix([...midPrev], [...midNext])[midPrev.length]![midNext.length]!
    const middleUnrelated = midDist / midMax > 0.4

    if (middleUnrelated) {
      for (let i = 0; i < midNext.length; i++) {
        ops.push({ type: 'insert', index: outIdx++, char: midNext[i]! })
      }
    } else {
      ops.push(...reindexOps(diffChars(midPrev, midNext, pre), outIdx))
      outIdx += midNext.length
    }
  }

  const suffixStart = Math.max(pre, next.length - suf)
  for (let i = suffixStart; i < next.length; i++) {
    const prevIdx = prev.length - suf + (i - (next.length - suf))
    if (prevIdx < pre) continue
    ops.push({
      type: 'keep',
      index: outIdx++,
      char: next[i]!,
      prevKey: prevIdx,
      region: 'suffix',
    })
  }

  return ops
}
