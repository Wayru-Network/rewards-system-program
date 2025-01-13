import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../target/types/reward_system";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import * as dotenv from "dotenv";
import { expect } from "chai";

import {
  setupTests,
} from "./utils";
import {
  initializeSystem,
  initializeNfnode,
  updateAdmin,
  updateNfnode,
  fundTokenStorage,
  ownerClaimRewards,
  pauseProgram,
  unpauseProgram,
  othersClaimRewards
} from "./actions";

describe("nfnode-rewards", async () => {
  dotenv.config();
  console.log("Starting test...");
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.RewardSystem as Program<RewardSystem>;

  let adminKeypair: Keypair,
    userKeypair: Keypair,
    user2Keypair: Keypair,
    mint: PublicKey,
    nftMint: PublicKey,
    adminTokenAccount: PublicKey,
    userTokenAccount: PublicKey,
    userNFTTokenAccount: PublicKey,
    user2NFTTokenAccount: PublicKey,
    user2TokenAccount: PublicKey,
    tokenStoragePDA: PublicKey,
    adminAccountPDA: PublicKey,
    nfnodeEntryPDA: PublicKey;

  before(async () => {
    const setupResult = await setupTests(provider, program);
    ({
      adminKeypair,
      userKeypair,
      user2Keypair,
      mint,
      nftMint,
      adminTokenAccount,
      userTokenAccount,
      userNFTTokenAccount,
      user2NFTTokenAccount,
      user2TokenAccount,
      tokenStoragePDA,
      adminAccountPDA,
      nfnodeEntryPDA,
    } = setupResult);
  });

  it("Initialize Reward System", async () => {
    await initializeSystem(program, adminKeypair);
  });

  it("Initialize Nfnode", async () => {
    await initializeNfnode(
      program,
      adminKeypair,
      userKeypair,
      user2Keypair,
      nftMint,
      userNFTTokenAccount,
      nfnodeEntryPDA
    );
  });

  it("Update admin", async () => {
    await updateAdmin(program, adminKeypair);
  });

  it("Should update nfnode entry", async () => {
    await updateNfnode(
      program,
      adminKeypair,
      userKeypair,
      user2Keypair,
      nftMint,
      userNFTTokenAccount,
      nfnodeEntryPDA
    );
  });

  it("Fund Token Storage", async () => {
    await fundTokenStorage(program, adminKeypair, mint, new anchor.BN(500000000));
  });

  it("Claim Rewards without admin signature must fail", async () => {
    let errorOccurred = false;
    let errorMessage = "";

    try {
      await ownerClaimRewards(
        program,
        provider,
        userKeypair,
        userKeypair,
        mint,
        nftMint,
        userNFTTokenAccount,
        new anchor.BN(100000000),
        new anchor.BN(32345)
      );
    } catch (error) {
      errorOccurred = true;
      errorMessage = error.message;
    }

    expect(errorOccurred).to.be.true;
  });

  it("Pause Program", async () => {
    await pauseProgram(program, adminKeypair, adminAccountPDA);
  });

  it("Attempt to Claim Rewards While Paused (should fail)", async () => {
    let claimError = null;
    try {
      await ownerClaimRewards(
        program,
        provider,
        adminKeypair,
        userKeypair,
        mint,
        nftMint,
        userNFTTokenAccount,
        new anchor.BN(100000000),
        new anchor.BN(32348)
      );
    } catch (error) {
      claimError = error;
    }

    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Program is paused.");
  });

  it("Unpause Program", async () => {
    await unpauseProgram(program, adminKeypair, adminAccountPDA);
  });

  it("Attempt to Claim Rewards With no nft (should fail)", async () => {
    let claimError = null;
    try {
      await ownerClaimRewards(
        program,
        provider,
        adminKeypair,
        user2Keypair,
        mint,
        nftMint,
        user2NFTTokenAccount,
        new anchor.BN(100000000),
        new anchor.BN(32350)
      );
    } catch (error) {
      claimError = error;
    }

    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Insufficient NFT balance.");
  });

  it("Claim Rewards After Unpausing (should succeed)", async () => {
    await ownerClaimRewards(
      program,
      provider,
      adminKeypair,
      userKeypair,
      mint,
      nftMint,
      userNFTTokenAccount,
      new anchor.BN(100000000),
      new anchor.BN(32349)
    );
  });

  it("Should allow host to claim rewards", async () => {
    await othersClaimRewards(
      program,
      provider,
      adminKeypair,
      user2Keypair,
      mint,
      nftMint,
      new anchor.BN(100000000),
      new anchor.BN(32355)
    );
  });

  it("Attempt to Claim Rewards Twice in less than 1 day (should fail)", async () => {
    let claimError = null;
    try {
      await ownerClaimRewards(
        program,
        provider,
        adminKeypair,
        userKeypair,
        mint,
        nftMint,
        userNFTTokenAccount,
        new anchor.BN(100000000),
        new anchor.BN(32351)
      );
    } catch (error) {
      claimError = error;
    }

    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Claim already made today.");
  });
});