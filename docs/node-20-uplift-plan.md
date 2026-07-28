# Node 20 Uplift Plan (Pre-Dependency Bump)

This plan documents the runtime/toolchain uplift to Node 20 and the follow-on dependency/security work.

## Scope

- Keep current app behavior and API contracts unchanged.
- Validate build/test/package flow on the current Node 20 pin.
- Create a clear go/no-go gate for upgrading `vite`, `vitest`, and `react-router` majors.

## Current Baseline

- Maven pins Node to `v20.20.2` in `pom.xml`.
- Frontend is Vite/Vitest-based and currently validated on Node 20.
- Remaining security fixes point to versions requiring Node 20+.

## Proposed Phases

### Phase 1: Post-Uplift Validation

1. Keep the current pinned Node 20 in `pom.xml`.
2. Run validation in CI/local on the same Node 20 pin.
3. Compare results for:
   - frontend tests (`npm test`)
   - frontend production build (`npm run build`)
   - full packaging (`mvn clean verify`)
   - runtime smoke (`./scripts/rag-smoke.sh`)
4. If validation remains green, proceed to Phase 2.

### Phase 2: Dependency Major Upgrades

1. Keep target secure versions (`vite@8`, `vitest@4`, `react-router@7`) updated within compatible ranges.
2. Re-run full validation matrix plus `npm audit`.
3. Resolve any behavior regressions or type/test failures.

## Test Matrix

| Axis | Values |
| --- | --- |
| Node runtime | 20.x (current pin) |
| Java runtime | 21 (current local), CI JDK profile(s) |
| eXist runtime | `existdb/existdb:7.0.0-beta3` |
| Build mode | Frontend-only + full Maven/XAR |

## Required Checks Per Matrix Cell

1. Frontend tests:

```bash
cd src/main/js/frontend
npm ci
npm test
```

2. Frontend build:

```bash
cd src/main/js/frontend
npm run build
```

3. Full package verify:

```bash
cd /Users/lcahlander/IdeaProjects/exist-stanford-nlp
mvn clean verify
```

4. Runtime RAG smoke:

```bash
cd /Users/lcahlander/IdeaProjects/exist-stanford-nlp
./scripts/rag-smoke.sh
```

5. Security snapshot:

```bash
cd src/main/js/frontend
npm audit --json
```

## Exit Criteria

- `mvn clean verify` succeeds under the target Node pin.
- RAG smoke test passes after deploy/package.
- Security report improves or remains stable with documented exceptions.

## Risks and Mitigations

- **Risk:** transitive dependency behavior changes between Node 20 patch releases.
  - **Mitigation:** rerun the same validation matrix on each Node pin change.
- **Risk:** CI drift from local environment.
  - **Mitigation:** explicitly pin Node and Java versions in CI jobs.
- **Risk:** runtime-only regressions in RESTXQ flows.
  - **Mitigation:** keep `scripts/rag-smoke.sh` as a required release gate.

## Recommended Next Commit Sequence

1. Keep CI Node pin aligned with Maven Node pin.
2. Track and apply safe router-family updates.
3. Re-run full validation and security checks.

