use anchor_lang::prelude::*;

use crate::{state::AdminAccount};

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
    pub system_program: Program<'info, System>,
}
