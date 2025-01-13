import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair } from "@solana/web3.js";

export async function initializeSystem(
  program: Program<RewardSystem>,
  adminKeypair: Keypair
) {
  await program.methods
    .initializeSystem()
    .accounts({
      user: adminKeypair.publicKey,
    })
    .signers([adminKeypair])
    .rpc();
}