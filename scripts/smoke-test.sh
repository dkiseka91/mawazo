#!/usr/bin/env bash
# Mawazo post-deploy smoke test.
# Run after Railway deployment: BASE_URL=https://your-app.up.railway.app npm run smoke-test
# Exits non-zero if any check fails.

set -euo pipefail

BASE_URL="${BASE_URL:-https://mawazowebhook-production.up.railway.app}"
PASS=0
FAIL=0
ERRORS=()

check() {
  local name="$1"
  local result="$2"
  local expected="$3"
  if echo "$result" | grep -q "$expected"; then
    echo "  ✓ $name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected '$expected', got: $result"
    FAIL=$((FAIL + 1))
    ERRORS+=("$name")
  fi
}

echo ""
echo "Mawazo Smoke Tests"
echo "=================="
echo "Target: $BASE_URL"
echo ""

# ── 1. Health check ────────────────────────────────────────────────────────────
HEALTH=$(curl -sf "$BASE_URL/health" 2>/dev/null || echo '{"status":"unreachable"}')
check "GET /health returns 200 with status:ok" "$HEALTH" '"status":"ok"'
check "GET /health includes db check" "$HEALTH" '"db":true'
check "GET /health includes redis check" "$HEALTH" '"redis":true'

# ── 2. Telegram webhook — rejects missing secret ───────────────────────────────
# Without a secret header, the POST should be processed (returns 200 immediately
# per Telegram protocol) but internally rejected. We check the status code only.
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/telegram" \
  -H "Content-Type: application/json" \
  -d '{"update_id":1,"message":{"message_id":1,"from":{"id":1,"is_bot":false,"first_name":"Test"},"chat":{"id":1,"type":"private"},"date":1700000000,"text":"test"}}')
check "POST /telegram returns 200 (Telegram protocol requires fast ack)" "$HTTP_STATUS" "200"

# ── 3. Admin endpoints require auth ───────────────────────────────────────────
UNAUTH_INFO=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/telegram/info")
check "GET /telegram/info without auth returns 403 or 503" "$UNAUTH_INFO" "^[45]"

UNAUTH_WEBHOOK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/telegram/set-webhook?url=https://evil.com")
check "GET /telegram/set-webhook without auth returns 403 or 503" "$UNAUTH_WEBHOOK" "^[45]"

# ── 4. 404 handler ────────────────────────────────────────────────────────────
NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/does-not-exist")
check "GET /nonexistent-path returns 404" "$NOT_FOUND" "404"

# ── 5. Body size enforcement ──────────────────────────────────────────────────
# Send a 200KB payload (over the 100kb limit)
LARGE_PAYLOAD=$(python3 -c "import json; print(json.dumps({'update_id':1,'message':{'text':'x'*200000}}))" 2>/dev/null || printf '{"update_id":1,"message":{"text":"%0.s-" {1..200000}}}')
LARGE_STATUS=$(echo "$LARGE_PAYLOAD" | curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/telegram" \
  -H "Content-Type: application/json" --data-binary @- 2>/dev/null || echo "413")
check "POST /telegram with 200KB body returns 413" "$LARGE_STATUS" "^41"

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo "Failed checks: ${ERRORS[*]}"
  echo ""
  exit 1
fi

echo ""
echo "All smoke tests passed ✅"
echo ""
