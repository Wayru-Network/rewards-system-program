import { PublicKey } from "@solana/web3.js";

export async function generatePDA(
  seed: string,
  userPublicKey: PublicKey,
  programId: PublicKey
) {
  const seedArray = [Buffer.from(seed)];
  if (seed === "reward_entry") seedArray.push(userPublicKey.toBuffer());
  const [rewardEntryPDA, bump] = PublicKey.findProgramAddressSync(
    seedArray,
    programId
  );

  return { rewardEntryPDA, bump };
}