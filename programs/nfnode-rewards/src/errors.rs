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
    #[msg("Invalid Nft token account.")]
    InvalidNftTokenAccount,
    #[msg("Invalid Nft supply.")]
    InvalidNftSupply,
    #[msg("Invalid Nft decimals.")]
    InvalidNftDecimals,
    #[msg("New admin can't be the same current admin")]
    SameAdminPubkey,
    #[msg("New admin can't be the same current admin candidate")]
    SameAdminCandidatePubkey,
    #[msg("Admin already accepted.")]
    AlreadyAccepted,
    #[msg("Program already paused.")]
    AlreadyPaused,
    #[msg("Program already running.")]
    AlreadyRunning,
    #[msg("Invalid pubkey.")]
    InvalidPubkey,
    #[msg("Reward amount must be greater than zero.")]
    InvalidRewardAmount,
    #[msg("Funding amount must be greater than zero.")]
    InvalidFundingAmount,
    #[msg("Deposit amount must be equal than 5000000000.")]
    InvalidDepositAmount,
    #[msg("Deposit already made.")]
    DepositAlreadyMade,
    #[msg("Withdraw already made.")]
    WithdrawAlreadyMade,
    #[msg("Withdraw too early.")]
    WithdrawTooEarly,
    #[msg("Invalid token mint.")]
    InvalidMint,
    #[msg("Deposit required.")]
    DepositRequired,
    #[msg("Unauthorized Mint Authority.")]
    UnauthorizedMintAuthority,
}