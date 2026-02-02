#!/bin/bash
# Settle session with mock PnL

SESSION_ID="0x8f683a1e506696d35c52c8d33b762c298976ca06bb940e8ccbf97746430da60a"
USER="0x561009A39f2BC5a975251685Ae8C7F98Fac063C7"
PNL="100000"  # User won 0.1 USDC
VAULT="0x49E4177eA6F21Cc5673bDc0b09507C5648fd53a3"

echo "=== Settling Session ==="
echo "Session ID: $SESSION_ID"
echo "User: $USER"
echo "PnL: $PNL (positive = won)"

# Create message hash: keccak256(abi.encodePacked(sessionId, pnl))
MSG_HASH=$(cast keccak256 $(cast abi-encode "f(bytes32,int256)" $SESSION_ID $PNL))
echo "Message Hash: $MSG_HASH"

# Sign the message (eth_sign adds prefix)
SIGNATURE=$(cast wallet sign --private-key $PRIVATE_KEY $MSG_HASH)
echo "Signature: $SIGNATURE"

# Encode the settlement proof: abi.encode(sessionId, pnl, bytes[])
# This is: (bytes32, int256, bytes[])
PROOF=$(cast abi-encode "f(bytes32,int256,bytes[])" $SESSION_ID $PNL "[$SIGNATURE]")
echo "Proof: $PROOF"

echo ""
echo "=== Calling reconcileSession ==="

# Call reconcileSession(user, pnl, proof)
cast send $VAULT \
  "reconcileSession(address,int256,bytes)" \
  $USER \
  $PNL \
  $PROOF \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY
