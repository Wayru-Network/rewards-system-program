import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey } from "@solana/web3.js";

export async function removeMintAuthority(
  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  mintAuthority: PublicKey
) {
  await program.methods
    .removeMintAuthority(mintAuthority)
    .accounts({
      user: adminKeypair.publicKey,
    })
    .signers([adminKeypair])
    .rpc({ commitment: "confirmed" });
}