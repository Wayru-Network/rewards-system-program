import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../target/types/reward_system";
import {
  PublicKey,
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo
} from "@solana/spl-token";

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
  //const provider = anchor.AnchorProvider.env();//
  const provider = anchor.AnchorProvider.local();
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

  it("Claim Rewards without admin signature must fail", async () => {
    // Generate message and signature for claiming rewards
    const rewardAmount = 100000000; // 100 tokens
    const nonce = 12345;

    // Claim rewards
    await program.methods
      .claimRewards(
        new anchor.BN(rewardAmount),
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
  it("Claim Rewards with admin signature Must Success", async () => {
    // Generate message and signature for claiming rewards
    const rewardAmount = 100000000; // 100 tokens
    const nonce = 12345;

    // Claim rewards
    const ix = await program.methods
      .claimRewards(
        new anchor.BN(rewardAmount),
        userKeypair.publicKey,
        new anchor.BN(nonce)
      )
      .accounts({
        user: userKeypair.publicKey,
        userAdmin: adminKeypair.publicKey,
        tokenMint: mint,
      })
      .instruction();
    let tx = new anchor.web3.Transaction()
    tx.add(ix);
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = userKeypair.publicKey;
    tx.partialSign(adminKeypair);
    const serializedTx = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    const txBase64 = serializedTx.toString("base64");
    const recoveredTx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));

    recoveredTx.partialSign(userKeypair);


    const connection = new Connection('http://localhost:8899')
    const serializedTxFinal = recoveredTx.serialize({
      requireAllSignatures: true,
      verifySignatures: true
    });
    const txId = await anchor.web3.sendAndConfirmRawTransaction(connection, serializedTxFinal, { commitment: 'confirmed' });
    console.log("Rewards Claimed");
    console.log("Transaction ID:", txId);
  });
});


