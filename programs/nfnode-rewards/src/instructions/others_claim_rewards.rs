use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{ AssociatedToken },
    token::{ self, Token, TokenAccount, Transfer, Mint }, //Wayru Token
    token_interface::{ Mint as Mint2022, TokenAccount as SplToken2022Account, TokenInterface },
};
use crate::{ errors::RewardError, state::{ RewardEntry, NfNodeEntry, AdminAccount } };
pub fn others_claim_rewards(
    ctx: Context<OwnerClaimRewards>,
    reward_amount: u64,
    nonce: u64
) -> Result<()> {
    let reward_entry = &mut ctx.accounts.reward_entry;
    let nfnode_entry = &mut ctx.accounts.nfnode_entry;

    let admin_account = &ctx.accounts.admin_account;
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
    msg!("Current timestamp: {}", current_timestamp);
    let last_claim_day_reward_entry = reward_entry.last_claimed_timestamp
        .checked_div(86400)
        .ok_or(RewardError::ArithmeticOverflow)?;
    let owner_last_claim_day_nfnode_entry = nfnode_entry.owner_last_claimed_timestamp
        .checked_div(86400)
        .ok_or(RewardError::ArithmeticOverflow)?;
    let current_day = current_timestamp.checked_div(86400).ok_or(RewardError::ArithmeticOverflow)?;
    require!(
        current_day > last_claim_day_reward_entry &&
            current_day > owner_last_claim_day_nfnode_entry,
        RewardError::ClaimAlreadyMadeToday
    );

    reward_entry.last_claimed_nonce = nonce;
    reward_entry.last_claimed_timestamp = current_timestamp;
    nfnode_entry.owner_last_claimed_timestamp = current_timestamp;
    nfnode_entry.total_rewards_claimed += reward_amount;

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
#[derive(Accounts)]
pub struct OwnerClaimRewards<'info> {
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
    #[account(
        mut,
        seeds = [b"nfnode_entry", nft_mint_address.key().as_ref()],
        bump
    )]
    pub nfnode_entry: Box<Account<'info, NfNodeEntry>>,
    pub token_mint: Account<'info, Mint>,
    /// CHECK:
    #[account(mut, seeds = [b"token_storage"], bump)]
    pub token_storage_authority: AccountInfo<'info>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = token_storage_authority,
    )]
    pub token_storage_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    #[account(seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
