#!/usr/bin/env node
/**
 * Deposit Script - Step 1 of Circle Gateway Flow
 * 
 * Deposits USDC from your wallet into the Gateway Wallet contract
 * to establish a unified cross-chain balance.
 * 
 * Usage: PRIVATE_KEY=xxx node scripts/deposit.js
 */

import { getAccount, setupAllChains } from "../setup.js";
import { GATEWAY_WALLET_ADDRESS } from "../config.js";

// Configuration
const DEPOSIT_AMOUNT = 1; // 1 USDC per chain (adjust as needed)
// Available chains: "ethereum", "base", "avalanche", "arc"
// Note: Arc uses USDC as native gas, so you only need USDC there!
const CHAINS_TO_DEPOSIT = ["arc"]; // Arc - USDC is native gas, instant finality!

async function main() {
  console.log("=".repeat(60));
  console.log("Circle Gateway - Deposit Script");
  console.log("=".repeat(60));

  // Get account and setup chains
  const account = getAccount();
  console.log(`\nWallet address: ${account.address}`);
  console.log(`Gateway Wallet: ${GATEWAY_WALLET_ADDRESS}`);
  console.log(`Deposit amount: ${DEPOSIT_AMOUNT} USDC per chain\n`);

  const chains = setupAllChains(account);

  // Deposit on each chain
  for (const chainName of CHAINS_TO_DEPOSIT) {
    const chain = chains[chainName];
    if (!chain) {
      console.error(`Unknown chain: ${chainName}`);
      continue;
    }

    console.log("-".repeat(40));
    console.log(`Processing ${chain.name}...`);

    const amountAtomic = BigInt(Math.floor(DEPOSIT_AMOUNT * 1e6));

    try {
      // Check USDC balance
      const balance = await chain.usdc.read.balanceOf([account.address]);
      console.log(`USDC balance: ${Number(balance) / 1e6} USDC`);

      if (balance < amountAtomic) {
        console.error(`Insufficient USDC! Get testnet USDC at https://faucet.circle.com/`);
        continue;
      }

      // Check gas balance
      const gasBalance = await chain.publicClient.getBalance({ address: account.address });
      console.log(`${chain.currency} balance: ${Number(gasBalance) / 1e18}`);

      if (gasBalance === 0n) {
        console.error(`No ${chain.currency} for gas fees!`);
        continue;
      }

      // Approve
      console.log(`\nApproving GatewayWallet for ${DEPOSIT_AMOUNT} USDC...`);
      const approvalHash = await chain.usdc.write.approve([
        GATEWAY_WALLET_ADDRESS,
        amountAtomic,
      ]);
      console.log(`Approval tx: ${approvalHash}`);
      await chain.publicClient.waitForTransactionReceipt({ hash: approvalHash });
      console.log("Approval confirmed!");

      // Deposit
      console.log(`\nDepositing ${DEPOSIT_AMOUNT} USDC into GatewayWallet...`);
      const depositHash = await chain.gatewayWallet.write.deposit([
        chain.usdc.address,
        amountAtomic,
      ]);
      console.log(`Deposit tx: ${depositHash}`);
      await chain.publicClient.waitForTransactionReceipt({ hash: depositHash });
      console.log("Deposit confirmed!");

    } catch (error) {
      if (error.message?.includes("insufficient funds")) {
        console.error(`Insufficient ${chain.currency} for gas fees!`);
      } else {
        console.error(`Error: ${error.message}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Deposit complete!");
  console.log("Run 'npm run balance' to check your unified balance.");
  console.log("=".repeat(60));
}

main().catch(console.error);
