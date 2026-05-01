use solana_client::rpc_client::RpcClient;
use solana_program::pubkey::Pubkey;
use solana_program::spl_token::state::{Mint, Account};
use solana_sdk::commitment_config::CommitmentConfig;
use std::str::FromStr;
use tokio::task::JoinHandle;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use anyhow::{Result, anyhow};
use log::{info, warn, error};

/// Represents the validation result with detailed breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub token_address: String,
    pub go_no_go: bool,
    pub mint_authority_renounced: bool,
    pub freeze_authority_renounced: bool,
    pub liquidity_burned: bool,
    pub total_supply_burned: f64,
    pub risk_score: u32,
    pub checks_duration_ms: u128,
    pub errors: Vec<String>,
}

/// Fast-path validator for Solana tokens
pub struct FastPathValidator {
    client: RpcClient,
    parallelism: usize,
}

impl FastPathValidator {
    /// Initialize the validator with RPC client
    pub fn new(rpc_url: String, parallelism: usize) -> Self {
        let client = RpcClient::new_with_commitment(
            rpc_url,
            CommitmentConfig::confirmed(),
        );
        
        FastPathValidator {
            client,
            parallelism,
        }
    }

    /// Main validation entry point - runs all checks in parallel
    pub async fn validate_token(&self, token_address: &str) -> Result<ValidationResult> {
        let start = Instant::now();
        let mut result = ValidationResult {
            token_address: token_address.to_string(),
            go_no_go: true,
            mint_authority_renounced: false,
            freeze_authority_renounced: false,
            liquidity_burned: false,
            total_supply_burned: 0.0,
            risk_score: 0,
            checks_duration_ms: 0,
            errors: Vec::new(),
        };

        // Parse token address
        let token_pubkey = match Pubkey::from_str(token_address) {
            Ok(pk) => pk,
            Err(e) => {
                result.go_no_go = false;
                result.risk_score = 100;
                result.errors.push(format!("Invalid token address: {}", e));
                result.checks_duration_ms = start.elapsed().as_millis();
                return Ok(result);
            }
        };

        // Spawn all validation tasks concurrently
        let client = self.client.clone();
        let check_mint_authority = tokio::spawn(async move {
            let client = client.clone();
            check_mint_authority_renounced(&client, &token_pubkey).await
        });

        let client = self.client.clone();
        let token_addr = token_pubkey.clone();
        let check_freeze_authority = tokio::spawn(async move {
            let client = client.clone();
            check_freeze_authority_renounced(&client, &token_addr).await
        });

        let client = self.client.clone();
        let token_addr = token_pubkey.clone();
        let check_liquidity = tokio::spawn(async move {
            let client = client.clone();
            check_liquidity_burned(&client, &token_addr).await
        });

        let client = self.client.clone();
        let token_addr = token_pubkey.clone();
        let check_holder_concentration = tokio::spawn(async move {
            let client = client.clone();
            check_holder_concentration(&client, &token_addr).await
        });

        // Wait for all checks to complete
        let (mint_auth_result, freeze_auth_result, liquidity_result, holder_result) = 
            tokio::join!(
                check_mint_authority,
                check_freeze_authority,
                check_liquidity,
                check_holder_concentration
            );

        // Process results
        match mint_auth_result {
            Ok(Ok(renounced)) => {
                result.mint_authority_renounced = renounced;
                if !renounced {
                    result.risk_score += 30;
                }
            }
            Ok(Err(e)) => {
                result.errors.push(format!("Mint authority check failed: {}", e));
                result.risk_score += 25;
            }
            Err(e) => {
                result.errors.push(format!("Mint authority task failed: {}", e));
                result.risk_score += 25;
            }
        }

        match freeze_auth_result {
            Ok(Ok(renounced)) => {
                result.freeze_authority_renounced = renounced;
                if !renounced {
                    result.risk_score += 30;
                }
            }
            Ok(Err(e)) => {
                result.errors.push(format!("Freeze authority check failed: {}", e));
                result.risk_score += 25;
            }
            Err(e) => {
                result.errors.push(format!("Freeze authority task failed: {}", e));
                result.risk_score += 25;
            }
        }

        match liquidity_result {
            Ok(Ok(burned)) => {
                result.liquidity_burned = burned;
                if burned {
                    result.risk_score += 50;
                }
            }
            Ok(Err(e)) => {
                result.errors.push(format!("Liquidity check failed: {}", e));
                result.risk_score += 15;
            }
            Err(e) => {
                result.errors.push(format!("Liquidity task failed: {}", e));
                result.risk_score += 15;
            }
        }

        match holder_result {
            Ok(Ok(concentrated)) => {
                if concentrated {
                    result.risk_score += 40;
                }
            }
            Ok(Err(e)) => {
                result.errors.push(format!("Holder concentration check failed: {}", e));
                result.risk_score += 10;
            }
            Err(e) => {
                result.errors.push(format!("Holder concentration task failed: {}", e));
                result.risk_score += 10;
            }
        }

        // Set final Go/No-Go signal
        result.go_no_go = result.risk_score < 60 
            && result.mint_authority_renounced 
            && result.freeze_authority_renounced 
            && !result.liquidity_burned;

        result.checks_duration_ms = start.elapsed().as_millis();

        info!(
            "✅ Token {} validation completed in {}ms | Go/No-Go: {} | Risk: {}/100",
            token_address, result.checks_duration_ms, result.go_no_go, result.risk_score
        );

        Ok(result)
    }
}

/// Check if mint authority has been renounced
async fn check_mint_authority_renounced(client: &RpcClient, token_address: &Pubkey) -> Result<bool> {
    let start = Instant::now();
    
    let account = client.get_account(token_address)
        .map_err(|e| anyhow!("Failed to fetch account: {}", e))?;

    // Parse mint data
    let mint = Mint::unpack(&account.data)
        .map_err(|e| anyhow!("Failed to parse mint data: {}", e))?;

    let renounced = mint.owner.is_none();
    
    info!(
        "🔐 Mint Authority Check ({}ms): {}",
        start.elapsed().as_millis(),
        if renounced { "✅ Renounced" } else { "❌ Not Renounced" }
    );

    Ok(renounced)
}

/// Check if freeze authority has been renounced
async fn check_freeze_authority_renounced(client: &RpcClient, token_address: &Pubkey) -> Result<bool> {
    let start = Instant::now();
    
    let account = client.get_account(token_address)
        .map_err(|e| anyhow!("Failed to fetch account: {}", e))?;

    let mint = Mint::unpack(&account.data)
        .map_err(|e| anyhow!("Failed to parse mint data: {}", e))?;

    let renounced = mint.freeze_authority.is_none();
    
    info!(
        "❄️  Freeze Authority Check ({}ms): {}",
        start.elapsed().as_millis(),
        if renounced { "✅ Renounced" } else { "❌ Not Renounced" }
    );

    Ok(renounced)
}

/// Check if liquidity has been burned (removed from circulation)
async fn check_liquidity_burned(client: &RpcClient, token_address: &Pubkey) -> Result<bool> {
    let start = Instant::now();
    
    let account = client.get_account(token_address)
        .map_err(|e| anyhow!("Failed to fetch account: {}", e))?;

    let mint = Mint::unpack(&account.data)
        .map_err(|e| anyhow!("Failed to parse mint data: {}", e))?;

    // Check if supply is extremely low (liquidity burned)
    // Typical DEX pools have millions of tokens, burned LP tokens are removed
    let burned = mint.supply == 0;

    info!(
        "🔥 Liquidity Burned Check ({}ms): Total Supply = {}",
        start.elapsed().as_millis(),
        mint.supply
    );

    Ok(burned)
}

/// Check for holder concentration (whale vulnerability)
async fn check_holder_concentration(client: &RpcClient, token_address: &Pubkey) -> Result<bool> {
    let start = Instant::now();
    
    // Get token accounts by owner
    let token_accounts = client.get_token_accounts_by_owner(
        token_address,
        solana_client::rpc_request::TokenAccountsFilter::Mint(*token_address),
    ).map_err(|e| anyhow!("Failed to fetch token accounts: {}", e))?;

    if token_accounts.is_empty() {
        info!(
            "👥 Holder Concentration Check ({}ms): No token accounts found",
            start.elapsed().as_millis()
        );
        return Ok(false);
    }

    let account = client.get_account(token_address)
        .map_err(|e| anyhow!("Failed to fetch account: {}", e))?;

    let mint = Mint::unpack(&account.data)
        .map_err(|e| anyhow!("Failed to parse mint data: {}", e))?;

    let total_supply = mint.supply as f64;

    // Check if top holder has more than 30% of supply
    let mut max_balance = 0u64;
    for token_account_pk in token_accounts {
        let account_data = client.get_account(&token_account_pk)
            .map_err(|e| anyhow!("Failed to fetch token account: {}", e))?;
        
        let token_account = Account::unpack(&account_data.data)
            .map_err(|e| anyhow!("Failed to parse token account: {}", e))?;
        
        if token_account.amount > max_balance {
            max_balance = token_account.amount;
        }
    }

    let concentration = (max_balance as f64 / total_supply) * 100.0;
    let is_concentrated = concentration > 30.0;

    info!(
        "👥 Holder Concentration Check ({}ms): Top holder = {:.2}% {}",
        start.elapsed().as_millis(),
        concentration,
        if is_concentrated { "⚠️ CONCENTRATED" } else { "✅ Distributed" }
    );

    Ok(is_concentrated)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_validator_initialization() {
        let validator = FastPathValidator::new(
            "https://api.mainnet-beta.solana.com".to_string(),
            4,
        );
        assert_eq!(validator.parallelism, 4);
    }

    #[tokio::test]
    async fn test_invalid_token_address() {
        let validator = FastPathValidator::new(
            "https://api.mainnet-beta.solana.com".to_string(),
            4,
        );
        
        let result = validator.validate_token("invalid_address").await;
        assert!(result.is_ok());
        
        let validation = result.unwrap();
        assert!(!validation.go_no_go);
        assert_eq!(validation.risk_score, 100);
    }
}
