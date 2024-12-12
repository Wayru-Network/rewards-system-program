use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{ self, Token, TokenAccount, Transfer, Mint },
};
use solana_program::{ ed25519_program, instruction::Instruction, program::invoke };

declare_id!("CUQLdZJSvB9jF15sSRpwFvyKjoRizV39PbbGRd61cxzK");

#[program]
pub mod reward_system {
    use super::*;

    pub fn initialize_system(ctx: Context<InitializeSystem>) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        admin_account.admin_pubkey = ctx.accounts.user.key(); // Guarda la clave pública del administrador
        Ok(())
    }

    pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin_pubkey: Pubkey) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        require!(ctx.accounts.user.key() == admin_account.admin_pubkey, RewardError::Unauthorized);
        admin_account.admin_pubkey = new_admin_pubkey; // Actualiza la clave pública del administrador
        Ok(())
    }

    pub fn fund_token_storage(ctx: Context<FundTokenStorage>, amount: u64) -> Result<()> {
        token::transfer(ctx.accounts.transfer_to_token_storage(), amount)?;
        Ok(())
    }

    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
        reward_amount: u64,
        admin_signature: [u8; 64],
        claimer_pubkey: Pubkey,
        nonce: u64
    ) -> Result<()> {
        let reward_entry = &mut ctx.accounts.reward_entry;

        if reward_entry.claimed_nonces.is_empty() {
            reward_entry.claimed_nonces = vec![]; // Inicializa el vector de nonces
        }

        require!(!reward_entry.claimed_nonces.contains(&nonce), RewardError::RewardAlreadyClaimed);

        let message = generate_reward_message(reward_amount, claimer_pubkey, nonce);
        verify_ed25519_signature(
            &ctx.accounts.admin_account.admin_pubkey.to_bytes(),
            &admin_signature,
            &message
        )?;

        require!(ctx.accounts.user.key() == claimer_pubkey, RewardError::Unauthorized);

        reward_entry.claimed_nonces.push(nonce);
        token::transfer(ctx.accounts.transfer_to_user(), reward_amount)?;
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
        associated_token::authority = token_storage_authority,
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
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + std::mem::size_of::<RewardEntry>(),
        seeds = [b"reward_entry", user.key().as_ref()],
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
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"admin_account"], bump)]
    pub admin_account: Account<'info, AdminAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct RewardEntry {
    pub claimed_nonces: Vec<u64>,
}

#[account]
pub struct AdminAccount {
    pub admin_pubkey: Pubkey,
}

#[error_code]
pub enum RewardError {
    #[msg("The reward has already been claimed.")]
    RewardAlreadyClaimed,
    #[msg("Invalid admin signature.")]
    InvalidAdminSignature,
    #[msg("Unauthorized access.")]
    Unauthorized,
}

fn generate_reward_message(reward_amount: u64, claimer_pubkey: Pubkey, nonce: u64) -> Vec<u8> {
    let mut message = vec![];
    message.extend_from_slice(claimer_pubkey.as_ref());
    message.extend_from_slice(&reward_amount.to_le_bytes());
    message.extend_from_slice(&nonce.to_le_bytes());
    message
}

fn verify_ed25519_signature(
    public_key: &[u8; 32],
    signature: &[u8; 64],
    message: &[u8]
) -> Result<()> {
    let instruction_data = create_ed25519_instruction_data(signature, public_key, message);

    let instruction = Instruction {
        program_id: ed25519_program::id(),
        accounts: vec![],
        data: instruction_data,
    };

    invoke(&instruction, &[]).map_err(|_| error!(RewardError::InvalidAdminSignature))
}

fn create_ed25519_instruction_data(signature: &[u8], public_key: &[u8], message: &[u8]) -> Vec<u8> {
    let mut instruction_data = vec![];

    let pubkey_offset = 1 + 4 + 64;
    let message_offset = pubkey_offset + public_key.len();

    instruction_data.push(0);
    instruction_data.extend_from_slice(&(64_u32).to_le_bytes());
    instruction_data.extend_from_slice(&(0_u32).to_le_bytes());
    instruction_data.extend_from_slice(&(32_u32).to_le_bytes());
    instruction_data.extend_from_slice(&(pubkey_offset as u32).to_le_bytes());
    instruction_data.extend_from_slice(&(message.len() as u32).to_le_bytes());
    instruction_data.extend_from_slice(&(message_offset as u32).to_le_bytes());

    instruction_data.extend_from_slice(signature);
    instruction_data.extend_from_slice(public_key);
    instruction_data.extend_from_slice(message);

    instruction_data
}

impl<'info> ClaimRewards<'info> {
    fn transfer_to_user(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info(), Transfer {
            from: self.token_storage_account.to_account_info(),
            to: self.user_token_account.to_account_info(),
            authority: self.token_storage_authority.to_account_info(),
        })
    }
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
