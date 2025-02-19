import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey } from "@solana/web3.js";

export async function updateAdmin(

  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  deployerKeypair: Keypair,
  adminAccountPDA: PublicKey
) {
  await program.methods
    .updateAdminRequest(adminKeypair.publicKey)
    .accounts({
      user: deployerKeypair.publicKey,
    })
    .signers([deployerKeypair])
    .rpc({ commitment: 'confirmed' });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  let updated = false;
  let times = 0;
  while (!updated && times < 10) {
    try {
      const adminAccountState = await program.account.adminAccount.fetch(
        adminAccountPDA,
        "finalized"
      );
      updated = adminAccountState.adminCandidatePubkey.toBase58() === adminKeypair.publicKey.toBase58();
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      times++;
    }
  }
}
export async function acceptAdmin(

  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  adminAccountPDA: PublicKey
) {
  await program.methods
    .acceptAdminRequest()
    .accounts({
      user: adminKeypair.publicKey,
    })
    .signers([adminKeypair])
    .rpc({ commitment: 'confirmed' });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  let updated = false;
  let times = 0;
  while (!updated && times < 10) {
    try {
      const adminAccountState = await program.account.adminAccount.fetch(
        adminAccountPDA,
        "finalized"
      );
      updated = adminAccountState.adminPubkey.toBase58() === adminKeypair.publicKey.toBase58();
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      times++;
    }
  }
}