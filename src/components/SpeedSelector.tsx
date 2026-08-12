import React, { useState, useRef, useEffect } from 'react';
import { Gauge, Check } from 'lucide-react';

type SpeedSelectorProps = {
  speed: number;
  onChange: (s: number) => void;
};

export const SpeedSelector = React.memo(({ speed, onChange }: SpeedSelectorProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 12px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 700,
          border: `1px solid ${speed !== 1 ? "rgba(226,221,217,0.2)" : "rgba(255,255,255,0.12)"}`,
          background: speed !== 1 ? "rgba(226,221,217,0.07)" : "transparent",
          cursor: "pointer",
          color: speed !== 1 ? "rgba(226,221,217,0.9)" : "rgba(255,255,255,0.5)",
          transition: "all .12s"
        }}
      >
        <Gauge size={11} />
        {speed}x
      </button>
      {open && (
        <div
          className="v-glass-popover"
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            borderRadius: "18px",
            padding: "6px",
            boxShadow: "0 20px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.08)",
            zIndex: 100,
            minWidth: "170px",
            animation: "speedPopoverDropIn 0.16s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "4px" }}>
            <Gauge size={11} style={{ color: "var(--v-fg2)", opacity: 0.7 }} />
            <span style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--v-fg2)" }}>Playback Speed</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {speeds.map(s => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: speed === s ? 700 : 500,
                  border: "none",
                  borderRadius: "9999px",
                  background: speed === s ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  cursor: "pointer",
                  color: speed === s ? "#ffffff" : "var(--v-fg2)",
                  transition: "all 0.12s ease"
                }}
                onMouseEnter={e => {
                  if (speed !== s) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.05)";
                    (e.currentTarget as HTMLElement).style.color = "#ffffff";
                  }
                }}
                onMouseLeave={e => {
                  if (speed !== s) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--v-fg2)";
                  }
                }}
              >
                <span>{s}× {s === 1 && <span style={{ opacity: 0.5, fontSize: "10.5px", fontWeight: 400, marginLeft: "4px" }}>(Normal)</span>}</span>
                {speed === s && <Check size={13} style={{ color: "var(--v-accent)" }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SpeedSelector.displayName = 'SpeedSelector';
