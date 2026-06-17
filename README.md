# CharFlow

Lightweight animated alphanumeric text for license plates, codes, and flowing paragraphs.

Digits and letters roll through their alphabet on change; inserts and deletes slide in and out. Built as a web component with an optional React wrapper.

<p align="center">
  <img src="./assets/demo.gif" alt="CharFlow demo: animated text and license plate" width="720" />
</p>

## Install

```sh
npm install char-flow
```

## Web component

Import the element entry to register `<char-flow>`:

```html
<script type="module">
  import 'char-flow/element'
</script>

<char-flow value="G-123-BB" preset="plate"></char-flow>
```

Or use the main entry (registers the element and re-exports helpers):

```ts
import 'char-flow'
```

### Attributes

| Attribute | Default | Description |
|---|---|---|
| `value` | `""` | Text to display |
| `preset` | `alnum` | `plate` (uppercase, tabular) or `alnum` |
| `animated` | `true` | Set to `false` to disable motion |

Animations respect `prefers-reduced-motion`.

### Styling

The component uses shadow DOM. Target the host or the exposed `part`:

```css
char-flow.plate {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

char-flow::part(root) {
  /* inner shell */
}
```

Timing can be adjusted from JavaScript:

```ts
const el = document.querySelector('char-flow')
el.spinTiming = { duration: 520, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' }
el.slideTiming = { duration: 340 }
```

## React

Register the element first, then use the wrapper:

```tsx
import 'char-flow/element'
import { CharFlow } from 'char-flow/react'

export function Plate({ value }: { value: string }) {
  return <CharFlow value={value} preset="plate" className="plate" />
}
```

React is an optional peer dependency (`>=18`).

## Low-level API

The main entry also exports diffing and classification utilities:

```ts
import { diff, classify } from 'char-flow'

diff('ABC-100', 'ABC-9')
classify('G')
```

## Demo

```sh
npm run demo
```

Opens a local demo at `http://localhost:3000/demo/`.

## Development

```sh
npm install
npm run build
npm run typecheck
```

## License

MIT
