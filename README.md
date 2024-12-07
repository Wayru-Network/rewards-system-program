# Rewards System Program

## Overview

Rewards System Program is a decentralized application built on the Solana blockchain that allows users to claim rewards based on their contributions. This project utilizes the Anchor framework to simplify the development of Solana programs.

## Features

- Claim rewards based on specified parameters.
- Admin signature verification using Ed25519.
- Secure handling of nonces to prevent replay attacks.
- Token transfers to multiple accounts (owner, host, manufacturer).

## Getting Started

### Prerequisites

- Rust and Cargo installed on your machine.
- Solana CLI installed and configured.
- Anchor framework installed.

### Installation

1. Clone the repository (ensure you have access):

   ```bash
   git clone https://github.com/Wayru-Network/rewards-system-program.git
   cd rewards-system-program
   ```

2. Build the project:

   ```bash
   anchor build
   ```

3. Deploy the program to the Solana cluster:

   ```bash
   anchor deploy
   ```

### Running Tests

To run the tests for the program, use the following command:

```bash
anchor test
```

### Interacting with the Program

You can interact with the program using the provided TypeScript tests. Modify the `tests/nfnode-rewards.ts` file to set your parameters and run the tests to claim rewards.

### Example Usage

Here is an example of how to claim rewards:

```typescript
const tx = await program.methods.claimRewards(
  new anchor.BN(rewardAmount), // Reward amount
  ownerShare,                  // Owner share percentage
  hostShare,                   // Host share percentage
  Array.from(adminKeypair.publicKey.toBytes()), // Admin public key
  Array.from(signature),       // Admin signature
  new anchor.BN(nonce)        // Nonce
);
console.log("Your transaction signature", tx);
```
## Acknowledgments

- [Solana](https://solana.com/)
- [Anchor](https://project-serum.github.io/anchor/)