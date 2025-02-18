# NfNode Rewards Program

## Overview

The NfNode Rewards Program is a decentralized application built on the Solana blockchain that enables users to claim rewards based on their NfNode operation and ownership. It leverages the Anchor framework to streamline the development of Solana programs.

This program allows administrators to establish a reward system, fund it with tokens, and manage the reward claiming process. Users, who are NfNode owners or operators, can claim rewards once per day. Each claim requires a partial signature from an administrator, enhancing security. The user claiming the reward is responsible for the transaction fees.

## Features

-   **Reward Claiming:** Users can claim rewards based on specified parameters, such as the operation of an NfNode.
-   **Admin Partial Signature:** Reward claim transactions require a partial signature from an administrator, adding an extra layer of security.
-   **User Pays Transaction Fees:** Users claiming rewards are responsible for paying the associated transaction fees.
-   **Secure Nonce Handling:** Nonces are used to prevent replay attacks, ensuring each reward claim is unique.
-   **Daily Claim Limit:** Users can claim rewards only once per day.
-   **Program Pausing:** Administrators can pause the program to halt reward claims and unpause it to resume them.
-   **Token Transfers:** The program facilitates token transfers from a designated storage account to the user's token account.
-   **NfNode Management:** The program allows for the initialization and updating of NfNode entries, including host information and reward shares.
-   **Host Rewards:** Hosts of NfNodes can claim rewards based on their share.
-   **Token Deposit and Withdrawal:** Users can deposit tokens when initializing NfNodes (except for DON types) and withdraw tokens after a specified period.

## Getting Started

### Prerequisites

-   Rust and Cargo installed.
-   Solana CLI installed and configured.
-   Anchor framework installed.
-   A Solana wallet with some SOL for transaction fees.
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

    Create a `.env` file in the root directory and add the following:

    ```
    ADMIN_PRIVATE_KEY=<your_admin_private_key>
    USER_PRIVATE_KEY=<your_user_private_key>
    USER2_PRIVATE_KEY=<your_user2_private_key>
    SOLANA_API_URL=<your_solana_api_url>
    ```

    Replace placeholders with your private keys and Solana API URL. For local testing, use `http://localhost:8899`.

4. Build the project:

    ```bash
    anchor build
    ```

5. Deploy the program to the Solana cluster:

    ```bash
    anchor deploy
    ```

### Running Tests

Run tests with:

```bash
anchor test
```

**Note:** For local testing, start a local validator:

```bash
anchor localnet
```

Or, to reset the validator:

```bash
anchor localnet --reset
```

### Interacting with the Program

Interact with the program using the provided TypeScript tests. Modify `tests/nfnode-rewards.ts` to set parameters and run tests to claim rewards.

### Example Usage

Here's an example of claiming rewards, based on the updated tests:

```typescript
// In tests/nfnode-rewards.ts
it("Claim Rewards After Unpausing (should succeed)", async () => {
    // ... (keypair configuration, airdrops, etc.) ...

    // 1. Define the reward amount and nonce
    const rewardAmount = new anchor.BN(100000000); // Example: 100 tokens
    const nonce = new anchor.BN(12345); // Example: A unique nonce

    // 2. Build the instruction to claim rewards
    const ix = await program.methods
      .ownerClaimRewards(rewardAmount, nonce)
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

    // 9. Sign the transaction with the user's keypair
    recoveredTx.partialSign(userKeypair);

    // 10. Serialize the transaction for sending
    const connection = new Connection(process.env.SOLANA_API_URL);
    const serializedTxFinal = recoveredTx.serialize({
      requireAllSignatures: true,
      verifySignatures: true,
    });

    // 11. Send and confirm the transaction
    const txId = await anchor.web3.sendAndConfirmRawTransaction(connection, serializedTxFinal, { commitment: 'confirmed' });

    console.log("Rewards Claimed Successfully");
    console.log("Transaction ID:", txId);
  });
```

**Explanation:**

1. **Define reward amount and nonce:**
    -   `rewardAmount`: The amount of tokens to claim.
    -   `nonce`: A unique number for each claim, preventing replay attacks. The program ensures the nonce is greater than the last claimed nonce for the user and NFT, is the initial claim (nonce 1), or is a new claim after a nonce overflow.
2. **Build the instruction:**
    -   `ownerClaimRewards(rewardAmount, nonce)`: Calls the `owner_claim_rewards` function with the amount and nonce.
    -   `.accounts(...)`: Specifies the accounts involved, including admin, user, token mint, NFT mint, and PDAs.
    -   `.instruction()`: Creates the instruction object.
3. **Create transaction:**
    -   `new anchor.web3.Transaction()`: Creates a new transaction.
    -   `tx.add(ix)`: Adds the `ownerClaimRewards` instruction to the transaction.
4. **Set blockhash and fee payer:**
    -   `tx.recentBlockhash`: Sets the recent blockhash.
    -   `tx.feePayer = userKeypair.publicKey`: Sets the user as the fee payer.
5. **Partial sign (admin):**
    -   `tx.partialSign(adminKeypair)`: Admin partially signs the transaction.
6. **Serialize:**
    -   `tx.serialize(...)`: Serializes the transaction for network transmission.
7. **Convert to base64:**
    -   `serializedTx.toString("base64")`: Converts to base64, necessary for some workflows or temporary storage.
8. **Deserialize:**
    -   `anchor.web3.Transaction.from(...)`: Deserializes from base64 back to a `Transaction` object.
9. **Partial sign (user):**
    -   `recoveredTx.partialSign(userKeypair)`: User signs the deserialized transaction.
10. **Serialize for sending:**
    -   `recoveredTx.serialize(...)`: Serializes with all required signatures.
11. **Send and confirm:**
    -   `anchor.web3.sendAndConfirmRawTransaction(...)`: Sends and waits for confirmation.

## Program Instructions

### `initialize_system`

Initializes the admin account for the reward system.

-   **Accounts:**
    -   `user`: The signer, who will become the admin.
    -   `admin_account`: The admin account PDA.
    -   `system_program`: The Solana system program.

### `update_admin`

Updates the admin's public key.

-   **Accounts:**
    -   `user`: The current admin, who must sign the transaction.
    -   `admin_account`: The admin account PDA.
-   **Arguments:**
    -   `new_admin_pubkey`: The public key of the new admin.

### `initialize_nfnode`

Initializes a new NfNode entry.

-   **Accounts:**
    -   `user_admin`: The admin, who must partially sign the transaction.
    -   `user`: The user initializing the NfNode, who pays for the account creation.
    -   `host`: The host of the NfNode.
    -   `manufacturer`: The manufacturer of the NfNode.
    -   `nft_mint_address`: The mint address of the NFT associated with the NfNode.
    -   `user_nft_token_account`: The user's token account for the NFT, used to verify ownership.
    -   `nfnode_entry`: The NfNode entry PDA.
    -   `admin_account`: The admin account PDA.
    -   `token_program_2022`: The SPL Token 2022 program.
    -   `system_program`: The Solana system program.
-   **Arguments:**
    -   `host_share`: The share of rewards that the host will receive.
    -   `nfnode_type`: The type of the NfNode (DON, BYOD, WAYRU_HOTSPOT).

### `update_nfnode`

Updates an existing NfNode entry.

-   **Accounts:**
    -   `user_admin`: The admin, who must partially sign the transaction.
    -   `user`: The user updating the NfNode.
    -   `host`: The new host of the NfNode.
    -   `nft_mint_address`: The mint address of the NFT associated with the NfNode.
    -   `user_nft_token_account`: The user's token account for the NFT, used to verify ownership.
    -   `nfnode_entry`: The NfNode entry PDA.
    -   `admin_account`: The admin account PDA.
    -   `token_program_2022`: The SPL Token 2022 program.
    -   `system_program`: The Solana system program.
-   **Arguments:**
    -   `host_share`: The updated share of rewards for the host.

### `fund_token_storage`

Funds the token storage account with tokens.

-   **Accounts:**
    -   `user`: The signer, who is funding the storage.
    -   `token_mint`: The mint of the token being transferred.
    -   `token_storage_authority`: The authority of the token storage PDA.
    -   `token_storage_account`: The token storage account PDA.
    -   `user_token_account`: The user's token account.
    -   `associated_token_program`: The SPL Associated Token program.
    -   `token_program`: The SPL Token program.
    -   `system_program`: The Solana system program.
-   **Arguments:**
    -   `amount`: The amount of tokens to transfer.

### `owner_claim_rewards`

Allows the owner of an NfNode to claim rewards.

-   **Accounts:**
    -   `user_admin`: The admin, who must partially sign the transaction.
    -   `user`: The user claiming the rewards.
    -   `nft_mint_address`: The mint address of the NFT associated with the NfNode.
    -   `reward_entry`: The reward entry PDA for the user and NFT.
    -   `nfnode_entry`: The NfNode entry PDA.
    -   `token_mint`: The mint of the reward token.
    -   `token_storage_authority`: The authority of the token storage PDA.
    -   `token_storage_account`: The token storage account PDA.
    -   `user_token_account`: The user's token account where rewards will be sent.
    -   `user_nft_token_account`: The user's token account for the NFT, used to verify ownership.
    -   `admin_account`: The admin account PDA.
    -   `token_program_2022`: The SPL Token 2022 program.
    -   `token_program`: The SPL Token program.
    -   `associated_token_program`: The SPL Associated Token program.
    -   `system_program`: The Solana system program.
-   **Arguments:**
    -   `reward_amount`: The amount of rewards to claim.
    -   `nonce`: A unique number for the claim.

### `others_claim_rewards`

Allows the host to claim rewards.

-   **Accounts:**
    -   `user_admin`: The admin, who must partially sign the transaction.
    -   `user`: The user (host) claiming the rewards.
    -   `nft_mint_address`: The mint address of the NFT associated with the NfNode.
    -   `reward_entry`: The reward entry PDA for the user and NFT.
    -   `nfnode_entry`: The NfNode entry PDA.
    -   `token_mint`: The mint of the reward token.
    -   `token_storage_authority`: The authority of the token storage PDA.
    -   `token_storage_account`: The token storage account PDA.
    -   `user_token_account`: The user's token account where rewards will be sent.
    -   `admin_account`: The admin account PDA.
    -   `token_program`: The SPL Token program.
    -   `associated_token_program`: The SPL Associated Token program.
    -   `system_program`: The Solana system program.
-   **Arguments:**
    -   `reward_amount`: The amount of rewards to claim.
    -   `nonce`: A unique number for the claim.

### `pause_program`

Pauses the program, preventing reward claims.

-   **Accounts:**
    -   `user`: The admin, who must sign the transaction.
    -   `admin_account`: The admin account PDA.

### `unpause_program`

Unpauses the program, allowing reward claims.

-   **Accounts:**
    -   `user`: The admin, who must sign the transaction.
    -   `admin_account`: The admin account PDA.

### `deposit_tokens`

Deposits tokens into the token storage account.

-   **Accounts:**
    -   `user`: The signer, who is depositing the tokens.
    -   `token_mint`: The mint of the token being deposited.
    -   `nft_mint_address`: The mint address of the NFT associated with the NfNode.
    -   `user_nft_token_account`: The user's token account for the NFT, used to verify ownership.
    -   `nfnode_entry`: The NfNode entry PDA.
    -   `admin_account`: The admin account PDA.
    -   `token_storage_authority`: The authority of the token storage PDA.
    -   `token_storage_account`: The token storage account PDA.
    -   `user_token_account`: The user's token account.
    -   `associated_token_program`: The SPL Associated Token program.
    -   `token_program`: The SPL Token program.
    -   `system_program`: The Solana system program.

### `withdraw_tokens`

Withdraws tokens from the token storage account.

-   **Accounts:**
    -   `user`: The signer, who is withdrawing the tokens.
    -   `token_mint`: The mint of the token being withdrawn.
    -   `nft_mint_address`: The mint address of the NFT associated with the NfNode.
    -   `user_nft_token_account`: The user's token account for the NFT, used to verify ownership.
    -   `nfnode_entry`: The NfNode entry PDA.
    -   `admin_account`: The admin account PDA.
    -   `token_storage_authority`: The authority of the token storage PDA.
    -   `token_storage_account`: The token storage account PDA.
    -   `user_token_account`: The user's token account.
    -   `associated_token_program`: The SPL Associated Token program.
    -   `token_program`: The SPL Token program.
    -   `system_program`: The Solana system program.

## Security Considerations

-   **Admin Partial Signature:** The requirement for an admin's partial signature adds a layer of security to reward claims. It ensures that rewards cannot be claimed without the admin's approval.
-   **Nonce Handling:** The use of nonces prevents replay attacks. Each nonce must be unique and greater than the previously used nonce for a given user and NFT.
-   **Daily Claim Limit:** The daily claim limit prevents users from draining the reward pool too quickly and ensures a fair distribution of rewards.
-   **Program Pausing:** The ability to pause the program allows admins to halt reward claims in case of emergencies or maintenance.

## Error Handling

The program defines the following custom error codes:

-   `UnauthorizedAdmin`: Returned when an unauthorized user attempts to perform an admin-only action.
-   `MissingAdminSignature`: Returned when a transaction requiring the admin's partial signature is not signed by the admin.
-   `NonceAlreadyClaimed`: Returned when a user attempts to claim rewards with a nonce that has already been used.
-   `ProgramPaused`: Returned when a user attempts to claim rewards while the program is paused.
-   `ClaimAlreadyMadeToday`: Returned when a user attempts to claim rewards more than once in a day.
-   `ArithmeticOverflow`: Returned when an arithmetic operation results in an overflow.
-   `InvalidNftMint`: Returned when an invalid NFT mint address is provided.
-   `InsufficientNftBalance`: Returned when the user's NFT balance is insufficient.
-   `InvalidNfNodeEntry`: Returned when an invalid NfNode entry is provided.
-   `InvalidMint`: Returned when an invalid token mint address is provided.
-   `InvalidFundingAmount`: Returned when the funding amount is zero or negative.
-   `DepositAlreadyMade`: Returned when a deposit has already been made for the NfNode.
-   `WithdrawAlreadyMade`: Returned when a withdrawal has already been made for the NfNode.
-   `WithdrawTooEarly`: Returned when a withdrawal is attempted before the allowed period.

## Acknowledgments

-   [Solana](https://solana.com/)
-   [Anchor](https://project-serum.github.io/anchor/)