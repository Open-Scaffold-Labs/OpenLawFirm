import React from 'react';

/**
 * OpenLawFirm branded logo — scales of justice wrapper around sacred cube.
 * Renders inline SVG for crisp display at any size. Use collapsed prop
 * to show icon-only version in collapsed sidebar.
 */
export default function AppLogo({ collapsed = false, className = '' }) {
  if (collapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 160 160" className="drop-shadow-sm">
          {/* Sacred cube core */}
          <polygon points="80,38 115,55 115,100 80,117" fill="#52525b" stroke="#71717a" strokeWidth="1.5"/>
          <polygon points="80,38 45,55 45,100 80,117" fill="#3f3f46" stroke="#71717a" strokeWidth="1.5"/>
          <polygon points="80,38 115,55 80,72 45,55" fill="#71717a" stroke="#71717a" strokeWidth="1.5"/>
          <line x1="90" y1="47" x2="90" y2="108" stroke="#818cf8" strokeWidth="1.5" opacity="0.7"/>
          <line x1="70" y1="47" x2="70" y2="108" stroke="#818cf8" strokeWidth="1.5" opacity="0.7"/>
          <line x1="50" y1="78" x2="110" y2="78" stroke="#818cf8" strokeWidth="1.5" opacity="0.6"/>
          <path d="M50 68 Q70 60 90 68 Q105 73 110 66" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="70" cy="78" r="2.5" fill="#f59e0b"/>
          <circle cx="90" cy="78" r="2.5" fill="#f59e0b"/>
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo mark */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-law-700/20 to-law-900/30 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg shadow-black/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 160 160">
            {/* Wrapper: Scales */}
            <line x1="80" y1="10" x2="80" y2="30" stroke="#c4b5fd" strokeWidth="2" opacity="0.6"/>
            <line x1="40" y1="24" x2="120" y2="24" stroke="#c4b5fd" strokeWidth="2" opacity="0.6" strokeLinecap="round"/>
            <path d="M28 36 Q40 30 52 36" fill="none" stroke="#c4b5fd" strokeWidth="1.5" opacity="0.5"/>
            <path d="M108 36 Q120 30 132 36" fill="none" stroke="#c4b5fd" strokeWidth="1.5" opacity="0.5"/>
            <circle cx="80" cy="10" r="3" fill="#c4b5fd" opacity="0.6"/>
            {/* Sacred cube */}
            <polygon points="80,38 115,55 115,100 80,117" fill="#52525b" stroke="#71717a" strokeWidth="1.5"/>
            <polygon points="80,38 45,55 45,100 80,117" fill="#3f3f46" stroke="#71717a" strokeWidth="1.5"/>
            <polygon points="80,38 115,55 80,72 45,55" fill="#71717a" stroke="#71717a" strokeWidth="1.5"/>
            <line x1="90" y1="47" x2="90" y2="108" stroke="#818cf8" strokeWidth="1.5" opacity="0.7"/>
            <line x1="70" y1="47" x2="70" y2="108" stroke="#818cf8" strokeWidth="1.5" opacity="0.7"/>
            <line x1="50" y1="78" x2="110" y2="78" stroke="#818cf8" strokeWidth="1.5" opacity="0.6"/>
            <path d="M50 68 Q70 60 90 68 Q105 73 110 66" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="70" cy="78" r="2.5" fill="#f59e0b"/>
            <circle cx="90" cy="78" r="2.5" fill="#f59e0b"/>
          </svg>
        </div>
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-xl bg-law-500/20 blur-md -z-10" />
      </div>

      {/* Text branding */}
      <div className="min-w-0">
        <div className="text-white font-bold text-sm leading-tight tracking-tight">
          Open<span className="text-law-300">LawFirm</span>
        </div>
        <div className="text-law-400 text-[10px] font-medium tracking-wider uppercase">
          Practice Management
        </div>
      </div>
    </div>
  );
}
