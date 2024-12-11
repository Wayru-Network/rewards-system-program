import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../target/types/reward_system";
import { PublicKey, Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import nacl from "tweetnacl";
import { strict as assert } from "assert";
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
      LAMPORTS_PER_SOL
    )

    const latestBlockHash = await connection.getLatestBlockhash()

    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropSignature,
    })

    const newBalance = await connection.getBalance(signer.publicKey)
    console.log("New balance is", newBalance / LAMPORTS_PER_SOL)
  }
}


// Función para generar la PDA
async function generatePDA(seed: string, userPublicKey: PublicKey, programId: PublicKey) {
  // Define el seed que se usará para generar la PDA

  // Genera la PDA
  const [rewardEntryPDA, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(seed), userPublicKey.toBuffer()],
    programId // Reemplaza con tu program ID
  );

  return { rewardEntryPDA, bump };
}

describe("nfnode-rewards", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.RewardSystem as Program<RewardSystem>;

  const userKeypair = Keypair.generate();
  const adminAccount = await generatePDA('admin_account', userKeypair.publicKey, program.programId)
  const newUserAdminKeypair = Keypair.generate();
  const reward_endtry = await generatePDA('reward_entry', userKeypair.publicKey, program.programId)
  console.log('adminAccount:', adminAccount)
  console.log('user:', newUserAdminKeypair)
  console.log('newuseradminKeypair:', newUserAdminKeypair)
  console.log('reward_endtry:', reward_endtry)
  // Initialize the admin account
  it("should update admin public key", async () => {
    await airdropSolIfNeeded(userKeypair, anchor.getProvider().connection)
    await airdropSolIfNeeded(newUserAdminKeypair, anchor.getProvider().connection)
    // Setup: Initialize the admin account
    const txInit = await program.methods.initializeSystem().accounts({
      user: userKeypair.publicKey,
    }).signers([userKeypair]).rpc({ commitment: 'confirmed' });
    console.log('txInit:', txInit)
    assert.ok(txInit)

    // Fetch the user admin account
    const userAdminAccount = await program.account.adminAccount.fetch(adminAccount.rewardEntryPDA, 'confirmed');
    console.log('user admin account', userAdminAccount)

    // Update the admin public key
    await program.methods.updateAdmin(Array.from(newUserAdminKeypair.publicKey.toBytes())).accounts({
      user: userKeypair.publicKey,
    }).signers([userKeypair]).rpc({ commitment: 'confirmed' });

    // Fetch the updated admin account

    const updatedAdminAccount = await program.account.adminAccount.fetch(adminAccount.rewardEntryPDA);
    console.log('updatedAdminAccount:', updatedAdminAccount)
    // Assert that the admin public key has been updated
    assert.equal(updatedAdminAccount.adminPubkey.toString(), newUserAdminKeypair.publicKey.toBytes().toString());
  });

  it("claimed!", async () => {
    // Backend signature.
    // Example inputs
    const rewardEntryKey = reward_endtry.rewardEntryPDA;
    const rewardAmount = 1000; // Example reward amount
    const ownerShare = 60; // Example owner share: 60%
    const hostShare = 39; // Example host share: 39%
    const nonce = 12345; // Example nonce

    // Admin Keypair (use a secure method to load this keypair)
    //const adminKeypair = Keypair.generate(); // Replace with admin keypair from .env

    // Generate the message
    const message = generateMessage(
      rewardEntryKey,
      rewardAmount,
      ownerShare,
      hostShare,
      nonce
    );

    console.log("Generated Message (Hex):", Buffer.from(message).toString("hex"));

    // Sign the message
    const signature = signMessage(message, newUserAdminKeypair);

    console.log("Admin Public Key:", newUserAdminKeypair.publicKey.toBase58());
    console.log("Message Signature (Hex):", Buffer.from(signature).toString("hex"));

    // Front interaction
    const tx = await program.methods.claimRewards(
      new anchor.BN(rewardAmount),
      ownerShare,
      hostShare,
      Array.from(newUserAdminKeypair.publicKey.toBytes()),
      Array.from(signature),
      new anchor.BN(nonce)
    ).accounts({
      rewardEntry: rewardEntryKey,
      admin: userKeypair.publicKey,
      host: userKeypair.publicKey,
      owner: userKeypair.publicKey,
      hostTokenAccount: userKeypair.publicKey,
      ownerTokenAccount: userKeypair.publicKey,
      manufacturer: userKeypair.publicKey,
      manufacturerTokenAccount: userKeypair.publicKey,
    }).signers([
      userKeypair,
    ]).rpc({ commitment: 'confirmed' });

    console.log("Your transaction signature", tx);
  });
});

/**
 * Generates a message for signing.
 * @param rewardEntryKey - PublicKey of the reward entry account.
 * @param rewardAmount - Amount of rewards to claim.
 * @param ownerShare - Percentage share for the owner.
 * @param hostShare - Percentage share for the host.
 * @param nonce - Unique nonce for this claim.
 * @returns The serialized message as a Uint8Array.
 */
function generateMessage(
  rewardEntryKey: PublicKey,
  rewardAmount: number,
  ownerShare: number,
  hostShare: number,
  nonce: number
): Uint8Array {
  const message = Buffer.alloc(50); // Total size: 32 (Pubkey) + 8 + 1 + 1 + 8
  message.set(rewardEntryKey.toBuffer(), 0); // 0-31: rewardEntryKey
  message.writeBigUInt64LE(BigInt(rewardAmount), 32); // 32-39: rewardAmount
  message.writeUInt8(ownerShare, 40); // 40: ownerShare
  message.writeUInt8(hostShare, 41); // 41: hostShare
  message.writeBigUInt64LE(BigInt(nonce), 42); // 42-49: nonce
  return new Uint8Array(message);
}

/**
 * Signs the generated message using the admin private key.
 * @param message - The serialized message to sign.
 * @param adminKeypair - The admin Keypair used for signing.
 * @returns The signature as a Uint8Array.
 */
function signMessage(message: Uint8Array, adminKeypair: Keypair): Uint8Array {
  return nacl.sign.detached(message, adminKeypair.secretKey);
}


