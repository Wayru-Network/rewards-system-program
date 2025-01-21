import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair } from "@solana/web3.js";

export async function updateAdmin(
  
  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  deployerKeypair: Keypair
) {
  await program.methods
    .updateAdmin(adminKeypair.publicKey)
    .accounts({
      user: deployerKeypair.publicKey,
    })
    .signers([deployerKeypair])
    .rpc({commitment:'finalized'});
}