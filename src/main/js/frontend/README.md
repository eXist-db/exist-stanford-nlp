# Frontend Development

The frontend uses Vite + React + TypeScript.

## Available Scripts

- `npm start` - run the Vite dev server.
- `npm run build` - create a production build in `build/`.
- `npm test` - run tests once using Vitest.
- `npm run test:watch` - run Vitest in watch mode.
- `npm run preview` - serve the production build locally.

## Notes

- Dev API calls to `/exist/*` are proxied to `http://localhost:8080` via `vite.config.ts`.
- Production build output stays in `build/` to match Maven/XAR packaging.
