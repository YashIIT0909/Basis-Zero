#!/usr/bin/env node
/**
 * Transfer Script - Steps 2 & 3 of Circle Gateway Flow
 * 
 * Transfers USDC from your unified balance to another chain.
 * This script:
 *   1. Creates and signs a burn intent (EIP-712)
 *   2. Submits to Gateway API for attestation
 *   3. Mints USDC on destination chain
 * 
 * Usage: PRIVATE_KEY=xxx node scripts/transfer.js
 */

import { getAccount, setupAllChains } from "../setup.js";
import { GatewayClient } from "../gateway-client.js";
import { burnIntent, burnIntentTypedData } from "../typed-data.js";

// Configuration
// Available chains: "ethereum", "base", "avalanche", "arc"
const FROM_CHAIN = "arc";           // Arc - USDC is native gas, instant finality!
const TO_CHAIN = "base";            // Destination chain
const TRANSFER_AMOUNT = 0.5;        // Amount in USDC

// Set this to a contract address if you want to send to a contract
// NOTE: Gateway will NOT trigger any contract function - only deposits USDC
const RECIPIENT = "0x5A763Ceb8bB8EaDc654685ca4078153c3ED75669"
// null = send to your own address

async function main() {
  console.log("=".repeat(60));
  console.log("Circle Gateway - Transfer Script");
  console.log("=".repeat(60));

  // Get account and setup chains
  const account = getAccount();
  console.log(`\nWallet address: ${account.address}`);

  const chains = setupAllChains(account);
  const from = chains[FROM_CHAIN];
  const to = chains[TO_CHAIN];

  if (!from || !to) {
    throw new Error("Invalid chain configuration");
  }

  const recipient = RECIPIENT || account.address;
  console.log(`\nTransfer: ${TRANSFER_AMOUNT} USDC`);
  console.log(`From:     ${from.name} (Domain ${from.domain})`);
  console.log(`To:       ${to.name} (Domain ${to.domain})`);
  console.log(`Recipient: ${recipient}`);

  // Initialize Gateway client
  const gateway = new GatewayClient("testnet");

  // Check unified balance
  console.log("\n" + "-".repeat(40));
  console.log("Step 1: Checking unified balance...");
  const { balances } = await gateway.balances("USDC", account.address);
  
  const sourceBalance = balances.find((b) => b.domain === from.domain);
  const availableBalance = sourceBalance ? parseFloat(sourceBalance.balance) : 0;
  
  console.log(`Available on ${from.name}: ${availableBalance} USDC`);

  if (availableBalance < TRANSFER_AMOUNT) {
    console.error("\n❌ Insufficient balance!");
    console.error("Wait for deposit finalization or run deposit script first.");
    console.error("\nNote: Ethereum Sepolia takes ~20 minutes to finalize.");
    console.error("Avalanche Fuji finalizes instantly.");
    process.exit(1);
  }

  // Create burn intent
  console.log("\n" + "-".repeat(40));
  console.log("Step 2: Creating burn intent...");
  const intent = burnIntent({
    account,
    from,
    to,
    amount: TRANSFER_AMOUNT,
    recipient,
  });

  console.log("Burn intent created:");
  console.log(`  Source Domain: ${intent.spec.sourceDomain}`);
  console.log(`  Dest Domain:   ${intent.spec.destinationDomain}`);
  console.log(`  Amount:        ${Number(intent.spec.value) / 1e6} USDC`);

  // Sign burn intent
  console.log("\n" + "-".repeat(40));
  console.log("Step 3: Signing burn intent (EIP-712)...");
  const typedData = burnIntentTypedData(intent);
  const signature = await account.signTypedData(typedData);
  console.log(`Signature: ${signature.slice(0, 20)}...`);

  // Request attestation
  console.log("\n" + "-".repeat(40));
  console.log("Step 4: Requesting attestation from Gateway API...");
  const request = [{ burnIntent: typedData.message, signature }];
  const response = await gateway.transfer(request);

  if (response.error) {
    console.error(`\n❌ Gateway API error: ${JSON.stringify(response.error)}`);
    process.exit(1);
  }

  console.log("Attestation received!");
  console.log(`Transfer ID: ${response.transferId}`);
  console.log(`Fee: ${response.fees?.[0]?.fee || "N/A"}`);
  console.log(`Expires at block: ${response.expirationBlock}`);

  // Mint on destination chain
  console.log("\n" + "-".repeat(40));
  console.log("Step 5: Minting USDC on destination chain...");
  const { attestation, signature: attestationSignature } = response;

  try {
    const mintHash = await to.gatewayMinter.write.gatewayMint([
      attestation,
      attestationSignature,
    ]);
    console.log(`Mint tx: ${mintHash}`);
    
    console.log("Waiting for confirmation...");
    await to.publicClient.waitForTransactionReceipt({ hash: mintHash });
    console.log("Mint confirmed!");

    console.log("\n" + "=".repeat(60));
    console.log("✓ Transfer complete!");
    console.log(`  ${TRANSFER_AMOUNT} USDC now available at ${recipient}`);
    console.log(`  on ${to.name}`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error(`\n❌ Mint failed: ${error.message}`);
    console.error("\nAttestation can still be used if not expired:");
    console.error(`Attestation: ${attestation}`);
    console.error(`Signature: ${attestationSignature}`);
    process.exit(1);
  }
}

main().catch(console.error);
