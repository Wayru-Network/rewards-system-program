import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export async function ownerClaimRewards(
    program: Program<RewardSystem>,
    provider: anchor.AnchorProvider,
    adminKeypair: Keypair,
    userKeypair: Keypair,
    mint: PublicKey,
    nftMint: PublicKey,
    userNFTTokenAccount: PublicKey,
    rewardAmount: anchor.BN,
    nonce: anchor.BN
) {
    const ix = await program.methods
        .ownerClaimRewards(rewardAmount, nonce)
        .accounts({
            userAdmin: adminKeypair.publicKey,
            user: userKeypair.publicKey,
            tokenMint: mint,
            nftMintAddress: nftMint,
            tokenProgram2022: TOKEN_2022_PROGRAM_ID,
            userNftTokenAccount: userNFTTokenAccount,
        })
        .instruction();

    let tx = new anchor.web3.Transaction();
    tx.add(ix);
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = userKeypair.publicKey;
    tx.partialSign(adminKeypair);

    const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    });

    const txBase64 = serializedTx.toString("base64");
    const recoveredTx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));
    recoveredTx.partialSign(userKeypair);

    const connection = new Connection(process.env.SOLANA_API_URL);
    const serializedTxFinal = recoveredTx.serialize({
        requireAllSignatures: true,
        verifySignatures: true,
    });

    const txId = await anchor.web3.sendAndConfirmRawTransaction(connection, serializedTxFinal, { commitment: 'confirmed' });
    console.log("Rewards Claimed Successfully");
    console.log("Transaction ID:", txId);
}

export async function othersClaimRewards(
    program: Program<RewardSystem>,
    provider: anchor.AnchorProvider,
    adminKeypair: Keypair,
    userKeypair: Keypair,
    mint: PublicKey,
    nftMint: PublicKey,
    rewardAmount: anchor.BN,
    nonce: anchor.BN
) {
    const ix = await program.methods
        .othersClaimRewards(rewardAmount, nonce)
        .accounts({
            userAdmin: adminKeypair.publicKey,
            user: userKeypair.publicKey,
            tokenMint: mint,
            nftMintAddress: nftMint,
        })
        .instruction();

    let tx = new anchor.web3.Transaction();
    tx.add(ix);
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = userKeypair.publicKey;
    tx.partialSign(adminKeypair);

    const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    });

    const txBase64 = serializedTx.toString("base64");
    const recoveredTx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));
    recoveredTx.partialSign(userKeypair);

    const connection = new Connection(process.env.SOLANA_API_URL);
    const serializedTxFinal = recoveredTx.serialize({
        requireAllSignatures: true,
        verifySignatures: true,
    });

    const txId = await anchor.web3.sendAndConfirmRawTransaction(connection, serializedTxFinal, { commitment: 'confirmed' });
    console.log("Rewards Claimed Successfully");
    console.log("Transaction ID:", txId);
}