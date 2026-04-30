import { BotSettings } from "../types";
import { Zap, Cpu, Shield, Search } from "lucide-react";

interface SettingsPanelProps {
  settings: BotSettings;
  setSettings: (settings: BotSettings) => void;
}

export function SettingsPanel({ settings, setSettings }: SettingsPanelProps) {
  const toggle = (key: keyof BotSettings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-6">
      <h3 className="text-gray-200 font-medium border-b border-gray-800 pb-2">Bot Infrastructure</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${settings.jitoEnabled ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gray-800/40 text-gray-500'}`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-200 font-medium">Jito Bundle Protocol</p>
              <p className="text-[10px] text-gray-500">Atomic execution & Anti-MEV</p>
            </div>
          </div>
          <button 
            onClick={() => toggle('jitoEnabled')}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.jitoEnabled ? 'bg-cyan-500' : 'bg-gray-700'}`}
          >
            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.jitoEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${settings.rustSidecarEnabled ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800/40 text-gray-500'}`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-200 font-medium">Rust Core Sidecar</p>
              <p className="text-[10px] text-gray-500">Off-loop cryptographic signing</p>
            </div>
          </div>
          <button 
             onClick={() => toggle('rustSidecarEnabled')}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.rustSidecarEnabled ? 'bg-purple-500' : 'bg-gray-700'}`}
          >
             <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.rustSidecarEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${settings.simulationMode ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-800/40 text-gray-500'}`}>
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-200 font-medium">Pre-Trade Simulation</p>
              <p className="text-[10px] text-gray-500">Verify honeypot before buy</p>
            </div>
          </div>
          <button 
            onClick={() => toggle('simulationMode')}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.simulationMode ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.simulationMode ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-800">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500">
            <span>Max Risk Threshold</span>
            <span className="text-gray-300">{settings.maxRisk}%</span>
          </div>
          <input 
            type="range" 
            min="10" max="100" step="5"
            value={settings.maxRisk}
            onChange={(e) => setSettings({ ...settings, maxRisk: parseInt(e.target.value) })}
            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500">
            <span>Buy Amount (SOL)</span>
            <span className="text-gray-300">{settings.solAmount} SOL</span>
          </div>
          <input 
             type="range" 
             min="0.1" max="10" step="0.1"
             value={settings.solAmount}
             onChange={(e) => setSettings({ ...settings, solAmount: parseFloat(e.target.value) })}
             className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}
