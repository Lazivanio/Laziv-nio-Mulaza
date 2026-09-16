import React from 'react';

export const FloatingBubbles: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* ----------------- LEFT LATERAL BUBBLES ----------------- */}
      {/* White Bubble 1 (Top Left) */}
      <div 
        className="absolute top-12 left-4 sm:left-12 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/40 border border-white/80 shadow-[0_8px_30px_rgba(255,255,255,0.35)] backdrop-blur-[2px] animate-bubble-slow-1"
      >
        <div className="absolute top-3 left-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/60 blur-[1px]" />
      </div>

      {/* Dark Blue Bubble 1 (Upper-Mid Left) */}
      <div 
        className="absolute top-44 left-8 sm:left-24 w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[#0a192f]/55 border border-blue-900/50 shadow-[0_12px_32px_rgba(10,25,47,0.35)] backdrop-blur-[1px] animate-bubble-slow-2"
      >
        <div className="absolute top-2.5 left-3.5 w-5 h-5 rounded-full bg-blue-300/30 blur-[1px]" />
      </div>

      {/* White Bubble 2 (Mid Left - Crisp) */}
      <div 
        className="absolute top-[52%] left-3 sm:left-16 w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/55 border-2 border-white/90 shadow-[0_6px_25px_rgba(255,255,255,0.4)] animate-bubble-slow-4"
      >
        <div className="absolute top-2 left-2.5 w-4 h-4 rounded-full bg-white/80" />
      </div>

      {/* Dark Blue Bubble 2 (Lower Left - Large Deep) */}
      <div 
        className="absolute bottom-16 left-6 sm:left-20 w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-[#071326]/50 border border-blue-950/40 shadow-[0_16px_40px_rgba(7,19,38,0.4)] backdrop-blur-[2px] animate-bubble-slow-3"
      >
        <div className="absolute top-4 left-5 w-8 h-8 rounded-full bg-cyan-400/20 blur-[2px]" />
      </div>

      {/* Tiny White Bubble (Mid-Left Ambient) */}
      <div 
        className="absolute top-[34%] left-24 sm:left-36 w-8 h-8 rounded-full bg-white/60 border border-white shadow-sm animate-bubble-slow-5"
      />

      {/* Dark Blue Bubble 3 (Bottom Left Edge) */}
      <div 
        className="absolute bottom-4 left-2 sm:left-6 w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-[#0f172a]/45 border border-blue-900/40 shadow-lg animate-bubble-slow-6"
      >
        <div className="absolute top-2 left-2.5 w-3.5 h-3.5 rounded-full bg-blue-400/25" />
      </div>


      {/* ----------------- RIGHT LATERAL BUBBLES ----------------- */}
      {/* Dark Blue Bubble 4 (Top Right) */}
      <div 
        className="absolute top-14 right-6 sm:right-16 w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-[#0a192f]/50 border border-blue-900/50 shadow-[0_12px_32px_rgba(10,25,47,0.35)] backdrop-blur-[2px] animate-bubble-slow-3"
      >
        <div className="absolute top-3.5 left-4.5 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-blue-300/30 blur-[1px]" />
      </div>

      {/* White Bubble 3 (Upper-Mid Right) */}
      <div 
        className="absolute top-52 right-8 sm:right-28 w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-white/45 border border-white/80 shadow-[0_8px_30px_rgba(255,255,255,0.35)] backdrop-blur-[1px] animate-bubble-slow-1"
      >
        <div className="absolute top-2.5 left-3.5 w-5 h-5 rounded-full bg-white/70 blur-[1px]" />
      </div>

      {/* Dark Blue Bubble 5 (Mid Right) */}
      <div 
        className="absolute top-[56%] right-3 sm:right-14 w-18 h-18 sm:w-24 sm:h-24 rounded-full bg-[#071326]/55 border border-blue-950/50 shadow-xl animate-bubble-slow-4"
      >
        <div className="absolute top-2.5 left-3 w-4.5 h-4.5 rounded-full bg-cyan-300/20" />
      </div>

      {/* White Bubble 4 (Bottom Right - Soft & Radiant) */}
      <div 
        className="absolute bottom-20 right-8 sm:right-24 w-28 h-28 sm:w-40 sm:h-40 rounded-full bg-white/40 border border-white/70 shadow-[0_16px_40px_rgba(255,255,255,0.3)] backdrop-blur-[2px] animate-bubble-slow-2"
      >
        <div className="absolute top-4 left-5 w-8 h-8 rounded-full bg-white/60 blur-[1px]" />
      </div>

      {/* Small Dark Blue Bubble (Mid-Right Ambient) */}
      <div 
        className="absolute top-[38%] right-24 sm:right-40 w-9 h-9 rounded-full bg-[#0a192f]/60 border border-blue-900/60 shadow-md animate-bubble-slow-5"
      />

      {/* White Bubble 5 (Bottom Right Edge) */}
      <div 
        className="absolute bottom-6 right-2 sm:right-8 w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-white/60 border-2 border-white shadow-md animate-bubble-slow-6"
      >
        <div className="absolute top-1.5 left-2 w-3 h-3 rounded-full bg-white/90" />
      </div>
    </div>
  );
};
