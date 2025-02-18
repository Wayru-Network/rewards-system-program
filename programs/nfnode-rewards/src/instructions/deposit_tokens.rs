use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{ self, Token, TokenAccount, Transfer, Mint }, //Wayru Token
    token_interface::{ Mint as Mint2022, TokenAccount as SplToken2022Account, TokenInterface },
};
use crate::{ errors::RewardError, state::{ NfNodeEntry, AdminAccount } };
pub fn deposit_tokens(ctx: Context<DepositTokens>) -> Result<()> {
    let nfnode_entry = &ctx.accounts.nfnode_entry;
    require!(nfnode_entry.deposit_amount == 0, RewardError::DepositAlreadyMade);
    // Validate that token_mint is a valid mint registered in admin account
    let admin_account = &ctx.accounts.admin_account;
    require!(!admin_account.paused, RewardError::ProgramPaused);
    let valid_mint = admin_account.valid_mint;
    let token_mint = &ctx.accounts.token_mint;
    require!(valid_mint == token_mint.key(), RewardError::InvalidMint);

    let user_nft_token_account_info = &ctx.accounts.user_nft_token_account;

    if user_nft_token_account_info.owner != &ctx.accounts.token_program_2022.key() {
        return err!(RewardError::InvalidNftMint);
    }
    // Fetch the mint account data
    let nft_mint_account_info = &ctx.accounts.nft_mint_address.to_account_info();
    let nft_mint_account_data = nft_mint_account_info.try_borrow_data()?;
    let nft_mint_account = Mint2022::try_deserialize(&mut &nft_mint_account_data[..])?;

    // Validate that the total supply is 1
    require!(nft_mint_account.supply == 1, RewardError::InvalidNftSupply);

    // Validate that the decimal precision is 0
    require!(nft_mint_account.decimals == 0, RewardError::InvalidNftDecimals);

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

    let amount = 5000000000;
    token::transfer(ctx.accounts.transfer_to_token_storage(), amount)?;
    let nfnode_entry = &mut ctx.accounts.nfnode_entry;
    nfnode_entry.deposit_amount = amount;
    nfnode_entry.deposit_timestamp = Clock::get()?.unix_timestamp;
    Ok(())
}
#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    ///CHECK: only read account
    pub nft_mint_address: InterfaceAccount<'info, Mint2022>,
    /// CHECK: used to check nft ownership
    pub user_nft_token_account: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"nfnode_entry", nft_mint_address.key().as_ref()],
        bump
    )]
    pub nfnode_entry: Box<Account<'info, NfNodeEntry>>,
    #[account(seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
    /// CHECK:
    #[account(mut, seeds = [b"token_storage",nft_mint_address.key().as_ref()], bump)]
    pub token_storage_authority: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = token_storage_authority
    )]
    pub token_storage_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    pub token_program_2022: Interface<'info, TokenInterface>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> DepositTokens<'info> {
    fn transfer_to_token_storage(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info(), Transfer {
            from: self.user_token_account.to_account_info(),
            to: self.token_storage_account.to_account_info(),
            authority: self.user.to_account_info(),
        })
    }
}
