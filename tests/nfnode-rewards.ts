import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../target/types/reward_system";
import {
  PublicKey,
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  SimulatedTransactionAccountInfo
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as dotenv from "dotenv"
import { expect } from "chai";

async function getKeypair(type: 'admin' | 'user' | 'user2') {
  const secretKeyMap = {
    'admin': process.env.ADMIN_PRIVATE_KEY,
    'user': process.env.USER_PRIVATE_KEY,
    'user2': process.env.USER2_PRIVATE_KEY,
  };

  const secret = JSON.parse(secretKeyMap[type]) as number[];
  const secretKey = Uint8Array.from(secret)
  const keypairFromSecretKey = anchor.web3.Keypair.fromSecretKey(secretKey)
  return keypairFromSecretKey
}

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
      5 * LAMPORTS_PER_SOL
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
  dotenv.config()
  console.log("Starting test...");
  // Configure the client to use the local cluster.
  //const provider = anchor.AnchorProvider.env();//
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.RewardSystem as Program<RewardSystem>;

  // Keypairs
  const adminKeypair = await getKeypair('admin');
  const userKeypair = await getKeypair('user')
  const user2Keypair = await getKeypair('user2')

  // SPL Token variables
  let mint: PublicKey;
  let nftMint: PublicKey;
  let adminTokenAccount: PublicKey;
  let userTokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;
  let userNFTTokenAccount: PublicKey;
  let user2NFTTokenAccount: PublicKey;
  let tokenStoragePDA: PublicKey;
  let adminAccountPDA: PublicKey;
  before(async () => {
    // SOL airdrop for accounts
    await Promise.all([
      airdropSolIfNeeded(adminKeypair, provider.connection),
      airdropSolIfNeeded(userKeypair, provider.connection),
      airdropSolIfNeeded(user2Keypair, provider.connection),

    ]);
    console.log('Airdrop successfull')
    const mintAdress = Keypair.generate()
    const nftMintAdress = Keypair.generate()
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
    nftMint = await createMint(
      provider.connection,
      adminKeypair,
      adminKeypair.publicKey,
      null,
      0, // decimals
      nftMintAdress,
      { commitment: 'finalized' },
      TOKEN_2022_PROGRAM_ID
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

    userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      userKeypair,
      mint,
      userKeypair.publicKey,
      null, null,
      { commitment: 'finalized' }
    ).then(account => account.address);
    userNFTTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      userKeypair,
      nftMint,
      userKeypair.publicKey,
      null, null,
      { commitment: 'finalized' },
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID

    ).then(account => account.address);
    user2NFTTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user2Keypair,
      nftMint,
      user2Keypair.publicKey,
      null, null,
      { commitment: 'finalized' },
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID

    ).then(account => account.address);
    user2TokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user2Keypair,
      mint,
      user2Keypair.publicKey,
      null, null,
      { commitment: 'finalized' }
    ).then(account => account.address);


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
    // Mint NFT for user
    await mintTo(
      provider.connection,
      adminKeypair,
      nftMint,
      userNFTTokenAccount,
      adminKeypair,
      1, // 1 NFT
      [],
      { commitment: 'finalized' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log('Tokens SENT')
    // Find token storage PDA
    const [_tokenStoragePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_storage")],
      program.programId
    );
    tokenStoragePDA = _tokenStoragePDA;
    console.log('token storage pda:', tokenStoragePDA)
    const [_adminAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin_account")],
      program.programId
    );
    adminAccountPDA = _adminAccountPDA;
    console.log('adminaccount pda:', adminAccountPDA)
    console.log('user acount:', userKeypair.publicKey)
    console.log('usernfttoken acount:', userNFTTokenAccount.toBase58())
    const userNftTokenAccountInfo = await provider.connection.getAccountInfo(userNFTTokenAccount);
    console.log('userNftTokenAccountInfo:', userNftTokenAccountInfo)
    if (userNftTokenAccountInfo === null) {
      throw new Error("userNftTokenAccount not found");
    }

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
  it("Update admin", async () => {
    // Initialize reward system
    await program.methods
      .updateAdmin(adminKeypair.publicKey)
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
    // Define the reward amount and nonce as BigNumbers
    const rewardAmount = new anchor.BN(100000000); // 100 tokens
    const nonce = new anchor.BN(32345);

    let errorOccurred = false;
    let errorMessage = "";

    try {
      await program.methods
        .claimRewards(rewardAmount, nonce)
        .accounts({
          userAdmin: adminKeypair.publicKey,
          user: userKeypair.publicKey,
          nftMintAddress: nftMint,
          tokenMint: mint,
          tokenProgram2022: TOKEN_2022_PROGRAM_ID,
          userNftTokenAccount: userNFTTokenAccount
        })
        .signers([userKeypair])
        .rpc();
    } catch (error) {
      errorOccurred = true;
      errorMessage = error.message;
    }

    expect(errorOccurred).to.be.true; // Assert that an error occurred

  });
  it("Pause Program", async () => {
    // Pause the program
    await program.methods
      .pauseProgram()
      .accounts({
        user: adminKeypair.publicKey,
      })
      .signers([adminKeypair])
      .rpc({ commitment: 'confirmed' });
    const programState = await program.account.adminAccount.fetch(adminAccountPDA);
    expect(programState.paused).to.be.true;
  });

  it("Attempt to Claim Rewards While Paused (should fail)", async () => {
    // Attempt to claim rewards while paused (should fail)
    const rewardAmount = new anchor.BN(100000000); // 100 tokens
    const nonce = new anchor.BN(32348);
    let claimError = null;
    try {
      const ix = await program.methods
        .claimRewards(rewardAmount, nonce)
        .accounts({
          userAdmin: adminKeypair.publicKey,
          user: userKeypair.publicKey,
          tokenMint: mint,
          nftMintAddress: nftMint,
          tokenProgram2022: TOKEN_2022_PROGRAM_ID,
          userNftTokenAccount: userNFTTokenAccount
        })
        .instruction();

      let tx = new anchor.web3.Transaction();
      tx.add(ix);
      tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
      tx.feePayer = userKeypair.publicKey;
      tx.partialSign(adminKeypair);
      const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const txBase64 = serializedTx.toString("base64");
      const recoveredTx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));
      recoveredTx.partialSign(userKeypair);

      const connection = new Connection(process.env.SOLANA_API_URL);
      const serializedTxFinal = recoveredTx.serialize({
        requireAllSignatures: true,
        verifySignatures: true,
      });

      await anchor.web3.sendAndConfirmRawTransaction(connection, serializedTxFinal, { commitment: 'confirmed' });
    } catch (error) {
      console.log("Error:", error);
      claimError = error;
    }

    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Program is paused.");
  });

  it("Unpause Program", async () => {
    // Unpause the program
    await program.methods
      .unpauseProgram()
      .accounts({
        user: adminKeypair.publicKey,
      })
      .signers([adminKeypair])
      .rpc({ commitment: 'confirmed' });
    // Check if the program is unpaused
    const programState = await program.account.adminAccount.fetch(adminAccountPDA, 'finalized');
    expect(programState.paused).to.be.false;
  });

  it("Claim Rewards After Unpausing (should succeed)", async () => {
    let paused = true;
    while (paused) {
      console.log("Program is paused. Waiting for it to be unpaused...");
      const programState = await program.account.adminAccount.fetch(adminAccountPDA, 'finalized');
      console.log(programState);
      console.log('adminpkey:', adminKeypair.publicKey)
      paused = programState.paused;
      console.log("Paused:", paused);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
    }
    // Claim rewards after unpausing (should succeed)
    const rewardAmount = new anchor.BN(100000000); // 100 tokens
    const nonce2 = new anchor.BN(32349); // Use a new nonce
    const ix2 = await program.methods
      .claimRewards(rewardAmount, nonce2)
      .accounts({
        userAdmin: adminKeypair.publicKey,
        user: userKeypair.publicKey,
        tokenMint: mint,
        nftMintAddress: nftMint,
        tokenProgram2022: TOKEN_2022_PROGRAM_ID,
        userNftTokenAccount: userNFTTokenAccount
      })
      .instruction();

    let tx2 = new anchor.web3.Transaction();
    tx2.add(ix2);
    tx2.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    tx2.feePayer = userKeypair.publicKey;
    tx2.partialSign(adminKeypair);

    const serializedTx2 = tx2.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const txBase642 = serializedTx2.toString("base64");
    const recoveredTx2 = anchor.web3.Transaction.from(Buffer.from(txBase642, "base64"));
    recoveredTx2.partialSign(userKeypair);

    const connection = new Connection(process.env.SOLANA_API_URL);
    const serializedTxFinal2 = recoveredTx2.serialize({
      requireAllSignatures: true,
      verifySignatures: true,
    });

    const txId2 = await anchor.web3.sendAndConfirmRawTransaction(connection, serializedTxFinal2, { commitment: 'confirmed' });
    console.log("Rewards Claimed Successfully After Unpausing");
    console.log("Transaction ID:", txId2);
  });
  it("Attempt to Claim Rewards Twice in less than 1 day (should fail)", async () => {
    let claimError = null;
    try {
      // Claim rewards for the first time (should succeed)
      const rewardAmount = new anchor.BN(100000000); // 100 tokens
      const nonce = new anchor.BN(32350); // Use a new nonce

      // Get the latest blockhash before each transaction
      const latestBlockHash = await provider.connection.getLatestBlockhash();

      const ix = await program.methods
        .claimRewards(rewardAmount, nonce)
        .accounts({
          userAdmin: adminKeypair.publicKey,
          user: userKeypair.publicKey,
          tokenMint: mint,
          nftMintAddress: nftMint,
          tokenProgram2022: TOKEN_2022_PROGRAM_ID,
          userNftTokenAccount: userNFTTokenAccount

        })
        .instruction();

      let tx = new anchor.web3.Transaction();
      tx.add(ix);
      tx.recentBlockhash = latestBlockHash.blockhash; // Use the latest blockhash
      tx.feePayer = userKeypair.publicKey;
      tx.partialSign(adminKeypair);

      const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const txBase64 = serializedTx.toString("base64");
      const recoveredTx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));
      recoveredTx.partialSign(userKeypair);

      const connection = new Connection(process.env.SOLANA_API_URL);
      const serializedTxFinal = recoveredTx.serialize({
        requireAllSignatures: true,
        verifySignatures: true,
      });

      const txId = await anchor.web3.sendAndConfirmRawTransaction(connection, serializedTxFinal, { commitment: 'confirmed' });
      console.log("First Reward Claimed Successfully");
      console.log("Transaction ID:", txId);

      // Add a delay of 5 seconds after the transaction is confirmed
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Attempt to claim rewards for the second time (should fail)
      const nonce2 = new anchor.BN(32351); // Use a new nonce

      const latestBlockHash2 = await provider.connection.getLatestBlockhash();
      const ix2 = await program.methods
        .claimRewards(rewardAmount, nonce2)
        .accounts({
          userAdmin: adminKeypair.publicKey,
          user: userKeypair.publicKey,
          tokenMint: mint,
          nftMintAddress: nftMint,
          tokenProgram2022: TOKEN_2022_PROGRAM_ID,
          userNftTokenAccount: userNFTTokenAccount
        })
        .instruction();

      let tx2 = new anchor.web3.Transaction();
      tx2.add(ix2);
      tx2.recentBlockhash = latestBlockHash2.blockhash;
      tx2.feePayer = userKeypair.publicKey;
      tx2.partialSign(adminKeypair);

      const serializedTx2 = tx2.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const txBase642 = serializedTx2.toString("base64");
      const recoveredTx2 = anchor.web3.Transaction.from(Buffer.from(txBase642, "base64"));
      recoveredTx2.partialSign(userKeypair);

      const connection2 = new Connection(process.env.SOLANA_API_URL);
      const serializedTxFinal2 = recoveredTx2.serialize({
        requireAllSignatures: true,
        verifySignatures: true,
      });

      await anchor.web3.sendAndConfirmRawTransaction(connection2, serializedTxFinal2, { commitment: 'confirmed' });
    } catch (error) {
      console.log("Error:", error);
      claimError = error;
    }

    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Claim already made today.");
  });
  it("Attempt to Claim Rewards With no nft", async () => {
    let claimError = null;
    try {
      // Claim rewards for the first time (should succeed)
      const rewardAmount = new anchor.BN(100000000); // 100 tokens
      const nonce = new anchor.BN(32350); // Use a new nonce

      // Get the latest blockhash before each transaction
      const latestBlockHash = await provider.connection.getLatestBlockhash();

      const ix = await program.methods
        .claimRewards(rewardAmount, nonce)
        .accounts({
          userAdmin: adminKeypair.publicKey,
          user: user2Keypair.publicKey,
          tokenMint: mint,
          nftMintAddress: nftMint,
          tokenProgram2022: TOKEN_2022_PROGRAM_ID,
          userNftTokenAccount: user2NFTTokenAccount

        })
        .instruction();

      let tx = new anchor.web3.Transaction();
      tx.add(ix);
      tx.recentBlockhash = latestBlockHash.blockhash; // Use the latest blockhash
      tx.feePayer = user2Keypair.publicKey;
      tx.partialSign(adminKeypair);

      const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const txBase64 = serializedTx.toString("base64");
      const recoveredTx = anchor.web3.Transaction.from(Buffer.from(txBase64, "base64"));
      recoveredTx.partialSign(user2Keypair);

      const connection = new Connection(process.env.SOLANA_API_URL);
      const serializedTxFinal = recoveredTx.serialize({
        requireAllSignatures: true,
        verifySignatures: true,
      });

      const txId = await anchor.web3.sendAndConfirmRawTransaction(connection, serializedTxFinal, { commitment: 'confirmed' });

    } catch (error) {
      console.log("Error nft:", error);
      claimError = error;
    }

    expect(claimError).to.not.be.null;
    expect(claimError.message).to.include("Insufficient NFT balance.");
  });

});


