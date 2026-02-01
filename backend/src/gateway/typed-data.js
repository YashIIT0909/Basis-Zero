import { randomBytes } from "node:crypto";
import { pad, zeroAddress, maxUint256 } from "viem";

///////////////////////////////////////////////////////////////////////////////
// EIP-712 typed data utilities for burn intents and burn intent sets

// EIP-712 Domain
const domain = {
  name: "GatewayWallet",
  version: "1",
};

// EIP-712 Type Definitions
const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
];

const TransferSpec = [
  { name: "version", type: "uint32" },
  { name: "sourceDomain", type: "uint32" },
  { name: "destinationDomain", type: "uint32" },
  { name: "sourceContract", type: "bytes32" },
  { name: "destinationContract", type: "bytes32" },
  { name: "sourceToken", type: "bytes32" },
  { name: "destinationToken", type: "bytes32" },
  { name: "sourceDepositor", type: "bytes32" },
  { name: "destinationRecipient", type: "bytes32" },
  { name: "sourceSigner", type: "bytes32" },
  { name: "destinationCaller", type: "bytes32" },
  { name: "value", type: "uint256" },
  { name: "salt", type: "bytes32" },
  { name: "hookData", type: "bytes" },
];

const BurnIntent = [
  { name: "maxBlockHeight", type: "uint256" },
  { name: "maxFee", type: "uint256" },
  { name: "spec", type: "TransferSpec" },
];

const BurnIntentSet = [{ name: "intents", type: "BurnIntent[]" }];

/**
 * Convert an address to bytes32 format
 */
function addressToBytes32(address) {
  return pad(address.toLowerCase(), { size: 32 });
}

/**
 * Create a burn intent object for a cross-chain transfer
 * @param {Object} options - Transfer options
 * @param {Object} options.account - The wallet account (viem account)
 * @param {Object} options.from - Source chain config (from setup.js)
 * @param {Object} options.to - Destination chain config (from setup.js)
 * @param {number} options.amount - Amount in USDC (human-readable, e.g., 10 for 10 USDC)
 * @param {string} options.recipient - Recipient address (defaults to account.address)
 * @param {string} options.maxFee - Max fee in atomic units (default: 2.01 USDC)
 * @returns {Object} Burn intent object
 */
export function burnIntent({
  account,
  from,
  to,
  amount,
  recipient,
  maxFee = 2_010000n, // 2.01 USDC covers fee for any chain
}) {
  return {
    // Needs to be at least 7 days in the future (maxUint256 = no expiry)
    maxBlockHeight: maxUint256,
    // Max fee user is willing to pay
    maxFee,
    // The details of the transfer
    spec: {
      version: 1,
      sourceDomain: from.domain,
      destinationDomain: to.domain,
      sourceContract: from.gatewayWallet.address,
      destinationContract: to.gatewayMinter.address,
      sourceToken: from.usdc.address,
      destinationToken: to.usdc.address,
      sourceDepositor: account.address,
      destinationRecipient: recipient || account.address,
      sourceSigner: account.address,
      destinationCaller: zeroAddress, // Anyone can use the attestation
      value: BigInt(Math.floor(amount * 1e6)), // Convert to atomic units (6 decimals)
      salt: "0x" + randomBytes(32).toString("hex"),
      hookData: "0x", // No hook data for now
    },
  };
}

/**
 * Convert a burn intent to EIP-712 typed data format for signing
 * @param {Object} intent - Burn intent from burnIntent()
 * @returns {Object} EIP-712 typed data object
 */
export function burnIntentTypedData(intent) {
  return {
    types: { EIP712Domain, TransferSpec, BurnIntent },
    domain,
    primaryType: "BurnIntent",
    message: {
      ...intent,
      spec: {
        ...intent.spec,
        sourceContract: addressToBytes32(intent.spec.sourceContract),
        destinationContract: addressToBytes32(intent.spec.destinationContract),
        sourceToken: addressToBytes32(intent.spec.sourceToken),
        destinationToken: addressToBytes32(intent.spec.destinationToken),
        sourceDepositor: addressToBytes32(intent.spec.sourceDepositor),
        destinationRecipient: addressToBytes32(intent.spec.destinationRecipient),
        sourceSigner: addressToBytes32(intent.spec.sourceSigner),
        destinationCaller: addressToBytes32(intent.spec.destinationCaller ?? zeroAddress),
      },
    },
  };
}

/**
 * Convert multiple burn intents to a single EIP-712 typed data set for batch signing
 * @param {Object} options - Options object
 * @param {Object[]} options.intents - Array of burn intents
 * @returns {Object} EIP-712 typed data object for the set
 */
export function burnIntentSetTypedData({ intents }) {
  return {
    types: { EIP712Domain, TransferSpec, BurnIntent, BurnIntentSet },
    domain,
    primaryType: "BurnIntentSet",
    message: {
      intents: intents.map((intent) => burnIntentTypedData(intent).message),
    },
  };
}
