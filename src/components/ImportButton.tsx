import { useState, useRef, useEffect } from 'react';
import { PlusCircle, ChevronDown, FileOutput } from 'lucide-react';

type ImportButtonProps = {
  onSpotify: () => void;
  onYoutube: () => void;
  onM3u: () => void;
};

export function ImportButton({ onSpotify, onYoutube, onM3u }: ImportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ marginTop: '12px', flexShrink: 0, position: 'relative', width: '100%' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          borderRadius: '8px',
          border: `1px solid ${open ? 'var(--v-bdr3)' : 'var(--v-bdr2)'}`,
          padding: '7px 11px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: open ? 'rgba(226,221,217,0.04)' : 'transparent',
          color: open ? '#e2ddd9' : '#5c5755',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          transition: 'all .12s'
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--v-bdr3)';
            e.currentTarget.style.color = '#9e9894';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--v-bdr2)';
            e.currentTarget.style.color = '#5c5755';
          }
        }}
      >
        <PlusCircle size={13} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Import Playlist</span>
        <ChevronDown size={12} style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: '6px',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--v-bg1)',
            border: '1px solid var(--v-bdr)',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
            animation: 'fadeUpSm 0.15s ease-out',
            zIndex: 9999
          }}
        >
          {[
            {
              label: 'From Spotify',
              icon: (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#1DB954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              ),
              action: () => { onSpotify(); setOpen(false); }
            },
            {
              label: 'From YouTube',
              icon: (
                <svg width="13" height="11" viewBox="0 0 18 14" fill="#ef4444">
                  <path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z" />
                </svg>
              ),
              action: () => { onYoutube(); setOpen(false); }
            },
            {
              label: 'From M3U File',
              icon: <FileOutput size={13} style={{ color: '#9e9894' }} />,
              action: () => { onM3u(); setOpen(false); }
            },
          ].map(({ label, icon, action }, idx) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: '100%',
                border: 'none',
                borderTop: idx !== 0 ? '1px solid var(--v-bdr)' : 'none',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'transparent',
                color: '#9e9894',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                textAlign: 'left',
                whiteSpace: 'nowrap',
                transition: 'background .15s, color .15s'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                (e.currentTarget as HTMLElement).style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = '#9e9894';
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', flexShrink: 0 }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
