import { useState, useEffect, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { X } from 'lucide-react';
import { Track } from '../../types';
import { cleanArtist } from '../../utils';

type YtImportModalProps = {
  onClose: () => void;
  onSavePlaylist: (name: string, desc: string, tracks: Track[]) => void;
  showToast: (m: string) => void;
};

export function YtImportModal({
  onClose,
  onSavePlaylist,
  showToast,
}: YtImportModalProps) {
  const [phase, setPhase] = useState<'input' | 'loading' | 'done'>('input');
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
      showToast('Please paste a YouTube playlist URL');
      return;
    }
    setPhase('loading');
    try {
      const raw: string = await invoke('import_youtube_playlist', { url: trimmed });
      const lines = raw.trim().split('\n').filter(Boolean);
      const parsed = lines.map(l => {
        const parts = l.split('====');
        if (parts.length < 4) return null;
        const [id, title, duration, thumb, artist, playlistTitle] = parts;
        const idTrim = id?.trim() || '';
        const thumbTrim = thumb?.trim() || '';
        const cover = (thumbTrim && thumbTrim.startsWith('http'))
          ? thumbTrim
          : (idTrim ? `https://i.ytimg.com/vi/${idTrim}/mqdefault.jpg` : '');

        let parsedArtist = artist?.trim() || '';
        if (parsedArtist.toLowerCase().endsWith(' - topic')) {
          parsedArtist = parsedArtist.slice(0, -8).trim();
        }

        return {
          title: title?.trim() || 'Unknown',
          artist: cleanArtist(parsedArtist) || 'Unknown',
          id: idTrim,
          duration: duration?.trim() || '',
          cover,
          playlistTitle: playlistTitle?.trim() || 'YouTube Playlist',
        };
      }).filter((t): t is NonNullable<typeof t> => t !== null && !!t.id);

      if (parsed.length === 0) { showToast('No tracks found'); setPhase('input'); return; }

      const playlistName = parsed[0]?.playlistTitle || 'YouTube Import';
      const tracks: Track[] = parsed.map((r, i) => ({
        id: i, title: r.title, artist: r.artist || 'Unknown',
        duration: r.duration || '', url: `https://youtube.com/watch?v=${r.id}`, cover: r.cover,
      }));

      onSavePlaylist(playlistName, `Imported from YouTube: ${trimmed}`, tracks);
      setPhase('done');
      onClose();
    } catch (e) {
      showToast(`Import failed: ${e}`);
      setPhase('input');
    }
  };

  const isYtUrl = url.includes('youtube.com') || url.includes('youtu.be');

  return (
    <>
    <div className="yt-import-modal-overlay" style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.75)",backdropFilter:"blur(12px)"}} onClick={onClose}>
      <div className="yt-import-modal-container" style={{width:"580px",maxHeight:"86vh",display:"flex",flexDirection:"column",borderRadius:"16px",overflow:"hidden",boxShadow:"0 30px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)",background:"rgba(22, 20, 20, 0.95)",backdropFilter:"blur(20px)"}}
        onClick={e => e.stopPropagation()}>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0
        }}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{width:"30px",height:"30px",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, #ff1e27 0%, #b30c12 100%)",boxShadow:"0 0 10px rgba(255, 30, 39, 0.25)"}}>
              <svg width="15" height="12" viewBox="0 0 18 14" fill="white"><path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/></svg>
            </div>
            <h2 style={{fontSize: "15px", fontWeight: 800, color: "#e2ddd9", margin: 0, letterSpacing: "-0.01em"}}>
              Import YouTube Playlist
            </h2>
          </div>
          <button onClick={onClose}
            onMouseEnter={() => setIsCloseHovered(true)}
            onMouseLeave={() => setIsCloseHovered(false)}
            style={{
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "none",
              background: isCloseHovered ? "rgba(255, 255, 255, 0.06)" : "transparent",
              color: isCloseHovered ? "#fff" : "#5c5755",
              cursor: "pointer",
              transform: isCloseHovered ? "rotate(90deg)" : "none",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            }}>
            <X size={15} />
          </button>
        </div>

        {phase === 'input' && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            padding: "20px 24px 24px 24px",
            gap: "16px",
            boxSizing: "border-box"
          }}>
            <p style={{fontSize: "13px", color: "#9e9894", lineHeight: 1.5, margin: 0}}>
              Paste a YouTube or YouTube Music playlist link to import your tracks.
            </p>

            <div className="yt-import-input-wrapper" style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(255, 255, 255, 0.02)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: isFocused ? "rgba(255, 30, 39, 0.4)" : "rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              padding: "0 16px",
              height: "46px",
              boxShadow: isFocused ? "0 0 16px rgba(255, 30, 39, 0.12)" : "none",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            }}>
              <svg width="15" height="12" viewBox="0 0 18 14" fill={isFocused ? "#ff1e27" : "rgba(255, 255, 255, 0.35)"} style={{flexShrink: 0, transition: "fill 0.25s"}}>
                <path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/>
              </svg>
              <input ref={inputRef} value={url} onChange={e => setUrl(e.target.value)}
                className="yt-import-input"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={e => { if (e.key === 'Enter' && isYtUrl) handleImport(); }}
                placeholder="https://youtube.com/playlist?list=..."
                style={{
                  flex: 1,
                  background: "transparent",
                  backgroundColor: "transparent",
                  fontSize: "13px",
                  color: "#e2ddd9",
                  outlineStyle: "none",
                  outlineWidth: 0,
                  outlineColor: "transparent",
                  borderStyle: "none",
                  borderWidth: 0,
                  borderColor: "transparent",
                  boxShadow: "none",
                  appearance: "none",
                  WebkitAppearance: "none",
                  fontWeight: 500
                }} />
            </div>

            <div style={{
              background: "rgba(255, 255, 255, 0.01)",
              border: "1px solid rgba(255, 255, 255, 0.03)",
              borderRadius: "10px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              {[
                "Playlist must be public or unlisted",
                "Veluna extracts metadata directly from web feeds"
              ].map((tip, i) => (
                <div key={i} style={{display: "flex", gap: "8px", alignItems: "center"}}>
                  <div style={{width: "4px", height: "4px", borderRadius: "50%", background: "#ff1e27"}} />
                  <div style={{fontSize: "11.5px", color: "#9e9894"}}>{tip}</div>
                </div>
              ))}
            </div>

            <button onClick={handleImport}
              disabled={!isYtUrl}
              onMouseEnter={() => setIsBtnHovered(true)}
              onMouseLeave={() => setIsBtnHovered(false)}
              style={{
                width: "100%",
                height: "46px",
                borderRadius: "10px",
                border: "none",
                background: isYtUrl ? "linear-gradient(135deg, #ff1e27 0%, #b30c12 100%)" : "rgba(255,255,255,0.03)",
                color: isYtUrl ? "#fff" : "rgba(255,255,255,0.25)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: !isYtUrl ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: (isYtUrl && isBtnHovered) ? "0 8px 24px rgba(255, 30, 39, 0.35)" : "none",
                transform: (isYtUrl && isBtnHovered) ? "translateY(-1.5px)" : "none",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
              }}>
              <svg width="14" height="11" viewBox="0 0 18 14" fill="currentColor">
                <path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/>
              </svg>
              Import Playlist
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            padding: "24px",
            boxSizing: "border-box",
            overflow: "hidden"
          }}>
            <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px"}}>
              <div style={{width: "14px", height: "14px", border: "2px solid #ff1e27", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite"}} />
              <div style={{fontSize: "12.5px", color: "#e2ddd9", fontWeight: 600}}>
                Fetching playlist metadata...
              </div>
            </div>

            <div style={{display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden"}}>
              {[1, 2, 3, 4].map(key => (
                <div key={key} className="yt-skeleton-card" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.03)"
                }}>
                  <div style={{
                    width: "48px",
                    height: "27px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.06)",
                    flexShrink: 0
                  }} />
                  <div style={{flex: 1, display: "flex", flexDirection: "column", gap: "6px"}}>
                    <div style={{width: "60%", height: "8px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.06)"}} />
                    <div style={{width: "35%", height: "6px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.03)"}} />
                  </div>
                  <div style={{width: "24px", height: "8px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.03)"}} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
