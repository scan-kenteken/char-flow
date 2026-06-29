import type { EffectTiming, FlowDirection, Preset, RollDirection } from './types'
import { DEFAULT_SLIDE, DEFAULT_SPIN } from './types'

export const STYLES = `
:host {
  display: inline-block;
  line-height: inherit;
  font-variant-numeric: tabular-nums;
  --cf-cell-height: 1lh;
  --cf-letter-gap: 0px;
  --cf-spin-duration: ${DEFAULT_SPIN.duration}ms;
  --cf-spin-easing: ${DEFAULT_SPIN.easing};
  --cf-slide-duration: ${DEFAULT_SLIDE.duration}ms;
  --cf-slide-easing: ${DEFAULT_SLIDE.easing};
}

.root {
  display: inline;
  position: relative;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.visual {
  display: inline-block;
  position: relative;
  white-space: nowrap;
}

.cf-cell {
  display: inline-block;
  height: var(--cf-cell-height);
  line-height: var(--cf-cell-height);
  vertical-align: baseline;
  overflow: hidden;
  position: relative;
  text-align: center;
}

.cf-cell + .cf-cell {
  margin-left: var(--cf-letter-gap);
}

/* Soft top/bottom fade only while a wheel is mid-roll. */
.cf-cell--rolling {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 18%,
    #000 82%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 18%,
    #000 82%,
    transparent 100%
  );
}

.cf-stack {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  will-change: transform;
}

.cf-glyph {
  display: block;
  height: var(--cf-cell-height);
  line-height: var(--cf-cell-height);
  text-align: center;
}
`.trim()

export function applyPresetStyle(host: HTMLElement, preset: Preset): void {
  if (preset === 'plate') {
    host.style.textTransform = 'uppercase'
    host.style.letterSpacing = '0.04em'
  } else {
    host.style.textTransform = ''
    host.style.letterSpacing = ''
  }
}

export function applyTimings(
  host: HTMLElement,
  spin?: EffectTiming,
  slide?: EffectTiming,
): void {
  const s = { ...DEFAULT_SPIN, ...spin }
  const l = { ...DEFAULT_SLIDE, ...slide }
  host.style.setProperty('--cf-spin-duration', `${s.duration}ms`)
  host.style.setProperty('--cf-spin-easing', s.easing)
  host.style.setProperty('--cf-slide-duration', `${l.duration}ms`)
  host.style.setProperty('--cf-slide-easing', l.easing)
}

export function parsePreset(v: string | null): Preset {
  return v === 'plate' ? 'plate' : 'alnum'
}

export function parseDirection(v: string | null): FlowDirection {
  if (v === 'forward' || v === 'backward') return v
  return 'auto'
}

export function parseRoll(v: string | null): RollDirection {
  if (v === 'up' || v === 'down') return v
  return 'auto'
}
