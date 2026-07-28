# Security Risk Acceptance - 2026-07-28

Scope: frontend dependency vulnerabilities reported by `npm audit` in `src/main/js/frontend`.

## Current Snapshot

- Total: 7
- Critical: 1
- High: 1
- Moderate: 5
- Low: 0

Affected packages:
- `vitest` (critical)
- `vite` (high)
- `esbuild`, `vite-node`, `@vitest/mocker`, `react-router`, `react-router-dom` (moderate)

## Decision

Accepted temporarily for the `0.9.4` release line, with compensating controls, until Node runtime uplift and major upgrades are completed.

## Why Acceptance Is Required

- Available complete remediations require breaking upgrades:
  - `vite@8.1.5`
  - `vitest@4.1.10`
  - `react-router@7.18.1`
- Those upgrades require Node 20+ while this project is currently pinned to Node 18 (`v18.20.4`).

## Compensating Controls in Place

1. Vite dev/preview servers are bound to loopback only:
   - `npm start` uses `vite --host 127.0.0.1`
   - `npm run preview` uses `vite preview --host 127.0.0.1`
   - `vite.config.ts` sets `server.host = '127.0.0.1'`
2. Vitest UI server is explicitly disabled:
   - `vite.config.ts` sets `test.ui = false`
3. CI uses non-UI one-shot tests (`vitest run`), not interactive UI mode.
4. Runtime application endpoints are behind eXist and validated via smoke tests.

## Residual Risk

- Development workstation risk remains if unsafe local network exposure is manually enabled.
- Dependency CVEs remain unresolved at package level until Node uplift + major dependency upgrades.

## Exit Criteria (Remove Acceptance)

- Node uplift plan completed (`docs/node-20-uplift-plan.md`).
- Upgrade to secure major lines (`vite@8`, `vitest@4`, `react-router@7`).
- `npm audit` rerun with no critical/high findings.

## Review Date

- Reassess by 2026-08-31 or earlier if Node 20 uplift lands.

