use anchor_lang::prelude::*;

use crate::{ errors::RewardError, state::AdminAccount };
pub fn remove_mint_authority(ctx: Context<RemoveMintAuthority>, mint_authority: Pubkey) -> Result<()> {
    let admin_account = &mut ctx.accounts.admin_account;
    require!(ctx.accounts.user.key() == admin_account.admin_pubkey, RewardError::UnauthorizedAdmin);
    if let Some(index) = admin_account.mint_authorities.iter().position(|&x| x == mint_authority) {
        admin_account.mint_authorities.remove(index);
        Ok(())
    } else {
        Err(RewardError::MintAuthorityNotFound.into())
    }
}
#[derive(Accounts)]
pub struct RemoveMintAuthority<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
}
