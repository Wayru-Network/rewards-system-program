# Rewards System Program

## Overview

The Rewards System Program is a decentralized application built on the Solana blockchain that allows users to claim rewards based on their contributions and NFT ownership. This project utilizes the Anchor framework to simplify the development of Solana programs.

The program enables administrators to set up a reward system, fund it with tokens, and pause/unpause reward claiming. Users can claim rewards once per day, and each claim requires a partial signature from an administrator for enhanced security. The user claiming the reward pays the transaction fees.

## Features

-   **Reward claiming:** Users can claim rewards based on specified parameters and NFT ownership.
-   **Admin partial signature:** Reward claim transactions require partial signature from an administrator for added security.
-   **User pays transaction fees:** The user claiming the reward is responsible for paying the transaction fees.
-   **Secure handling of nonces:** Nonces are used to prevent replay attacks, ensuring each reward claim is unique.
-   **Daily claim limit:** Users can only claim rewards once per day.
-   **Program pausing:** Administrators can pause the program to prevent reward claims, and unpause it to allow claims again.
-   **Token transfers:** The program facilitates token transfers from a designated storage account to the user's token account.

## Getting Started

### Prerequisites

-   Rust and Cargo installed on your machine.
-   Solana CLI installed and configured.
-   Anchor framework installed.
-   A Solana wallet with some SOL to pay for transaction fees.
-   Node.js and npm installed.

### Installation

1. Clone the repository (ensure you have access):

    ```bash
    git clone https://github.com/Wayru-Network/rewards-system-program.git
    cd rewards-system-program
    ```

2. Install the dependencies:

    ```bash
    npm install
    ```

3. Set up environment variables:

    Create a `.env` file in the root directory of the project and add the following variables:

    ```
    ADMIN_PRIVATE_KEY=<your_admin_private_key>
    USER_PRIVATE_KEY=<your_user_private_key>
    USER2_PRIVATE_KEY=<your_user2_private_key>
    SOLANA_API_URL=<your_solana_api_url>
    ```

    Replace the placeholders with your actual private keys and Solana API URL. For local testing, you can use `http://localhost:8899` as the API URL.

4. Build the project:

    ```bash
    anchor build
    ```

5. Deploy the program to the Solana cluster:

    ```bash
    anchor deploy
    ```

### Running Tests

To run the tests for the program, use the following command:

```bash
anchor test
```

**Note:** To run tests locally, start a local validator with:

```bash
anchor localnet
```

Or, if you need to reset the validator:

```bash
anchor localnet --reset
```

### Interacting with the Program

You can interact with the program using the provided TypeScript tests. Modify the `tests/nfnode-rewards.ts` file to set your parameters and run the tests to claim rewards.

### Example Usage

Here is an example of how to claim rewards, based on the updated tests:

```typescript
// In tests/nfnode-rewards.ts
it("Claim Rewards After Unpausing (should succeed)", async () => {
    // ... (keypair configuration, airdrops, etc.) ...

    // 1. Define the reward amount and nonce
    const rewardAmount = new anchor.BN(100000000); // Example: 100 tokens
    const nonce = new anchor.BN(12345); // Example: A unique nonce

    // 2. Build the instruction to claim rewards
    const ix = await program.methods
      .claimRewards(rewardAmount, nonce)
      .accounts({
        userAdmin: adminKeypair.publicKey, // Admin's public key for partial signature
        user: userKeypair.publicKey, // User's public key claiming the reward
        tokenMint: mint, // Reward token mint address
        nftMintAddress: nftMint, // NFT mint address
        // ... other accounts (token_storage_authority, token_storage_account, user_token_account, admin_account, etc.) ...
      })
      .instruction();

    // 3. Create a new transaction and add the instruction
    let tx = new anchor.web3.Transaction();
    tx.add(ix);

    // 4. Set the recent blockhash and fee payer
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = userKeypair.publicKey; // User pays the transaction fees

    // 5. Partially sign the transaction with the admin's keypair
    tx.partialSign(adminKeypair);

    // 6. Serialize the transaction without requiring all signatures
    const serializedTx = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // 7. Convert the serialized transaction to base64
    const txBase64 = serializedTx.toString("base64");

    // 8. Deserialize the transaction from base64
    const recoveredTx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));

    // 9. Sign the transaction with the