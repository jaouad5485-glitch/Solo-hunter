import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Terminal } from "./Terminal";
import { TradeHistory } from "./TradeHistory";
import { PerformanceStats } from "./PerformanceStats";
import { SettingsPanel } from "./SettingsPanel";
import { Trade, BotSettings, EngineLog, TradeStatus } from "../types";
import { Activity, Radio, Cpu, Wallet, Power, ShieldAlert, LogIn } from "lucide-react";
import { collection, addDoc, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../lib/firebase";

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<EngineLog[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isSniping, setIsSniping] = useState(false);
  const [settings, setSettings] = useState<BotSettings>({
    jitoEnabled: true,
    rustSidecarEnabled: false,
    simulationMode: true,
    maxRisk: 45,
    priorityFee: 0.005,
    solAmount: 1.0,
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("log", (log: EngineLog) => {
      setLogs((prev) => [...prev.slice(-100), { ...log, timestamp: new Date().toISOString() }]);
    });

    newSocket.on("trade-result", async (tradeData: Partial<Trade>) => {
      if (!auth.currentUser) return;

      const trade: any = {
        ownerId: auth.currentUser.uid,
        tokenAddress: tradeData.tokenAddress || "",
        symbol: tradeData.symbol || "UNKNOWN",
        timestamp: tradeData.timestamp || new Date().toISOString(),
        status: tradeData.status as TradeStatus,
        profit: Number(tradeData.profit) || 0,
        riskScore: tradeData.riskScore || 0,
        logs: [],
      };
      
      try {
        await addDoc(collection(db, "trades"), trade);
      } catch (err) {
        console.error("Failed to persist trade:", err);
      }
    });

    return () => {
      newSocket.close();
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setTrades([]);
      return;
    }

    const q = query(
      collection(db, "trades"), 
      where("ownerId", "==", user.uid),
      orderBy("timestamp", "desc"), 
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tradesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setTrades(tradesList);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const toggleSniping = () => {
    if (!socket || !user) return;
    if (isSniping) {
      socket.emit("stop-sniping");
      setIsSniping(false);
    } else {
      socket.emit("start-sniping");
      setIsSniping(true);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <div className="mx-auto w-16 h-16 bg-cyan-500 rounded transform rotate-45 flex items-center justify-center">
              <Radio className="w-8 h-8 text-black transform -rotate-45" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter text-white">KATANA SOL</h1>
            <p className="text-cyan-500 font-mono text-xs tracking-[0.2em] uppercase">Authentication Required</p>
          </div>
          
          <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-2xl backdrop-blur-xl">
             <p className="text-gray-400 text-sm mb-8 leading-relaxed">
               Welcome to Katana. Access to the high-frequency execution engine requires institutional verification.
             </p>
             <button 
                onClick={handleLogin}
                className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
             >
                <LogIn className="w-4 h-4" /> Sign in with Google
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 selection:bg-cyan-500/30">
      {/* Header Navigation */}
      <nav className="border-b border-gray-800 bg-[#0a0a0a] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500 p-2 rounded transform rotate-45">
            <Radio className="w-5 h-5 text-black transform -rotate-45" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-white">KATANA SOL HUNTER</h1>
            <p className="text-[10px] text-cyan-500 font-mono tracking-widest uppercase">Institutional AI Sniper v2.1</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-gray-500 uppercase tracking-tighter">Status</span>
            <span className="flex items-center gap-1.5 text-green-400">
              <Activity className="w-3 h-3" /> ENGINE_READY
            </span>
          </div>
          <div className="flex flex-col border-l border-gray-800 pl-8">
            <span className="text-gray-500 uppercase tracking-tighter">Latency</span>
            <span className="text-white">12ms</span>
          </div>
          <div className="flex flex-col border-l border-gray-800 pl-8">
            <span className="text-gray-500 uppercase tracking-tighter">Wallet</span>
            <span className="flex items-center gap-1.5 text-gray-300">
              <Wallet className="w-3 h-3" /> 14.52 SOL
            </span>
          </div>
        </div>

        <button 
          onClick={toggleSniping}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all text-xs tracking-wider uppercase ${
            isSniping 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
              : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]'
          }`}
        >
          <Power className="w-4 h-4" />
          {isSniping ? 'Stop Engine' : 'Initialize Sniper'}
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="p-6 grid grid-cols-12 gap-6 max-w-[1600px] mx-auto">
        
        {/* Left Column: Logs & Terminal */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 ">
          <div className="h-[450px]">
            <Terminal logs={logs} />
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[350px]">
             <TradeHistory trades={trades} />
             <PerformanceStats trades={trades} />
          </div>
        </div>

        {/* Right Column: Settings & Risk */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-cyan-950/20 border border-cyan-900/50 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              <div>
                <h4 className="text-sm font-bold text-gray-200">Anti-Scam Logic Active</h4>
                <p className="text-[10px] text-gray-500 italic">Advanced authority & freeze check enabled</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-black/40 border border-gray-800 p-2 rounded">
                 <span className="block text-[10px] text-gray-500 uppercase">Success Rate</span>
                 <span className="text-cyan-400 font-mono">92.4%</span>
              </div>
              <div className="bg-black/40 border border-gray-800 p-2 rounded">
                <span className="block text-[10px] text-gray-500 uppercase">MEV Avoided</span>
                <span className="text-orange-400 font-mono">142</span>
              </div>
            </div>
          </div>
          
          <SettingsPanel settings={settings} setSettings={setSettings} />
          
          <div className="bg-black/40 border border-gray-800 rounded-lg p-4 flex-1">
             <h3 className="text-gray-200 font-medium mb-3">AI Intelligence Logs</h3>
             <div className="space-y-3 opacity-60">
                <div className="border-l-2 border-cyan-500 pl-3">
                   <p className="text-[10px] text-gray-400">Gemini-3 Pro analyzing developer wallets...</p>
                   <p className="text-[9px] text-cyan-600 font-mono">HASH: 4x82...a90z</p>
                </div>
                <div className="border-l-2 border-gray-800 pl-3">
                   <p className="text-[10px] text-gray-400">Memory optimization: Cleaning buffer...</p>
                   <p className="text-[9px] text-gray-600 font-mono">SIZE: 142MB</p>
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-gray-800 px-6 py-2 flex items-center justify-between text-[10px] font-mono text-gray-500 z-50">
        <div className="flex gap-6">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> RPC: MAINNET-LATENCY-4MS</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> SOCKET: ACTIVE</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> SIDECAR: IDLE</span>
        </div>
        <div className="flex gap-4">
          <span>VERSION: 2.1.0-STABLE</span>
          <span>© 2026 KATANA PROTOCOL</span>
        </div>
      </footer>
    </div>
  );
}
