import { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { X } from 'lucide-react';
import { Track } from '../types';

type MetadataEditModalProps = {
  track: Track;
  onSave: (title: string, artist: string, album: string) => Promise<void>;
  onClose: () => void;
};

export function MetadataEditModal({
  track,
  onSave,
  onClose
}: MetadataEditModalProps) {
  const [title, setTitle] = useState(track.title || '');
  const [artist, setArtist] = useState(track.artist || '');
  const [album, setAlbum] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'title' | 'artist' | 'album' | null>(null);
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [isCancelHovered, setIsCancelHovered] = useState(false);
  const [isSaveHovered, setIsSaveHovered] = useState(false);

  useEffect(() => {
    const path = track.url.substring(8);
    invoke<{ album: string }>('get_audio_metadata', { path })
      .then(m => {
        if (m.album) setAlbum(m.album);
      })
      .catch(() => {});
  }, [track]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onSave(title.trim(), artist.trim(), album.trim());
      onClose();
    } catch {}
    setLoading(false);
  };

  return (
    <div className="yt-import-modal-overlay" style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 16px 100px 16px",background:"rgba(0,0,0,0.85)"}} onClick={onClose}>
      <div className="yt-import-modal-container" style={{width:"420px",maxHeight:"calc(100vh - 120px)",borderRadius:"16px",overflow:"hidden",boxShadow:"0 16px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)",background:"var(--v-bg2)"}} onClick={e => e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"20px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.01)"}}>
          <div style={{flex:1}}>
            <h2 style={{fontSize:"15px",fontWeight:800,color:"#e2ddd9",margin:0,letterSpacing:"-0.01em"}}>Edit Metadata</h2>
            <p style={{fontSize:"11.5px",color:"#8a817c",margin:"2px 0 0 0",lineHeight:1.2}}>Update ID3 audio tags on this file.</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width:"28px",
              height:"28px",
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              borderRadius:"50%",
              border:"none",
              background:isCloseHovered?"rgba(255, 255, 255, 0.08)":"transparent",
              color:isCloseHovered?"#fff":"#8a817c",
              cursor:"pointer",
              transition:"all 0.2s ease"
            }}
            onMouseEnter={() => setIsCloseHovered(true)}
            onMouseLeave={() => setIsCloseHovered(false)}
          >
            <X size={15} />
          </button>
        </div>
        <div style={{padding:"24px",display:"flex",flexDirection:"column",gap:"16px"}}>
          <div>
            <label style={{display:"block",fontSize:"10px",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#8a817c",marginBottom:"6px"}}>Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} disabled={loading}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
              onKeyDown={e => { if (e.key === 'Enter' && title.trim() && !loading) handleSave(); }}
              style={{
                width:"100%",
                background:"rgba(28, 26, 26, 0.6)",
                border:`1px solid ${focusedField==='title'?'#e2ddd9':'var(--v-bdr2)'}`,
                boxShadow:focusedField==='title'?'0 0 0 2px rgba(226, 221, 217, 0.15)':'none',
                color:"#e2ddd9",
                borderRadius:"8px",
                padding:"10px 12px",
                fontSize:"13px",
                outline:"none",
                transition:"all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxSizing:"border-box"
              }}
            />
          </div>
          <div>
            <label style={{display:"block",fontSize:"10px",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#8a817c",marginBottom:"6px"}}>Artist</label>
            <input value={artist} onChange={e=>setArtist(e.target.value)} disabled={loading}
              onFocus={() => setFocusedField('artist')}
              onBlur={() => setFocusedField(null)}
              onKeyDown={e => { if (e.key === 'Enter' && title.trim() && !loading) handleSave(); }}
              style={{
                width:"100%",
                background:"rgba(28, 26, 26, 0.6)",
                border:`1px solid ${focusedField==='artist'?'#e2ddd9':'var(--v-bdr2)'}`,
                boxShadow:focusedField==='artist'?'0 0 0 2px rgba(226, 221, 217, 0.15)':'none',
                color:"#e2ddd9",
                borderRadius:"8px",
                padding:"10px 12px",
                fontSize:"13px",
                outline:"none",
                transition:"all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxSizing:"border-box"
              }}
            />
          </div>
          <div>
            <label style={{display:"block",fontSize:"10px",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#8a817c",marginBottom:"6px"}}>Album</label>
            <input value={album} onChange={e=>setAlbum(e.target.value)} disabled={loading}
              onFocus={() => setFocusedField('album')}
              onBlur={() => setFocusedField(null)}
              onKeyDown={e => { if (e.key === 'Enter' && title.trim() && !loading) handleSave(); }}
              style={{
                width:"100%",
                background:"rgba(28, 26, 26, 0.6)",
                border:`1px solid ${focusedField==='album'?'#e2ddd9':'var(--v-bdr2)'}`,
                boxShadow:focusedField==='album'?'0 0 0 2px rgba(226, 221, 217, 0.15)':'none',
                color:"#e2ddd9",
                borderRadius:"8px",
                padding:"10px 12px",
                fontSize:"13px",
                outline:"none",
                transition:"all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxSizing:"border-box"
              }}
            />
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:"8px",padding:"16px 24px",borderTop:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.005)"}}>
          <button onClick={onClose} disabled={loading}
            style={{
              padding:"9px 16px",
              borderRadius:"8px",
              border:`1px solid ${isCancelHovered?'#3a3532':'var(--v-bdr2)'}`,
              color:isCancelHovered?"#e2ddd9":"#8a817c",
              background:isCancelHovered?"rgba(255,255,255,0.03)":"transparent",
              fontWeight:600,
              cursor:"pointer",
              fontSize:"12.5px",
              transition:"all 0.2s ease"
            }}
            onMouseEnter={() => setIsCancelHovered(true)}
            onMouseLeave={() => setIsCancelHovered(false)}
          >
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading || !title.trim()}
            style={{
              padding:"9px 16px",
              borderRadius:"8px",
              background:loading?"rgba(226,221,217,0.3)":(isSaveHovered?"#fff":"#e2ddd9"),
              border:"none",
              color:"var(--v-bg0)",
              fontWeight:700,
              cursor:(loading || !title.trim())?"not-allowed":"pointer",
              fontSize:"12.5px",
              transition:"all 0.2s ease",
              boxShadow:(!loading && title.trim())?"0 4px 12px rgba(226, 221, 217, 0.2)":"none"
            }}
            onMouseEnter={() => setIsSaveHovered(true)}
            onMouseLeave={() => setIsSaveHovered(false)}
          >
            {loading ? 'Saving...' : 'Save Tags'}
          </button>
        </div>
      </div>
    </div>
  );
}
