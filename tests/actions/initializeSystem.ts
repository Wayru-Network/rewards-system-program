import * as anchor from "@coral-xyz/anchor";
import { Program, ProgramAccount } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey } from "@solana/web3.js";

export async function initializeSystem(
  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  tokenMint: PublicKey
) {
  const programDataAddress = new PublicKey("7RHXmtumkAtJHPeQ4hYstR11DWVJoPfxFvW6MRPzkdzS")//changes on diferents programID and deployments 
  await program.methods
    .initializeSystem()
    .accounts({
      user: adminKeypair.publicKey,
      programData: programDataAddress,
      tokenMint

    })
    .signers([adminKeypair])
    .rpc({ commitment: 'confirmed' });
}