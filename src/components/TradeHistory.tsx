import { Trade } from "../types";
import { formatAddress } from "../lib/utils";
import { TrendingUp, TrendingDown, Clock, ShieldCheck } from "lucide-react";

interface TradeHistoryProps {
  trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  return (
    <div className="bg-black/40 border border-gray-800 rounded-lg overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-gray-200 font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-500" />
          Recent Snipes
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="p-10 text-center text-gray-600">No trades captured in this session.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-900/90 backdrop-blur z-10">
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
                <th className="px-4 py-2">Asset</th>
                <th className="px-4 py-2">Profit</th>
                <th className="px-4 py-2">Risk</th>
                <th className="px-4 py-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="text-sm font-mono">
              {trades.map((trade) => (
                <tr 
                  key={trade.id} 
                  className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-gray-200 font-bold">{trade.symbol}</span>
                      <span className="text-[10px] text-gray-500">{formatAddress(trade.tokenAddress)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={trade.profit >= 0 ? "text-green-500" : "text-red-500"}>
                      {trade.profit >= 0 ? "+" : ""}{trade.profit} SOL
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className={`w-1 h-3 rounded-full ${trade.riskScore < 50 ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-gray-400">{trade.riskScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
