import assert from 'node:assert/strict'
import { planFor, rollsUp } from '../src/render/stack.ts'
import type { RenderSegment } from '../src/types.ts'

function wheel(from: string, to: string, direction: 'auto' | 'forward' | 'backward', roll: 'auto' | 'up' | 'down') {
  const seg: RenderSegment = {
    key: 't',
    char: to,
    kind: 'digit',
    anim: 'wheel-digit',
    fromChar: from,
  }
  return planFor(seg, direction, roll)!
}

const up = wheel('2', '3', 'forward', 'auto')
assert.equal(rollsUp(up), true, 'forward path rolls up by default')

const down = wheel('2', '3', 'forward', 'down')
assert.equal(rollsUp(down), false, 'roll=down inverts a forward path')
assert.equal(down.chars[down.endIdx], '3', 'lands on target glyph')

const shortBack = wheel('3', '2', 'backward', 'down')
assert.equal(rollsUp(shortBack), false, 'backward path already rolls down')

const longBack = wheel('2', '3', 'backward', 'down')
assert.equal(longBack.chars.length, 10, 'backward path keeps the long wheel route')
assert.equal(rollsUp(longBack), false, 'roll=down stays downward on long path')

console.log('roll tests ok')
