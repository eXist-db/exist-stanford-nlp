# Production Readiness Checklist

This checklist is intended for release validation of `exist-stanford-nlp`.

## 1) Build and Packaging

- [ ] `mvn clean verify` succeeds from repository root.
- [ ] Frontend build is included in Maven packaging.
- [ ] `.xar` artifact is generated in `target/`.

## 2) API/Runtime Smoke Tests

- [ ] RAG smoke test passes against target eXist-db instance:

  (Automated in CI via `.travis.yml`; keep this command for local verification.)

```bash
./scripts/rag-smoke.sh
```

- [ ] Manual NER endpoint check succeeds:

```bash
curl -sS -i -X POST 'http://localhost:8080/exist/restxq/Stanford/ner' \
  -H 'Content-Type: application/json' \
  --data '{"language":"en","text":"John works at Acme in Austin."}'
```

## 3) RESTXQ Registry Health

- [ ] No recent `RQST0025` or RESTXQ annotation errors in container logs:

```bash
docker logs exist --since 15m 2>&1 | grep -E 'RQST0025|RestAnnotationException|ERROR \(DocumentTriggers\.java' | cat
```

- [ ] RAG endpoints appear registered in logs after deployment/update.

## 4) Security Review

- [ ] Capture a baseline report:

```bash
cd src/main/js/frontend
npm audit --json > ../../../../npm-audit-report.json
```

- [ ] Resolve non-breaking vulnerabilities (`npm audit fix`) and retest.
- [ ] Triage remaining findings that require breaking upgrades; document accepted risk and mitigation.
- [ ] If findings remain, link a signed decision record (for example,
  `docs/security-risk-acceptance-2026-07-28.md`).

## 5) Data Safety and Operations

- [ ] Confirm backup/restore procedure for `/db/apps/stanford-nlp/data`.
- [ ] Validate app behavior after restart/redeploy.
- [ ] Confirm rollback plan to previous `.xar`.

## 6) Release Metadata

- [ ] Maven and frontend versions are aligned for the release.
- [ ] Changelog/release notes include API-impacting behavior changes.

## 7) Runtime Baseline

- [ ] If dependency major upgrades are planned, validate Node uplift gates in
  `docs/node-20-uplift-plan.md` before merging.

