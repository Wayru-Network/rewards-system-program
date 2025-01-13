use anchor_lang::prelude::*;

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
    #[msg("Invalid Nfnode entry.")]
    InvalidNfNodeEntry,
}