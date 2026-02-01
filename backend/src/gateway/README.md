# Circle Gateway SDK for Basis Zero

Cross-chain USDC transfer SDK using Circle Gateway for the Basis Zero prediction market.

## Quick Start

```bash
# Install dependencies
npm install

# Configure your wallet
cp .env.example .env
# Edit .env and add your private key

# Check your unified balance
npm run balance

# Deposit USDC into Gateway (Step 1)
npm run deposit

# Transfer USDC cross-chain (Steps 2 & 3)
npm run transfer
```

## How It Works

Circle Gateway enables **instant cross-chain USDC transfers** (~500ms) through a 3-step process:

### Step 1: Deposit (Establish Unified Balance)
```javascript
import { GatewayService, getAccount } from './index.js';

const account = getAccount();
const gateway = new GatewayService(account);

// Deposit 10 USDC from Avalanche
await gateway.deposit("avalanche", 10);
```

### Step 2 & 3: Transfer (Attest + Mint)
```javascript
// Transfer 5 USDC from Avalanche to Base
await gateway.transfer("avalanche", "base", 5);

// Or send to a contract address
await gateway.transferToContract(
  "avalanche", 
  "base", 
  5, 
  "0xYourContractAddress..."
);
```

> **Note:** When sending to a contract, USDC simply appears in the contract's balance. Gateway does NOT trigger any callback function. Use CCTP if you need "transfer + execute" in one step.

## Contract Addresses

| Contract | Address |
|----------|---------|
| Gateway Wallet | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` |
| Gateway Minter | `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B` |

## Supported Chains (Testnet)

| Chain | Domain ID | USDC Address |
|-------|-----------|--------------|
| Ethereum Sepolia | 0 | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| Avalanche Fuji | 1 | `0x5425890298aed601595a70ab815c96711a31bc65` |
| Base Sepolia | 6 | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

## Get Testnet Funds

- **USDC:** [Circle Faucet](https://faucet.circle.com/)
- **ETH:** [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- **AVAX:** [Avalanche Fuji Faucet](https://core.app/tools/testnet-faucet)
- **Base ETH:** [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)

## API Reference

### GatewayService

```javascript
const gateway = new GatewayService(account, "testnet");

// Get unified balance
const balances = await gateway.getBalance();

// Deposit USDC
await gateway.deposit(chainName, amount);

// Transfer USDC
await gateway.transfer(fromChain, toChain, amount, recipient?);

// Transfer to contract
await gateway.transferToContract(fromChain, toChain, amount, contractAddress);
```

### GatewayClient (Low-level API)

```javascript
const client = new GatewayClient("testnet");

// Get system info
const info = await client.info();

// Check balances
const { balances } = await client.balances("USDC", address);

// Submit burn intents for attestation
const response = await client.transfer([{ burnIntent, signature }]);
```

## License

MIT
