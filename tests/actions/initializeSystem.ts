import * as anchor from "@coral-xyz/anchor";
import { Program, ProgramAccount } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey } from "@solana/web3.js";

export async function initializeSystem(
  program: Program<RewardSystem>,
  deployerKeypair: Keypair,
  tokenMint: PublicKey,
  adminKeypair: Keypair
) {
  const programDataAddress = new PublicKey("CgPQ6kuTiGvh6b5b2UzbKwL4XgLbrYXNA8t4regUCfEW")//changes on diferents programID and deployments 
  await program.methods
    .initializeSystem()
    .accounts({
      user: deployerKeypair.publicKey,
      programData: programDataAddress,
      tokenMint,
      mintAuthority: adminKeypair.publicKey
    })
    .signers([deployerKeypair])
    .rpc({ commitment: 'confirmed' });
}