# Frontend Security Audit Summary

Date: 2026-07-27

## Baseline (`npm audit` before `npm audit fix`)

- total: 74
- low: 15
- moderate: 23
- high: 32
- critical: 4

## After `npm audit fix` (still on CRA)

- total: 69
- low: 4
- moderate: 6
- high: 59
- critical: 0

## After frontend modernization (Vite + Vitest)

- total: 7
- low: 0
- moderate: 5
- high: 1
- critical: 1

## Notes

- `npm audit fix` removed critical findings and reduced total findings.
- Remaining findings are now concentrated in the Vite/Vitest toolchain and React Router.
- Suggested fixes point to `vite@8`, `vitest@4`, and `react-router@7`.
- `vite@8.1.5` requires Node `^20.19.0 || >=22.12.0` and
  `vitest@4.1.10` requires Node `^20 || ^22 || >=24`.
- Current build pins Node `v18.20.4`, so a runtime uplift is required first.

## Recommended Next Step

Plan a follow-up dependency track for Node runtime uplift and major upgrades (`vite`, `vitest`, `react-router`), then re-run audit and regression tests.

## Risk Acceptance Record

See `docs/security-risk-acceptance-2026-07-28.md` for accepted residual risk,
compensating controls, and exit criteria.

