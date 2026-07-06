import React from 'react';

type WaveformBarProps = {
  waveform: number[];
  progressPercent: number;
  isDragging: boolean;
};

export const WaveformBar = React.memo(({
  waveform,
  progressPercent,
  isDragging,
}: WaveformBarProps) => {
  if (!waveform.length) return null;
  const max = Math.max(...waveform, 0.01);
  return (
    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",gap:"1px",pointerEvents:"none",overflow:"hidden"}}>
      {waveform.map((v, i) => (
        <div key={i} style={{
            flex:1, borderRadius:"1px",
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: (i / waveform.length) * 100 <= progressPercent ? 'var(--v-accent)' : '#232020',
            transition: isDragging ? 'none' : 'background 0.3s',
          }} />
      ))}
    </div>
  );
});

WaveformBar.displayName = 'WaveformBar';
