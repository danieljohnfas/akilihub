'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Activity, CheckCircle2, XCircle, AlertTriangle, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KeyStatus {
  id: string;
  name: string;
  supportsStructured: boolean;
  errorCount: number;
  lastUsed: number;
  totalCalls: number;
  totalErrors: number;
  coolingFor: number;
  available: boolean;
}

interface PoolStatus {
  timestamp: string;
  totalKeys: number;
  availableKeys: number;
  keys: KeyStatus[];
}

export default function AIStatusDashboard() {
  const [status, setStatus] = useState<PoolStatus | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/ai-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setLastRefreshed(new Date());
      }
    } catch (e) {
      console.error('Failed to fetch AI status', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto refresh every 2 seconds
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="animate-pulse font-medium">Initializing Neural Link...</p>
        </div>
      </div>
    );
  }

  const healthPercentage = status.totalKeys > 0 
    ? Math.round((status.availableKeys / status.totalKeys) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-indigo-500/30">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
              <Database className="h-8 w-8 text-indigo-400" />
              AI Pool Telemetry
            </h1>
            <p className="text-zinc-400 mt-2">Real-time monitoring of the distributed extraction cluster.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50 backdrop-blur-md">
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Live Sync</span>
              <span className="text-sm font-mono text-zinc-300">
                {lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 1 }) : '--:--:--'}
              </span>
            </div>
            <div className={`p-2 rounded-full ${isRefreshing ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </div>
          </div>
        </div>

        {/* Global Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Activity className="h-4 w-4" /> System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-zinc-100">{healthPercentage}%</div>
              <p className="text-xs text-zinc-500 mt-1">Available compute nodes</p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Active Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-emerald-400">
                {status.availableKeys} <span className="text-xl text-zinc-500">/ {status.totalKeys}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Currently serving traffic</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-400" /> Total Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-indigo-400">
                {status.keys.reduce((acc, k) => acc + k.totalCalls, 0).toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Total requests routed across all nodes</p>
            </CardContent>
          </Card>
        </div>

        {/* Nodes Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-200">Compute Nodes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status.keys.map((key) => {
              const totalCalls = key.totalCalls || 0;
              const errorRate = totalCalls > 0 ? ((key.totalErrors / totalCalls) * 100).toFixed(1) : 0;
              
              return (
                <div 
                  key={key.id} 
                  className={`relative p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
                    key.available 
                      ? 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700' 
                      : 'bg-red-950/20 border-red-900/50 shadow-[0_0_30px_-15px_rgba(220,38,38,0.3)]'
                  }`}
                >
                  {/* Status Indicator */}
                  <div className="absolute top-5 right-5 flex items-center gap-2">
                    {key.available ? (
                      <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    ) : (
                      <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/20">
                        Cooling ({key.coolingFor}s)
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-zinc-100 text-lg pr-12 truncate" title={key.name}>
                        {key.name}
                      </h3>
                      <p className="text-xs font-mono text-zinc-500 mt-1">{key.id}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-2 border-y border-zinc-800/50">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Total Calls</p>
                        <p className="font-mono text-sm text-zinc-200">{totalCalls.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Error Rate</p>
                        <p className="font-mono text-sm text-zinc-200">{errorRate}%</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                      <span>Last Used: {key.lastUsed > 0 ? new Date(key.lastUsed).toLocaleTimeString() : 'Never'}</span>
                      {key.errorCount > 0 && (
                        <span className="flex items-center gap-1 text-orange-400">
                          <AlertTriangle className="h-3 w-3" />
                          {key.errorCount} fails
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
