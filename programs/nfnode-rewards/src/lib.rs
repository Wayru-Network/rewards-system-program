use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{ AssociatedToken },
    token::{ self, Token, TokenAccount, Transfer, Mint },
};
use solana_program::{ pubkey::Pubkey };

declare_id!("ECu399aX2ikU9x1R6cFQm2nxNE31YfDgTvGtX7E9ChQL");

#[program]
pub mod reward_system {
    use super::*;

    pub fn initialize_system(ctx: Context<InitializeSystem>) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        admin_account.admin_pubkey = ctx.accounts.user.key();
        Ok(())
    }

    pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin_pubkey: Pubkey) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        require!(
            ctx.accounts.user.key() == admin_account.admin_pubkey,
            RewardError::UnauthorizedAdmin
        );
        admin_account.admin_pubkey = new_admin_pubkey;
        msg!("admin_pubkey: {}", new_admin_pubkey);
        msg!("user_admin pubkey: {}", ctx.accounts.user.key());
        Ok(())
    }

    pub fn fund_token_storage(ctx: Context<FundTokenStorage>, amount: u64) -> Result<()> {
        token::transfer(ctx.accounts.transfer_to_token_storage(), amount)?;
        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>, reward_amount: u64, nonce: u64) -> Result<()> {
        let reward_entry = &mut ctx.accounts.reward_entry;
        let admin_account = &mut ctx.accounts.admin_account;
        require!(!admin_account.paused, RewardError::ProgramPaused);
        require!(
            nonce > reward_entry.last_claimed_nonce ||
                (reward_entry.last_claimed_nonce == 0 && nonce == 1) || // initialization
                (reward_entry.last_claimed_nonce == u64::MAX && nonce == 1), // overflow unprobably
            RewardError::NonceAlreadyClaimed
        );
        msg!("user pubkey: {}", ctx.accounts.user.key());

        require!(
            ctx.accounts.user_admin.key() == admin_account.admin_pubkey,
            RewardError::UnauthorizedAdmin
        );
        let user_admin_account_info = ctx.accounts.user_admin.to_account_info();
        let is_partially_signed_by_admin = user_admin_account_info.is_signer;
        require!(is_partially_signed_by_admin, RewardError::MissingAdminSignature);
        require!(
            ctx.accounts.user_nft_token_account.mint == ctx.accounts.nft_mint_address.key(),
            RewardError::InvalidNftMint
        );

        require!(
            ctx.accounts.user_nft_token_account.owner == ctx.accounts.user.key(),
            RewardError::UnauthorizedUser
        );

        // Check that the amount of the NFT is greater than 0
        require!(
            ctx.accounts.user_nft_token_account.amount > 0,
            RewardError::InsufficientNftBalance
        );
        let current_timestamp = Clock::get()?.unix_timestamp;
        let last_claim_day = reward_entry.last_claimed_timestamp / 60; //86400; // 86400 seconds in a day
        let current_day = current_timestamp / 60; //86400;
        msg!("current_day: {}", current_day);
        msg!("last_claim_day: {}", last_claim_day);
        require!(current_day > last_claim_day, RewardError::ClaimAlreadyMadeToday);
        reward_entry.last_claimed_nonce = nonce;
        reward_entry.last_claimed_timestamp = current_timestamp;

        let authority_bump = ctx.bumps.token_storage_authority;
        let authority_seeds = &[&b"token_storage"[..], &[authority_bump]];
        let signer_seeds = &[&authority_seeds[..]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_storage_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.token_storage_authority.to_account_info(),
                },
                signer_seeds
            ),
            reward_amount
        )?;

        Ok(())
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

#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
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

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    /// CHECK:
    #[account(mut)]
    pub user_admin: Signer<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub nft_mint_address: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + std::mem::size_of::<RewardEntry>(),
        seeds = [b"reward_entry", user.key().as_ref(), nft_mint_address.key().as_ref()],
        bump
    )]
    pub reward_entry: Account<'info, RewardEntry>,
    pub token_mint: Account<'info, Mint>,
    /// CHECK:
    #[account(mut, seeds = [b"token_storage"], bump)]
    pub token_storage_authority: AccountInfo<'info>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = token_storage_authority,
    )]
    pub token_storage_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub user_nft_token_account: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct RewardEntry {
    pub last_claimed_nonce: u64,
    pub last_claimed_timestamp: i64,
}

#[account]
pub struct AdminAccount {
    pub admin_pubkey: Pubkey,
    pub paused: bool,
}

#[error_code]
pub enum RewardError {
    #[msg("Unauthorized access admin.")]
    UnauthorizedAdmin,
    #[msg("Unauthorized access user.")]
    UnauthorizedUser,
    #[msg("Missing admin signature.")]
    MissingAdminSignature,
    #[msg("Nonce already claimed or invalid.")]
    NonceAlreadyClaimed,
    #[msg("Invalid NFT mint.")]
    InvalidNftMint,
    #[msg("Insufficient NFT balance.")]
    InsufficientNftBalance,
    #[msg("Program is paused.")]
    ProgramPaused,
    #[msg("Claim already made today.")]
    ClaimAlreadyMadeToday,
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
