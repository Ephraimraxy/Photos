import { type ReactNode } from "react";

interface WatermarkOverlayProps {
  children: ReactNode;
  text?: string;
}

export function WatermarkOverlay({ children, text = "DOCUEDIT PHOTOS" }: WatermarkOverlayProps) {
  return (
    <div className="relative group overflow-hidden" data-testid="watermark-container">
      {children}
      
      {/* Watermark overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40">
        <div 
          className="text-white/30 font-bold text-2xl md:text-4xl transform rotate-[-45deg] select-none"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          {text}
        </div>
      </div>

      {/* Security overlay to prevent right-click and drag */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        data-testid="security-overlay"
      />
    </div>
  );
}
