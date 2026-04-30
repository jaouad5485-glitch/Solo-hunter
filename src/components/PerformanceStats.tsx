import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Trade } from '../types';

interface StatsProps {
  trades: Trade[];
}

export function PerformanceStats({ trades }: StatsProps) {
  const data = trades.map((t, i) => ({
    name: i,
    val: t.profit,
    cumulative: trades.slice(0, i + 1).reduce((acc, curr) => acc + Number(curr.profit), 0).toFixed(4)
  }));

  return (
    <div className="bg-black/40 border border-gray-800 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-gray-200 font-medium mb-4 flex items-center justify-between">
        Profit Analytics (SOL)
        <span className="text-[10px] text-cyan-500 uppercase tracking-widest bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/50">
          Real-time
        </span>
      </h3>
      
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis dataKey="name" hide />
            <YAxis 
              hide
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '4px' }}
              itemStyle={{ color: '#22d3ee' }}
            />
            <Area 
              type="monotone" 
              dataKey="cumulative" 
              stroke="#22d3ee" 
              fillOpacity={1} 
              fill="url(#colorProfit)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-800">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Net Profit</span>
          <span className="text-cyan-400 font-mono text-lg">
            {trades.reduce((acc, curr) => acc + Number(curr.profit), 0).toFixed(3)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Win Rate</span>
          <span className="text-gray-200 font-mono text-lg">
            {trades.length ? ((trades.filter(t => t.profit > 0).length / trades.length) * 100).toFixed(0) : 0}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Latency</span>
          <span className="text-gray-200 font-mono text-lg">
            24ms
          </span>
        </div>
      </div>
    </div>
  );
}
