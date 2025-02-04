use anchor_lang::prelude::*;
pub const MAX_MINT_AUTHORITIES: usize = 10; //
#[account]
pub struct RewardEntry {
    pub last_claimed_nonce: u64,
    pub last_claimed_timestamp: i64,
    pub total_rewards_earned: u64,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum NfNodeType {
    DON,
    BYOD,
    WayruHotspot,
}
#[account]
pub struct NfNodeEntry {
    pub owner_last_claimed_timestamp: i64,
    pub host: Pubkey,
    pub host_share: u64,
    pub host_last_claimed_timestamp: i64,
    pub manufacturer: Pubkey,
    pub manufacturer_last_claimed_timestamp: i64,
    pub total_rewards_claimed: u64,
    pub deposit_amount: u64,
    pub deposit_timestamp: i64,
    pub nfnode_type: NfNodeType,
}
#[account]
pub struct AdminAccount {
    pub admin_pubkey: Pubkey,
    pub admin_candidate_pubkey: Pubkey,
    pub paused: bool,
    pub admin_update_requested: bool,
    pub valid_mint: Pubkey,
    pub mint_authorities: Vec<Pubkey>
}