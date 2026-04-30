export enum TradeStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  SIMULATED = "SIMULATED",
}

export interface Trade {
  id: string;
  tokenAddress: string;
  symbol: string;
  timestamp: string;
  status: TradeStatus;
  profit: number;
  buyPrice?: number;
  sellPrice?: number;
  riskScore: number;
  logs: string[];
}

export interface BotSettings {
  jitoEnabled: boolean;
  rustSidecarEnabled: boolean;
  simulationMode: boolean;
  maxRisk: number;
  priorityFee: number;
  solAmount: number;
}

export interface EngineLog {
  type: "info" | "signal" | "audit" | "execution" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
}
