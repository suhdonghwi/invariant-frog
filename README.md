# Invariant Frog

A visual intro to loop invariants: draw an area that frogs can never hop out of. Play it at [invariant.donghwi.me](https://invariant.donghwi.me).

- [docs/design.md](docs/design.md): what the game teaches and the rules of its world
- [docs/experience.md](docs/experience.md): how it looks, moves and responds
- [docs/architecture.md](docs/architecture.md): how the code is organised

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
