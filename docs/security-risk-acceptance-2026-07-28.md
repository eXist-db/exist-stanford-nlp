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

Open advisory tracked for this acceptance:
- `GHSA-qwww-vcr4-c8h2` (`react-router` family)

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

## Advisory Detail (Open)

- Advisory: `GHSA-qwww-vcr4-c8h2`
- Family: `react-router` / `react-router-dom`
- Current pin in this project: `react-router-dom@7.18.1`
- `npm audit` currently reports vulnerable range `>=7.12.0 <8.3.0`; as of this review, no `8.3.0` release is available from the npm registry for `react-router-dom`.
- The audit tool's suggested downgrade path (`7.11.0`) is not accepted because it introduces multiple additional historical findings in the same dependency family.

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
- Apply and validate the first compatible dependency set that removes remaining highs (or documented upstream correction to advisory range).
- `npm audit` rerun with no critical/high findings.

## Monitoring / Revalidation Trigger

- Re-check immediately when a new `react-router-dom` release is published.
- Re-check immediately if GitHub Security Advisory data for `GHSA-qwww-vcr4-c8h2` changes.
- Re-run `npm audit`, `npm test`, `npm run build`, and Maven package verification after any router-family change.

## Review Date

- Reassess by 2026-08-31 or earlier if a React Router advisory remediation release is published.

