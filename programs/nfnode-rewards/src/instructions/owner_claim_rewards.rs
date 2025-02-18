use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{ AssociatedToken },
    token::{ self, Token, TokenAccount, Transfer, Mint }, //Wayru Token
    token_interface::{ Mint as Mint2022, TokenAccount as SplToken2022Account, TokenInterface },
};
use crate::{ errors::RewardError, state::{ RewardEntry, NfNodeEntry, AdminAccount, NfNodeType } };
pub fn owner_claim_rewards(
    ctx: Context<OwnerClaimRewards>,
    reward_amount: u64,
    nonce: u64
) -> Result<()> {
    // Validate that the reward amount is greater than zero
    require!(reward_amount > 0, RewardError::InvalidRewardAmount);

    let reward_entry = &mut ctx.accounts.reward_entry;
    let nfnode_entry = &mut ctx.accounts.nfnode_entry;
    let amount = 5000000000;
    //validate if type is not DON to validate the amount deposited
    if nfnode_entry.nfnode_type !=NfNodeType::DON {
    require!(nfnode_entry.deposit_amount == amount, RewardError::DepositRequired);}
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

    let user_nft_token_account_info = &ctx.accounts.user_nft_token_account;

    if user_nft_token_account_info.owner != &ctx.accounts.token_program_2022.key() {
        return err!(RewardError::InvalidNftMint);
    }
    // Manually derive the associated token account PDA
    let (derived_ata, _bump_seed) = Pubkey::find_program_address(
        &[
            &ctx.accounts.user.key().to_bytes(),
            &ctx.accounts.token_program_2022.key().to_bytes(),
            &ctx.accounts.nft_mint_address.key().to_bytes(),
        ],
        &ctx.accounts.associated_token_program.key()
    );

    // Validate the ownership of the user_nft_token_account
    require!(derived_ata == *user_nft_token_account_info.key, RewardError::InvalidNftTokenAccount);

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
    //validate if nft has valid mint authority
    let metadata_account_info = &ctx.accounts.nft_mint_address.to_account_info();
    let metadata_account_data = metadata_account_info.try_borrow_data()?;
    let mint = Mint2022::try_deserialize(&mut &metadata_account_data[..])?;
    let mint_authority = mint.mint_authority.unwrap();
    require!(
        admin_account.mint_authorities.contains(&mint_authority),
        RewardError::UnauthorizedMintAuthority
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
