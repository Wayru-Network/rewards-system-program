use anchor_lang::prelude::*;
use anchor_spl::{
    token::{ Token, Mint }, //Wayru Token
};
use crate::{ state::AdminAccount, NfnodeRewards };

pub fn initialize_system(ctx: Context<InitializeSystem>) -> Result<()> {
    let admin_account = &mut ctx.accounts.admin_account;
    admin_account.admin_pubkey = ctx.accounts.user.key();
    admin_account.paused = false;
    admin_account.valid_mint = ctx.accounts.token_mint.key();
    admin_account.mint_authority = ctx.accounts.mint_authority.key();
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeSystem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<AdminAccount>(),
        seeds = [b"admin_account"],
        bump
    )]
    pub admin_account: Account<'info, AdminAccount>,
    ///CHECK: only read account
    pub mint_authority: AccountInfo<'info>,
    ///CHECK: only read account
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, NfnodeRewards>,
    #[account(constraint = program_data.upgrade_authority_address == Some(user.key()))]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
}
