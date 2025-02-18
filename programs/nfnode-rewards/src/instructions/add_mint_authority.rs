use anchor_lang::prelude::*;

use crate::{ errors::RewardError, state::{ AdminAccount, MAX_MINT_AUTHORITIES } };
pub fn add_mint_authority(
    ctx: Context<AddMintAuthority>,
    new_mint_authority: Pubkey
) -> Result<()> {
    let admin_account = &mut ctx.accounts.admin_account;
    require!(ctx.accounts.user.key() == admin_account.admin_pubkey, RewardError::UnauthorizedAdmin);
    require!(new_mint_authority != Pubkey::default(), RewardError::InvalidPubkey); // Non-zero address validation
    if admin_account.mint_authorities.len() >= MAX_MINT_AUTHORITIES {
        return Err(RewardError::MintAuthorityListFull.into());
    }
    if admin_account.mint_authorities.contains(&new_mint_authority) {
        return Err(RewardError::MintAuthorityAlreadyExists.into());
    }
    admin_account.mint_authorities.push(new_mint_authority);
    Ok(())
}
#[derive(Accounts)]
pub struct AddMintAuthority<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
}
