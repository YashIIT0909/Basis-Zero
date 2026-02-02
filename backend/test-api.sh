#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Basis-Zero API Test Script
# ═══════════════════════════════════════════════════════════════════════════

BASE_URL="${BASE_URL:-http://localhost:3001}"
# Replace with your test wallet address
TEST_USER="${TEST_USER:-0xYourWalletAddress}"

echo "═══════════════════════════════════════════════════════════════════"
echo "  Basis-Zero API Testing"
echo "  Base URL: $BASE_URL"
echo "  Test User: $TEST_USER"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ───────────────────────────────────────────────────────────────────────────
# 1. Health Check
# ───────────────────────────────────────────────────────────────────────────
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# ───────────────────────────────────────────────────────────────────────────
# 2. Get Gateway Balances
# ───────────────────────────────────────────────────────────────────────────
echo "2. Gateway Balances"
curl -s "$BASE_URL/api/gateway/balances" | jq .
echo ""

# ───────────────────────────────────────────────────────────────────────────
# 3. Get Current Session (should be None initially)
# ───────────────────────────────────────────────────────────────────────────
echo "3. Get Session Info for $TEST_USER"
curl -s "$BASE_URL/api/sessions/session/$TEST_USER" | jq .
echo ""

# ───────────────────────────────────────────────────────────────────────────
# 4. Start a Session (locks yield on Arc)
# ───────────────────────────────────────────────────────────────────────────
echo "4. Start Session (amount: 1000000 = 1 USDC)"
curl -s -X POST "$BASE_URL/api/sessions/session/start" \
  -H "Content-Type: application/json" \
  -d "{\"user\": \"$TEST_USER\", \"amount\": \"1000000\"}" | jq .
echo ""

# ───────────────────────────────────────────────────────────────────────────
# 5. Get Session After Start (should be PendingBridge)
# ───────────────────────────────────────────────────────────────────────────
echo "5. Get Session After Start"
curl -s "$BASE_URL/api/sessions/session/$TEST_USER" | jq .
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "  Test Complete!"
echo "═══════════════════════════════════════════════════════════════════"
