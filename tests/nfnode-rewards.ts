import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../target/types/reward_system";
import {
  PublicKey,
  Keypair,
  Connection,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo
} from "@solana/spl-token";
import nacl from "tweetnacl";
async function airdropSolIfNeeded(
  signer: Keypair,
  connection: Connection
) {
  const balance = await connection.getBalance(signer.publicKey)
  console.log("Current balance is", balance / LAMPORTS_PER_SOL)

  // if (balance < web3.LAMPORTS_PER_SOL) {
  if (balance < 10000) {

    console.log("Airdropping 1 SOL...")
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      10 * LAMPORTS_PER_SOL
    )

    const latestBlockHash = await connection.getLatestBlockhash()

    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropSignature,
    }, 'finalized')

    const newBalance = await connection.getBalance(signer.publicKey)
    console.log("New balance is", newBalance / LAMPORTS_PER_SOL)
  }
}


// Generates PDA Function
async function generatePDA(seed: string, userPublicKey: PublicKey, programId: PublicKey) {


  const seedArray = [Buffer.from(seed)];
  if (seed === 'reward_emtry') seedArray.push(userPublicKey.toBuffer())
  const [rewardEntryPDA, bump] = PublicKey.findProgramAddressSync(
    seedArray,
    programId
  );

  return { rewardEntryPDA, bump };
}

describe("nfnode-rewards", async () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.RewardSystem as Program<RewardSystem>;

  // Keypairs
  const adminKeypair = Keypair.generate();
  const userKeypair = Keypair.generate();

  // SPL Token variables
  let mint: PublicKey;
  let adminTokenAccount: PublicKey;
  let userTokenAccount: PublicKey;
  let tokenStoragePDA: PublicKey;

  before(async () => {
    // SOL airdrop for accounts
    await Promise.all([
      airdropSolIfNeeded(adminKeypair, provider.connection),
      airdropSolIfNeeded(userKeypair, provider.connection),

    ]);
    console.log('Airdrop successfull')
    const mintAdress = Keypair.generate()
    // Create SPL Token
    mint = await createMint(
      provider.connection,
      adminKeypair,
      adminKeypair.publicKey,
      null,
      6, // decimals
      mintAdress,
      { commitment: 'finalized' }
    );
    console.log('Token Mint Created')
    // Create token accounts for admin and user
    adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      adminKeypair,
      mint,
      adminKeypair.publicKey,
      null, null,
      { commitment: 'finalized' }
    ).then(account => account.address);
    console.log('Admin token account:', adminTokenAccount.toBase58())

    userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      userKeypair,
      mint,
      userKeypair.publicKey,
      null, null,
      { commitment: 'finalized' }
    ).then(account => account.address);
    console.log('User token account:', userTokenAccount.toBase58())

    // Mint tokens for admin
    await mintTo(
      provider.connection,
      adminKeypair,
      mint,
      adminTokenAccount,
      adminKeypair,
      1000000000, // 1000 tokens with 6 decimals
      [],
      { commitment: 'finalized' }
    );
    console.log('Tokens minted tot:', adminKeypair.publicKey.toBase58(), '-', adminTokenAccount.toBase58())

    // Find token storage PDA
    const [_tokenStoragePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_storage")],
      program.programId
    );
    tokenStoragePDA = _tokenStoragePDA;
    console.log('token storage pda:', tokenStoragePDA)
  });

  it("Initialize Reward System", async () => {
    // Initialize reward system
    await program.methods
      .initializeSystem()
      .accounts({
        user: adminKeypair.publicKey,
      })
      .signers([adminKeypair])
      .rpc();
  });

  it("Fund Token Storage", async () => {
    // Fund token storage
    await program.methods
      .fundTokenStorage(new anchor.BN(500000000)) // 500 tokens
      .accounts({
        user: adminKeypair.publicKey,
        tokenMint: mint,
      })
      .signers([adminKeypair])
      .rpc();
  });

  it("Claim Rewards", async () => {
    // Generate message and signature for claiming rewards
    const rewardAmount = 100000000; // 100 tokens
    const nonce = 12345;

    // Generate message
    const message = Buffer.alloc(50);
    message.set(userKeypair.publicKey.toBuffer(), 0);
    message.writeBigUInt64LE(BigInt(rewardAmount), 32);
    message.writeUInt8(60, 40); // owner share
    message.writeUInt8(40, 41); // host share
    message.writeBigUInt64LE(BigInt(nonce), 42);

    // Sign message
    const signature = nacl.sign.detached(
      message,
      adminKeypair.secretKey
    );

    // Find reward entry PDA
    const [rewardEntryPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward_entry"),
        userKeypair.publicKey.toBuffer()
      ],
      program.programId
    );

    // Claim rewards
    await program.methods
      .claimRewards(
        new anchor.BN(rewardAmount),
        Array.from(signature),
        userKeypair.publicKey,
        new anchor.BN(nonce)
      )
      .accounts({
        user: userKeypair.publicKey,
        tokenMint: mint,
      })
      .signers([userKeypair])
      .rpc();
  });
});


