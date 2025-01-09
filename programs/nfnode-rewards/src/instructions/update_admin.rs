
use anchor_lang::prelude::*;

use crate::{errors::RewardError,state::AdminAccount};
pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin_pubkey: Pubkey) -> Result<()> {
    let admin_account = &mut ctx.accounts.admin_account;
    require!(
        ctx.accounts.user.key() == admin_account.admin_pubkey,
        RewardError::UnauthorizedAdmin
    );
    admin_account.admin_pubkey = new_admin_pubkey;
    Ok(())
}
#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
}