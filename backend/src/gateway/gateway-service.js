import { GatewayClient } from "./gateway-client.js";
import { burnIntent, burnIntentTypedData } from "./typed-data.js";
import { getAccount, setupChain, setupAllChains } from "./setup.js";
import {
  GATEWAY_WALLET_ADDRESS,
  GATEWAY_MINTER_ADDRESS,
  DOMAINS,
  CHAIN_NAMES,
  getConfig,
} from "./config.js";
import { erc20Abi, gatewayWalletAbi, gatewayMinterAbi } from "./abis.js";

///////////////////////////////////////////////////////////////////////////////
// High-level Gateway Service for cross-chain USDC transfers

export class GatewayService {
  /**
   * Create a new GatewayService
   * @param {Object} account - viem account object
   * @param {string} network - "testnet" or "mainnet"
   */
  constructor(account, network = "testnet") {
    this.account = account;
    this.network = network;
    this.client = new GatewayClient(network);
    this.chains = setupAllChains(account);
  }

  /**
   * Get the user's unified balance across all chains
   * @returns {Promise<Object>} Balances by chain
   */
  async getBalance() {
    const { balances } = await this.client.balances("USDC", this.account.address);
    return balances.map((b) => ({
      chain: CHAIN_NAMES[b.domain],
      domain: b.domain,
      balance: b.balance,
    }));
  }

  /**
   * Deposit USDC into Gateway on a specific chain
   * @param {string} chainName - Chain to deposit on (e.g., "ethereum", "base", "avalanche")
   * @param {number} amount - Amount in USDC (human-readable)
   * @returns {Promise<Object>} Transaction hashes for approve and deposit
   */
  async deposit(chainName, amount) {
    const chain = this.chains[chainName];
    if (!chain) {
      throw new Error(`Unknown chain: ${chainName}. Use "ethereum", "base", "avalanche", or "arc"`);
    }

    const amountAtomic = BigInt(Math.floor(amount * 1e6));

    // Check balance
    const balance = await chain.usdc.read.balanceOf([this.account.address]);
    if (balance < amountAtomic) {
      throw new Error(
        `Insufficient USDC balance on ${chain.name}. ` +
          `Have: ${Number(balance) / 1e6} USDC, Need: ${amount} USDC`
      );
    }

    // Approve
    console.log(`Approving ${amount} USDC for GatewayWallet on ${chain.name}...`);
    const approvalHash = await chain.usdc.write.approve([
      GATEWAY_WALLET_ADDRESS,
      amountAtomic,
    ]);
    await chain.publicClient.waitForTransactionReceipt({ hash: approvalHash });
    console.log(`Approval confirmed: ${approvalHash}`);

    // Deposit
    console.log(`Depositing ${amount} USDC into GatewayWallet on ${chain.name}...`);
    const depositHash = await chain.gatewayWallet.write.deposit([
      chain.usdc.address,
      amountAtomic,
    ]);
    await chain.publicClient.waitForTransactionReceipt({ hash: depositHash });
    console.log(`Deposit confirmed: ${depositHash}`);

    return { approvalHash, depositHash };
  }

  /**
   * Transfer USDC from unified balance to destination chain
   * @param {string} fromChainName - Source chain name
   * @param {string} toChainName - Destination chain name
   * @param {number} amount - Amount in USDC (human-readable)
   * @param {string} recipient - Recipient address (default: sender's address)
   * @returns {Promise<Object>} Transfer result with mint transaction hash
   */
  async transfer(fromChainName, toChainName, amount, recipient) {
    const from = this.chains[fromChainName];
    const to = this.chains[toChainName];

    if (!from || !to) {
      throw new Error("Unknown chain. Use 'ethereum', 'base', 'avalanche', or 'arc'");
    }

    // Create burn intent
    console.log(`Creating burn intent: ${amount} USDC from ${from.name} to ${to.name}...`);
    const intent = burnIntent({
      account: this.account,
      from,
      to,
      amount,
      recipient: recipient || this.account.address,
    });

    // Sign the burn intent
    console.log("Signing burn intent...");
    const typedData = burnIntentTypedData(intent);
    const signature = await this.account.signTypedData(typedData);

    // Request attestation from Gateway API
    console.log("Requesting attestation from Gateway API...");
    const request = [{ burnIntent: typedData.message, signature }];
    const response = await this.client.transfer(request);

    if (response.error) {
      throw new Error(`Gateway API error: ${response.error}`);
    }

    // Mint on destination chain
    console.log(`Minting USDC on ${to.name}...`);
    const { attestation, signature: attestationSignature } = response;
    const mintHash = await to.gatewayMinter.write.gatewayMint([
      attestation,
      attestationSignature,
    ]);
    await to.publicClient.waitForTransactionReceipt({ hash: mintHash });
    console.log(`Mint confirmed: ${mintHash}`);

    return {
      attestation,
      mintHash,
      recipient: recipient || this.account.address,
    };
  }

  /**
   * Transfer USDC to a contract address on another chain
   * NOTE: The contract will receive the USDC but Gateway does NOT call any function on it.
   * @param {string} fromChainName - Source chain name
   * @param {string} toChainName - Destination chain name
   * @param {number} amount - Amount in USDC
   * @param {string} contractAddress - Contract address to receive USDC
   * @returns {Promise<Object>} Transfer result
   */
  async transferToContract(fromChainName, toChainName, amount, contractAddress) {
    console.log(`Transferring ${amount} USDC to contract ${contractAddress}...`);
    console.log("NOTE: USDC will appear in the contract balance. No callback is triggered.");
    return this.transfer(fromChainName, toChainName, amount, contractAddress);
  }
}

// Export everything
export {
  GatewayClient,
  burnIntent,
  burnIntentTypedData,
  getAccount,
  setupChain,
  setupAllChains,
  GATEWAY_WALLET_ADDRESS,
  GATEWAY_MINTER_ADDRESS,
  DOMAINS,
  CHAIN_NAMES,
  getConfig,
  erc20Abi,
  gatewayWalletAbi,
  gatewayMinterAbi,
};
