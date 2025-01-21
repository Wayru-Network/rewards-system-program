use anchor_lang::prelude::*;

use crate::{ state::AdminAccount, NfnodeRewards };

pub fn initialize_system(ctx: Context<InitializeSystem>) -> Result<()> {
    let admin_account = &mut ctx.accounts.admin_account;
    admin_account.admin_pubkey = ctx.accounts.user.key();
    admin_account.paused = false;
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
    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, NfnodeRewards>,
    #[account(constraint = program_data.upgrade_authority_address == Some(user.key()))]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
}
