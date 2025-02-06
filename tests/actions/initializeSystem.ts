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
  const [programDataAddress] = PublicKey.findProgramAddressSync(
    [program.programId.toBuffer()],
    new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')
  );
  //const programDataAddress = new PublicKey("HDwx7pg7m1ozQSUnregX3dH1X6VjeZknng3ysCS6ehgB")//changes on diferents programID and deployments 
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