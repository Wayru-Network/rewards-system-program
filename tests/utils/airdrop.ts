import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function airdropSolIfNeeded(
  signer: Keypair,
  connection: Connection
) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log("Current balance is", balance / LAMPORTS_PER_SOL);

  if (balance < 10000) {
    console.log("Airdropping 5 SOL...");
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      5 * LAMPORTS_PER_SOL
    );

    const latestBlockHash = await connection.getLatestBlockhash();

    await connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropSignature,
      },
      "finalized"
    );

    const newBalance = await connection.getBalance(signer.publicKey);
    console.log("New balance is", newBalance / LAMPORTS_PER_SOL);
  }
}