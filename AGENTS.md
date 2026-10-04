# Project: Poteto Frontier

A single page Vite + React app for self-reported agent adoption. See contributing.md for commands and source context.

## Conventions

- Use pnpm and modern TypeScript with ESM
- No semicolons; oxfmt formats and oxlint lints
- Keep pnpm test and pnpm build green
- Use ky for HTTP and zod to validate external data
- Use pnpm dev and the Portless URL it prints
- Agentation is enabled only in development for local feedback

## Mental model

X handle → validated public profile and embedded photo → one normalized curve position → SVG → Takumi PNG

- src/frontier.ts is the shared chart source. UI and downloads must use this same geometry.
- Keep the original trust and number of agents axes, hand-drawn style, and tick labels unless asked to change them.
- Position always stays on the curve. Preserve pointer, touch, and keyboard behavior.
- Downloads must use Takumi. Do not substitute a browser screenshot or canvas renderer.
- Profile lookup depends on FxTwitter and X’s public image CDN; show failures honestly.
- No account authentication or backend. The handle and public profile photo URL persist in localStorage. Never embed personal X credentials.
- Generated PNGs, reference media, build output, and node_modules are ignored. Bundled font and its license are source assets.
- readme.md is deliberately brief; implementation details belong in contributing.md.
