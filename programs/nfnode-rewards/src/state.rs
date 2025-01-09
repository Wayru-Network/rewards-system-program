use anchor_lang::prelude::*;
#[account]
pub struct RewardEntry {
    pub last_claimed_nonce: u64,
    pub last_claimed_timestamp: i64,
    pub total_rewards_earned: u64,
}

#[account]
pub struct NfNodeEntry {
    pub owner: Pubkey,
    pub owner_last_claimed_timestamp: i64,
    pub host: Pubkey,
    pub host_share: u64,
    pub host_last_claimed_timestamp: i64,
    pub manufacturer: Pubkey,
    pub manufacturer_last_claimed_timestamp: i64,
    pub total_rewards_earned: u64,
}
#[account]
pub struct AdminAccount {
    pub admin_pubkey: Pubkey,
    pub paused: bool,
}