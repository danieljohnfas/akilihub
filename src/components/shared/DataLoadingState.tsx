import React from 'react';

interface DataLoadingStateProps {
  title?: string;
  subtitle?: string;
  cardCount?: number;
  layout?: 'grid' | 'list';
}

export function DataLoadingState({
  title = 'Scanning Regional Database...',
  subtitle = 'Filtering verified data across Kenya, Tanzania, Uganda, Rwanda, Ethiopia, DRC & the wider region.',
  cardCount = 6,
  layout = 'grid',
}: DataLoadingStateProps) {
  return (
    <div className="w-full py-8 space-y-8 animate-in fade-in duration-300">
      {/* Central Visual Intelligence Scanner */}
      <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 relative overflow-hidden backdrop-blur-md">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-cyan-500/20 via-primary/25 to-emerald-500/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
        
        {/* Animated Scanner Graphic */}
        <div className="relative w-28 h-28 mb-5 flex items-center justify-center">
          {/* Outer Rotating Radar Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/30 animate-[spin_8s_linear_infinite]" />
          
          {/* Inner Counter-Rotating Ring */}
          <div className="absolute inset-2 rounded-full border border-emerald-400/40 animate-[spin_5s_linear_infinite_reverse]" />
          
          {/* Pulsing Ripple Rings */}
          <div className="absolute inset-4 rounded-full border border-primary/50 animate-ping opacity-25" />
          
          {/* Central Holographic Core */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-primary to-emerald-400 p-0.5 shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center">
            <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center backdrop-blur-sm">
              <svg 
                className="w-7 h-7 text-cyan-300 animate-pulse" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                {/* Brain / Intelligence Node Icon */}
                <path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0-3 3.87 4 4 0 0 0 2 3.46V15a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4v-.67a4 4 0 0 0 2-3.46 4 4 0 0 0-3-3.87V6a4 4 0 0 0-4-4z" />
                <path d="M9 12h6" />
                <path d="M12 9v6" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Orbiting Satellite Particle */}
          <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9] -top-1 left-1/2 -translate-x-1/2" />
          </div>
        </div>

        {/* Text Details & Live Status */}
        <div className="space-y-2 max-w-md mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Live Filtering
          </div>
          <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Shimmer Progress Track */}
        <div className="w-48 h-1 bg-white/10 rounded-full mt-5 overflow-hidden relative">
          <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>

      {/* Synchronized Skeleton Card Grid */}
      <div className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div 
            key={i} 
            className="p-6 rounded-xl border border-white/5 bg-white/[0.02] space-y-4 relative overflow-hidden backdrop-blur-sm"
          >
            {/* Shimmer Wave Overlay */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[shimmer_2s_infinite]" />
            
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-white/10 rounded-md w-3/4 animate-pulse" />
                <div className="h-4 bg-white/5 rounded-md w-1/2 animate-pulse" />
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/10 shrink-0 animate-pulse" />
            </div>

            <div className="space-y-2 pt-2">
              <div className="h-3 bg-white/5 rounded w-full animate-pulse" />
              <div className="h-3 bg-white/5 rounded w-5/6 animate-pulse" />
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/5">
              <div className="h-6 w-16 bg-white/10 rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
              <div className="h-6 w-14 bg-white/10 rounded-full ml-auto animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
