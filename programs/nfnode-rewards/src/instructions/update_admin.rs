use anchor_lang::prelude::*;

use crate::{ errors::RewardError, state::AdminAccount };
pub fn update_admin_request(ctx: Context<UpdateAdmin>, new_admin_pubkey: Pubkey) -> Result<()> {
    let admin_account = &mut ctx.accounts.admin_account;
    require!(ctx.accounts.user.key() == admin_account.admin_pubkey, RewardError::UnauthorizedAdmin);
    require!(new_admin_pubkey != admin_account.admin_pubkey, RewardError::SameAdminPubkey);
    require!(new_admin_pubkey != admin_account.admin_candidate_pubkey, RewardError::SameAdminCandidatePubkey);
    require!(new_admin_pubkey != Pubkey::default(), RewardError::InvalidPubkey); // Non-zero address validation
      admin_account.admin_candidate_pubkey = new_admin_pubkey;
    Ok(())
}
pub fn accept_admin_request(ctx: Context<UpdateAdmin>) -> Result<()> {
    let admin_account = &mut ctx.accounts.admin_account;
    require!(
        ctx.accounts.user.key() == admin_account.admin_candidate_pubkey,
        RewardError::UnauthorizedAdmin
    );
    require!(
        admin_account.admin_pubkey != admin_account.admin_candidate_pubkey,
        RewardError::AlreadyAccepted
    );
    admin_account.admin_pubkey = admin_account.admin_candidate_pubkey;
    Ok(())
}
#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
}
