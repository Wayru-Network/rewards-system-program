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
  othersClaimRewards,
  acceptAdmin,
  depositTokens,
  withdrawTokens
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
    deployerKeypair: Keypair,
    mint: PublicKey,
    nftMint: PublicKey,
    nft2Mint: PublicKey,
    adminTokenAccount: PublicKey,
    userTokenAccount: PublicKey,
    userNFTTokenAccount: PublicKey,
    userNFT2TokenAccount: PublicKey,
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
      deployerKeypair,
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
      nft2Mint,
      userNFT2TokenAccount,
    } = setupResult);
  });

  it("Initialize Reward System", async () => {
    await initializeSystem(program, deployerKeypair, mint);
  });
  it("Update admin request", async () => {
    await updateAdmin(program, adminKeypair, deployerKeypair, adminAccountPDA);
  });
  it("Accept admin request", async () => {
    await acceptAdmin(program, adminKeypair, adminAccountPDA);
  });
  it("Initialize Nfnode byod", async () => {
    await initializeNfnode(
      program,
      adminKeypair,
      userKeypair,
      user2Keypair,
      nftMint,
      userNFTTokenAccount,
      nfnodeEntryPDA,
      mint,
      { byod: {} }
    );
  });
  it("Attempt to Deposit twice (should fail)", async () => {
    let claimError = null;
    try {
      await depositTokens(program, userKeypair, mint, nftMint, userNFTTokenAccount);
    } catch (error) {
      claimError = error;
    }
    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Deposit already made.");

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
  
  it("Initialize Nfnode DON", async () => {
    await initializeNfnode(
      program,
      adminKeypair,
      userKeypair,
      user2Keypair,
      nft2Mint,
      userNFT2TokenAccount,
      nfnodeEntryPDA,
      mint,
      { don: {} }
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
  it("Attempt Withdraw  with no nft (should fail)", async () => {
    let claimError = null;
    try {
      await withdrawTokens(program, user2Keypair, mint, nftMint, user2NFTTokenAccount);
    } catch (error) {
      claimError = error;
    }
    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Insufficient NFT balance.");

  });
  it("Attempt Withdraw  with no nft 2 (should fail)", async () => {
    let claimError = null;
    try {
      await withdrawTokens(program, user2Keypair, mint, nftMint, userNFTTokenAccount);
    } catch (error) {
      claimError = error;
    }
    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Invalid Nft token account.");

  });
  it("Attempt Withdraw  with worng token mint address (should fail)", async () => {
    let claimError = null;
    try {
      await withdrawTokens(program, userKeypair, nftMint, nftMint, userNFTTokenAccount);
    } catch (error) {
      claimError = error;
    }
    expect(claimError).to.not.be.null;

  });
  it("Attempt Withdraw  after unpaused and before 30 days (should fail)", async () => {
    let claimError = null;
    try {
      await withdrawTokens(program, userKeypair, mint, nftMint, userNFTTokenAccount);
    } catch (error) {
      claimError = error;
    }
    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Withdraw too early.");

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
  it("Attempt Unauthorized Reward Claim (should fail)", async () => {
    let claimError = null;
    try {
      await ownerClaimRewards(
        program,
        provider,
        adminKeypair,
        user2Keypair, // Alice's keypair
        mint,
        nftMint,
        userNFTTokenAccount, // Tom's NFT token account (maliciously used)
        new anchor.BN(100000000),
        new anchor.BN(32349) // Unique nonce
      );
    } catch (error) {
      claimError = error;
    }

    //Assert that the claim failed
    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Invalid Nft token account.");
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