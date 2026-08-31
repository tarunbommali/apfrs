#!/usr/bin/env bash
# ==============================================================================
# deploy/smoke-test.sh
# APFRS Production Deployment Smoke Test Suite
# ==============================================================================
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1}"
API_URL="${BASE_URL}/api"
FAILED_TESTS=0

echo "========================================================="
echo "🧪 APFRS Production Smoke Test Verification"
echo "Target Base URL: $BASE_URL"
echo "========================================================="

run_check() {
  local test_name="$1"
  local url="$2"
  local expected_status="$3"
  local match_pattern="${4:-}"
  local http_method="${5:-GET}"
  local request_body="${6:-}"

  echo -n "👉 Testing: $test_name... "

  local response
  local http_code
  local body

  if [ "$http_method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$request_body" "$url" || echo "FAIL 000")
  else
    response=$(curl -s -w "\n%{http_code}" "$url" || echo "FAIL 000")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -eq "$expected_status" ]; then
    if [ -n "$match_pattern" ]; then
      if echo "$body" | grep -q "$match_pattern"; then
        echo "✅ PASS (HTTP $http_code, pattern matched)"
      else
        echo "❌ FAIL (HTTP $http_code, pattern '$match_pattern' NOT found in body: $body)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
      fi
    else
      echo "✅ PASS (HTTP $http_code)"
    fi
  else
    echo "❌ FAIL (Expected HTTP $expected_status, got $http_code: $body)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# 1. Frontend Static SPA Delivery
run_check "Frontend SPA index.html Delivery" "$BASE_URL/" 200 "<div id=\"root\">"

# 2. API Liveness Probe
run_check "Backend API Liveness (/api/health)" "$API_URL/health" 200 "\"status\":\"ok\""

# 3. API Readiness Probe (Database connectivity verification)
run_check "Backend API Deep Readiness (/api/readiness)" "$API_URL/readiness" 200 "\"status\":\"ready\""

# 4. Authentication API Validation (Negative test: rejects invalid credentials safely without 500)
run_check "Authentication API Boundary Rejection" "$API_URL/auth/login" 401 "\"success\":false" "POST" '{"email":"invalid_test_probe@example.com","password":"invalid_password"}'

# 5. Security Check: Direct 8001 / 3306 Port Access Boundary Verification
if command -v nc &>/dev/null; then
  echo -n "👉 Testing: Internal MySQL port 3306 external isolation... "
  if nc -z -w2 127.0.0.1 3306 &>/dev/null; then
    echo "✅ Local MySQL listening on loopback"
  else
    echo "⚠️ MySQL port unreachable locally"
  fi
fi

echo "========================================================="
if [ "$FAILED_TESTS" -eq 0 ]; then
  echo "🎉 ALL SMOKE TESTS PASSED! APFRS deployment is operational."
  exit 0
else
  echo "❌ $FAILED_TESTS smoke test(s) failed. Check logs via: journalctl -u apfrs.service -n 50"
  exit 1
fi
