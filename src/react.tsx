import { createElement, useEffect, useRef, type HTMLAttributes } from 'react'
import type { CharFlowElement } from './element'
import type { EffectTiming, FlowDirection, Preset, RollDirection } from './types'

export type { CharFlowElement }
export type { Preset, EffectTiming, FlowDirection, RollDirection } from './types'

function assertRegistered(): void {
  if (typeof customElements !== 'undefined' && !customElements.get('char-flow')) {
    throw new Error(
      'CharFlow: import "char-flow/element" before using the React wrapper.',
    )
  }
}

export interface CharFlowProps extends Omit<HTMLAttributes<CharFlowElement>, 'value'> {
  value: string
  preset?: Preset
  animated?: boolean
  direction?: FlowDirection
  roll?: RollDirection
  spinTiming?: EffectTiming
  slideTiming?: EffectTiming
}

export function CharFlow({
  value,
  preset = 'alnum',
  animated = true,
  direction = 'auto',
  roll = 'auto',
  spinTiming,
  slideTiming,
  className,
  style,
  ...rest
}: CharFlowProps) {
  const ref = useRef<CharFlowElement>(null)

  useEffect(() => {
    assertRegistered()
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.value !== value) el.value = value
  }, [value])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.preset = preset
    el.animated = animated
    el.direction = direction
    el.roll = roll
    if (spinTiming !== undefined) el.spinTiming = spinTiming
    if (slideTiming !== undefined) el.slideTiming = slideTiming
  }, [preset, animated, direction, roll, spinTiming, slideTiming])

  return createElement('char-flow', {
    ref,
    value,
    preset,
    direction,
    roll,
    ...(animated ? {} : { animated: 'false' }),
    class: className,
    style,
    ...rest,
  })
}
