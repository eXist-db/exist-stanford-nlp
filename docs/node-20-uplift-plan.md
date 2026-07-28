# Node 20 Uplift Plan (Pre-Dependency Bump)

This plan prepares `exist-stanford-nlp` for a safe runtime/toolchain uplift from Node 18 to Node 20 before major frontend dependency updates.

## Scope

- Keep current app behavior and API contracts unchanged.
- Validate build/test/package flow on Node 18 and Node 20.
- Create a clear go/no-go gate for upgrading `vite`, `vitest`, and `react-router` majors.

## Current Baseline

- Maven pins Node to `v18.20.4` in `pom.xml`.
- Frontend is Vite/Vitest-based and currently compatible with Node 18.
- Remaining security fixes point to versions requiring Node 20+.

## Proposed Phases

### Phase 1: Dual-Track Validation (No dependency majors yet)

1. Keep the current pinned Node 18 in `pom.xml`.
2. Add temporary validation runs under Node 20 in CI/local.
3. Compare results for:
   - frontend tests (`npm test`)
   - frontend production build (`npm run build`)
   - full packaging (`mvn clean verify`)
   - runtime smoke (`./scripts/rag-smoke.sh`)
4. If Node 20 behaves the same as Node 18, proceed to Phase 2.

### Phase 2: Runtime Pin Uplift

1. Update Maven Node pin to Node 20 LTS.
2. Re-run full validation matrix.
3. Merge only when all matrix jobs are green.

### Phase 3: Dependency Major Upgrades

1. Upgrade to target secure versions (`vite@8`, `vitest@4`, `react-router@7`).
2. Re-run full validation matrix plus `npm audit`.
3. Resolve any behavior regressions or type/test failures.

## Test Matrix

| Axis | Values |
| --- | --- |
| Node runtime | 18.x (current), 20.x (target) |
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

- No test regressions between Node 18 and Node 20.
- `mvn clean verify` succeeds under the target Node pin.
- RAG smoke test passes after deploy/package.
- Security report improves or remains stable with documented exceptions.

## Risks and Mitigations

- **Risk:** transitive dependency behavior changes between Node 18 and 20.
  - **Mitigation:** run identical matrix and compare outputs.
- **Risk:** CI drift from local environment.
  - **Mitigation:** explicitly pin Node and Java versions in CI jobs.
- **Risk:** runtime-only regressions in RESTXQ flows.
  - **Mitigation:** keep `scripts/rag-smoke.sh` as a required release gate.

## Recommended Next Commit Sequence

1. CI matrix addition (Node 18 + 20 validation jobs).
2. Maven Node pin uplift to 20.
3. Dependency major bump PR.

