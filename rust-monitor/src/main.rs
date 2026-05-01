use solana_client::rpc_client::RpcClient;
use solana_program::pubkey::Pubkey;
use solana_sdk::commitment_config::CommitmentConfig;
use std::str::FromStr;
use std::time::Duration;
use tokio::time::interval;
use serde::{Deserialize, Serialize};
use log::{info, error, warn};

mod token_monitor;
mod transaction_parser;
mod websocket_server;

use token_monitor::TokenMonitor;
use websocket_server::WebSocketServer;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenEvent {
    pub token_address: String,
    pub symbol: String,
    pub name: String,
    pub liquidity: f64,
    pub timestamp: String,
    pub risk_score: u32,
    pub is_new_pool: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();

    info!("🚀 Starting Solana Token Monitor Service...");

    // Initialize Solana RPC Client
    let rpc_url = std::env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".to_string());
    
    let client = RpcClient::new_with_commitment(
        rpc_url.clone(),
        CommitmentConfig::confirmed(),
    );

    info!("📡 Connected to Solana RPC: {}", rpc_url);

    // Initialize Token Monitor
    let mut token_monitor = TokenMonitor::new(client.clone());

    // Initialize WebSocket Server (for communication with frontend)
    let ws_server = WebSocketServer::new("127.0.0.1:8080".to_string());
    let ws_server_clone = ws_server.clone();
    
    tokio::spawn(async move {
        if let Err(e) = ws_server_clone.start().await {
            error!("WebSocket server error: {}", e);
        }
    });

    info!("🔌 WebSocket server listening on ws://127.0.0.1:8080");

    // Main monitoring loop
    let mut monitor_interval = interval(Duration::from_secs(3));

    loop {
        monitor_interval.tick().await;

        match token_monitor.scan_for_new_tokens().await {
            Ok(events) => {
                if !events.is_empty() {
                    info!("🔍 Detected {} new token events", events.len());
                    
                    for event in events {
                        info!(
                            "📊 Token: {} | Liquidity: ${:.2} | Risk: {}/100",
                            event.symbol, event.liquidity, event.risk_score
                        );

                        // Send event to WebSocket clients
                        if let Err(e) = ws_server.broadcast(&event).await {
                            error!("Failed to broadcast event: {}", e);
                        }
                    }
                }
            }
            Err(e) => {
                error!("❌ Error scanning for tokens: {}", e);
            }
        }
    }
}
