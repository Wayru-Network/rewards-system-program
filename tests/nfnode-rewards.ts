import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardSystem } from "../target/types/reward_system";

describe("nfnode-rewards", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.NfnodeRewards as Program<RewardSystem>;

  it("claimed!", async () => {
    // Backend signature.
    // Example inputs
  const rewardEntryKey = new PublicKey("Fg6PaFpoGXkYsidMpWxTWyVvYX2HVvTT9dVsi4d44wge");
  const rewardAmount = 1000; // Example reward amount
  const ownerShare = 60; // Example owner share: 60%
  const hostShare = 39; // Example host share: 39%
  const nonce = 12345; // Example nonce

  // Admin Keypair (use a secure method to load this keypair)
  const adminKeypair = Keypair.generate(); // Replace with admin keypair from .env

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
  const signature = signMessage(message, adminKeypair);

  console.log("Admin Public Key:", adminKeypair.publicKey.toBase58());
  console.log("Message Signature (Hex):", Buffer.from(signature).toString("hex"));


  /////front interaction
    const tx = await program.methods.claimRewards(
      new anchor.BN(rewardAmount),
      ownerShare,
      hostShare,
      Array.from(adminKeypair.publicKey.toBytes()),
      Array.from(signature),
      new anchor.BN(nonce)
    );
    console.log("Your transaction signature", tx);
  });
});


import { PublicKey, Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
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


