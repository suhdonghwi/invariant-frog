# Invariant Frog — Architecture

How the code is organised, and the rules that keep it working.

Stack: Vite, React (with React Compiler), TypeScript, react-three-fiber with
drei, zustand, Tailwind CSS v4, z3-solver (WebAssembly), Vitest, ESLint, and
playwright-core for the browser smoke test.

## Layout

```
src/
  lang/        parser, type checker, interpreter, symbolic execution
  checker/     counterexample search, Z3 proofs, verdicts
  levels/      the level format and every level
  i18n/        every line the game says, in English and Korean
  game/        the zustand store, progress, what the buttons do
  director/    scripted sequences: frogs, Step/Run, verification, counterexamples
  tutorial/    the tutorial's steps and the helpers they are written with
  scene/       the 3D world: floor, slabs, frogs, labels, camera rig, scene time
  ui/          the DOM over the scene
  motion.ts    every duration and pause
scripts/       level validation, the browser smoke test, the Z3 copy, fonts, the link preview, the favicon, the paper's figures
tests/         unit tests
```

Dependencies point downward: `lang` knows nothing of levels; `levels` and
`checker` know nothing of the UI; `scene` and `ui` render state; `director`,
`tutorial` and `game/actions` drive it.

## One language, three backends

A level's program and the learner's formula are parsed once into one AST,
which feeds:

- an **exact interpreter** (BigInt) for hops, eggs, and confirming what Z3
  found;
- **Z3** for proofs. Bounded passes look for small counterexamples first; the
  unbounded pass proves. Every model Z3 returns is replayed in the interpreter
  before it is shown, and arrays in a shown model are at most `MAX_LEN` long.
  A rule that fails only for longer arrays is reported as such, without a
  counterexample;
- **GLSL** for the floor (visual only). It walks a quantifier the way the
  interpreter's fast path does, with the same step budget (`EVAL_BUDGET`): a
  tile whose formula runs out of steps is off the area in both. Division by a
  literal rounds down exactly. Values are 32-bit: literals past ±2³¹−1 are
  clamped and sums and products wrap, so a tile whose values overflow can be
  drawn wrong.

Change semantics in `lang/` and make every backend agree. `pnpm validate` and
the tests are the safety net.

## State

- **The store** (`game/store.ts`) holds what the UI and the sequences share.
  Store actions exist only where there is logic.
- **Per-frame scene data lives outside the store**, in plain module objects
  read in `useFrame`. Never put per-frame data in zustand.
- **Slab height has one source: the area's formula.** Nothing lists the tiles
  of the area; the GPU and the CPU each evaluate the same formula.

## Time

- **The scene runs on scene time** (`scene/sceneTime.ts`), which stops while
  the page is hidden. Don't use `performance.now()` or `setTimeout` for
  anything that animates in the scene.
- **Each screen starts together**: scene time and CSS animations hold until
  the first frame is drawn and the fonts are in.
- **Each screen leaves together**: on a scene switch the screen fades out as
  one, and an open dialog leaves the top layer so it fades with the screen.
- **Every duration and pause is a token** from `motion.ts`, mirrored in CSS as
  `--duration-*`.

## Sequences

- Anything scripted is a `director/` function. Each starts with `begin()`,
  which cancels whatever was playing, and checks `tok.alive` after every
  `await`.
- **A check is abandoned, then interrupted**: a result for another level,
  mode or formula is dropped, and abandoning a check (leaving the level, an
  edit, Cancel) interrupts Z3 so the next check starts at once. `checking` is
  true only while the current run is alive.
- Async errors that are not `Aborted` reach the crash card through one
  `unhandledrejection` handler.
- **The camera follows one rule.** A moment names only the tiles it must show
  (`cameraRig.frame({ focus, labels })`), never a position or a zoom, and the
  rig picks the closest pose that fits them into the screen the panels leave
  free. Don't move the camera any other way.
- **Tutorial steps declare the scene they start from**, so Back and
  skip-ahead can rebuild any step instantly. A step runs under a generation
  token and calls `gen.guard()` after every `await`.
- The tutorial reacts to the learner through events and buttons; it never
  polls.
- `?step=N` starts the tutorial at step N.

## Rendering

- The floor is **one shader plane**, evaluated per pixel, so it is truly
  infinite.
- **Slabs are one instanced grid centred on the camera**, so the area reaches
  the horizon at any zoom.
- **The GPU sees coordinates near a floating origin** (`scene/origin.ts`),
  since a 32-bit float has no fractions left near ten million.
- Models are procedural, and shadows are soft blobs, not shadow maps.

## Styling

Components style themselves with Tailwind classes. `src/styles.css` holds only
what is clearer as CSS. Shared class lists live in `ui/classes.ts`; their
variants never override each other.

## The solver

Z3 runs as WebAssembly with threads, so the page must be cross-origin isolated
(`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy:
require-corp`). It is loaded as a plain script, not bundled, because its
thread workers re-load it by URL, and warmed up only once the player opens
the level list, a level or the tutorial. Its status (`idle`, `loading`,
`ready`, `failed`) lives in `checker/solverStatus.ts`; a page that is not
cross-origin isolated is `failed` from the start, and the reason goes to the
console.

## Conventions

- Components are `PascalCase.tsx`, other modules `camelCase.ts`; one concern
  per file.
- Remove dead code rather than leaving it behind.
- **Per-frame updates reach three.js objects through refs** (a mesh's `ref`,
  or `primitive ref`), never through a value a hook returned, so the React
  Compiler's lint rules hold.
- Before committing: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm
  validate` (when levels, the language or the checker changed), `pnpm build`.
  `pnpm smoke` opens the game in Chrome (home, a level with a wrong and a right
  formula, a few tutorial steps) and fails on any console error.
- `typescript` is aliased to `@typescript/typescript6` because typescript-eslint
  needs the TypeScript 6 API; `tsc` itself is TypeScript 7 from
  `@typescript/native`.
