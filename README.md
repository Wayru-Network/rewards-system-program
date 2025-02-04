# NfNode Rewards System Program

A decentralized rewards system built on the Solana blockchain using the Anchor framework. This program enables administrators to establish and manage a token reward system for NfNode owners and operators, with secure claim mechanisms and flexible reward distribution.

## 📋 Table of Contents

* [Overview](#overview)
* [Features](#features)
* [Architecture](#architecture)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Configuration](#configuration)
* [Building and Testing](#building-and-testing)
* [Deployment](#deployment)
* [Usage Examples](#usage-examples)
* [Program Instructions](#program-instructions)
* [Security Considerations](#security-considerations)
* [Error Handling](#error-handling)
* [Contributing](#contributing)
* [License](#license)
* [Acknowledgments](#acknowledgments)

## Overview

The NfNode Rewards Program is a Solana smart contract that facilitates a secure and efficient reward distribution system. It allows:

* **Administrators** to initialize and fund reward pools, manage NfNode entries, and control program operations
* **NfNode Owners** to claim rewards based on their ownership and operation
* **Hosts** to claim their share of rewards for hosting NfNodes

The system implements multiple security layers including admin partial signatures, nonce-based replay attack prevention, daily claim limits, and program pausing capabilities.

### Key Concepts

* **NfNode**: A network node represented by an NFT, with different types (DON, BYOD, WAYRU_HOTSPOT)
* **Reward Claims**: Users can claim rewards once per day, requiring admin partial signature
* **Token Storage**: Centralized token storage account managed by a PDA (Program Derived Address)
* **Nonce System**: Prevents replay attacks by tracking unique claim identifiers

## Features

### Core Functionality

* ✅ **Reward Claiming**: Secure reward distribution to NfNode owners and hosts
* ✅ **Admin Partial Signature**: Multi-signature requirement for enhanced security
* ✅ **Daily Claim Limit**: Prevents abuse with once-per-day claim restrictions
* ✅ **Nonce Protection**: Replay attack prevention through unique nonce tracking
* ✅ **Program Pausing**: Emergency stop mechanism for administrators
* ✅ **NfNode Management**: Initialize and update NfNode entries with host information
* ✅ **Token Deposits/Withdrawals**: Users can deposit and withdraw tokens (with time restrictions)
* ✅ **Flexible Reward Shares**: Configurable reward distribution between owners and hosts
* ✅ **Multiple NfNode Types**: Support for DON, BYOD, and WAYRU_HOTSPOT types

### Security Features

* 🔒 Admin-controlled operations with partial signature requirements
* 🔒 NFT ownership verification for reward claims
* 🔒 Nonce-based transaction uniqueness
* 🔒 Program pause/unpause functionality
* 🔒 Comprehensive error handling and validation

## Architecture

### Technology Stack

* **Blockchain**: Solana
* **Framework**: Anchor 0.30.1
* **Language**: Rust (program), TypeScript (tests)
* **Token Standard**: SPL Token & Token-2022

### Program Structure

```
programs/nfnode-rewards/
├── src/
│   ├── lib.rs           # Main program entry point
│   ├── instructions/    # Instruction handlers
│   ├── state.rs         # State structures
│   └── errors.rs        # Custom error definitions
```

### Key Accounts

* **Admin Account**: PDA storing admin public key and program state
* **NfNode Entry**: PDA storing NfNode information (host, type, shares)
* **Reward Entry**: PDA tracking user reward claims (nonces, last claim date)
* **Token Storage**: Token account managed by PDA for reward distribution

## Prerequisites

Before you begin, ensure you have the following installed:

* **Rust** (latest stable version)
  

```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

* **Solana CLI** (v1.18 or later)
  

```bash
  sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
  ```

* **Anchor Framework** (v0.30.1)
  

```bash
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
  avm install latest
  avm use latest
  ```

* **Node.js** (v16 or later) and npm/yarn
  

```bash
  node --version
  npm --version
  ```

* **Solana Wallet** with sufficient SOL for deployment and transactions

## Installation

1. **Clone the repository**

   

```bash
   git clone https://github.com/Wayru-Network/rewards-system-program.git
   cd rewards-system-program
   ```

2. **Install dependencies**

   

```bash
   npm install
   # or
   yarn install
   ```

3. **Verify Anchor installation**

   

```bash
   anchor --version
   ```

4. **Build the project**

   

```bash
   anchor build
   ```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
ADMIN_PRIVATE_KEY=<your_admin_private_key_base58>
USER_PRIVATE_KEY=<your_user_private_key_base58>
USER2_PRIVATE_KEY=<your_user2_private_key_base58>
SOLANA_API_URL=https://api.devnet.solana.com
```

**For local development:**

```env
SOLANA_API_URL=http://localhost:8899
```

**Security Note**: Never commit your `.env` file. Add it to `.gitignore` .

### Anchor Configuration

The `Anchor.toml` file contains program configuration. Key settings:

```toml
[programs.localnet]
reward_system = "EqeqjHyJTsmnVFCs3rnUEKSgvYBtjXa5ujJueiexWLHp"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"
```

## Building and Testing

### Build the Program

```bash
anchor build
```

This will:
* Compile the Rust program
* Generate the IDL (Interface Definition Language)
* Create deployment artifacts in `target/deploy/`

### Run Tests

**Start a local validator:**

```bash
anchor localnet
```

**Or reset and start fresh:**

```bash
anchor localnet --reset
```

**Run tests:**

```bash
anchor test
```

**Or use npm scripts:**

```bash
npm test
```

### Test Structure

Tests are located in `tests/` and organized as:
* `nfnode-rewards.ts` - Main test file
* `actions/` - Individual action tests
* `utils/` - Helper functions

## Deployment

### Deploy to Devnet

1. **Configure Solana CLI for devnet**
   

```bash
   solana config set --url devnet
   ```

2. **Get devnet SOL** (if needed)
   

```bash
   solana airdrop 2
   ```

3. **Clean previous builds**
   

```bash
   anchor clean
   ```

4. **Build the program**
   

```bash
   anchor build
   ```

5. **Deploy**
   

```bash
   anchor deploy
   ```

### Deploy to Mainnet

⚠️ **Warning**: Deploying to mainnet requires careful consideration and sufficient SOL (~6 SOL for deployment).

1. **Switch to mainnet**
   

```bash
   solana config set --url mainnet-beta
   ```

2. **Update Anchor.toml** with mainnet configuration

3. **Build and deploy**
   

```bash
   anchor build
   anchor deploy
   ```

### Advanced Deployment

For a complete deployment with IDL initialization:

```bash
# 1. Clean
anchor clean

# 2. Remove old keypair (if needed)
rm -f program-keypair.json

# 3. Create new program keypair
mkdir -p target/deploy
solana-keygen new -o target/deploy/reward_system-keypair.json --force

# 4. Update program ID in lib.rs and Anchor.toml
# Replace declare_id!() in programs/nfnode-rewards/src/lib.rs
# Update [programs.devnet] in Anchor.toml

# 5. Clean and build
anchor clean
anchor build

# 6. Deploy
anchor deploy --program-name reward_system \
  --provider.cluster devnet \
  --program-keypair target/deploy/reward_system-keypair.json

# 7. Initialize IDL
anchor idl init \
  --provider.cluster devnet \
  YOUR_PROGRAM_ID \
  -f target/idl/reward_system.json

# 8. (Optional) Close buffers to recover SOL
solana program close --buffers \
  --url https://api.devnet.solana.com \
  --rpc-timeout 120
```

## Usage Examples

### Initialize the System

```typescript
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";

// Initialize admin account
const adminKeypair = Keypair.fromSecretKey(/* admin secret key */);
const program = /* your program instance */;

await program.methods
  .initializeSystem()
  .accounts({
    user: adminKeypair.publicKey,
    adminAccount: adminAccountPDA,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminKeypair])
  .rpc();
```

### Initialize an NfNode

```typescript
await program.methods
  .initializeNfnode(
    new anchor.BN(hostShare), // e.g., 30 for 30%
    nfnodeType // DON, BYOD, or WAYRU_HOTSPOT
  )
  .accounts({
    userAdmin: adminKeypair.publicKey,
    user: userKeypair.publicKey,
    host: hostKeypair.publicKey,
    manufacturer: manufacturerPubkey,
    nftMintAddress: nftMint,
    userNftTokenAccount: userNftTokenAccount,
    nfnodeEntry: nfnodeEntryPDA,
    adminAccount: adminAccountPDA,
    tokenProgram2022: TOKEN_2022_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([userKeypair])
  .rpc();
```

### Claim Rewards (Owner)

```typescript
// Build instruction
const ix = await program.methods
  .ownerClaimRewards(
    new anchor.BN(rewardAmount),
    new anchor.BN(nonce)
  )
  .accounts({
    userAdmin: adminKeypair.publicKey,
    user: userKeypair.publicKey,
    nftMintAddress: nftMint,
    rewardEntry: rewardEntryPDA,
    nfnodeEntry: nfnodeEntryPDA,
    tokenMint: tokenMint,
    tokenStorageAuthority: tokenStorageAuthorityPDA,
    tokenStorageAccount: tokenStorageAccountPDA,
    userTokenAccount: userTokenAccount,
    userNftTokenAccount: userNftTokenAccount,
    adminAccount: adminAccountPDA,
    tokenProgram2022: TOKEN_2022_PROGRAM_ID,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .instruction();

// Create transaction
let tx = new anchor.web3.Transaction();
tx.add(ix);
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
tx.feePayer = userKeypair.publicKey;

// Admin partial sign
tx.partialSign(adminKeypair);

// Serialize without all signatures
const serializedTx = tx.serialize({
  requireAllSignatures: false,
  verifySignatures: false,
});

// User signs
const recoveredTx = anchor.web3.Transaction.from(
  Buffer.from(serializedTx.toString("base64"), "base64")
);
recoveredTx.partialSign(userKeypair);

// Send transaction
const finalTx = recoveredTx.serialize({
  requireAllSignatures: true,
  verifySignatures: true,
});

const txId = await anchor.web3.sendAndConfirmRawTransaction(
  connection,
  finalTx,
  { commitment: "confirmed" }
);
```

### Fund Token Storage

```typescript
await program.methods
  .fundTokenStorage(new anchor.BN(amount))
  .accounts({
    user: funderKeypair.publicKey,
    tokenMint: tokenMint,
    tokenStorageAuthority: tokenStorageAuthorityPDA,
    tokenStorageAccount: tokenStorageAccountPDA,
    userTokenAccount: funderTokenAccount,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([funderKeypair])
  .rpc();
```

## Program Instructions

### System Management

#### `initialize_system`

Initializes the admin account for the reward system.

**Accounts:**
* `user` (signer): The signer who will become the admin
* `admin_account` (PDA): The admin account PDA
* `system_program`: Solana system program

#### `update_admin_request`

Initiates an admin update request.

**Accounts:**
* `user` (signer): Current admin
* `admin_account` (PDA): Admin account PDA

**Arguments:**
* `new_admin_pubkey`: Public key of the new admin

#### `accept_admin_request`

Accepts a pending admin update request.

**Accounts:**
* `user` (signer): New admin
* `admin_account` (PDA): Admin account PDA

#### `pause_program`

Pauses the program, preventing all reward claims.

**Accounts:**
* `user` (signer): Current admin
* `admin_account` (PDA): Admin account PDA

#### `unpause_program`

Unpauses the program, resuming reward claims.

**Accounts:**
* `user` (signer): Current admin
* `admin_account` (PDA): Admin account PDA

### NfNode Management

#### `initialize_nfnode`

Initializes a new NfNode entry in the system.

**Accounts:**
* `user_admin` (partial signer): Admin
* `user` (signer): User initializing the NfNode
* `host`: Host of the NfNode
* `manufacturer`: Manufacturer of the NfNode
* `nft_mint_address`: NFT mint address
* `user_nft_token_account`: User's NFT token account
* `nfnode_entry` (PDA): NfNode entry PDA
* `admin_account` (PDA): Admin account PDA
* `token_program_2022`: SPL Token 2022 program
* `system_program`: Solana system program

**Arguments:**
* `host_share`: Reward share percentage for the host (0-100)
* `nfnode_type`: Type of NfNode (DON, BYOD, WAYRU_HOTSPOT)

#### `update_nfnode`

Updates an existing NfNode entry.

**Accounts:**
* `user_admin` (partial signer): Admin
* `user` (signer): User updating the NfNode
* `host`: New host address
* `nft_mint_address`: NFT mint address
* `user_nft_token_account`: User's NFT token account
* `nfnode_entry` (PDA): NfNode entry PDA
* `admin_account` (PDA): Admin account PDA
* `token_program_2022`: SPL Token 2022 program
* `system_program`: Solana system program

**Arguments:**
* `host_share`: Updated reward share for the host

### Reward Operations

#### `owner_claim_rewards`

Allows NfNode owners to claim rewards.

**Accounts:**
* `user_admin` (partial signer): Admin
* `user` (signer): User claiming rewards
* `nft_mint_address`: NFT mint address
* `reward_entry` (PDA): Reward entry PDA
* `nfnode_entry` (PDA): NfNode entry PDA
* `token_mint`: Reward token mint
* `token_storage_authority` (PDA): Token storage authority
* `token_storage_account` (PDA): Token storage account
* `user_token_account`: User's token account
* `user_nft_token_account`: User's NFT token account
* `admin_account` (PDA): Admin account PDA
* `token_program_2022`: SPL Token 2022 program
* `token_program`: SPL Token program
* `associated_token_program`: Associated Token program
* `system_program`: Solana system program

**Arguments:**
* `reward_amount`: Amount of tokens to claim
* `nonce`: Unique nonce for this claim

#### `others_claim_rewards`

Allows hosts to claim their share of rewards.

**Accounts:**
* `user_admin` (partial signer): Admin
* `user` (signer): Host claiming rewards
* `nft_mint_address`: NFT mint address
* `reward_entry` (PDA): Reward entry PDA
* `nfnode_entry` (PDA): NfNode entry PDA
* `token_mint`: Reward token mint
* `token_storage_authority` (PDA): Token storage authority
* `token_storage_account` (PDA): Token storage account
* `user_token_account`: Host's token account
* `admin_account` (PDA): Admin account PDA
* `token_program`: SPL Token program
* `associated_token_program`: Associated Token program
* `system_program`: Solana system program

**Arguments:**
* `reward_amount`: Amount of tokens to claim
* `nonce`: Unique nonce for this claim

### Token Management

#### `fund_token_storage`

Funds the token storage account with tokens.

**Accounts:**
* `user` (signer): User funding the storage
* `token_mint`: Token mint address
* `token_storage_authority` (PDA): Token storage authority
* `token_storage_account` (PDA): Token storage account
* `user_token_account`: User's token account
* `associated_token_program`: Associated Token program
* `token_program`: SPL Token program
* `system_program`: Solana system program

**Arguments:**
* `amount`: Amount of tokens to transfer

#### `deposit_tokens`

Deposits tokens into the token storage (for NfNode initialization).

**Accounts:**
* `user` (signer): User depositing tokens
* `token_mint`: Token mint address
* `nft_mint_address`: NFT mint address
* `user_nft_token_account`: User's NFT token account
* `nfnode_entry` (PDA): NfNode entry PDA
* `admin_account` (PDA): Admin account PDA
* `token_storage_authority` (PDA): Token storage authority
* `token_storage_account` (PDA): Token storage account
* `user_token_account`: User's token account
* `associated_token_program`: Associated Token program
* `token_program`: SPL Token program
* `system_program`: Solana system program

#### `withdraw_tokens`

Withdraws tokens from the token storage (after required period).

**Accounts:**
* `user` (signer): User withdrawing tokens
* `token_mint`: Token mint address
* `nft_mint_address`: NFT mint address
* `user_nft_token_account`: User's NFT token account
* `nfnode_entry` (PDA): NfNode entry PDA
* `admin_account` (PDA): Admin account PDA
* `token_storage_authority` (PDA): Token storage authority
* `token_storage_account` (PDA): Token storage account
* `user_token_account`: User's token account
* `associated_token_program`: Associated Token program
* `token_program`: SPL Token program
* `system_program`: Solana system program

### Mint Authority Management

#### `add_mint_authority`

Adds a new mint authority to the system.

**Accounts:**
* `user` (signer): Admin
* `admin_account` (PDA): Admin account PDA

**Arguments:**
* `new_mint_authority`: Public key of the new mint authority

#### `remove_mint_authority`

Removes a mint authority from the system.

**Accounts:**
* `user` (signer): Admin
* `admin_account` (PDA): Admin account PDA

**Arguments:**
* `mint_authority`: Public key of the mint authority to remove

## Security Considerations

### Admin Partial Signatures

All reward claim transactions require a partial signature from an administrator. This ensures:
* Rewards cannot be claimed without admin approval
* Admin maintains control over reward distribution
* Protection against unauthorized claims

### Nonce System

The nonce-based system prevents replay attacks:
* Each claim must use a unique, incrementing nonce
* Nonces are tracked per user and NFT combination
* Prevents duplicate claim attempts

### Daily Claim Limits

Users can claim rewards only once per day:
* Prevents rapid draining of reward pools
* Ensures fair distribution
* Timestamp-based validation

### Program Pausing

Administrators can pause the program:
* Emergency stop mechanism
* Maintenance capability
* Prevents claims during critical updates

### NFT Ownership Verification

Reward claims require NFT ownership verification:
* Users must hold the associated NFT
* Prevents unauthorized claims
* Token account balance checks

## Error Handling

The program defines comprehensive error codes for various failure scenarios:

| Error Code | Description |
|------------|-------------|
| `UnauthorizedAdmin` | Unauthorized user attempted admin action |
| `MissingAdminSignature` | Transaction missing required admin signature |
| `NonceAlreadyClaimed` | Nonce has already been used |
| `ProgramPaused` | Program is currently paused |
| `ClaimAlreadyMadeToday` | User already claimed rewards today |
| `ArithmeticOverflow` | Arithmetic operation resulted in overflow |
| `InvalidNftMint` | Invalid NFT mint address provided |
| `InsufficientNftBalance` | User doesn't own the required NFT |
| `InvalidNfNodeEntry` | Invalid NfNode entry provided |
| `InvalidMint` | Invalid token mint address |
| `InvalidFundingAmount` | Funding amount is zero or negative |
| `DepositAlreadyMade` | Deposit already made for this NfNode |
| `WithdrawAlreadyMade` | Withdrawal already made for this NfNode |
| `WithdrawTooEarly` | Withdrawal attempted before allowed period |
| `AlreadyPaused` | Program is already paused |
| `AlreadyRunning` | Program is already running |

## Contributing

This project is now open source and welcomes contributions from the community. Since WAYRU is no longer operating, there is no official support, but the community can maintain and improve this project.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

* Follow Rust and TypeScript best practices
* Write comprehensive tests for new features
* Update documentation for API changes
* Ensure all tests pass before submitting PRs

## License

This project is open source. Please check the repository for specific license information.

## Acknowledgments

* [Solana](https://solana.com/) - The blockchain platform
* [Anchor](https://www.anchor-lang.com/) - The Solana framework
* [SPL Token](https://spl.solana.com/token) - Token program library

---

## 💙 Farewell Message

With gratitude and love, we say goodbye.

WAYRU is closing its doors, but we are leaving these repositories open and free for the community.

May they continue to inspire builders, dreamers, and innovators.

With love, 
WAYRU

---

**Note**: This project is now **open source** and available for the community to use, modify, and improve. WAYRU no longer exists and will not provide support, maintenance, or updates. The community is welcome to fork, modify, and maintain this codebase as needed.
