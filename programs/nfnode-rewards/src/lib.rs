use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{ AssociatedToken },
    token::{ self, Token, TokenAccount, Transfer, Mint }, //Wayru Token
};
use solana_program::{ pubkey::Pubkey };
mod errors;
mod instructions;
mod state;
use crate::{ errors::* };
declare_id!("GSgccXoXVjTU9CwfkaPeDBzXtPBYUHvSpZjxfbJSGwUZ");

#[program]
pub mod reward_system {
    pub use super::instructions::*;
    use super::*;

    pub fn initialize_system(ctx: Context<InitializeSystem>) -> Result<()> {
        instructions::initialize_system(ctx)
    }

    pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin_pubkey: Pubkey) -> Result<()> {
        instructions::update_admin(ctx, new_admin_pubkey)
    }

    pub fn initialize_nfnode(ctx: Context<InitializeNfNode>, host_share: u64) -> Result<()> {
        instructions::initialize_nfnode(ctx, host_share)
    }
    pub fn update_nfnode(ctx: Context<UpdateNfNode>, host_share: u64) -> Result<()> {
        instructions::update_nfnode(ctx, host_share)
    }

    pub fn fund_token_storage(ctx: Context<FundTokenStorage>, amount: u64) -> Result<()> {
        token::transfer(ctx.accounts.transfer_to_token_storage(), amount)?;
        Ok(())
    }

    pub fn owner_claim_rewards(
        ctx: Context<OwnerClaimRewards>,
        reward_amount: u64,
        nonce: u64
    ) -> Result<()> {
        instructions::owner_claim_rewards(ctx, reward_amount, nonce)
    }
    pub fn others_claim_rewards(
        ctx: Context<OthersClaimRewards>,
        reward_amount: u64,
        nonce: u64
    ) -> Result<()> {
        instructions::others_claim_rewards(ctx, reward_amount, nonce)
    }
    pub fn pause_program(ctx: Context<UpdateAdmin>) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        require!(
            ctx.accounts.user.key() == admin_account.admin_pubkey,
            RewardError::UnauthorizedAdmin
        );
        admin_account.paused = true;
        Ok(())
    }

    pub fn unpause_program(ctx: Context<UpdateAdmin>) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        require!(
            ctx.accounts.user.key() == admin_account.admin_pubkey,
            RewardError::UnauthorizedAdmin
        );
        admin_account.paused = false;
        Ok(())
    }
}
pub struct NfnodeRewards;

impl NfnodeRewards {}

// Implement the Id trait for NfnodeRewards
impl anchor_lang::Id for NfnodeRewards {
    fn id() -> Pubkey {
        crate::ID
    }
}

#[derive(Accounts)]
pub struct FundTokenStorage<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    /// CHECK:
    #[account(mut, seeds = [b"token_storage"], bump)]
    pub token_storage_authority: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = token_storage_authority
    )]
    pub token_storage_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> FundTokenStorage<'info> {
    fn transfer_to_token_storage(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info(), Transfer {
            from: self.user_token_account.to_account_info(),
            to: self.token_storage_account.to_account_info(),
            authority: self.user.to_account_info(),
        })
    }
}
