import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey } from "@solana/web3.js";

export async function fundTokenStorage(
  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  mint: PublicKey,
  amount: anchor.BN
) {
  await program.methods
    .fundTokenStorage(amount)
    .accounts({
      user: adminKeypair.publicKey,
      tokenMint: mint,
    })
    .signers([adminKeypair])
    .rpc();
}