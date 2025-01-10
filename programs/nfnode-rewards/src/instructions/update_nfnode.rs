use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{ Mint as Mint2022, TokenAccount as SplToken2022Account, TokenInterface },
};
use crate::{ errors::RewardError, state::{ NfNodeEntry, AdminAccount } };
pub fn update_nfnode(ctx: Context<UpdateNfNode>, host_share: u64) -> Result<()> {
    let admin_account = &ctx.accounts.admin_account;
    require!(
        ctx.accounts.user_admin.key() == admin_account.admin_pubkey,
        RewardError::UnauthorizedAdmin
    );
    let user_admin_account_info = ctx.accounts.user_admin.to_account_info();
    let is_partially_signed_by_admin = user_admin_account_info.is_signer;
    require!(is_partially_signed_by_admin, RewardError::MissingAdminSignature);
    let user_nft_token_account_info = &ctx.accounts.user_nft_token_account;

    if user_nft_token_account_info.owner != &ctx.accounts.token_program_2022.key() {
        return err!(RewardError::InvalidNftMint);
    }

    let user_nft_token_account_data = user_nft_token_account_info.try_borrow_data()?;
    let user_nft_token_account = SplToken2022Account::try_deserialize(
        &mut &user_nft_token_account_data[..]
    )?;

    if user_nft_token_account.amount == 0 {
        return err!(RewardError::InsufficientNftBalance);
    }

    if user_nft_token_account.mint != ctx.accounts.nft_mint_address.key() {
        return err!(RewardError::InvalidNftMint);
    }
    let nfnode_entry = &mut ctx.accounts.nfnode_entry;
    nfnode_entry.host = ctx.accounts.host.key();
    nfnode_entry.host_share = host_share;
    Ok(())
}
#[derive(Accounts)]
pub struct UpdateNfNode<'info> {
    #[account(mut)]
    pub user_admin: Signer<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    ///CHECK: only read account
    pub host: AccountInfo<'info>,
    ///CHECK: only read account
    pub nft_mint_address: InterfaceAccount<'info, Mint2022>,
    /// CHECK: used to check nft ownership
    pub user_nft_token_account: AccountInfo<'info>,
    #[account(mut,seeds = [b"nfnode_entry", nft_mint_address.key().as_ref()], bump)]
    pub nfnode_entry: Account<'info, NfNodeEntry>,
    #[account(seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
    pub token_program_2022: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
