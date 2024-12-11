use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Token, Transfer };
use solana_program::{ ed25519_program, instruction::Instruction, program::invoke };

declare_id!("4E4oAH7z8bFYrzhovCqq9VgMgqAW9oJ6jHfmMS2Kiork");

const MANUFACTURER_SHARE: u8 = 1; // Always 1%

#[program]
pub mod reward_system {
    use super::*;

    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
        reward_amount: u64,
        owner_share: u8,
        host_share: u8,
        admin_pubkey: [u8; 32],
        admin_signature: [u8; 64],
        nonce: u64
    ) -> Result<()> {
        let reward_entry_key = ctx.accounts.reward_entry.key();

        // Check if the reward has already been claimed using the nonce
        require!(
            !ctx.accounts.reward_entry.claimed_nonces.contains(&nonce),
            RewardError::RewardAlreadyClaimed
        );

        // Generate the message to verify
        let message = generate_reward_message(
            reward_entry_key,
            reward_amount,
            owner_share,
            host_share,
            nonce
        );

        // Verify admin signature using Ed25519 program
        verify_ed25519_signature(&admin_pubkey, &admin_signature, &message)?;

        // Calculate amounts
        let (owner_amount, host_amount, manufacturer_amount) = calculate_amounts(
            reward_amount,
            owner_share,
            host_share
        );

        // Transfers
        token::transfer(ctx.accounts.transfer_to_owner(), owner_amount)?;
        token::transfer(ctx.accounts.transfer_to_host(), host_amount)?;
        token::transfer(ctx.accounts.transfer_to_manufacturer(), manufacturer_amount)?;

        // Register the nonce as claimed
        ctx.accounts.reward_entry.claimed_nonces.push(nonce);

        Ok(())
    }

    // Method to update the admin public key
    pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin_pubkey: [u8; 32]) -> Result<()> {
        // First, get the admin_account key immutably
        let admin_account = &mut ctx.accounts.admin_account;

        // Then, check that the signer is the deployer of the program
        let user_key_base58 = ctx.accounts.user.key().to_string();
        let admin_key_base58 = Pubkey::from(admin_account.admin_pubkey).to_string();

        msg!("User key: {}", user_key_base58);
        msg!("Admin key: {}", admin_key_base58);
        require!(user_key_base58 == admin_key_base58, RewardError::Unauthorized);

        admin_account.admin_pubkey = new_admin_pubkey; // Update the admin public key
        Ok(())
    }

    // General initialization function
    pub fn initialize_system(ctx: Context<InitializeSystem>) -> Result<()> {
        // Initialize the admin account
        let admin_account = &mut ctx.accounts.admin_account;
        admin_account.admin_pubkey = ctx.accounts.user.key().to_bytes();
        // Initialize the reward_entry PDA
        let (reward_entry_key, _bump) = Pubkey::find_program_address(
            &[b"reward_entry", ctx.accounts.user.key().as_ref()],
            ctx.program_id
        );

        // Ensure that the reward_entry account is the expected PDA
        require!(ctx.accounts.reward_entry.key() == reward_entry_key, RewardError::InvalidAccount);

        let reward_entry = &mut ctx.accounts.reward_entry;
        reward_entry.claimed_nonces = vec![]; // Initialize the nonces vector

        Ok(())
    }
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub reward_entry: Account<'info, RewardEntry>,
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: The host account is used as a transfer destination and does not require additional checks.
    #[account(mut)]
    pub host: AccountInfo<'info>,
    /// CHECK: The manufacturer account is used as a transfer destination and does not require additional checks.
    #[account(mut)]
    pub manufacturer: AccountInfo<'info>,
    /// CHECK: Manual verification is performed in the program to ensure this is a valid TokenAccount.
    #[account(mut)]
    pub owner_token_account: AccountInfo<'info>,
    /// CHECK: Manual verification is performed in the program to ensure this is a valid TokenAccount.
    #[account(mut)]
    pub host_token_account: AccountInfo<'info>,
    /// CHECK: Manual verification is performed in the program to ensure this is a valid TokenAccount.
    #[account(mut)]
    pub manufacturer_token_account: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Used only for signature validation in the program.
    pub admin: UncheckedAccount<'info>,
}

// Context struct for the general initialization
#[derive(Accounts)]
pub struct InitializeSystem<'info> {
    #[account(mut)]
    pub user: Signer<'info>, // User who is initializing
    #[account(
        init,
        payer = user,
        space = 40,
        seeds = [b"admin_account", user.key().as_ref()],
        bump
    )] //
    pub admin_account: Account<'info, AdminAccount>, // Admin account
    #[account(
        init,
        payer = user,
        space = 1024,
        seeds = [b"reward_entry", user.key().as_ref()],
        bump
    )] // Space for reward_entry
    pub reward_entry: Account<'info, RewardEntry>, // Reward entry PDA
    pub system_program: Program<'info, System>, // Required for initialization
}
#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
    #[account(mut)]
    pub user: Signer<'info>, //
    #[account(
        mut,
        seeds = [b"admin_account", user.key().as_ref()],
        bump
    )] //
    pub admin_account: Account<'info, AdminAccount>, // Admin account
    pub system_program: Program<'info, System>, // Required for initialization
}
#[account]
pub struct RewardEntry {
    pub claimed_nonces: Vec<u64>, // Stores nonces to prevent replay attacks
}

#[account]
pub struct AdminAccount {
    pub admin_pubkey: [u8; 32], // Stores the public key of the admin
}

#[error_code]
pub enum RewardError {
    #[msg("The reward has already been claimed.")]
    RewardAlreadyClaimed,
    #[msg("Invalid admin signature.")]
    InvalidAdminSignature,
    #[msg("Invalid rewards account.")]
    InvalidAccount,
    #[msg("Unauthorized access.")]
    Unauthorized,
}

// Helper function to generate the signature message
fn generate_reward_message(
    reward_entry: Pubkey,
    reward_amount: u64,
    owner_share: u8,
    host_share: u8,
    nonce: u64
) -> Vec<u8> {
    let mut message = vec![];
    message.extend_from_slice(reward_entry.as_ref());
    message.extend_from_slice(&reward_amount.to_le_bytes());
    message.push(owner_share);
    message.push(host_share);
    message.extend_from_slice(&nonce.to_le_bytes());
    message
}

// Function to verify Ed25519 signature
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

// Helper function to create Ed25519 instruction data
fn create_ed25519_instruction_data(signature: &[u8], public_key: &[u8], message: &[u8]) -> Vec<u8> {
    let mut instruction_data = vec![];

    // Calculate offsets
    let pubkey_offset = 1 + 4 + 64; // signature_offset + length
    let message_offset = pubkey_offset + public_key.len();

    // Add instruction prefix (required by the Ed25519 program)
    instruction_data.push(0); // Signature verification instruction
    instruction_data.extend_from_slice(&(64_u32).to_le_bytes()); // Signature length
    instruction_data.extend_from_slice(&(0_u32).to_le_bytes()); // Signature offset
    instruction_data.extend_from_slice(&(32_u32).to_le_bytes()); // Public key length
    instruction_data.extend_from_slice(&(pubkey_offset as u32).to_le_bytes()); // Public key offset
    instruction_data.extend_from_slice(&(message.len() as u32).to_le_bytes()); // Message length
    instruction_data.extend_from_slice(&(message_offset as u32).to_le_bytes()); // Message offset

    // Add signature, public key, and message
    instruction_data.extend_from_slice(signature);
    instruction_data.extend_from_slice(public_key);
    instruction_data.extend_from_slice(message);

    instruction_data
}

fn calculate_amounts(reward_amount: u64, owner_share: u8, host_share: u8) -> (u64, u64, u64) {
    let owner_amount = (reward_amount * (owner_share as u64)) / 100;
    let host_amount = (reward_amount * (host_share as u64)) / 100;
    let manufacturer_amount = (reward_amount * (MANUFACTURER_SHARE as u64)) / 100;
    (owner_amount, host_amount, manufacturer_amount)
}

impl<'info> ClaimRewards<'info> {
    fn transfer_to_owner(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info(), Transfer {
            from: self.owner_token_account.to_account_info(),
            to: self.owner.to_account_info(),
            authority: self.owner.to_account_info(),
        })
    }

    fn transfer_to_host(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info(), Transfer {
            from: self.host_token_account.to_account_info(),
            to: self.host.to_account_info(),
            authority: self.owner.to_account_info(),
        })
    }

    fn transfer_to_manufacturer(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(self.token_program.to_account_info(), Transfer {
            from: self.manufacturer_token_account.to_account_info(),
            to: self.manufacturer.to_account_info(),
            authority: self.owner.to_account_info(),
        })
    }
}
