import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey } from "@solana/web3.js";

export async function addMintAuthority(
  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  newMintAuthority: PublicKey,
  adminAccountPDA: PublicKey
) {
  try {
    await program.methods
      .addMintAuthority(newMintAuthority)
      .accounts({
        user: adminKeypair.publicKey,
      })
      .signers([adminKeypair])
      .rpc({ commitment: "confirmed" });

  } catch (error) {
    console.log('error:', error)
  }


  await new Promise((resolve) => setTimeout(resolve, 5000));
  let updated = false;
  let times = 0;
  while (!updated && times < 10) {
    try {
      const adminAccountState = await program.account.adminAccount.fetch(
        adminAccountPDA,
        "finalized"
      );
      const mintAuthorities = adminAccountState.mintAuthorities.map((mintAuthority) => mintAuthority.toBase58());
      updated = mintAuthorities.includes(newMintAuthority.toBase58());
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      times++;
    }
  }
}