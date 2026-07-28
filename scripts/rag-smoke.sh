#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8080/exist/restxq}"
DOC_ID="smoke-$(date +%s)"
QUERY="stanford nlp"

call_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local response

  if [[ -n "$body" ]]; then
    response="$(curl -sS -X "$method" "$url" -H 'Content-Type: application/json' -d "$body" -w $'\n%{http_code}')"
  else
    response="$(curl -sS -X "$method" "$url" -w $'\n%{http_code}')"
  fi

  local status
  status="$(printf '%s' "$response" | tail -n 1)"
  local payload
  payload="$(printf '%s' "$response" | sed '$d')"

  if [[ "$status" != "200" ]]; then
    echo "Request failed: $method $url (HTTP $status)" >&2
    echo "$payload" >&2
    return 1
  fi

  python3 -c 'import json,sys; json.load(sys.stdin); print("ok")' <<<"$payload" >/dev/null
  printf '%s' "$payload"
}

assert_json_true() {
  local payload="$1"
  local field="$2"

  JSON_PAYLOAD="$payload" python3 - "$field" <<'PY'
import json
import sys
name = sys.argv[1]
obj = json.loads(__import__("os").environ["JSON_PAYLOAD"])
if obj.get(name) is not True:
    raise SystemExit(f"Expected {name}=true, got {obj.get(name)!r}")
PY
}

echo "[1/4] Clearing index before test"
CLEAR_BEFORE="$(call_json GET "$BASE_URL/stanford/rag/clear")"
assert_json_true "$CLEAR_BEFORE" status

echo "[2/4] Ingesting smoke document"
INGEST_PAYLOAD=$(cat <<JSON
{"docId":"$DOC_ID","language":"en","chunkSize":30,"overlap":5,"text":"Stanford NLP smoke test for retrieval augmented generation in eXist-db."}
JSON
)
INGEST_RESULT="$(call_json POST "$BASE_URL/stanford/rag/ingest" "$INGEST_PAYLOAD")"
assert_json_true "$INGEST_RESULT" status

echo "[3/4] Searching smoke document"
SEARCH_RESULT="$(call_json GET "$BASE_URL/stanford/rag/search?q=$(python3 -c 'import urllib.parse; print(urllib.parse.quote("'"$QUERY"'"))')&lang=en&topK=5")"
assert_json_true "$SEARCH_RESULT" status

JSON_PAYLOAD="$SEARCH_RESULT" python3 <<'PY'
import json
obj = json.loads(__import__("os").environ["JSON_PAYLOAD"])
results = obj.get("results", [])
if not isinstance(results, list):
    raise SystemExit("results is not a list")
if len(results) < 1:
    raise SystemExit("Expected at least one search result after ingest")
print(f"Search returned {len(results)} result(s)")
PY

echo "[4/4] Clearing index after test"
CLEAR_AFTER="$(call_json GET "$BASE_URL/stanford/rag/clear")"
assert_json_true "$CLEAR_AFTER" status

echo "RAG smoke test passed against $BASE_URL"


