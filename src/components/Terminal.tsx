import { useEffect, useRef } from "react";
import { EngineLog } from "../types";

interface TerminalProps {
  logs: EngineLog[];
}

export function Terminal({ logs }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getColor = (type: string) => {
    switch (type) {
      case "signal": return "text-cyan-400";
      case "audit": return "text-purple-400";
      case "execution": return "text-orange-400";
      case "success": return "text-green-400";
      case "warning": return "text-yellow-400";
      case "error": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/90 border border-gray-800 rounded-lg overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-bottom border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-gray-300 font-bold tracking-tight">LIVE TERMINAL [SIDE_CAR_V2]</span>
        </div>
        <span className="text-gray-500">WS://KATANA_SYNC_01</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-800"
      >
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Waiting for engine initialization...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 leading-relaxed">
            <span className="text-gray-600 shrink-0">[{new Date().toLocaleTimeString()}]:</span>
            <span className={getColor(log.type)}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
