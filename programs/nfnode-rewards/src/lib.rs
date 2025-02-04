use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{ AssociatedToken },
    token::{ self, Token, TokenAccount, Transfer, Mint }, //Wayru Token
};
use solana_program::{ pubkey::Pubkey };
mod errors;
mod instructions;
mod state;
use crate::{ errors::*, state::{ NfNodeType } };
declare_id!("9sG3k17Kuc9HMwkq5txjmRiRwbShBHrWudpVK4z1CkVV");

#[program]
pub mod reward_system {
    pub use super::instructions::*;
    use super::*;

    pub fn initialize_system(ctx: Context<InitializeSystem>) -> Result<()> {
        instructions::initialize_system(ctx)
    }

    pub fn update_admin_request(ctx: Context<UpdateAdmin>, new_admin_pubkey: Pubkey) -> Result<()> {
        instructions::update_admin_request(ctx, new_admin_pubkey)
    }
    pub fn accept_admin_request(ctx: Context<UpdateAdmin>) -> Result<()> {
        instructions::accept_admin_request(ctx)
    }

    pub fn initialize_nfnode(
        ctx: Context<InitializeNfNode>,
        host_share: u64,
        nfnode_type: NfNodeType
    ) -> Result<()> {
        instructions::initialize_nfnode(ctx, host_share, nfnode_type)
    }
    pub fn update_nfnode(ctx: Context<UpdateNfNode>, host_share: u64) -> Result<()> {
        instructions::update_nfnode(ctx, host_share)
    }

    pub fn fund_token_storage(ctx: Context<FundTokenStorage>, amount: u64) -> Result<()> {
        // Validate that the amount is greater than zero
        require!(amount > 0, RewardError::InvalidFundingAmount);

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
        require!(admin_account.paused == false, RewardError::AlreadyPaused);
        admin_account.paused = true;
        Ok(())
    }

    pub fn unpause_program(ctx: Context<UpdateAdmin>) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        require!(
            ctx.accounts.user.key() == admin_account.admin_pubkey,
            RewardError::UnauthorizedAdmin
        );
        require!(admin_account.paused == true, RewardError::AlreadyRunning);
        admin_account.paused = false;
        Ok(())
    }
    pub fn deposit_tokens(ctx: Context<DepositTokens>) -> Result<()> {
        instructions::deposit_tokens(ctx)
    }
    pub fn withdraw_tokens(ctx: Context<WithdrawTokens>) -> Result<()> {
        instructions::withdraw_tokens(ctx)
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
