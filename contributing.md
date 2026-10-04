# Contributing

Requires Node.js 24+ and pnpm (version in package.json).

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm dev
pnpm test
pnpm build
```

`pnpm dev` prints the Portless URL. The app builds to `dist/` and needs no server, keys, or database.

Agentation is available in local development for annotations and copied feedback. It is excluded from the production build.

- `src/frontier.ts` owns the curve, original chart geometry, labels, and SVG generator. Edit this to adjust the chart.
- `src/app.tsx` handles placement and the profile form. Dragging projects onto the curve; arrow keys, Home, and End also work.
- `src/profile.ts` validates handles and the public FxTwitter profile response, then embeds the profile photo. This third-party service may be unavailable or rate limited. Handles are sent to FxTwitter and photos fetched from X’s image CDN.
- `src/profile-storage.ts` remembers the handle and public photo URL locally, restoring the photo after refresh without another profile lookup.
- `src/export.ts` renders the same SVG with Takumi WASM and the bundled Virgil font. Rendering and downloads happen locally.

Vercel Analytics is mounted only in production. Enable Web Analytics for the Vercel project before deploying to collect page views.

Run `pnpm generate:social-image` to regenerate `public/social.png` with Takumi and the shared chart geometry.

CI runs formatting, lint, type checks, offline unit tests, and the Vite build. Builds, PNG exports, dependencies, and supplied reference media stay outside Git. The bundled Virgil font is licensed under the SIL Open Font License; see public/fonts/OFL.txt.

Source context: [Lauren’s agent talk](https://x.com/poteto/status/2102050467505430555), [follow-up interview](https://x.com/poteto/status/2106134336705843554). The app is a playful, self-reported placement, not a measured score or an endorsement.
