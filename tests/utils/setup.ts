import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../../target/types/reward_system";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { airdropSolIfNeeded, getKeypair } from "./";

export async function setupTests(
  provider: anchor.AnchorProvider,
  program: Program<RewardSystem>
) {
  // Keypairs
  const adminKeypair = await getKeypair("admin");
  const userKeypair = await getKeypair("user");
  const user2Keypair = await getKeypair("user2");
  const deployerKeypair = await getKeypair("deployer");

  // SOL airdrop for accounts
  await Promise.all([
    airdropSolIfNeeded(adminKeypair, provider.connection),
    airdropSolIfNeeded(userKeypair, provider.connection),
    airdropSolIfNeeded(user2Keypair, provider.connection),
  ]);
  console.log("Airdrop successful");

  const mintAdress = Keypair.generate();
  const nftMintAdress = Keypair.generate();
  const nft2MintAdress = Keypair.generate();
  // Create SPL Token
  const mint = await createMint(
    provider.connection,
    adminKeypair,
    adminKeypair.publicKey,
    null,
    6, // decimals
    mintAdress,
    { commitment: "finalized" }
  );
  const nftMint = await createMint(
    provider.connection,
    adminKeypair,
    adminKeypair.publicKey,
    null,
    0, // decimals
    nftMintAdress,
    { commitment: "finalized" },
    TOKEN_2022_PROGRAM_ID
  );
  const nft2Mint = await createMint(
    provider.connection,
    adminKeypair,
    adminKeypair.publicKey,
    null,
    0, // decimals
    nft2MintAdress,
    { commitment: "finalized" },
    TOKEN_2022_PROGRAM_ID
  );
  console.log("Token Mint Created");
  // Create token accounts for admin and user
  const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    adminKeypair,
    mint,
    adminKeypair.publicKey,
    null,
    null,
    { commitment: "finalized" }
  ).then((account) => account.address);

  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    userKeypair,
    mint,
    userKeypair.publicKey,
    null,
    null,
    { commitment: "finalized" }
  ).then((account) => account.address);
  const userNFTTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    userKeypair,
    nftMint,
    userKeypair.publicKey,
    null,
    null,
    { commitment: "finalized" },
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  ).then((account) => account.address);
  const userNFT2TokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    userKeypair,
    nft2Mint,
    userKeypair.publicKey,
    null,
    null,
    { commitment: "finalized" },
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  ).then((account) => account.address);
  const user2NFTTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    user2Keypair,
    nftMint,
    user2Keypair.publicKey,
    null,
    null,
    { commitment: "finalized" },
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  ).then((account) => account.address);
  const user2TokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    user2Keypair,
    mint,
    user2Keypair.publicKey,
    null,
    null,
    { commitment: "finalized" }
  ).then((account) => account.address);

  // Mint tokens for admin
  await mintTo(
    provider.connection,
    adminKeypair,
    mint,
    adminTokenAccount,
    adminKeypair,
    10000000000, // 1000 tokens with 6 decimals
    [],
    { commitment: "finalized" }
  );
  // Mint tokens for user
  await mintTo(
    provider.connection,
    adminKeypair,
    mint,
    userTokenAccount,
    adminKeypair,
    5000000000, // 5000 tokens with 6 decimals
    [],
    { commitment: "finalized" }
  );
  // Mint NFT for user
  await mintTo(
    provider.connection,
    adminKeypair,
    nftMint,
    userNFTTokenAccount,
    adminKeypair,
    1, // 1 NFT
    [],
    { commitment: "finalized" },
    TOKEN_2022_PROGRAM_ID
  );
  await mintTo(
    provider.connection,
    adminKeypair,
    nft2Mint,
    userNFT2TokenAccount,
    adminKeypair,
    1, // 1 NFT
    [],
    { commitment: "finalized" },
    TOKEN_2022_PROGRAM_ID
  );
  console.log("Tokens SENT");
  // Find token storage PDA
  const [_tokenStoragePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_storage")],
    program.programId
  );
  const tokenStoragePDA = _tokenStoragePDA;
  const [_adminAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("admin_account")],
    program.programId
  );
  const adminAccountPDA = _adminAccountPDA;

  const [_nfnodeEntryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("nfnode_entry"), nftMint.toBuffer()],
    program.programId
  );
  const nfnodeEntryPDA = _nfnodeEntryPDA;
  const userNftTokenAccountInfo = await provider.connection.getAccountInfo(
    userNFTTokenAccount
  );
  if (userNftTokenAccountInfo === null) {
    throw new Error("userNftTokenAccount not found");
  }

  return {
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
    deployerKeypair,
    nft2Mint,
    userNFT2TokenAccount
  };
}