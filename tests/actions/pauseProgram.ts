import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

export async function pauseProgram(
  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  adminAccountPDA: PublicKey
) {
  await program.methods
    .pauseProgram()
    .accounts({
      user: adminKeypair.publicKey,
    })
    .signers([adminKeypair])
    .rpc({ commitment: "confirmed" });
  const programState = await program.account.adminAccount.fetch(
    adminAccountPDA
  );
  expect(programState.paused).to.be.true;
}