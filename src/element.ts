import { observeMetrics, syncMetrics } from './layout/metrics'
import { mountVisual } from './render/mount'
import { buildSegments, initialSegments } from './segments'
import { applyPresetStyle, applyTimings, parseDirection, parsePreset, parseRoll, STYLES } from './styles'
import type { EffectTiming, FlowDirection, Preset, RollDirection } from './types'

const TAG = 'char-flow'

export class CharFlowElement extends HTMLElement {
  static observedAttributes = ['value', 'preset', 'animated', 'direction', 'roll'] as const

  #sr!: HTMLElement
  #visual!: HTMLElement
  #prevValue = ''
  #keys: string[] = []
  #motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  #onMotionChange = (): void => this.#syncReduced()
  #stopMetrics: (() => void) | undefined

  #spinTiming: EffectTiming | undefined
  #slideTiming: EffectTiming | undefined

  connectedCallback(): void {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' })
      const style = document.createElement('style')
      style.textContent = STYLES
      const shell = document.createElement('div')
      shell.className = 'root'
      shell.setAttribute('part', 'root')

      this.#sr = document.createElement('span')
      this.#sr.className = 'sr'
      this.#sr.setAttribute('aria-live', 'polite')
      this.#sr.setAttribute('aria-atomic', 'true')

      this.#visual = document.createElement('span')
      this.#visual.className = 'visual'
      this.#visual.setAttribute('aria-hidden', 'true')

      shell.append(this.#sr, this.#visual)
      root.append(style, shell)
    }

    this.#motionQuery.addEventListener('change', this.#onMotionChange)
    this.#syncReduced()
    this.#applyOptions()
    this.#stopMetrics = observeMetrics(this)
    this.#render(true)
  }

  disconnectedCallback(): void {
    this.#motionQuery.removeEventListener('change', this.#onMotionChange)
    this.#stopMetrics?.()
    this.#stopMetrics = undefined
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'value') {
      this.#render(false)
      return
    }
    this.#applyOptions()
    if (name === 'animated') this.#render(false)
  }

  get value(): string {
    return this.getAttribute('value') ?? ''
  }

  set value(v: string) {
    this.setAttribute('value', v)
  }

  get preset(): Preset {
    return parsePreset(this.getAttribute('preset'))
  }

  set preset(v: Preset) {
    this.setAttribute('preset', v)
  }

  get animated(): boolean {
    return this.getAttribute('animated') !== 'false'
  }

  set animated(v: boolean) {
    if (v) this.removeAttribute('animated')
    else this.setAttribute('animated', 'false')
  }

  get direction(): FlowDirection {
    return parseDirection(this.getAttribute('direction'))
  }

  set direction(v: FlowDirection) {
    this.setAttribute('direction', v)
  }

  get roll(): RollDirection {
    return parseRoll(this.getAttribute('roll'))
  }

  set roll(v: RollDirection) {
    this.setAttribute('roll', v)
  }

  set spinTiming(t: EffectTiming | undefined) {
    this.#spinTiming = t
    this.#applyOptions()
  }

  set slideTiming(t: EffectTiming | undefined) {
    this.#slideTiming = t
    this.#applyOptions()
  }

  #canAnimate(): boolean {
    if (!this.animated) return false
    if (this.#motionQuery.matches) return false
    return true
  }

  #syncReduced(): void {
    if (this.#motionQuery.matches) this.dataset.reduced = ''
    else delete this.dataset.reduced
  }

  #applyOptions(): void {
    applyPresetStyle(this, this.preset)
    applyTimings(this, this.#spinTiming, this.#slideTiming)
    syncMetrics(this)
  }

  #render(initial: boolean): void {
    const next = this.value
    this.#sr.textContent = next

    const animated = this.#canAnimate() && !initial

    let segments
    if (initial || !this.#prevValue) {
      const init = initialSegments(next)
      segments = init.segments
      this.#keys = init.keys
    } else if (this.#prevValue === next) {
      return
    } else {
      const built = buildSegments(this.#prevValue, next, this.#keys)
      segments = built.segments
      this.#keys = built.keys
    }

    mountVisual(this.#visual, segments, animated, this.direction, this.roll)
    this.#prevValue = next
  }
}

export function defineCharFlow(tag = TAG): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, CharFlowElement)
  }
}

defineCharFlow()

declare global {
  interface HTMLElementTagNameMap {
    'char-flow': CharFlowElement
  }
}

export { TAG }
