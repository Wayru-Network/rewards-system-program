# Rewards System Program

## Overview

The Rewards System Program is a decentralized application built on the Solana blockchain that allows users to claim rewards based on their contributions. This project utilizes the Anchor framework to simplify the development of Solana programs.

The program enables administrators to set up a reward system and users to claim those rewards. Transactions are partially signed by an administrator for enhanced security, while the user claiming the reward pays the transaction fees.

## Features

-   **Reward claiming:** Users can claim rewards based on specified parameters.
-   **Admin partial signature:** Reward claim transactions require partial signature from an administrator for added security.
-   **User pays transaction fees:** The user claiming the reward is responsible for paying the transaction fees.
-   **Secure handling of nonces:** Nonces are used to prevent replay attacks.
-   **Token transfers:** The program facilitates token transfers to multiple accounts (owner, host, manufacturer).

## Getting Started

### Prerequisites

-   Rust and Cargo installed on your machine.
-   Solana CLI installed and configured.
-   Anchor framework installed.

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

Here is an example of how to claim rewards, based on the `Claim Rewards with admin signature Must Success` test:

```typescript
// In tests/nfnode-rewards.ts
it("Claim Rewards with admin signature Must Success", async () => {
// ... (keypair configuration, airdrops, etc.) ...
// Build the instruction to claim rewards, specifying that the administrator
// will partially sign this instruction.
const claimRewardsIx = await program.methods
.claimRewards(
new anchor.BN(rewardAmount), // Reward amount
userKeypair.publicKey, // User's public key
new anchor.BN(nonce) // Nonce
)
.accounts({
user: userKeypair.publicKey, // User claiming
userAdmin: adminKeypair.publicKey, // Administrator
tokenMint: mint, // Reward token
// ... other accounts ...
})
.signers([adminKeypair]) // Administrator's partial signature
.instruction();
// Create a new transaction and add the instruction.
let tx = new Transaction();
tx.add(claimRewardsIx);
// Get the recent blockhash.
tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
// Set the feePayer as userKeypair.publicKey.
tx.feePayer = userKeypair.publicKey;
// Serialize the transaction without requiring all signatures.
const serializedTx = tx.serialize({
requireAllSignatures: false,
});
const txBase64 = serializedTx.toString("base64");
// Deserialize the transaction.
const recoveredTx = Transaction.from(Buffer.from(txBase64, "base64"));
// Sign the transaction with userKeypair.
recoveredTx.partialSign(userKeypair);
// The claimant sends the transaction.
const txId = await provider.sendAndConfirm(recoveredTx, [userKeypair], { commitment: 'confirmed' });
console.log("Rewards Claimed");
console.log("Transaction ID:", txId);
});
```
**Explanation of the example:**

1. **`claimRewardsIx`:** The instruction for claiming rewards is constructed.
    *   **`rewardAmount`:** The amount of the reward to be claimed.
    *   **`userKeypair.publicKey`:** The public key of the user claiming the reward.
    *   **`nonce`:** A unique number to prevent replay attacks.
    *   **`.signers([adminKeypair])`:** Specifies that the administrator (`adminKeypair`) will partially sign this instruction.
2. **`tx`:** A new transaction is created and the `claimRewardsIx` instruction is added to it.
3. **`tx.recentBlockhash`:** The recent `blockhash` is set for the transaction.
4. **`tx.feePayer = userKeypair.publicKey;`:** The user claiming the reward (`userKeypair`) is set as the payer of the transaction fees.
5. **Serialization and deserialization:** The transaction is serialized and then deserialized. This is an intermediate step that might be necessary in certain workflows, for example, when the transaction is signed at different times or by different entities.
6. **`recoveredTx.partialSign(userKeypair);`:** The user signs the deserialized transaction.
7. **`provider.sendAndConfirm`:** The transaction, now signed by both the administrator and the user, is sent to the network for confirmation.

## Acknowledgments

-   [Solana](https://solana.com/)
-   [Anchor](https://project-serum.github.io/anchor/)