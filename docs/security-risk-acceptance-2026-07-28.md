# Security Risk Acceptance - 2026-07-28

Scope: frontend dependency vulnerabilities reported by `npm audit` in `src/main/js/frontend`.

## Current Snapshot

Post-uplift snapshot (after Node/toolchain and router updates):

- Total: 2
- Critical: 0
- High: 2
- Moderate: 0
- Low: 0

Affected packages:
- `react-router` (high)
- `react-router-dom` (high)

Baseline before uplift (for traceability):

- Total: 7
- Critical: 1
- High: 1
- Moderate: 5
- Low: 0

## Decision

Accepted temporarily for the current release line, with compensating controls, until an upstream-safe React Router path is available and validated in this project.

## Why Acceptance Is Required

- The prior critical/high findings were remediated by upgrading to Node 20 and major-safe toolchain versions (`vite@8`, `vitest@4`, `@vitejs/plugin-react@6`).
- Remaining high findings are tied to `react-router`/`react-router-dom` advisory ranges where the `npm audit` recommended downgrade target is known to reintroduce broader historical findings.
- No clean non-breaking dependency path currently yields zero high findings in this dependency family for this app.

## Compensating Controls in Place

1. Vite dev/preview servers are bound to loopback only:
   - `npm start` uses `vite --host 127.0.0.1`
   - `npm run preview` uses `vite preview --host 127.0.0.1`
   - `vite.config.ts` sets `server.host = '127.0.0.1'`
2. Vitest UI server is explicitly disabled:
   - `vite.config.ts` sets `test.ui = false`
3. CI uses non-UI one-shot tests (`vitest run`), not interactive UI mode.
4. Runtime application endpoints are behind eXist and validated via smoke tests.
5. Full local validation completed after uplift (`npm test`, `npm run build`, `mvn -q clean verify`).

## Residual Risk

- Development workstation risk remains if unsafe local network exposure is manually enabled.
- Two high vulnerabilities remain in the React Router dependency family pending a stable, validated upstream resolution path for this stack.

## Exit Criteria (Remove Acceptance)

- Monitor `react-router` and `react-router-dom` advisories for a fix path that does not regress to older vulnerable ranges.
- Apply and validate the first compatible dependency set that removes remaining highs.
- `npm audit` rerun with no critical/high findings.

## Review Date

- Reassess by 2026-08-31 or earlier if a React Router advisory remediation release is published.

