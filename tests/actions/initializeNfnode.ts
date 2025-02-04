import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";

export async function initializeNfnode(
  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  userKeypair: Keypair,
  user2Keypair: Keypair,
  nftMint: PublicKey,
  userNFTTokenAccount: PublicKey,
  nfnodeEntryPDA: PublicKey,
  tokenMint: PublicKey,
  nfnodeType: { don: {} } | { byod: {} } | { wayruHotspot: {} }
) {
  await program.methods
    .initializeNfnode(new anchor.BN(0), nfnodeType) // Pass the enum as an object
    .accounts({
      userAdmin: adminKeypair.publicKey,
      user: userKeypair.publicKey,
      nftMintAddress: nftMint,
      host: userKeypair.publicKey,
      manufacturer: user2Keypair.publicKey,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
      userNftTokenAccount: userNFTTokenAccount,
      tokenMint,
    })
    .signers([adminKeypair, userKeypair])
    .rpc({ commitment: "confirmed" });
  console.log("initialize nfnode success");
  // Add a delay of 5 seconds after the transaction is confirmed
  await new Promise((resolve) => setTimeout(resolve, 5000));
  let nfnodeData = false;
  let times = 0;
  while (!nfnodeData && times < 10) {
    try {
      const nfnodeState = await program.account.nfNodeEntry.fetch(
        nfnodeEntryPDA,
        "finalized"
      );
      nfnodeData = nfnodeState.host.toBase58().length > 0;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      times++;
    }
  }
  expect(nfnodeData).to.be.true;
}