import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import { Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";

export async function updateNfnode(
  program: Program<RewardSystem>,
  adminKeypair: Keypair,
  userKeypair: Keypair,
  user2Keypair: Keypair,
  nftMint: PublicKey,
  userNFTTokenAccount: PublicKey,
  nfnodeEntryPDA: PublicKey
) {
  await program.methods
    .updateNfnode(new anchor.BN(50))
    .accounts({
      userAdmin: adminKeypair.publicKey,
      user: userKeypair.publicKey,
      host: user2Keypair.publicKey,
      nftMintAddress: nftMint,
      userNftTokenAccount: userNFTTokenAccount,
      tokenProgram2022: TOKEN_2022_PROGRAM_ID,
    })
    .signers([adminKeypair, userKeypair])
    .rpc();

  const updatedNfNodeEntry = await program.account.nfNodeEntry.fetch(
    nfnodeEntryPDA
  );
  expect(updatedNfNodeEntry.host.toBase58() == user2Keypair.publicKey.toBase58()).to.be.true;
  expect(updatedNfNodeEntry.hostShare.toNumber() == 50).to.be.true;
}