use anchor_lang::prelude::*;

declare_id!("3bJrkegLA6EmU5gmoXNHwnSiVoVbZVkqSsaa7dfV6e2e");

#[program]
pub mod nfnode_rewards {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
