import * as anchor from "@coral-xyz/anchor";
import * as dotenv from "dotenv";

dotenv.config();

export async function getKeypair(type: "admin" | "user" | "user2" | "deployer") {
  const secretKeyMap = {
    admin: process.env.ADMIN_PRIVATE_KEY,
    user: process.env.USER_PRIVATE_KEY,
    user2: process.env.USER2_PRIVATE_KEY,
    deployer: process.env.DEPLOYER_PRIVATE_KEY
  };

  const secret = JSON.parse(secretKeyMap[type]) as number[];
  const secretKey = Uint8Array.from(secret);
  const keypairFromSecretKey = anchor.web3.Keypair.fromSecretKey(secretKey);
  return keypairFromSecretKey;
}