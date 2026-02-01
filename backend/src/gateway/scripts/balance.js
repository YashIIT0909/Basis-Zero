#!/usr/bin/env node
/**
 * Balance Script - Check unified Gateway balance
 * 
 * Checks your USDC balance across all supported chains via the Gateway API.
 * 
 * Usage: PRIVATE_KEY=xxx node scripts/balance.js
 */

import { getAccount } from "../setup.js";
import { GatewayClient } from "../gateway-client.js";

async function main() {
  console.log("=".repeat(60));
  console.log("Circle Gateway - Balance Check");
  console.log("=".repeat(60));

  // Get account
  const account = getAccount();
  console.log(`\nWallet address: ${account.address}\n`);

  // Initialize Gateway client
  const gateway = new GatewayClient("testnet");

  // Get system info
  console.log("Fetching Gateway info...");
  const info = await gateway.info();
  console.log("\nSupported chains:");
  for (const domain of info.domains) {
    const hasWallet = "walletContract" in domain;
    const hasMinter = "minterContract" in domain;
    console.log(
      `  - ${domain.chain} ${domain.network}: wallet=${hasWallet}, minter=${hasMinter}`
    );
  }

  // Get balances
  console.log("\nFetching balances...");
  const { balances } = await gateway.balances("USDC", account.address);

  console.log("\n" + "-".repeat(40));
  console.log("Your Unified USDC Balance:");
  console.log("-".repeat(40));

  let totalBalance = 0;
  for (const balance of balances) {
    const chainName = GatewayClient.CHAIN_NAMES[balance.domain] || `Domain ${balance.domain}`;
    const amount = parseFloat(balance.balance);
    totalBalance += amount;
    console.log(`  ${chainName}: ${balance.balance} USDC`);
  }

  console.log("-".repeat(40));
  console.log(`  TOTAL: ${totalBalance.toFixed(6)} USDC`);
  console.log("-".repeat(40));

  console.log("\n✓ Balance check complete.");
}

main().catch(console.error);
