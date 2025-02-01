import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export async function withdrawTokens(
    program: Program<RewardSystem>,
    userKeypair: Keypair,
    mint: PublicKey,
    nftMint: PublicKey,
    userNFTTokenAccount: PublicKey
) {
    await program.methods
        .withdrawTokens()
        .accounts({
            user: userKeypair.publicKey,
            tokenMint: mint,
            nftMintAddress: nftMint,
            tokenProgram2022: TOKEN_2022_PROGRAM_ID,
            userNftTokenAccount: userNFTTokenAccount
        })
        .signers([userKeypair])
        .rpc();
}