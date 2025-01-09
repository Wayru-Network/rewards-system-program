use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{ AssociatedToken },
    token::{ self, Token, TokenAccount, Transfer, Mint }, //Wayru Token
    token_interface::{ Mint as Mint2022, TokenAccount as SplToken2022Account, TokenInterface },
};
use solana_program::{ pubkey::Pubkey };

declare_id!("AgaHAYCtdwgi3HikyXEYJP5VsXtRpouVZBxKFyKu8R4w");

#[program]
pub mod reward_system {
    use super::*;

    pub fn initialize_system(ctx: Context<InitializeSystem>) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        admin_account.admin_pubkey = ctx.accounts.user.key();
        Ok(())
    }

    pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin_pubkey: Pubkey) -> Result<()> {
        msg!("admin_account_pubkey: {}", ctx.accounts.admin_account.key());
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
        let admin_account = &ctx.accounts.admin_account;
        // msg!("admin_account_pubkey: {}", admin_account.key());
        msg!("admin_pubkey: {}", admin_account.admin_pubkey);
        msg!("admin_account.paused: {}", admin_account.paused);
        require!(!admin_account.paused, RewardError::ProgramPaused);
        require!(
            nonce > reward_entry.last_claimed_nonce ||
                (reward_entry.last_claimed_nonce == 0 && nonce == 1) || // initialization
                (reward_entry.last_claimed_nonce == u64::MAX && nonce == 1), // overflow unprobably
            RewardError::NonceAlreadyClaimed
        );
        require!(
            ctx.accounts.user_admin.key() == admin_account.admin_pubkey,
            RewardError::UnauthorizedAdmin
        );
        let user_admin_account_info = ctx.accounts.user_admin.to_account_info();
        let is_partially_signed_by_admin = user_admin_account_info.is_signer;
        require!(is_partially_signed_by_admin, RewardError::MissingAdminSignature);
        let current_timestamp = Clock::get()?.unix_timestamp;
        let last_claim_day = reward_entry.last_claimed_timestamp
            .checked_div(86400)
            .ok_or(RewardError::ArithmeticOverflow)?;
        let current_day = current_timestamp
            .checked_div(86400)
            .ok_or(RewardError::ArithmeticOverflow)?;
        require!(current_day > last_claim_day, RewardError::ClaimAlreadyMadeToday);

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
        msg!("Program paused");
        Ok(())
    }

    pub fn unpause_program(ctx: Context<UpdateAdmin>) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        require!(
            ctx.accounts.user.key() == admin_account.admin_pubkey,
            RewardError::UnauthorizedAdmin
        );
        admin_account.paused = false;
        msg!("Program unpaused");
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
    /// CHECK:
    pub nft_mint_address: InterfaceAccount<'info, Mint2022>,
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
    /// CHECK: used to check nft ownership
    pub user_nft_token_account: AccountInfo<'info>,
    // pub user_nft_token_account: InterfaceAccount<'info, SplToken2022Account>,
    #[account(seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
    pub token_program_2022: Interface<'info, TokenInterface>,
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
    #[msg("Program is paused.")]
    ProgramPaused,
    #[msg("Claim already made today.")]
    ClaimAlreadyMadeToday,
    #[msg("Aricmetic overflow.")]
    ArithmeticOverflow,
    #[msg("Invalid NFT mint.")]
    InvalidNftMint,
    #[msg("Insufficient NFT balance.")]
    InsufficientNftBalance,
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
