# Invariant Frog

A visual intro to loop invariants: draw an area that frogs can never hop out of. Play it at [invariant.donghwi.me](https://invariant.donghwi.me).

## Running

```bash
pnpm install
pnpm dev
```

Z3 runs as WebAssembly and needs a cross-origin isolated page, so any host must send
`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.

Besides `dev`, `build` and `test`:

- `pnpm validate` proves every level's solutions with Z3 and checks its pitfalls and hints.
- `pnpm og` redraws the link preview, `public/og.png`.
- `pnpm fonts` rebuilds the Korean font subsets.
- `pnpm figure <dir> [group]` renders the paper's figures as PNGs.
