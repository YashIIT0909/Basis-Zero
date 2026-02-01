import { GATEWAY_API, DOMAINS, CHAIN_NAMES } from "./config.js";

///////////////////////////////////////////////////////////////////////////////
// A lightweight API client for interacting with the Circle Gateway API.

export class GatewayClient {
  constructor(network = "testnet") {
    this.baseUrl = GATEWAY_API[network];
    if (!this.baseUrl) {
      throw new Error(`Unknown network: ${network}. Use 'testnet' or 'mainnet'.`);
    }
  }

  // Static references for convenience
  static DOMAINS = DOMAINS;
  static CHAIN_NAMES = CHAIN_NAMES;

  /**
   * Gets info about supported chains and contracts
   * @returns {Promise<Object>} Gateway system information
   */
  async info() {
    return this.#get("/info");
  }

  // EVM-compatible domains only (exclude Solana=5, Noble=4)
  static EVM_DOMAINS = [0, 1, 6, 26]; // Ethereum, Avalanche, Base, Arc

  /**
   * Checks balances for a given depositor across specified domains
   * @param {string} token - Token symbol (e.g., "USDC")
   * @param {string} depositor - Wallet address
   * @param {number[]} domains - Optional array of domain IDs to check (defaults to EVM domains)
   * @returns {Promise<Object>} Balances by domain
   */
  async balances(token, depositor, domains) {
    // Default to EVM domains only (Solana and Noble have different address formats)
    if (!domains) {
      domains = GatewayClient.EVM_DOMAINS;
    }
    return this.#post("/balances", {
      token,
      sources: domains.map((domain) => ({
        depositor,
        domain,
      })),
    });
  }

  /**
   * Sends burn intents to the API to retrieve an attestation
   * @param {Object} body - Request body with burn intents and signatures
   * @returns {Promise<Object>} Attestation and signature for minting
   */
  async transfer(body) {
    return this.#post("/transfer", body);
  }

  // Private method to do a GET request to the Gateway API
  async #get(path) {
    const url = this.baseUrl + path;
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway API error: ${response.status} - ${error}`);
    }
    return response.json();
  }

  // Private method to do a POST request to the Gateway API
  async #post(path, body) {
    const url = this.baseUrl + path;
    const headers = { "Content-Type": "application/json" };
    const response = await fetch(url, {
      method: "POST",
      headers,
      // Serialize bigints as strings
      body: JSON.stringify(body, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      ),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway API error: ${response.status} - ${error}`);
    }
    return response.json();
  }
}
