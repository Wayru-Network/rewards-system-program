import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair } from "@solana/web3.js";

export async function updateAdmin(
  program: Program<RewardSystem>,
  adminKeypair: Keypair
) {
  await program.methods
    .updateAdmin(adminKeypair.publicKey)
    .accounts({
      user: adminKeypair.publicKey,
    })
    .signers([adminKeypair])
    .rpc();
}