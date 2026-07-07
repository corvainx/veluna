import React, { useState, useRef, useEffect } from 'react';
import { Gauge } from 'lucide-react';

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
          padding: "5px 8px",
          borderRadius: "7px",
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
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--v-bg2)",
            border: "1px solid var(--v-bdr2)",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: "0 12px 36px rgba(0,0,0,0.85)",
            zIndex: 50,
            minWidth: "200px",
            animation: "dropIn 0.12s ease-out"
          }}
        >
          <p style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#363230", padding: "8px 12px 4px" }}>Speed</p>
          {speeds.map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "7px 12px",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                background: speed === s ? "rgba(226,221,217,0.06)" : "transparent",
                cursor: "pointer",
                color: speed === s ? "rgba(226,221,217,0.9)" : "rgba(255,255,255,0.45)",
                transition: "background .08s,color .08s"
              }}
              onMouseEnter={e => {
                if (speed !== s) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
                }
              }}
              onMouseLeave={e => {
                if (speed !== s) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
                }
              }}
            >
              {s}× {s === 1 && <span style={{ color: "#363230", fontSize: "10px", fontWeight: 400, marginLeft: "4px" }}>normal</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

SpeedSelector.displayName = 'SpeedSelector';
