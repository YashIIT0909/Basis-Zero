import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";

import { GatewayClient } from "./gateway-client.js";
import { erc20Abi, gatewayWalletAbi, gatewayMinterAbi } from "./abis.js";
import {
  GATEWAY_WALLET_ADDRESS,
  GATEWAY_MINTER_ADDRESS,
  USDC_ADDRESSES_TESTNET,
  RPC_URLS_TESTNET,
} from "./config.js";

// Define Arc Testnet chain (not built into viem)
// Arc uses USDC as native gas token!
const arcTestnet = defineChain({
  id: 5042002, // Arc Testnet chain ID (correct)
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://arc-testnet.drpc.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://testnet.arcscan.io",
    },
  },
  testnet: true,
});

// Map chain names to chain objects (including custom chains)
const chainMap = {
  ...chains,
  arcTestnet,
};

/**
 * Sets up clients and contracts for a given chain
 * @param {string} chainName - Chain name (e.g., "sepolia", "baseSepolia", "avalancheFuji", "arcTestnet")
 * @param {Object} account - viem account object
 * @returns {Object} Chain configuration with clients and contracts
 */
export function setupChain(chainName, account) {
  const chain = chainMap[chainName];
  if (!chain) {
    throw new Error(`Unknown chain: ${chainName}. Available: ${Object.keys(chainMap).join(", ")}`);
  }

  const rpcUrl = RPC_URLS_TESTNET[chainName];
  const transport = http(rpcUrl);

  // Public client for reading
  const publicClient = createPublicClient({
    chain,
    transport,
  });

  // Wallet client for writing
  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  });

  const usdcAddress = USDC_ADDRESSES_TESTNET[chainName];
  if (!usdcAddress) {
    throw new Error(`No USDC address configured for chain: ${chainName}`);
  }

  return {
    chainName,
    chain,
    name: chain.name,
    domain: GatewayClient.DOMAINS[chainName],
    currency: chain.nativeCurrency.symbol,
    publicClient,
    walletClient,
    usdc: getContract({
      address: usdcAddress,
      abi: erc20Abi,
      client: { public: publicClient, wallet: walletClient },
    }),
    gatewayWallet: getContract({
      address: GATEWAY_WALLET_ADDRESS,
      abi: gatewayWalletAbi,
      client: { public: publicClient, wallet: walletClient },
    }),
    gatewayMinter: getContract({
      address: GATEWAY_MINTER_ADDRESS,
      abi: gatewayMinterAbi,
      client: { public: publicClient, wallet: walletClient },
    }),
  };
}

/**
 * Get the account from environment variable
 * @returns {Object} viem account object
 */
export function getAccount() {
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is not set");
  }

  // Add 0x prefix if not present
  if (!privateKey.startsWith("0x")) {
    privateKey = `0x${privateKey}`;
  }

  return privateKeyToAccount(privateKey);
}

/**
 * Setup all testnet chains for an account
 * @param {Object} account - viem account object
 * @returns {Object} Object with ethereum, base, avalanche, and arc configs
 */
export function setupAllChains(account) {
  return {
    ethereum: setupChain("sepolia", account),
    base: setupChain("baseSepolia", account),
    avalanche: setupChain("avalancheFuji", account),
    arc: setupChain("arcTestnet", account),
  };
}

// Export Arc chain for external use
export { arcTestnet };
