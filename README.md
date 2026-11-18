# Stillflow

[![npm version](https://img.shields.io/npm/v/stillflow.engine)](https://www.npmjs.com/package/stillflow.engine)
[![bundle size](https://img.shields.io/bundlephobia/minzip/stillflow.engine)](https://bundlephobia.com/package/stillflow.engine@0.6.5)
[![dependencies](https://img.shields.io/depfu/dependencies/github/SampleUserD%2FStillflow.Engine)](https://npmgraph.js.org/?q=stillflow.engine)
[![license](https://img.shields.io/npm/l/stillflow.engine)](./LICENSE)

A headless, transaction-based UI engine with AOT compilation, designed for predictable performance and minimal memory overhead (~2.8 kB gzipped, zero runtime dependencies).

---

## Why Stillflow?

Built to achieve explicit control over the application lifecycle with predictable performance and out-of-the-box serializable state, Stillflow **does not use a Virtual DOM**. Instead of unpredictable $O(n)$ VDOM diffing, it compiles JSX ahead-of-time into flat bytecode instructions and updates the DOM directly through atomic transactions.

---

## Philosophy

$$\text{UI} = \text{State} + \text{Projections} + \text{Bindings} + \text{Feedback Loop}$$

* **UI is a subset of State:** Real applications deal with user and document events (`click`, `input`, `load`, etc.), meaning state cannot be fully reconstructed from the UI alone.
* **Map-State as a Single Source of Truth:** Global state is modeled as a clean, serializable structure ("map-state") free of symbols, functions, or opaque class instances.
* **Explicit Reactivity over Implicit Magic:** Stillflow uses an explicit `commit()` boundary where mutations accumulate in double-buffered queues and apply atomically.

---

## Key Features

1. **AOT Compilation & Bytecode IR** — Compiles JSX inside the `$()` entry point into flat bytecode instructions at build time.
2. **Transactional Kernel** — Explicit `commit()`, double-buffered delta queues, and atomic updates.
3. **Keyless List Reconciliation via Fenwick Trees** — Built-in `Flushable` collections backed by resizable `Int32Array` Fenwick trees map logical indices to physical DOM nodes in $O(\log n)$ time.
4. **Headless Core** — Completely decoupled from the DOM to target custom renderers.
5. **Type-Safe JSX** — Full TypeScript inference and autocomplete for DOM properties and directives.

---

## Installation

```bash
npm install stillflow.engine
```

### Vite & TypeScript Setup

Configure Vite with the Stillflow AOT compiler plugin and point TypeScript JSX to `stillflow.engine`:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { stillflow_plugin } from 'stillflow.engine/vite'

export default defineConfig({
  plugins: [stillflow_plugin()]
})
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "preserve",
  }
}
```

---

## Quick Start

Try Stillflow online in [CodeSandbox](https://codesandbox.io). For a complete Todo application implementation utilizing headless state, Fenwick tree collections, and AOT-compiled components, please refer to the full source code in the reference documentation.

---

## License

[MIT](./LICENSE)
