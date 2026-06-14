import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Home, Search, Play, Pause, SkipBack, SkipForward,
  ListMusic, Heart, Music, Volume2, VolumeX,
  MoreVertical, ListPlus, Share2, Download, ExternalLink, Copy,
  Info, X, Clock, Youtube, Hash, FileCode2, PlaySquare,
  PlusCircle, FileBadge2, Settings, RefreshCw, FolderDown,
  Shuffle, Repeat, Repeat1, ListOrdered, Trash2, Pencil,
  ChevronRight, ChevronLeft, ImagePlus, AlignLeft, HardDrive,
  FileMusic, AlertCircle, Gauge, Moon, FolderOpen,
  Zap, BarChart2, FileOutput,
  CheckCircle, Database, Upload, ArchiveRestore,
  ChevronDown,
  Loader2, CheckCircle2, XCircle, ArrowUpCircle, Image, Mic2
} from 'lucide-react';

const __APP_VERSION__ = '0.1.0';

type Track = {
  id: number;
  title: string;
  artist: string;
  duration: string;
  url: string;
  cover: string;
};

type LocalTrack = {
  title: string;
  path: string;
  size_bytes: number;
  extension: string;
  artist?: string;
  duration?: string;
};

type Playlist = {
  id: string;
  name: string;
  description: string;
  tracks: Track[];
  customCover?: string;
};

type RepeatMode = 'off' | 'all' | 'one';

type CtxMenu = {
  x: number; y: number;
  type: 'track' | 'playlist' | 'sidebar-playlist' | 'queue-track' | 'quickpick';
  track?: Track;
  playlist?: Playlist;
};

type AudioInfo = { codec: string; bitrate: number; samplerate: number; channels: string; format: string; url: string };
type DiskInfo = { used_bytes: number; track_count: number };
type BatchProgress = { index: number; total: number; title: string; success: boolean; error?: string };
type SettingsTab = 'updates' | 'downloads' | 'playback' | 'storage' | 'appearance';

function parseDurationToSeconds(d: string): number {
  const p = d.split(':').map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] || 0;
}
function formatTime(s: number): string {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
function formatBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function loadLS<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}
function saveLS(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}
function clampMenu(x: number, y: number, w = 260, h = 320) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  const cx = x + w > vw - 8 ? Math.max(8, x - w) : x;
  
  const cy = y + h > vh - 8 ? Math.max(8, y - h) : y;
  return { x: cx, y: cy };
}

const SleepTimerPopover = React.memo(({
  sleepTimer, onSet, onCancel, onClose,
}: { sleepTimer: number; onSet: (m: number) => void; onCancel: () => void; onClose: () => void }) => {
  const [input, setInput] = useState('');
  const presets = [5, 10, 15, 20, 30, 45, 60, 90];
  return (
    <div style={{width:'220px',background:'#161414',border:'1px solid #252222',borderRadius:'12px',overflow:'hidden',boxShadow:'0 12px 40px rgba(0,0,0,0.8)'}} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid #1c1a1a'}}>
        <span style={{fontSize:'12px',fontWeight:700,color:'#9e9894',display:'flex',alignItems:'center',gap:'7px'}}><Moon size={13}/> Sleep Timer</span>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#363230',display:'flex'}} onMouseEnter={e=>(e.currentTarget.style.color='#9e9894')} onMouseLeave={e=>(e.currentTarget.style.color='#363230')}><X size={13}/></button>
      </div>
      {sleepTimer > 0 && (
        <div style={{padding:'10px 14px',borderBottom:'1px solid #1c1a1a',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'12px',color:'#9e9894'}}>Pausing in <strong>{Math.ceil(sleepTimer/60)}m</strong></span>
          <button onClick={()=>{onCancel();onClose();}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'11px',color:'#5c5755',display:'flex',alignItems:'center',gap:'4px'}} onMouseEnter={e=>(e.currentTarget.style.color='#b05555')} onMouseLeave={e=>(e.currentTarget.style.color='#5c5755')}><X size={10}/>Cancel</button>
        </div>
      )}
      <div style={{padding:'10px 14px 6px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px'}}>
        {presets.map(m=>(
          <button key={m} onClick={()=>{onSet(m);onClose();}}
            style={{padding:'5px 0',borderRadius:'7px',border:'1px solid #252222',background:'transparent',color:'#5c5755',cursor:'pointer',fontSize:'11px',fontWeight:600,transition:'border-color .1s,color .1s,background .1s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(226,221,217,0.06)';(e.currentTarget as HTMLElement).style.color='#9e9894';(e.currentTarget as HTMLElement).style.borderColor='#2e2b2b';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='#5c5755';(e.currentTarget as HTMLElement).style.borderColor='#252222';}}>
            {m}m
          </button>
        ))}
      </div>
      <div style={{padding:'6px 14px 12px',display:'flex',gap:'6px'}}>
        <input type="number" min="1" max="999" placeholder="Custom min"
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'){const m=parseInt(input);if(m>0){onSet(m);onClose();}}}}
          style={{flex:1,background:'#1c1a1a',border:'1px solid #252222',color:'#e2ddd9',borderRadius:'7px',padding:'5px 8px',fontSize:'11px',outline:'none'}}
        />
        <button onClick={()=>{const m=parseInt(input);if(m>0){onSet(m);onClose();}}}
          style={{padding:'5px 10px',background:'rgba(226,221,217,0.07)',border:'1px solid #2e2b2b',color:'#9e9894',borderRadius:'7px',cursor:'pointer',fontSize:'11px',fontWeight:600}}>
          Set
        </button>
      </div>
    </div>
  );
});

type TrackRowProps = {
  track: Track; index: number; showRemove?: boolean; onRemove?: () => void;
  isActive: boolean; isHovered: boolean; isLoadingTrack: boolean; isPlaying: boolean;
  isLiked: boolean; isDownloading: number;
  onPlay: () => void; onHoverEnter: () => void; onHoverLeave: () => void;
  onLike: () => void; onDownload: () => void; onCtx: (e: React.MouseEvent) => void;

};
const TrackRow = React.memo(({
  track, index, showRemove, onRemove,
  isActive, isHovered, isLoadingTrack, isPlaying, isLiked, isDownloading,
  onPlay, onHoverEnter, onHoverLeave, onLike, onDownload, onCtx,
}: TrackRowProps) => (
  <div
    className={`v-track${isActive ? ' v-track--active' : ''}`}
    onClick={onPlay} onContextMenu={onCtx} onMouseEnter={onHoverEnter} onMouseLeave={onHoverLeave}
  >
    <div className="v-track__num">
      {isActive && isLoadingTrack
        ? <div style={{width:'12px',height:'12px',border:'1.5px solid #9e9894',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto'}} />
        : isActive && isPlaying
          ? <div style={{display:'flex',gap:'2px',alignItems:'flex-end',height:'14px',justifyContent:'center'}}>
              {[100,65,80].map((h,i) => <div key={i} style={{width:'2.5px',background:'#9e9894',borderRadius:'1px',height:`${h}%`,animation:`barBounce ${0.7+i*0.12}s ease-in-out ${i*110}ms infinite`,transformOrigin:'bottom'}} />)}
            </div>
          : isHovered ? <Play size={13} style={{fill:'#e2ddd9',color:'#e2ddd9',margin:'0 auto'}} />
          : index + 1}
    </div>
    <div className="v-track__art">
      <img src={track.cover} alt={track.title} loading="lazy" />
    </div>
    <div className="v-track__info">
      <div className="v-track__title">{track.title}</div>
      <div className="v-track__artist">{track.artist}</div>
    </div>
    <div className="v-track__actions">
      <button className="v-track__btn" onClick={e => { e.stopPropagation(); onLike(); }}>
        <Heart size={13} style={isLiked?{color:'#e05555',fill:'#e05555'}:{color:'#5c5755'}}/>
      </button>
      <button className="v-track__btn" onClick={e => { e.stopPropagation(); onDownload(); }}>
        {isDownloading > 0
          ? <svg width="13" height="13" viewBox="0 0 14 14">
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="#2a2727" strokeWidth="1.5"/>
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="#9e9894" strokeWidth="1.5" strokeLinecap="round"
                strokeDasharray={`${2*Math.PI*5.5}`}
                strokeDashoffset={`${2*Math.PI*5.5*(1-Math.min(isDownloading,100)/100)}`}
                style={{transformOrigin:'7px 7px',transform:'rotate(-90deg)',transition:'stroke-dashoffset 0.3s ease'}}
              />
              {isDownloading>=100&&<path d="M4.5 7l2 2 3-3" stroke="#9e9894" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>}
            </svg>
          : <Download size={13} />}
      </button>
      {showRemove && onRemove
        ? <button className="v-track__btn" style={{color:'#5c5755'}} onClick={e => { e.stopPropagation(); onRemove(); }}
            onMouseEnter={e=>(e.currentTarget.style.color='#b05555')} onMouseLeave={e=>(e.currentTarget.style.color='#5c5755')}>
            <X size={13} />
          </button>
        : <button className="v-track__btn" onClick={e => { e.stopPropagation(); onCtx(e); }}>
            <MoreVertical size={13} />
          </button>}
    </div>
    <span className="v-track__dur">{track.duration && track.duration !== '0:00' ? track.duration : '—'}</span>
  </div>
));

const TrackRowSkeleton = ({ index }: { index: number }) => (
  <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'8px 12px',animation:`fadeUpSm 0.18s cubic-bezier(0.2,0,0,1) ${index*40}ms both`}}>
    <div style={{width:'26px',height:'12px',background:'#1c1a1a',borderRadius:'4px',flexShrink:0}} className="animate-pulse"/>
    <div style={{width:'42px',height:'42px',borderRadius:'8px',background:'#1c1a1a',flexShrink:0}} className="animate-pulse"/>
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:'6px'}}>
      <div style={{height:'11px',background:'#1c1a1a',borderRadius:'3px',width:`${55+(index*13)%35}%`}} className="animate-pulse"/>
      <div style={{height:'9px',background:'#1c1a1a',borderRadius:'3px',width:`${30+(index*7)%25}%`}} className="animate-pulse"/>
    </div>
  </div>
);

const WaveformBar = React.memo(({ waveform, progressPercent, isDragging }: { waveform: number[]; progressPercent: number; isDragging: boolean }) => {
  if (!waveform.length) return null;
  const max = Math.max(...waveform, 0.01);
  return (
    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",gap:"1px",pointerEvents:"none",overflow:"hidden"}}>
      {waveform.map((v, i) => (
        <div key={i} style={{
            flex:1, borderRadius:"1px",
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: (i / waveform.length) * 100 <= progressPercent ? '#e2ddd9' : '#232020',
            transition: isDragging ? 'none' : 'background 0.3s',
          }} />
      ))}
    </div>
  );
});

const ThemedSelect = ({ value, options, onChange }: {
  value: string;
  options: { label: string; value: string; desc?: string }[];
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);

  // Close on outside click — must check both button and dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Recompute position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const dropW = Math.max(r.width, 220);
      const left = Math.min(r.left, window.innerWidth - dropW - 8);
      setDropPos({ top: r.bottom + 4, left: Math.max(8, left), width: dropW });
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const dropW = Math.max(r.width, 220);
      const left = Math.min(r.left, window.innerWidth - dropW - 8);
      setDropPos({ top: r.bottom + 4, left: Math.max(8, left), width: dropW });
    }
    setOpen(o => !o);
  };

  // Use a portal so the dropdown renders into document.body, escaping all
  // overflow:hidden / overflow:auto scroll containers and stacking contexts.
  const dropdown = open ? (
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: dropPos.top,
        left: dropPos.left,
        minWidth: dropPos.width,
        zIndex: 999999,
        animation: 'dropIn 0.15s ease-out',
        background: '#161414',
        border: '1px solid #252222',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
      {options.map((opt, i) => (
        <button key={opt.value}
          onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '9px 14px', textAlign: 'left', cursor: 'pointer', borderTop: i !== 0 ? '1px solid #1c1a1a' : 'none', background: value === opt.value ? 'rgba(226,221,217,0.06)' : 'transparent', color: value === opt.value ? '#e2ddd9' : '#9e9894', transition: 'background 0.1s' }}
          onMouseEnter={e => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = 'rgba(226,221,217,0.04)'; }}
          onMouseLeave={e => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{opt.label}</span>
          {opt.desc && <span style={{ fontSize: '12px', color: '#5c5755', marginTop: '3px' }}>{opt.desc}</span>}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef}
        onClick={handleOpen}
        style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 12px',borderRadius:'8px',fontSize:'13px',fontWeight:500,border:`1px solid ${open?'#2e2b2b':'#252222'}`,background:open?'rgba(226,221,217,0.05)':'#161414',color:open?'#e2ddd9':'#9e9894',cursor:'pointer',minWidth:'130px',transition:'border-color .12s,color .12s,background .12s'}}
        onMouseEnter={e=>{if(!open){(e.currentTarget as HTMLElement).style.borderColor='#2e2b2b';(e.currentTarget as HTMLElement).style.color='#e2ddd9';}}}
        onMouseLeave={e=>{if(!open){(e.currentTarget as HTMLElement).style.borderColor='#252222';(e.currentTarget as HTMLElement).style.color='#9e9894';}}}
      >
        <span style={{flex:1,textAlign:"left"}}>{current?.label}</span>
        <ChevronDown size={14} style={{transition:"transform .2s",transform:open?"rotate(180deg)":"none"}}/>
      </button>
      {typeof document !== 'undefined' && dropdown
        ? ReactDOM.createPortal(dropdown, document.body)
        : null}
    </div>
  );
};

function ImportResultModal({
  matchedCount, failedCount,
  onSave, onClose,
}: { matchedCount: number; failedCount: number; onSave: (name: string, desc: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,3,3,0.9)"}}>
      <div style={{width:"380px",borderRadius:"14px",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.95)",background:"#161414",border:"1px solid #252222"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid #1c1a1a"}}>
          <h2 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Save Playlist</h2>
          <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>
            <span style={{color:"#9e9894",fontWeight:700}}>{matchedCount}</span> tracks matched
            {failedCount>0&&<span style={{color:"#363230"}}> · {failedCount} not found</span>}
          </p>
        </div>
        <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:"10px"}}>
          <div>
            <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"6px"}}>Playlist Name</label>
            <input ref={inputRef} value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&name.trim())onSave(name.trim(),desc.trim());}}
              placeholder="My Playlist" maxLength={80}
              style={{width:"100%",background:"#1c1a1a",border:"1px solid #252222",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",color:"#e2ddd9",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"6px"}}>Description <span style={{color:"#363230",textTransform:"none",fontWeight:400}}>(optional)</span></label>
            <input value={desc} onChange={e=>setDesc(e.target.value)}
              placeholder="e.g. Chill vibes, road trip..." maxLength={160}
              style={{width:"100%",background:"#1c1a1a",border:"1px solid #252222",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",color:"#e2ddd9",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:"8px",marginTop:"4px"}}>
            <button onClick={onClose}
              style={{flex:1,padding:"8px",borderRadius:"8px",border:"1px solid #252222",color:"#5c5755",background:"transparent",fontWeight:600,cursor:"pointer",fontSize:"12px",transition:"border-color .12s,color .12s"}}
              onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#2e2b2b";}}
              onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}>
              Cancel
            </button>
            <button onClick={()=>{if(name.trim())onSave(name.trim(),desc.trim());}} disabled={!name.trim()}
              style={{flex:1,padding:"8px",borderRadius:"8px",border:"none",background:"#e2ddd9",color:"#0c0b0b",fontWeight:700,cursor:"pointer",fontSize:"12px",opacity:name.trim()?1:0.35}}>
              Save Playlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportButton({ onSpotify, onYoutube, onM3u }: {
  onSpotify: () => void; onYoutube: () => void; onM3u: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{marginTop:'12px',flexShrink:0,position:'relative'}}>
      <button onClick={() => setOpen(o => !o)}
        style={{width:'100%',borderRadius:'8px',border:`1px solid ${open?'#2e2b2b':'#252222'}`,padding:'7px 11px',display:'flex',alignItems:'center',gap:'8px',background:open?'rgba(226,221,217,0.04)':'transparent',color:open?'#9e9894':'#5c5755',cursor:'pointer',fontSize:'12px',fontWeight:600,transition:'border-color .12s,color .12s,background .12s'}}>
        <PlusCircle size={13} />
        <span style={{flex:1,textAlign:'left'}}>Import Playlist</span>
        <ChevronDown size={12} style={{transition:'transform .2s',transform:open?'rotate(180deg)':'none'}} />
      </button>
      {open && (
        <div style={{marginTop:'4px',display:'flex',flexDirection:'column',gap:'2px',animation:'dropIn 0.15s ease-out'}}>
          {[
            { label:'From Spotify', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>, action:()=>{onSpotify();setOpen(false);} },
            { label:'From YouTube', icon:<svg width="13" height="11" viewBox="0 0 18 14" fill="#ef4444"><path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/></svg>, action:()=>{onYoutube();setOpen(false);} },
            { label:'From M3U File', icon:<FileOutput size={13}/>, action:()=>{onM3u();setOpen(false);} },
          ].map(({label,icon,action})=>(
            <button key={label} onClick={action}
              style={{width:'100%',borderRadius:'7px',border:'1px solid #252222',padding:'6px 10px',display:'flex',alignItems:'center',gap:'8px',background:'transparent',color:'#5c5755',cursor:'pointer',fontSize:'12px',fontWeight:500,textAlign:'left',transition:'border-color .1s,color .1s,background .1s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(226,221,217,0.04)';(e.currentTarget as HTMLElement).style.color='#9e9894';(e.currentTarget as HTMLElement).style.borderColor='#2e2b2b';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='#5c5755';(e.currentTarget as HTMLElement).style.borderColor='#252222';}}>
              {icon}{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text, label, icon: Icon, disabled = false, className = '' }: {
  text: string; label: string; icon: React.ElementType; disabled?: boolean; className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    if (!text || disabled) return;
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else { const el = document.createElement('textarea'); el.value = text; el.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button onClick={handleCopy} disabled={disabled}
      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"7px",padding:"8px",borderRadius:"9px",border:"1px solid #252222",background:"#1c1a1a",color:copied?"#9e9894":"#5c5755",fontSize:"12px",fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.3:1,transition:"border-color .12s,color .12s,background .12s",width:"100%"}}
      onMouseEnter={e=>{if(!disabled){e.currentTarget.style.background="#232020";e.currentTarget.style.color="#9e9894";}}}
      onMouseLeave={e=>{e.currentTarget.style.background="#1c1a1a";e.currentTarget.style.color=copied?"#9e9894":"#5c5755";}}>
      {copied ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9e9894" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!</> : <><Icon size={13}/>{label}</>}
    </button>
  );
}

function CsvImportModal({
  onClose,
  onSavePlaylist,
  showToast,
  onProgress,
  onMatchingDone,
}: {
  onClose: () => void;
  onSavePlaylist: (name: string, desc: string, tracks: Track[]) => void;
  showToast: (m: string) => void;
  onProgress?: (matched: number, total: number, label: string) => void;
  onMatchingDone?: (tracks: Track[], matched: number, failed: number) => void;
}) {
  const [phase, setPhase] = useState<'instructions' | 'matching' | 'saving' | 'done'>('instructions');
  const [results, setResults] = useState<{ title: string; artist: string; status: 'pending' | 'fetching' | 'matched' | 'failed'; url?: string; cover?: string }[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [matchedTracks, setMatchedTracks] = useState<Track[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const abortRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) { showToast('Please upload a .csv file from Exportify'); return; }
    const text = await file.text();

    setStatusMsg('Parsing CSV...');
    let raw: string;
    try {
      raw = await invoke<string>('import_csv_playlist', { csvContent: text });
    } catch (e) {
      showToast(`Failed to parse CSV: ${e}`);
      setStatusMsg('');
      return;
    }

    const lines = raw.trim().split('\n').filter(Boolean);
    let trackLines = lines;
    if (lines[0]?.startsWith('PLAYLIST:')) trackLines = lines.slice(1);
    if (trackLines.length === 0) { showToast('No tracks found in CSV'); return; }

    const initial = trackLines.map(l => {
      const [title, artist] = l.split('====');
      return { title: title?.trim() || 'Unknown', artist: artist?.trim() || '', status: 'pending' as const };
    });

    setResults(initial);
    setPhase('matching');
    abortRef.current = false;

    // 12 true concurrent tasks with a semaphore (not chunked — starts new task
    // immediately when any slot frees). Uses ytsearch5 (5 results) with a
    // title+artist scoring pass to pick the best match, not just the first result.
    const CONCURRENCY = 12;
    const total = initial.length;
    let completed = 0;
    const matched: Track[] = [];
    let failed = 0;

    // Match cache — skip re-searching identical title+artist within session
    const matchCache = new Map<string, string | null>();

    // Scoring: prefer results whose title contains both artist and track name.
    // Returns the video ID of the best result, or null if none found.
    const pickBestMatch = (lines: string[], title: string, artist: string): string | null => {
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      const tNorm = norm(title);
      const aNorm = norm(artist);
      let bestId: string | null = null;
      let bestScore = -1;
      for (const line of lines) {
        const parts = line.split('====');
        const rTitle = norm(parts[0] || '');
        const rArtist = norm(parts[1] || '');
        const id = parts[3]?.trim();
        if (!id) continue;
        let score = 0;
        if (rTitle.includes(tNorm) || tNorm.includes(rTitle)) score += 3;
        if (rArtist.includes(aNorm) || aNorm.includes(rArtist)) score += 2;
        // bonus for "official" / "audio" / "lyrics"
        if (rTitle.includes('official') || rTitle.includes('audio') || rTitle.includes('lyric')) score += 1;
        if (score > bestScore) { bestScore = score; bestId = id; }
      }
      // Fall back to first result if nothing scored
      if (!bestId) {
        const id = lines[0]?.split('====')[3]?.trim();
        bestId = id || null;
      }
      return bestId;
    };

    const processTrack = async (track: typeof initial[0], i: number): Promise<void> => {
      if (abortRef.current) return;
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'fetching' } : r));
      try {
        const cacheKey = `${track.title}|||${track.artist}`.toLowerCase();
        let cleanId: string | null | undefined = matchCache.get(cacheKey);

        if (cleanId === undefined) {
          const q = `${track.title} ${track.artist} audio`;
          const res: string = await invoke('search_youtube', { query: q });
          const lines = res.trim().split('\n').filter(Boolean).slice(0, 5);
          cleanId = pickBestMatch(lines, track.title, track.artist);
          matchCache.set(cacheKey, cleanId);
        }

        if (cleanId) {
          const t: Track = {
            id: i, title: track.title, artist: track.artist,
            duration: '0:00', url: `https://youtube.com/watch?v=${cleanId}`,
            cover: `https://i.ytimg.com/vi/${cleanId}/mqdefault.jpg`,
          };
          matched.push(t);
          setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'matched', url: t.url, cover: t.cover } : r));
        } else {
          failed++;
          setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'failed' } : r));
        }
      } catch {
        failed++;
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'failed' } : r));
      }
      completed++;
      setStatusMsg(`Matching ${completed} / ${total}...`);
      onProgress?.(matched.length, total, `${completed}/${total} matched`);
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    };

    // Semaphore: allow at most CONCURRENCY tasks running at once
    // (unlike chunking, new tasks start immediately when one finishes)
    const semaphore = {
      running: 0,
      queue: [] as (() => void)[],
      acquire() { return new Promise<void>(r => { if (this.running < CONCURRENCY) { this.running++; r(); } else { this.queue.push(r); } }); },
      release() { this.running--; const next = this.queue.shift(); if (next) { this.running++; next(); } },
    };

    await Promise.all(initial.map(async (track, i) => {
      await semaphore.acquire();
      try { await processTrack(track, i); }
      finally { semaphore.release(); }
    }));

    setMatchedTracks(matched);
    setFailedCount(failed);
    onProgress?.(matched.length, total, 'Done!');
    if (onMatchingDone) {
      // Notify parent — parent will show name popup even if we were minimized
      onMatchingDone(matched, matched.length, failed);
    } else {
      setPhase('saving');
    }
    setStatusMsg('');
  };

  const matched = results.filter(r => r.status === 'matched');
  const failed = results.filter(r => r.status === 'failed');
  const isDone = phase === 'done' || phase === 'saving';

  return (
    <>
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,3,3,0.9)"}} onClick={phase==='matching'?undefined:onClose}>
      <div style={{width:"700px",maxHeight:"88vh",display:"flex",flexDirection:"column",borderRadius:"14px",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.95)",background:"#161414",border:"1px solid #252222"}}
        onClick={e => e.stopPropagation()}>

        {}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px",borderBottom:"1px solid #1c1a1a",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"32px",height:"32px",borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(226,221,217,0.08)"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#9e9894"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            </div>
            <h2 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Import Spotify Playlist</h2>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            {phase === 'matching' && (
              <button onClick={onClose} title="Minimize — import continues in background"
                style={{width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"7px",border:"1px solid #252222",background:"transparent",color:"#5c5755",cursor:"pointer",fontSize:"12px",fontWeight:700,transition:"color .12s,border-color .12s"}} onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#2e2b2b";}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}>
                —
              </button>
            )}
            <button onClick={onClose} style={{width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"7px",border:"none",background:"transparent",color:"#5c5755",cursor:"pointer",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
              <X size={14}/>
            </button>
          </div>
        </div>

        {}
        {phase === 'instructions' && (
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"18px 20px",gap:"16px",overflowY:"auto"}} className="custom-scrollbar">
            <p style={{fontSize:"13px",color:"#9e9894",lineHeight:1.6}}>
              Veluna uses <span style={{color:"#e2ddd9",fontWeight:600}}>Exportify</span> to import Spotify playlists, no extra software needed.
            </p>
            {[
              { n: '1', title: 'Go to Exportify', desc: 'Open exportify.net in your browser', link: 'https://exportify.net', linkLabel: 'exportify.net →' },
              { n: '2', title: 'Log in with Spotify', desc: 'Click "Log in with Spotify" and authorise Exportify to read your playlists.' },
              { n: '3', title: 'Export your playlist', desc: 'Find the playlist and click the green Export button. A .csv file will download.' },
              { n: '4', title: 'Upload the CSV here', desc: 'Click the button below and select the downloaded .csv file.' },
            ].map(step => (
              <div key={step.n} style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"12px",fontWeight:700,color:"#0c0b0b",marginTop:"2px",background:"#e2ddd9"}}>{step.n}</div>
                <div>
                  <p style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>{step.title}</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px",lineHeight:1.5}}>{step.desc}</p>
                  {step.link && <button onClick={() => openUrl(step.link!).catch(() => window.open(step.link!, '_blank'))}
                    style={{fontSize:"12px",marginTop:"8px",display:"inline-flex",alignItems:"center",gap:"4px",fontWeight:700,cursor:"pointer",color:"#9e9894",background:"rgba(226,221,217,0.06)",border:"1px solid #252222",borderRadius:"7px",padding:"5px 10px",textDecoration:"none"}} onMouseEnter={e=>{e.currentTarget.style.color="#e2ddd9";e.currentTarget.style.borderColor="#2e2b2b";}} onMouseLeave={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#252222";}}>{step.linkLabel}</button>}
                </div>
              </div>
            ))}
            <input ref={fileInputRef} type="file" accept=".csv" style={{display:"none"}}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <button onClick={() => fileInputRef.current?.click()}
              style={{marginTop:"6px",width:"100%",padding:"10px",borderRadius:"9px",fontSize:"13px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",border:"none",background:"#e2ddd9",color:"#0c0b0b",cursor:"pointer"}}>
              <Upload size={16} /> Upload Exportify CSV
            </button>
          </div>
        )}

        {}
        {(phase === 'matching' || phase === 'saving' || phase === 'done') && (
          <>
            <div style={{padding:"10px 20px",borderBottom:"1px solid #1c1a1a",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
                <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#9e9894' }}>
                  {isDone ? `Done · ${matched.length} matched` : `Matching · ${matched.length + failed.length} / ${results.length}`}
                  {failed.length>0&&<span style={{color:"#363230",marginLeft:"6px"}}>· {failed.length} not found</span>}
                </span>
                {statusMsg&&<span style={{fontSize:"10px",color:"#363230",fontFamily:"monospace"}}>{statusMsg}</span>}
              </div>
              <div style={{height:"3px",borderRadius:"2px",background:"#232020",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:"2px",transition:"width .3s",width:`${results.length>0?((matched.length+failed.length)/results.length)*100:0}%`,background:"#e2ddd9"}} />
              </div>
            </div>
            <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar">
              {results.map((r, i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"8px 20px",borderBottom:"1px solid rgba(28,26,26,0.6)"}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"6px",flexShrink:0,overflow:"hidden",background:"#1c1a1a",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {r.cover?<img src={r.cover} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<Music size={12} style={{color:"#363230"}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                    <div style={{fontSize:"11px",color:"#363230",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.artist}</div>
                  </div>
                  <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:"5px",width:"80px",justifyContent:"flex-end"}}>
                    {r.status==='pending'&&<span style={{fontSize:"11px",color:"#2a2727"}}>·</span>}
                    {r.status === 'fetching' && <Loader2 size={12} style={{animation:"spin 0.8s linear infinite",color:"#5c5755"}} />}
                    {r.status === 'matched'  && <CheckCircle2 size={13} style={{ color: '#9e9894' }} />}
                    {r.status === 'failed'   && <XCircle size={13} style={{color:"#a05050"}} />}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    {}
    {phase === 'saving' && (
      <ImportResultModal
        matchedCount={matchedTracks.length}
        failedCount={failedCount}
        onSave={(name, desc) => {
          onSavePlaylist(name, desc, matchedTracks);
          setPhase('done');
          onClose();
        }}
        onClose={() => { setPhase('done'); onClose(); }}
      />
    )}
    </>
  );
}

function YtImportModal({
  onClose,
  onSavePlaylist,
  showToast,
}: {
  onClose: () => void;
  onSavePlaylist: (name: string, desc: string, tracks: Track[]) => void;
  showToast: (m: string) => void;
}) {
  const [phase, setPhase] = useState<'input' | 'loading' | 'saving' | 'done'>('input');
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<{ title: string; artist: string; id: string; cover: string }[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
      showToast('Please paste a YouTube playlist URL');
      return;
    }
    setPhase('loading');
    setStatusMsg('Fetching playlist from YouTube...');
    try {
      const raw: string = await invoke('import_youtube_playlist', { url: trimmed });
      const lines = raw.trim().split('\n').filter(Boolean);
      const parsed = lines.map(l => {
        const [title, artist, id] = l.split('====');
        return {
          title: title?.trim() || 'Unknown',
          artist: artist?.trim() || '',
          id: id?.trim() || '',
          cover: id?.trim() ? `https://i.ytimg.com/vi/${id.trim()}/mqdefault.jpg` : '',
        };
      }).filter(t => t.id);

      if (parsed.length === 0) { showToast('No tracks found'); setPhase('input'); return; }
      setResults(parsed);
      setPhase('saving');
      setStatusMsg('');
    } catch (e) {
      showToast(`Import failed: ${e}`);
      setPhase('input');
      setStatusMsg('');
    }
  };

  const isYtUrl = url.includes('youtube.com') || url.includes('youtu.be');

  return (
    <>
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,3,3,0.9)"}} onClick={onClose}>
      <div style={{width:"640px",maxHeight:"86vh",display:"flex",flexDirection:"column",borderRadius:"14px",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.95)",background:"#161414",border:"1px solid #252222"}}
        onClick={e => e.stopPropagation()}>

        {}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px",borderBottom:"1px solid #1c1a1a",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"32px",height:"32px",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(180,40,40,0.7)"}}>
              <svg width="18" height="14" viewBox="0 0 18 14" fill="white"><path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/></svg>
            </div>
            <h2 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Import YouTube Playlist</h2>
          </div>
          <button onClick={onClose} style={{width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"7px",border:"none",background:"transparent",color:"#5c5755",cursor:"pointer",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
            <X size={16} />
          </button>
        </div>

        {}
        {(phase === 'input' || phase === 'loading') && (
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"18px 20px",gap:"14px"}}>
            <p style={{fontSize:"13px",color:"#9e9894"}}>Paste a public YouTube playlist URL below. All videos will be imported instantly, no matching needed.</p>
            <div style={{display:"flex",gap:"8px"}}>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:"8px",background:"#1c1a1a",border:"1px solid #252222",borderRadius:"9px",padding:"0 12px",height:"38px"}}>
                <svg width="14" height="11" viewBox="0 0 18 14" fill="#5c5755" style={{flexShrink:0}}><path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/></svg>
                <input ref={inputRef} value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && phase === 'input' && isYtUrl) handleImport(); }}
                  placeholder="https://youtube.com/playlist?list=..."
                  disabled={phase === 'loading'}
                  style={{flex:1,background:"transparent",fontSize:"13px",color:"#e2ddd9",outline:"none",border:"none"}} />
              </div>
              <button onClick={handleImport} disabled={phase === 'loading' || !isYtUrl}
                style={{padding:"0 16px",height:"38px",borderRadius:"9px",border:"none",background:"#e2ddd9",color:"#0c0b0b",fontWeight:700,fontSize:"13px",cursor:"pointer",display:"flex",alignItems:"center",gap:"7px",flexShrink:0,opacity:phase==="loading"||!isYtUrl?0.4:1,transition:"opacity .12s"}}>
                {phase === 'loading' ? <Loader2 size={15} style={{animation:"spin 0.8s linear infinite"}}/> : <><svg width="13" height="10" viewBox="0 0 18 14" fill="white"><path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/></svg>Import</>}
              </button>
            </div>
            {statusMsg && <p style={{fontSize:"11px",color:"#5c5755",fontFamily:"monospace"}}>{statusMsg}</p>}
          </div>
        )}

        {}
        {phase === 'saving' && (
          <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}} className="custom-scrollbar">
            <p style={{fontSize:"11px",color:"#5c5755",marginBottom:"10px"}}>{results.length} videos found. Enter a name and save.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {results.slice(0, 50).map((r, i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <img src={r.cover} style={{width:"48px",height:"27px",borderRadius:"5px",objectFit:"cover",flexShrink:0,background:"#1c1a1a"}} alt="" />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"13px",color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                    <div style={{fontSize:"11px",color:"#5c5755",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.artist}</div>
                  </div>
                </div>
              ))}
              {results.length > 50 && <p style={{fontSize:"11px",color:"#363230",paddingTop:"4px"}}>+ {results.length - 50} more...</p>}
            </div>
          </div>
        )}
      </div>
    </div>
    {phase === 'saving' && (
      <ImportResultModal
        matchedCount={results.length}
        failedCount={0}
        onSave={(name, desc) => {
          const tracks: Track[] = results.map((r, i) => ({
            id: i, title: r.title, artist: r.artist, duration: '0:00',
            url: `https://youtube.com/watch?v=${r.id}`, cover: r.cover,
          }));
          onSavePlaylist(name, desc, tracks);
          setPhase('done');
          onClose();
        }}
        onClose={() => { setPhase('done'); onClose(); }}
      />
    )}
    </>
  );
}

// ── Settings Validation Layer ─────────────────────────────────────────────────
// Detects conflicting settings before applying them. Returns a warning string
// if a conflict exists, or null if safe to apply.
function validateSettingsChange(
  key: string,
  newVal: unknown,
  current: {
    loudnormEnabled: boolean; skipSilence: boolean;
    eq: { bass: number; mid: number; treble: number };
    streamQuality: string;
  }
): string | null {
  const { loudnormEnabled, skipSilence, eq } = current;
  const hasEq = eq.bass !== 0 || eq.mid !== 0 || eq.treble !== 0;

  if (key === 'loudnormEnabled' && newVal === true && skipSilence) {
    return 'Loudnorm + Skip Silence together can cause audio distortion on short tracks. Consider disabling one.';
  }
  if (key === 'skipSilence' && newVal === true && loudnormEnabled) {
    return 'Loudnorm + Skip Silence together can cause audio distortion on short tracks. Consider disabling one.';
  }
  if (key === 'loudnormEnabled' && newVal === true && hasEq) {
    const extreme = Math.max(Math.abs(eq.bass), Math.abs(eq.mid), Math.abs(eq.treble));
    if (extreme >= 10) {
      return `Loudnorm with high EQ values (${extreme}dB) may clip audio. Reduce EQ or disable Loudnorm.`;
    }
  }
  return null; // no conflict
}

function SettingsPanel({
  downloadQuality, setDownloadQuality, downloadPath, handleSelectDirectory,
  downloadFormat, setDownloadFormat,
  embedThumbnail, setEmbedThumbnail,
  duplicateDetect, setDuplicateDetect,
  onBackup, onRestore, onReset,
  backupPath, setBackupPath,
  loudnormEnabled, setLoudnormEnabled,
  streamQuality, setStreamQuality,
  skipSilence, setSkipSilence,
  eq, setEq,
  showToast,
  updateAvailable,
  appVersion,
  lyricsSource, setLyricsSource,
  trayEnabled, setTrayEnabled,
  audioDevices, setAudioDevices,
}: {
  downloadQuality: string; setDownloadQuality: (q: string) => void;
  downloadPath: string; handleSelectDirectory: () => void;
  downloadFormat: string; setDownloadFormat: (f: string) => void;
  embedThumbnail: boolean; setEmbedThumbnail: (v: boolean) => void;
  duplicateDetect: boolean; setDuplicateDetect: (v: boolean) => void;
  onBackup: () => void; onRestore: () => void; onReset: () => void;
  backupPath: string; setBackupPath: (p: string) => void;
  loudnormEnabled: boolean; setLoudnormEnabled: (e: boolean) => void;
  streamQuality: string; setStreamQuality: (v: string) => void;
  skipSilence: boolean; setSkipSilence: (v: boolean) => void;
  eq: { bass: number; mid: number; treble: number }; setEq: (v: { bass: number; mid: number; treble: number }) => void;
  showToast: (m: string) => void;
  updateAvailable: string | null;
  appVersion: string;
  onNavigateToUpdates?: () => void;
  lyricsSource: string; setLyricsSource: (v: string) => void;
  trayEnabled: boolean; setTrayEnabled: (v: boolean) => void;
  audioDevices: { id: string; name: string; form: string; is_default: boolean }[];
  setAudioDevices: React.Dispatch<React.SetStateAction<{ id: string; name: string; form: string; is_default: boolean }[]>>;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('updates');
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);
  const [switchingDevice, setSwitchingDevice] = useState(false);

  useEffect(() => {
    invoke<DiskInfo>('get_disk_usage', { path: downloadPath }).then(setDiskInfo).catch(() => {});
  }, [downloadPath]);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'updates',    label: 'Updates',    icon: <ArrowUpCircle size={15} /> },
    { id: 'downloads',  label: 'Downloads',  icon: <FolderDown size={15} /> },
    { id: 'playback',   label: 'Playback',   icon: <Zap size={15} /> },
    { id: 'storage',    label: 'Storage',    icon: <Database size={15} /> },
    { id: 'appearance', label: 'Appearance', icon: <Moon size={15} /> },
  ];

  return (
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      <div style={{width:"172px",flexShrink:0,borderRight:"1px solid #1c1a1a",display:"flex",flexDirection:"column",padding:"14px 10px",gap:"2px"}}>
        <div style={{fontSize:"9px",fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"#363230",padding:"0 8px 10px"}}>Settings</div>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              display:"flex",alignItems:"center",gap:"9px",
              padding:"8px 10px",borderRadius:"8px",
              border:"none",cursor:"pointer",
              textAlign:"left",width:"100%",
              fontSize:"12.5px",fontWeight:500,
              background:activeTab===tab.id?"rgba(226,221,217,0.07)":"transparent",
              color:activeTab===tab.id?"#e2ddd9":"#5c5755",
              position:"relative",
              transition:"background .12s,color .12s",
              boxShadow:activeTab===tab.id?"inset 2px 0 0 #9e9894":"none",
            }}
            onMouseEnter={e=>{if(activeTab!==tab.id){e.currentTarget.style.background="rgba(226,221,217,0.04)";e.currentTarget.style.color="#9e9894";}}}
            onMouseLeave={e=>{if(activeTab!==tab.id){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#5c5755";}}}>
            <span style={{color:activeTab===tab.id?"#9e9894":"#363230",display:"flex",flexShrink:0}}>{tab.icon}</span>
            <span style={{flex:1}}>{tab.label}</span>
            {tab.id === 'updates' && updateAvailable && (
              <span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#9e9894",flexShrink:0}} />
            )}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}} className="custom-scrollbar">

        {}
        {activeTab === 'updates' && (
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            <div>
              <h2 style={{fontSize:"17px",fontWeight:700,color:"#e2ddd9",margin:"0 0 3px"}}>Updates</h2>
              <p style={{fontSize:"12px",color:"#5c5755",marginTop:"3px"}}>Check for new releases of Veluna.</p>
            </div>

            <div style={{borderRadius:"10px",border:`1px solid ${updateAvailable?"rgba(226,221,217,0.12)":"#1c1a1a"}`,padding:"14px",display:"flex",alignItems:"flex-start",gap:"12px",background:updateAvailable?"rgba(226,221,217,0.04)":"#161414"}}>
              <div style={{marginTop:"1px",flexShrink:0,color:updateAvailable?"#9e9894":"#363230"}}>
                {updateAvailable ? <ArrowUpCircle size={20}/> : <CheckCircle size={20}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                {updateAvailable ? (
                  <>
                    <div style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",marginBottom:"3px"}}>Update available — v{updateAvailable}</div>
                    <div style={{fontSize:"11px",color:"#5c5755",marginBottom:"10px"}}>A new version of Veluna is ready to download.</div>
                    <a href="#" onClick={e=>{e.preventDefault();openUrl('https://github.com/ishmweet/veluna/releases/latest');}}
                      style={{display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:600,color:"#9e9894",textDecoration:"none"}}
                      onMouseEnter={e=>(e.currentTarget.style.textDecoration="underline")} onMouseLeave={e=>(e.currentTarget.style.textDecoration="none")}>
                      <ExternalLink size={11}/> View release on GitHub
                    </a>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",marginBottom:"3px"}}>You're up to date</div>
                    <div style={{fontSize:"11px",color:"#5c5755"}}>Veluna v{appVersion} is the latest release.</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'downloads' && (
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            <div>
              <h2 style={{fontSize:"17px",fontWeight:700,color:"#e2ddd9",margin:"0 0 3px"}}>Downloads</h2>
              <p style={{fontSize:"12px",color:"#5c5755",marginTop:"3px"}}>Configure download quality and destination folder.</p>
            </div>

            {}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Audio Quality</h3>
                <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Quality of downloaded MP3 files.</p>
              </div>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Download Quality</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>
                    {downloadQuality === 'High' ? 'Best available audio bitrate (320kbps+)' : downloadQuality === 'Medium' ? 'Balanced quality (~128kbps)' : 'Smallest file size'}
                  </p>
                </div>
                <ThemedSelect
                  value={downloadQuality}
                  onChange={setDownloadQuality}
                  options={[
                    { value: 'High', label: 'High', desc: 'Best quality · largest files' },
                    { value: 'Medium', label: 'Medium', desc: 'Balanced · ~128kbps' },
                    { value: 'Low', label: 'Low', desc: 'Smallest files' },
                  ]}
                />
              </div>
            </div>

            {}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Download Folder</h3>
              </div>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.025)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} onClick={handleSelectDirectory}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:"12px",fontFamily:"monospace",color:"#c8c4c0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{downloadPath}</p>
                  {diskInfo && <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>{formatBytes(diskInfo.used_bytes)} used · {diskInfo.track_count} audio files</p>}
                </div>
                <button style={{padding:"6px",marginLeft:"12px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",flexShrink:0,borderRadius:"7px",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <FolderOpen size={17} />
                </button>
              </div>
            </div>

            {}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Audio Format</h3>
                <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Container format for downloaded files.</p>
              </div>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Format</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>
                    {downloadFormat === 'opus' ? 'Best compression, native YouTube codec' : downloadFormat === 'm4a' ? 'AAC in M4A, great Apple/car stereo compat' : downloadFormat === 'flac' ? 'Lossless — largest files' : 'MP3 — widest compatibility'}
                  </p>
                </div>
                <ThemedSelect
                  value={downloadFormat}
                  onChange={setDownloadFormat}
                  options={[
                    { value: 'mp3',  label: 'MP3',  desc: 'Most compatible' },
                    { value: 'opus', label: 'Opus', desc: 'Best compression' },
                    { value: 'm4a',  label: 'M4A',  desc: 'AAC / Apple' },
                    { value: 'flac', label: 'FLAC', desc: 'Lossless' },
                  ]}
                />
              </div>
            </div>

            {}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"12.5px",fontWeight:600,color:"#e2ddd9",display:"flex",alignItems:"center",gap:"7px",margin:0}}><Image size={14} style={{color:"#5c5755"}} className="text-[#d4cfcf]" /> File Options</h3>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",borderBottom:"1px solid #1c1a1a"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Embed Thumbnail</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>{embedThumbnail ? 'Cover art written into file tags' : 'No cover art in downloaded files'}</p>
                </div>
                <button onClick={() => setEmbedThumbnail(!embedThumbnail)}
                  style={{position:"relative",width:"40px",height:"22px",borderRadius:"11px",flexShrink:0,background:embedThumbnail?"rgba(226,221,217,0.65)":"#232020",border:"1px solid",borderColor:embedThumbnail?"rgba(226,221,217,0.2)":"#2e2b2b",transition:"background .2s",cursor:"pointer"}}>
                  <span style={{position:"absolute",top:"2px",width:"16px",height:"16px",borderRadius:"50%",transition:"left .2s",background:embedThumbnail?"#0c0b0b":"#5c5755",left:embedThumbnail?"20px":"2px"}} />
                </button>
              </div>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Duplicate Detection</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>{duplicateDetect ? 'Skips tracks already in your download folder' : 'Always download regardless of duplicates'}</p>
                </div>
                <button onClick={() => setDuplicateDetect(!duplicateDetect)}
                  style={{position:"relative",width:"40px",height:"22px",borderRadius:"11px",flexShrink:0,background:duplicateDetect?"rgba(226,221,217,0.65)":"#232020",border:"1px solid",borderColor:duplicateDetect?"rgba(226,221,217,0.2)":"#2e2b2b",transition:"background .2s",cursor:"pointer"}}>
                  <span style={{position:"absolute",top:"2px",width:"16px",height:"16px",borderRadius:"50%",transition:"left .2s",background:duplicateDetect?"#0c0b0b":"#5c5755",left:duplicateDetect?"20px":"2px"}} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'playback' && (
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            <div>
              <h2 style={{fontSize:"17px",fontWeight:700,color:"#e2ddd9",margin:"0 0 3px"}}>Playback</h2>
              <p style={{fontSize:"12px",color:"#5c5755",marginTop:"3px"}}>Audio engine and playback behaviour settings.</p>
            </div>

            {/* Loudnorm */}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"12.5px",fontWeight:600,color:"#e2ddd9",display:"flex",alignItems:"center",gap:"7px",margin:0}}><Zap size={14} style={{color:"#5c5755"}} className="text-[#d4cfcf]" /> Audio Normalization</h3>
                <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Equalizes loudness across all tracks so nothing is too loud or too quiet.</p>
              </div>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Loudnorm (EBU R128)</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>{loudnormEnabled ? 'Active — consistent volume across tracks' : 'Disabled — faster start, raw volume'}</p>
                </div>
                <button onClick={() => {
                  const next = !loudnormEnabled;
                  const warn = validateSettingsChange('loudnormEnabled', next, { loudnormEnabled, skipSilence, eq, streamQuality });
                  if (warn) { showToast(`⚠ ${warn}`); }
                  setLoudnormEnabled(next);
                }}
                  style={{position:"relative",width:"40px",height:"22px",borderRadius:"11px",flexShrink:0,background:loudnormEnabled?"rgba(226,221,217,0.65)":"#232020",border:"1px solid",borderColor:loudnormEnabled?"rgba(226,221,217,0.2)":"#2e2b2b",transition:"background .2s",cursor:"pointer"}}>
                  <span style={{position:"absolute",top:"2px",width:"16px",height:"16px",borderRadius:"50%",transition:"left .2s",background:loudnormEnabled?"#0c0b0b":"#5c5755",left:loudnormEnabled?"20px":"2px"}} />
                </button>
              </div>
            </div>

            {/* Playback Quality */}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"12.5px",fontWeight:600,color:"#e2ddd9",display:"flex",alignItems:"center",gap:"7px",margin:0}}><Gauge size={14} style={{color:"#5c5755"}} className="text-[#d4cfcf]" /> Stream Quality</h3>
                <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Higher quality uses more bandwidth. Opus is native YouTube codec with best compression.</p>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Streaming Format</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>Preferred audio codec for streaming playback</p>
                </div>
                <ThemedSelect
                  value={streamQuality}
                  onChange={setStreamQuality}
                  options={[
                    { value: 'best', label: 'Best', desc: 'Highest quality available' },
                    { value: 'opus', label: 'Opus', desc: 'Native YouTube, best compression' },
                    { value: 'webm', label: 'WebM', desc: 'WebM container, efficient' },
                  ]}
                />
              </div>
            </div>

            {/* Skip Silence */}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"12.5px",fontWeight:600,color:"#e2ddd9",display:"flex",alignItems:"center",gap:"7px",margin:0}}><SkipForward size={14} style={{color:"#5c5755"}} className="text-[#d4cfcf]" /> Smart Playback</h3>
              </div>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Skip Silence</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>{skipSilence ? 'Auto-skips silent parts between tracks' : 'Play all audio including silence'}</p>
                </div>
                <button onClick={() => {
                  const next = !skipSilence;
                  const warn = validateSettingsChange('skipSilence', next, { loudnormEnabled, skipSilence, eq, streamQuality });
                  if (warn) { showToast(`⚠ ${warn}`); }
                  setSkipSilence(next);
                }}
                  style={{position:"relative",width:"40px",height:"22px",borderRadius:"11px",flexShrink:0,background:skipSilence?"rgba(226,221,217,0.65)":"#232020",border:"1px solid",borderColor:skipSilence?"rgba(226,221,217,0.2)":"#2e2b2b",transition:"background .2s",cursor:"pointer"}}>
                  <span style={{position:"absolute",top:"2px",width:"16px",height:"16px",borderRadius:"50%",transition:"left .2s",background:skipSilence?"#0c0b0b":"#5c5755",left:skipSilence?"20px":"2px"}} />
                </button>
              </div>
            </div>

            {/* Audio Output */}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <h3 style={{fontSize:"12.5px",fontWeight:600,color:"#e2ddd9",display:"flex",alignItems:"center",gap:"7px",margin:0}}><Volume2 size={14} style={{color:"#5c5755"}} className="text-[#d4cfcf]" /> Audio Output</h3>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Select output device. Switches instantly without restarting playback.</p>
                </div>
                <button onClick={() => invoke<{ id: string; name: string; form: string; is_default: boolean }[]>('list_audio_devices').then(setAudioDevices).catch(() => {})}
                  style={{padding:"5px",background:"none",border:"none",cursor:"pointer",color:"#363230",borderRadius:"6px",display:"flex",transition:"color .12s"}} title="Refresh" onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#363230")}>
                  <RefreshCw size={13} />
                </button>
              </div>
              <div style={{display:"flex",flexDirection:"column"}}>
                {audioDevices.length === 0 ? (
                  <div style={{padding:"10px 14px",fontSize:"12px",color:"#5c5755"}}>No devices found</div>
                ) : audioDevices.map(dev => {
                  const isDefault = dev.is_default;
                  return (
                    <button key={dev.id} disabled={switchingDevice}
                      onClick={async () => {
                        if (isDefault) return;
                        setSwitchingDevice(true);
                        try {
                          await invoke('set_audio_device', { id: dev.id });
                          setAudioDevices(prev => prev.map(d => ({ ...d, is_default: d.id === dev.id })));
                          showToast(`Output: ${dev.name}`);
                        } catch (e) { showToast(`Switch failed: ${e}`); }
                        finally { setSwitchingDevice(false); }
                      }}
                      style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 14px",textAlign:"left",cursor:isDefault?"default":"pointer",width:"100%",background:isDefault?"rgba(255,255,255,0.025)":"transparent",border:"none",transition:"background .1s",opacity:switchingDevice&&!isDefault?0.4:1}}
                      onMouseEnter={e=>{if(!isDefault)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.035)";}}
                      onMouseLeave={e=>{if(!isDefault)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1px solid ${isDefault?"rgba(226,221,217,0.2)":"rgba(255,255,255,0.05)"}`,background:isDefault?"rgba(226,221,217,0.06)":"#1c1a1a"}}>
                        {dev.form === 'headphones'
                          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isDefault ? '#9e9894' : '#3a3a3a'} strokeWidth="2" strokeLinecap="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                          : <Volume2 size={13} style={{color:isDefault?"#9e9894":"#363230"}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:"12.5px",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:isDefault?"#e2ddd9":"#5c5755"}}>{dev.name}</p>
                        {dev.form&&<p style={{fontSize:"10px",color:"#363230",textTransform:"capitalize",marginTop:"1px"}}>{dev.form}</p>}
                      </div>
                      {isDefault&&<span style={{fontSize:"9.5px",fontWeight:700,color:"#9e9894",flexShrink:0,letterSpacing:".05em"}}>ACTIVE</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lyrics Source */}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"12.5px",fontWeight:600,color:"#e2ddd9",display:"flex",alignItems:"center",gap:"7px",margin:0}}><Mic2 size={14} className="text-[#d4cfcf]" /> Lyrics Source</h3>
                <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Primary source for synced lyrics. Falls back to lrclib → lyrics.ovh automatically.</p>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Primary source</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>
                    {lyricsSource === 'musixmatch' ? 'Musixmatch — word-level richsync when available'
                      : lyricsSource === 'netease' ? 'NetEase — strong for C-pop / K-pop'
                      : 'lrclib — open, fast, no rate limits'}
                  </p>
                </div>
                <ThemedSelect value={lyricsSource} onChange={setLyricsSource} options={[
                  { value: 'lrclib', label: 'lrclib', desc: 'Open source, fast' },
                  { value: 'musixmatch', label: 'Musixmatch', desc: 'Word-level sync' },
                  { value: 'netease', label: 'NetEase', desc: 'Best for C/K-pop' },
                ]} />
              </div>
            </div>

            {/* Equalizer */}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <h3 style={{fontSize:"12.5px",fontWeight:600,color:"#e2ddd9",display:"flex",alignItems:"center",gap:"7px",margin:0}}><BarChart2 size={14} className="text-[#d4cfcf]" /> Equalizer</h3>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Adjust bass, mid, and treble. Applied in real-time via mpv.</p>
                </div>
                <button onClick={() => { setEq({ bass: 0, mid: 0, treble: 0 }); invoke('set_equalizer', { bass: 0, mid: 0, treble: 0 }).catch(() => {}); }}
                  style={{fontSize:"11px",color:"#5c5755",cursor:"pointer",padding:"3px 8px",borderRadius:"6px",border:"1px solid #252222",background:"transparent"}}>
                  Reset
                </button>
              </div>
              <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                {([
                  { label: 'Bass', key: 'bass' as const, desc: 'Low frequencies (60–250Hz)' },
                  { label: 'Mid', key: 'mid' as const, desc: 'Mids (500Hz–2kHz)' },
                  { label: 'Treble', key: 'treble' as const, desc: 'High frequencies (4–16kHz)' },
                ] as { label: string; key: 'bass' | 'mid' | 'treble'; desc: string }[]).map(({ label, key, desc }) => (
                  <div key={key}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
                      <div>
                        <span style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>{label}</span>
                        <span style={{fontSize:"11px",color:"#5c5755",marginLeft:"6px"}}>{desc}</span>
                      </div>
                      <span style={{fontSize:"11px",fontWeight:700,fontVariantNumeric:"tabular-nums",width:"38px",textAlign:"right",color:eq[key]>0?"#9e9894":eq[key]<0?"#5c5755":"#363230"}}>
                        {eq[key] > 0 ? `+${eq[key]}` : eq[key]}dB
                      </span>
                    </div>
                    <div style={{position:"relative",height:"4px",background:"#232020",borderRadius:"2px"}}>
                      {/* center tick */}
                      <div style={{position:"absolute",top:0,left:"50%",width:"1px",height:"100%",background:"#2e2b2b",borderRadius:"1px",pointerEvents:"none"}}/>
                      <input type="range" min="-12" max="12" step="1" value={eq[key]}
                        onChange={e => {
                          const v = parseInt(e.target.value);
                          const next = { ...eq, [key]: v };
                          setEq(next);
                          invoke('set_equalizer', { bass: next.bass, mid: next.mid, treble: next.treble }).catch(() => {});
                        }}
                        style={{position:"absolute",inset:0,width:"100%",opacity:0,cursor:"pointer",height:"100%"}}
                      />
                      {/* filled track */}
                      <div style={{
                          position:"absolute",top:0,height:"100%",borderRadius:"2px",pointerEvents:"none",transition:"all .15s",
                          left: eq[key] >= 0 ? '50%' : `${((eq[key] + 12) / 24) * 100}%`,
                          width: `${(Math.abs(eq[key]) / 24) * 100}%`,
                          background: eq[key] >= 0 ? '#9e9894' : '#3a3a3a',
                        }} />
                      {/* thumb */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white bg-[#0a0a0a] shadow pointer-events-none transition-all"
                        style={{ left: `calc(${((eq[key] + 12) / 24) * 100}% - 8px)` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        )}

        {}
        {activeTab === 'storage' && (
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            <div>
              <h2 style={{fontSize:"17px",fontWeight:700,color:"#e2ddd9",margin:"0 0 3px"}}>Storage</h2>
              <p style={{fontSize:"12px",color:"#5c5755",marginTop:"3px"}}>Backup and restore your playlists, queue, settings, and history.</p>
            </div>

            {}
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Backup Location</h3>
                <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Choose where backup files are saved.</p>
              </div>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.025)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} onClick={async () => {
                try {
                  const sel = await (await import('@tauri-apps/plugin-dialog')).open({ directory: true, multiple: false, defaultPath: backupPath });
                  if (sel) setBackupPath(sel as string);
                } catch {}
              }}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:"12px",fontFamily:"monospace",color:"#c8c4c0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{backupPath || downloadPath}</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>Backup file: veluna_backup.json</p>
                </div>
                <button style={{padding:"6px",marginLeft:"12px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",flexShrink:0,borderRadius:"7px",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <FolderOpen size={17} />
                </button>
              </div>
            </div>

            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              {}
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.025)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} onClick={onBackup}>
                <div>
                  <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Create Backup</h3>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Save all playlists, queue, history and settings to a JSON file.</p>
                </div>
                <button style={{padding:"6px",marginLeft:"12px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",flexShrink:0,borderRadius:"7px",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <Upload size={17} />
                </button>
              </div>

              {}
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.025)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} onClick={onRestore}>
                <div>
                  <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Restore Backup</h3>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Restore your data and settings from a backup file.</p>
                </div>
                <button style={{padding:"6px",marginLeft:"12px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",flexShrink:0,borderRadius:"7px",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <ArchiveRestore size={17} />
                </button>
              </div>

              {}
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(180,40,40,0.05)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                onClick={onReset}>
                <div>
                  <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Reset Veluna App</h3>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Clear all data and reset the app to its default state.</p>
                </div>
                <button style={{padding:"6px",color:"#a05050",background:"none",border:"none",cursor:"pointer",display:"flex",flexShrink:0,marginLeft:"10px"}}>
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            <div>
              <h2 style={{fontSize:"17px",fontWeight:700,color:"#e2ddd9",margin:"0 0 3px"}}>Appearance</h2>
              <p style={{fontSize:"12px",color:"#5c5755",marginTop:"3px"}}>Tray icon and window behaviour.</p>
            </div>
            <div style={{borderRadius:"10px",border:"1px solid #1c1a1a",overflow:"hidden"}}>
              <div style={{padding:"11px 14px",borderBottom:"1px solid #1c1a1a",background:"rgba(255,255,255,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>System Tray</h3>
                <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>Left-click icon toggles window. Tray menu: play/pause, next, prev, quit.</p>
              </div>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Enable Tray Icon</p>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"4px"}}>{trayEnabled ? 'Active — close button hides to tray' : 'Disabled — close exits app'}</p>
                </div>
                <button onClick={async () => {
                  const next = !trayEnabled;
                  try { await invoke('tray_set', { enabled: next }); setTrayEnabled(next); }
                  catch (e) { showToast(`Tray unavailable: ${e}`); }
                }} style={{position:"relative",width:"40px",height:"22px",borderRadius:"11px",flexShrink:0,background:trayEnabled?"rgba(226,221,217,0.65)":"#232020",border:"1px solid",borderColor:trayEnabled?"rgba(226,221,217,0.2)":"#2e2b2b",transition:"background .2s,border-color .2s",cursor:"pointer"}}>
                  <span style={{position:"absolute",top:"2px",width:"16px",height:"16px",borderRadius:"50%",transition:"left .2s",background:trayEnabled?"#0c0b0b":"#5c5755",left:trayEnabled?"20px":"2px"}}/>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function DownloadsPanel({
  downloadPath, onPlayLocalTrack, onDeleteLocalTrack,
  currentTrackPath, isPlaying, isLoadingTrack,
  onOpenInFileManager, onExportM3u, onChangeFolder,
}: {
  downloadPath: string; onPlayLocalTrack: (t: LocalTrack, list?: LocalTrack[], idx?: number) => void;
  onDeleteLocalTrack: (t: LocalTrack) => void; currentTrackPath: string | null;
  isPlaying: boolean; isLoadingTrack: boolean;
  onOpenInFileManager: (p: string) => void; onExportM3u: (ts: LocalTrack[]) => void;
  onChangeFolder: () => void;
}) {
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [scanning, setScanning] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);
  const [renaming, setRenaming] = useState<LocalTrack | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const dragLocalIdx = useRef<number | null>(null);
  const dragOverLocalIdxRef = useRef<number | null>(null);
  const [dragOverLocalIdx, setDragOverLocalIdx] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = searchQ.trim()
    ? tracks.filter(t => {
        const q = searchQ.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q);
      })
    : tracks;

  const scan = useCallback(async () => {
    setScanning(true); setError(null);
    try {
      const raw: LocalTrack[] = await invoke('scan_downloads', { path: downloadPath });
      setTracks(raw);
      setScanning(false);

      const di = await invoke<DiskInfo>('get_disk_usage', { path: downloadPath }).catch(() => null);
      if (di) setDiskInfo(di);

      setEnriching(true);
      for (const t of raw) {
        try {
          const m: { title: string; artist: string; duration: string } = await invoke('get_audio_metadata', { path: t.path });
          const enriched = { ...t, title: m.title || t.title, artist: m.artist || undefined, duration: m.duration !== '0:00' ? m.duration : undefined };
          setTracks(prev => prev.map(p => p.path === t.path ? enriched : p));
        } catch { /* keep original */ }
      }
      setEnriching(false);
    } catch (e) { setError(String(e)); setScanning(false); setEnriching(false); }
  }, [downloadPath]);

  useEffect(() => { scan(); }, [scan]);

  const confirmRename = async () => {
    if (!renaming || !renameVal.trim()) return;
    try {
      const newPath: string = await invoke('rename_local_file', { oldPath: renaming.path, newTitle: renameVal.trim() });
      setTracks(prev => prev.map(t => t.path === renaming.path ? { ...t, title: renameVal.trim(), path: newPath } : t));
      setRenaming(null);
    } catch (e) { setError(String(e)); }
  };


  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"22px 28px",zIndex:10}}>
      {}
      <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"14px"}}>
        <div style={{width:"40px",height:"40px",borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(226,221,217,0.06)",border:"1px solid rgba(226,221,217,0.1)",flexShrink:0}}>
          <HardDrive size={22} className="text-[#d4cfcf]" />
        </div>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontSize:"20px",fontWeight:800,color:"#e2ddd9",margin:0}}>Offline</h2>
          {}
          <button onClick={onChangeFolder}
            style={{display:"flex",alignItems:"center",gap:"5px",marginTop:"2px",fontSize:"12px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",fontFamily:"monospace",overflow:"hidden",maxWidth:"100%",padding:0,transition:"color .12s"}}
            onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")} title="Change folder">
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{downloadPath}</span>
            <FolderOpen size={12} style={{flexShrink:0}}/>
          </button>
          {diskInfo && <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>{formatBytes(diskInfo.used_bytes)} used · {diskInfo.track_count} files</p>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"5px",flexShrink:0}}>
          <button onClick={onChangeFolder} title="Change folder"
            style={{padding:"7px",borderRadius:"8px",border:"1px solid #252222",background:"transparent",color:"#5c5755",cursor:"pointer",display:"flex",transition:"color .12s,border-color .12s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#2e2b2b";}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}><FolderOpen size={15}/></button>
          {tracks.length > 0 && (
            <button onClick={()=>onExportM3u(tracks)} title="Export M3U"
              style={{padding:"7px",borderRadius:"8px",border:"1px solid #252222",background:"transparent",color:"#5c5755",cursor:"pointer",display:"flex",transition:"color .12s,border-color .12s"}}
              onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#2e2b2b";}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}><FileOutput size={15}/></button>
          )}
          <button onClick={scan} disabled={scanning} title="Refresh"
            style={{padding:"7px",borderRadius:"8px",border:"1px solid #252222",background:"transparent",color:"#5c5755",cursor:scanning?"not-allowed":"pointer",display:"flex",opacity:scanning?0.4:1,transition:"color .12s,border-color .12s"}}
            onMouseEnter={e=>{if(!scanning){e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#2e2b2b";}}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}>
            <RefreshCw size={15} style={scanning?{animation:"spin 0.8s linear infinite"}:{}}/>
          </button>
        </div>
      </div>

      {}
      {!scanning && tracks.length > 0 && (
        <div style={{position:"relative",marginBottom:"10px"}}>
          <Search size={14} style={{position:"absolute",left:"11px",top:"50%",transform:"translateY(-50%)",color:searchQ?"#9e9894":"#363230",pointerEvents:"none"}}/>
          <input ref={searchRef} type="text" placeholder="Filter tracks…" value={searchQ}
            onChange={e=>setSearchQ(e.target.value)}
            style={{width:"100%",height:"36px",background:"#161414",border:"1px solid #252222",color:"#e2ddd9",borderRadius:"9px",padding:"0 32px 0 34px",fontSize:"13px",outline:"none"}}
          />
          {searchQ && (
            <button onClick={()=>setSearchQ('')} style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#5c5755",display:"flex",padding:"2px"}} onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
              <X size={13}/>
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"8px",background:"rgba(160,40,40,0.08)",border:"1px solid rgba(160,40,40,0.2)",color:"#a05050",fontSize:"12px",marginBottom:"16px"}}>
          <AlertCircle size={15} style={{flexShrink:0}}/><span>{error}</span>
        </div>
      )}

      {scanning && (
        <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"8px 12px"}}>
              <div style={{width:"38px",height:"38px",borderRadius:"7px",background:"#1c1a1a",flexShrink:0}} className="animate-pulse"/>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:"6px"}}>
                <div style={{height:"11px",background:"#1c1a1a",borderRadius:"3px",width:`${50+(i*11)%35}%`}} className="animate-pulse"/>
                <div style={{height:"9px",background:"#1c1a1a",borderRadius:"3px",width:`${25+(i*7)%20}%`}} className="animate-pulse"/>
              </div>
            </div>
          ))}
        </div>
      )}

      {!scanning && tracks.length === 0 && !error && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"160px",gap:"12px",textAlign:"center"}}>
          <div style={{width:"52px",height:"52px",borderRadius:"12px",background:"#161414",border:"1px solid #1c1a1a",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <FileMusic size={22} strokeWidth={1} style={{color:"#363230"}}/>
          </div>
          <div>
            <div style={{fontSize:"13px",fontWeight:600,color:"#5c5755"}}>No audio files found</div>
            <div style={{fontSize:"11px",color:"#363230",marginTop:"4px"}}>Download tracks from Home or change folder in Settings</div>
          </div>
        </div>
      )}

      {!scanning && tracks.length > 0 && (
        <>
          <div className="v-section-head">
            <h2>{searchQ.trim()?`${filtered.length} result${filtered.length!==1?'s':''}`:`${tracks.length} track${tracks.length!==1?'s':''}`}</h2>
            {enriching && <span style={{fontSize:"11px",color:"#5c5755",display:"flex",alignItems:"center",gap:"5px"}}><div style={{width:"10px",height:"10px",border:"1.5px solid #5c5755",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>reading…</span>}
            {!searchQ && !enriching && <span style={{fontSize:"10px",color:"#363230"}}>drag to reorder</span>}
          </div>

          {filtered.length === 0 && searchQ && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"110px",color:"#363230",gap:"7px"}}>
              <Search size={28} strokeWidth={1} />
              <p style={{fontSize:"12px",color:"#5c5755"}}>No tracks match "{searchQ}"</p>
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
            {filtered.map((track, i) => {
              const isActive = currentTrackPath === track.path;
              const isHov = hovered === track.path;
              const isDragOver = dragOverLocalIdx === i && dragLocalIdx.current !== null && dragLocalIdx.current !== i;
              return (
                <div key={track.path}
                  className={`v-track${isActive?' v-track--active':''}`}
                  style={{position:"relative",borderColor:isDragOver?"rgba(226,221,217,0.2)":"undefined"}}
                  onMouseEnter={() => { setHovered(track.path); if(dragLocalIdx.current!==null){dragOverLocalIdxRef.current=i;setDragOverLocalIdx(i);} }}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onPlayLocalTrack(track, searchQ ? filtered : tracks, i)}
                >
                  {isDragOver && <div style={{position:"absolute",top:0,left:0,right:0,height:"1.5px",background:"rgba(226,221,217,0.5)",borderRadius:"1px",zIndex:10,pointerEvents:"none"}} />}
                  {!searchQ && (
                    <div style={{width:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"grab",opacity:isHov?0.5:0,transition:"opacity .12s"}}
                      onMouseDown={e => {
                        e.preventDefault();
                        dragLocalIdx.current = i; dragOverLocalIdxRef.current = i; setDragOverLocalIdx(i);
                        const onUp = () => {
                          const from = dragLocalIdx.current; const to = dragOverLocalIdxRef.current;
                          dragLocalIdx.current = null; dragOverLocalIdxRef.current = null; setDragOverLocalIdx(null);
                          window.removeEventListener('mouseup', onUp);
                          if (from===null||to===null||from===to) return;
                          setTracks(prev => { const next=[...prev]; const [moved]=next.splice(from,1); next.splice(to,0,moved); return next; });
                        };
                        window.addEventListener('mouseup', onUp);
                      }}>
                      <svg width="8" height="14" viewBox="0 0 10 16" fill="#5c5755"><circle cx="3" cy="3" r="1.5"/><circle cx="7" cy="3" r="1.5"/><circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/><circle cx="3" cy="13" r="1.5"/><circle cx="7" cy="13" r="1.5"/></svg>
                    </div>
                  )}
                  <div className="v-track__num">
                    {isActive&&isLoadingTrack
                      ? <div style={{width:"12px",height:"12px",border:"1.5px solid #9e9894",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
                      : isActive&&isPlaying
                        ? <div style={{display:"flex",gap:"2px",alignItems:"flex-end",height:"13px",justifyContent:"center"}}>{[100,65,80].map((h,j)=><div key={j} style={{width:"2.5px",background:"#9e9894",borderRadius:"1px",height:`${h}%`,animation:`barBounce ${0.7+j*0.12}s ease-in-out ${j*110}ms infinite`,transformOrigin:"bottom"}}/>)}</div>
                        : isHov ? <Play size={12} style={{fill:"#e2ddd9",color:"#e2ddd9",margin:"0 auto"}}/>
                        : i+1}
                  </div>
                  <div style={{width:"38px",height:"38px",borderRadius:"7px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:isActive?"rgba(226,221,217,0.06)":"#1c1a1a",border:`1px solid ${isActive?"rgba(226,221,217,0.1)":"rgba(255,255,255,0.05)"}`}}>
                    <FileMusic size={16} style={{color:isActive?"#9e9894":"#363230"}}/>
                  </div>
                  <div className="v-track__info">
                    <div className="v-track__title">{track.title}</div>
                    <div className="v-track__artist">{track.artist||track.extension.toUpperCase()} · {formatBytes(track.size_bytes)}</div>
                  </div>
                  <div className="v-track__actions">
                    <button className="v-track__btn" title="Rename" onClick={e=>{e.stopPropagation();setRenaming(track);setRenameVal(track.title);}}><Pencil size={12}/></button>
                    <button className="v-track__btn" title="Show in folder" onClick={e=>{e.stopPropagation();onOpenInFileManager(track.path);}}><FolderOpen size={12}/></button>
                    <button className="v-track__btn" title="Delete" onClick={e=>{e.stopPropagation();onDeleteLocalTrack(track);scan();}}
                      onMouseEnter={e=>(e.currentTarget.style.color="#b05555")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}><Trash2 size={12}/></button>
                  </div>
                  <span style={{fontSize:"11px",color:"#363230",fontVariantNumeric:"tabular-nums",width:"40px",textAlign:"right",flexShrink:0}}>{track.duration||"—"}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {}
      {renaming && (
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,3,3,0.88)"}}>
          <div style={{background:"#161414",border:"1px solid #252222",padding:"20px",borderRadius:"12px",width:"300px",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}}>
            <div style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",marginBottom:"14px"}}>Rename Track</div>
            <input autoFocus type="text" value={renameVal} onChange={e=>setRenameVal(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')confirmRename();if(e.key==='Escape')setRenaming(null);}}
              style={{width:"100%",background:"#1c1a1a",border:"1px solid #252222",color:"#e2ddd9",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",marginBottom:"14px",boxSizing:"border-box"}}/>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
              <button onClick={()=>setRenaming(null)} style={{padding:"7px 14px",background:"transparent",border:"1px solid #252222",color:"#5c5755",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:500}}>Cancel</button>
              <button onClick={confirmRename} style={{padding:"7px 14px",background:"#e2ddd9",color:"#0c0b0b",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:700,border:"none"}}>Rename</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SpeedSelector = React.memo(({ speed, onChange }: { speed: number; onChange: (s: number) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        style={{display:"flex",alignItems:"center",gap:"5px",padding:"5px 8px",borderRadius:"7px",fontSize:"11px",fontWeight:700,border:`1px solid ${speed!==1?"rgba(226,221,217,0.2)":"rgba(255,255,255,0.12)"}`,background:speed!==1?"rgba(226,221,217,0.07)":"transparent",cursor:"pointer",color:speed!==1?"rgba(226,221,217,0.9)":"rgba(255,255,255,0.5)",transition:"all .12s"}}>
        <Gauge size={11} />
        {speed}x
      </button>
      {open && (
        <div style={{position:"absolute",bottom:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",background:"#161414",border:"1px solid #252222",borderRadius:"10px",overflow:"hidden",boxShadow:"0 12px 36px rgba(0,0,0,0.85)",zIndex:50,minWidth:"200px",animation:"dropIn 0.12s ease-out"}}>
          <p style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#363230",padding:"8px 12px 4px"}}>Speed</p>
          {speeds.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              style={{width:"100%",textAlign:"left",padding:"7px 12px",fontSize:"12px",fontWeight:600,border:"none",background:speed===s?"rgba(226,221,217,0.06)":"transparent",cursor:"pointer",color:speed===s?"rgba(226,221,217,0.9)":"rgba(255,255,255,0.45)",transition:"background .08s,color .08s"}}
              onMouseEnter={e=>{if(speed!==s){(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.05)";(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.85)";}}}
              onMouseLeave={e=>{if(speed!==s){(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.45)";}}} >
              {s}× {s===1&&<span style={{color:"#363230",fontSize:"10px",fontWeight:400,marginLeft:"4px"}}>normal</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

function LyricsAudioDropdown({ devices, switching, onSwitch }: {
  devices: { id: string; name: string; form: string; is_default: boolean }[];
  switching: boolean;
  onSwitch: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const active = devices.find(d => d.is_default) ?? devices[0];
  return (
    <div style={{width:"100%",position:"relative"}}>
      <button onClick={() => setOpen(o => !o)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"8px",textAlign:"left",border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.06)",cursor:"pointer",transition:"background .12s"}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.06)";}}>
        <Volume2 size={12} style={{color:"#9e9894",flexShrink:0}}/>
        <span style={{fontSize:"12px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,textAlign:"left",color:"rgba(255,255,255,0.7)"}}>{active?.name ?? 'No device'}</span>
        <ChevronDown size={11} style={{color:"rgba(255,255,255,0.3)",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s",flexShrink:0}}/>
      </button>
      {open && (
        <div style={{position:"absolute",bottom:"calc(100% + 6px)",left:0,right:0,borderRadius:"10px",overflow:"hidden",zIndex:20,background:"#161414",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 16px 40px rgba(0,0,0,0.9)"}}>
          <div style={{padding:"7px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <span style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,0.3)"}}>Output Device</span>
          </div>
          {devices.map(dev => (
            <button key={dev.id} disabled={switching}
              onClick={() => { if (!dev.is_default) onSwitch(dev.id); setOpen(false); }}
              style={{width:"100%",display:"flex",alignItems:"center",gap:"9px",padding:"9px 12px",textAlign:"left",border:"none",background:dev.is_default?"rgba(255,255,255,0.05)":"transparent",cursor:dev.is_default?"default":"pointer",transition:"background .1s"}}
              onMouseEnter={e=>{if(!dev.is_default)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.05)";}}
              onMouseLeave={e=>{if(!dev.is_default)(e.currentTarget as HTMLElement).style.background="transparent";}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",flexShrink:0,background:dev.is_default?"#9e9894":"rgba(255,255,255,0.15)"}}/>
              <span style={{fontSize:"12px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:dev.is_default?"#fff":"rgba(255,255,255,0.5)",flex:1,textAlign:"left"}}>{dev.name}</span>
              {dev.is_default && <span style={{fontSize:"9px",fontWeight:700,color:"#9e9894",flexShrink:0,letterSpacing:".05em"}}>ACTIVE</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Veluna() {

  
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    
    const id = requestAnimationFrame(() => setIsHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadLS('vg_searchHistory', []));
  const [showHistory, setShowHistory] = useState(false);
  const [, setHasSearched] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => loadLS('vg_currentTrack', null));
  const [currentLocalPath, setCurrentLocalPath] = useState<string | null>(null);
  const currentLocalPathRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const setIsPlayingSync = useCallback((v: boolean) => { isPlayingRef.current = v; setIsPlaying(v); }, []);

  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState(__APP_VERSION__);
  useEffect(() => {
    import('@tauri-apps/api/app').then(m => m.getVersion()).then(setAppVersion).catch(() => {});
  }, []);
  const [_navHistory, setNavHistory] = useState<string[]>([]);

  const navigateTo = useCallback((nav: string) => {
    setNavHistory(prev => [...prev.slice(-20), activeNav]);
    setActiveNav(nav);
  }, [activeNav]);

  const navigateBack = useCallback(() => {
    setNavHistory(prev => {
      const next = [...prev];
      const dest = next.pop() ?? 'home';
      setActiveNav(dest);
      return next;
    });
  }, []);
  const [trackDurationSeconds, setTrackDurationSeconds] = useState(0);
  const trackDurationRef = useRef(0);
  const [progressSeconds, setProgressSeconds] = useState(0);
  const progressSecondsRef = useRef(0);

  const [isSearching, setIsSearching] = useState(false);

  
  useEffect(() => {
    if (activeNav === 'home') {
      setSearchQuery('');
      setTracks([]);
      setIsSearching(false);
    }
  }, [activeNav]);

  const [quickPicks, setQuickPicks] = useState<Track[]>(() => loadLS('vg_quickPicks', []));

  const [queue, setQueue] = useState<Track[]>(() => loadLS('vg_queue', []));
  const [queuePulseKey, setQueuePulseKey] = useState(0);
  const [playHistory, setPlayHistory] = useState<Track[]>(() => loadLS('vg_playHistory', []));
  
  const [playCounts, setPlayCounts] = useState<Record<string, number>>(() => loadLS('vg_playCounts', {}));
  const [listenSecs, setListenSecs] = useState<Record<string, number>>(() => loadLS('vg_listenSecs', {}));
  const [firstSeen, setFirstSeen] = useState<Record<string, string>>(() => loadLS('vg_firstSeen', {}));
  const [dailyPlays, setDailyPlays] = useState<Record<string, number>>(() => loadLS('vg_dailyPlays', {}));
  const listenSecsRef = useRef(listenSecs);
  useEffect(() => { listenSecsRef.current = listenSecs; }, [listenSecs]);
  const [shuffle, setShuffle] = useState<boolean>(() => loadLS('vg_shuffle', false));
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => loadLS('vg_repeatMode', 'off'));
  const repeatModeRef = useRef<RepeatMode>(loadLS('vg_repeatMode', 'off'));
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const dragQueueIdx = useRef<number | null>(null);
  const dragOverQueueIdxRef = useRef<number | null>(null);
  const [dragOverQueueIdx, setDragOverQueueIdx] = React.useState<number | null>(null);
  const dragPlaylistIdx = useRef<number | null>(null);
  const dragOverPlaylistIdxRef = useRef<number | null>(null);
  const [dragOverPlaylistIdx, setDragOverPlaylistIdx] = React.useState<number | null>(null);
  const dragPlaylistCardIdx = useRef<number | null>(null);
  const dragOverPlaylistCardIdxRef = useRef<number | null>(null);
  const [dragOverPlaylistCardIdx, setDragOverPlaylistCardIdx] = React.useState<number | null>(null);

  const [volume, setVolume] = useState<number>(() => loadLS('vg_volume', 100));
  const [previousVolume, setPreviousVolume] = useState(100);

  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const isDraggingProgressRef = useRef(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  
  const [playlists, setPlaylists] = useState<Playlist[]>(() =>
    loadLS('vg_playlists', [{ id: 'p1', name: 'Liked Songs', description: '', tracks: [] }])
  );
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [playlistSearchQ, setPlaylistSearchQ] = useState('');
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [renamingPlaylist, setRenamingPlaylist] = useState<Playlist | null>(null);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [showYtImportModal, setShowYtImportModal] = useState(false);
  const [showDuplicatesPlaylist, setShowDuplicatesPlaylist] = useState<Playlist | null>(null);
  const [bulkEditPlaylist, setBulkEditPlaylist] = useState<Playlist | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [renameDescVal, setRenameDescVal] = useState('');
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [sidebarPlaylistsExpanded, setSidebarPlaylistsExpanded] = useState(true);
  // Background Spotify import progress pill
  const [bgImport, setBgImport] = useState<{ matched: number; total: number; label: string } | null>(null);
  // Pending spotify save — survives modal minimize so name popup appears when done
  const [pendingSpotifyImport, setPendingSpotifyImport] = useState<{ tracks: Track[]; matchedCount: number; failedCount: number } | null>(null);
  // Lyrics state
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsData, setLyricsData] = useState<{ lines: {time:number;text:string}[]; title: string; artist: string } | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  // Artist thumbnail cache for Stats page
  const [artistThumbs, setArtistThumbs] = useState<Record<string, string>>({});

  
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [infoModalTrack, setInfoModalTrack] = useState<Track | null>(null);
  const [downloadingTracks, setDownloadingTracks] = useState<Record<string, number>>({});
  const [hoveredTrackUrl, setHoveredTrackUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  
  const [downloadQuality, setDownloadQuality] = useState<string>(() => loadLS('vg_dlQuality', 'High'));
  const [downloadFormat, setDownloadFormatState] = useState<string>(() => loadLS('vg_dlFormat', 'mp3'));
  const [embedThumbnail, setEmbedThumbnailState] = useState<boolean>(() => loadLS('vg_embedThumb', true));
  const [duplicateDetect, setDuplicateDetectState] = useState<boolean>(() => loadLS('vg_dupDetect', true));
  const [downloadPath, setDownloadPath] = useState<string>(() => loadLS('vg_dlPath', '~/Downloads'));
  const [backupPath, setBackupPathState] = useState<string>(() => loadLS('vg_backupPath', ''));
  const setBackupPath = useCallback((p: string) => { setBackupPathState(p); saveLS('vg_backupPath', p); }, []);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(() => loadLS('vg_speed', 1));
  const [crossfadeSeconds] = useState<number>(() => loadLS('vg_crossfade', 0));
  const [loudnormEnabled, setLoudnormEnabledState] = useState<boolean>(() => loadLS('vg_loudnorm', true));
  const [streamQuality, setStreamQualityState] = useState<string>(() => loadLS('vg_streamQuality', 'best'));
  const [skipSilence, setSkipSilenceState] = useState<boolean>(() => loadLS('vg_skipSilence', false));
  const [lyricsSource, setLyricsSource] = useState<string>(() => loadLS('vg_lyricsSource', 'lrclib'));
  const [trayEnabled, setTrayEnabled] = useState<boolean>(() => loadLS('vg_trayEnabled', false));
  const [audioDevices, setAudioDevices] = useState<{ id: string; name: string; form: string; is_default: boolean }[]>([]);
  const [switchingDevice, setSwitchingDevice] = useState(false);

  useEffect(() => {
    invoke<{ id: string; name: string; form: string; is_default: boolean }[]>('list_audio_devices')
      .then(setAudioDevices).catch(() => {});
  }, []);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const bookmarksRef = useRef<Record<string, number>>(loadLS('vg_bookmarks', {}));
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const abLoopRef = useRef<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [eq, setEqState] = useState<{ bass: number; mid: number; treble: number }>(() => loadLS('vg_eq', { bass: 0, mid: 0, treble: 0 }));

  const [sleepTimer, setSleepTimerState] = useState(-1);
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [showSleepPopover, setShowSleepPopover] = useState(false);

  
  const searchRef = useRef<HTMLInputElement>(null);
  const endDetectedRef = useRef(false);
  const currentTrackRef = useRef(currentTrack);
  const queueRef = useRef(queue);

  const localTracksListRef = useRef<LocalTrack[]>([]);
  const localTrackIndexRef = useRef(0);
  
  const playlistContextRef = useRef<{ tracks: Track[]; index: number } | null>(null);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  
  useEffect(() => { saveLS('vg_playlists', playlists); }, [playlists]);
  const prevQueueLenRef = useRef(0);
  useEffect(() => {
    saveLS('vg_queue', queue);
    if (queue.length > prevQueueLenRef.current) setQueuePulseKey(k => k + 1);
    prevQueueLenRef.current = queue.length;
  }, [queue]);
  useEffect(() => { saveLS('vg_playHistory', playHistory); }, [playHistory]);
  useEffect(() => { saveLS('vg_playCounts', playCounts); }, [playCounts]);
  useEffect(() => { saveLS('vg_listenSecs', listenSecs); }, [listenSecs]);
  useEffect(() => { saveLS('vg_firstSeen', firstSeen); }, [firstSeen]);
  useEffect(() => { saveLS('vg_dailyPlays', dailyPlays); }, [dailyPlays]);
  useEffect(() => { saveLS('vg_shuffle', shuffle); }, [shuffle]);
  useEffect(() => { saveLS('vg_repeatMode', repeatMode); }, [repeatMode]);
  useEffect(() => { saveLS('vg_volume', volume); }, [volume]);
  
  useEffect(() => { saveLS('vg_currentTrack', currentTrack); }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack) return;
    const parseDuration = (d: string): number => {
      const parts = d.split(':').map(Number);
      if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
      if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
      return 0;
    };
    invoke('set_mpris_metadata', {
      title:        currentTrack.title  ?? '',
      artist:       currentTrack.artist ?? '',
      coverUrl:     currentTrack.cover  ?? '',
      durationSecs: parseDuration(currentTrack.duration ?? '0:00'),
      playing:      isPlaying,
    }).catch(() => {});
  }, [currentTrack, isPlaying]);

  
  useEffect(() => { saveLS('vg_searchHistory', searchHistory); }, [searchHistory]);
  useEffect(() => { saveLS('vg_dlQuality', downloadQuality); }, [downloadQuality]);
  useEffect(() => { saveLS('vg_dlFormat', downloadFormat); }, [downloadFormat]);
  useEffect(() => { saveLS('vg_embedThumb', embedThumbnail); }, [embedThumbnail]);
  useEffect(() => { saveLS('vg_dupDetect', duplicateDetect); }, [duplicateDetect]);
  useEffect(() => { saveLS('vg_dlPath', downloadPath); }, [downloadPath]);
  useEffect(() => { saveLS('vg_quickPicks', quickPicks); }, [quickPicks]);
  useEffect(() => { saveLS('vg_speed', playbackSpeed); }, [playbackSpeed]);
  useEffect(() => { saveLS('vg_loudnorm', loudnormEnabled); invoke('set_loudnorm_enabled', { enabled: loudnormEnabled }).catch(() => {}); }, [loudnormEnabled]);
  useEffect(() => { saveLS('vg_streamQuality', streamQuality); invoke('set_stream_quality', { quality: streamQuality }).catch(() => {}); }, [streamQuality]);
  useEffect(() => { saveLS('vg_skipSilence', skipSilence); invoke('set_skip_silence', { enabled: skipSilence }).catch(() => {}); }, [skipSilence]);
  useEffect(() => { saveLS('vg_eq', eq); }, [eq]);
  useEffect(() => { saveLS('vg_lyricsSource', lyricsSource); }, [lyricsSource]);
  useEffect(() => { saveLS('vg_trayEnabled', trayEnabled); }, [trayEnabled]);

  // Restore tray on startup
  useEffect(() => {
    if (trayEnabled) invoke('tray_set', { enabled: true }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tray events — wire to same refs as MPRIS
  useEffect(() => {
    const unsubs = [
      listen('tray_play_pause', () => mprisToggleRef.current()),
      listen('tray_next', () => mprisNextRef.current()),
      listen('tray_prev', () => mprisPrevRef.current()),
    ];
    return () => { unsubs.forEach(p => p.then(fn => fn())); };
  }, []);

  
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  
  useEffect(() => {
    const h = () => { setCtxMenu(null); setShowHistory(false); setShowSleepPopover(false); };
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r: number = await invoke('get_sleep_timer_remaining');
        if (r >= 0) {
          setSleepTimerState(r);
          
          if (r === 0 && isPlayingRef.current) {
            try { await invoke('pause_audio'); setIsPlayingSync(false); } catch {}
            setSleepTimerState(-1);
          }
        } else {
          setSleepTimerState(-1);
        }
      } catch {}
    }, sleepTimer > 0 ? 2000 : 10000);
    return () => clearInterval(id);
  }, [sleepTimer, setIsPlayingSync]);

  
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<BatchProgress>('batch_download_progress', e => {
      showToast(`Downloaded ${e.payload.index + 1}/${e.payload.total}${e.payload.error ? ' (error)' : ''}`);
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [showToast]);

  const mprisToggleRef    = useRef<() => void>(() => {});
  const mprisNextRef      = useRef<() => void>(() => {});
  const mprisPrevRef      = useRef<() => void>(() => {});

  useEffect(() => {
    const unlisteners: (() => void)[] = [];
    listen('mpris_play_pause', () => mprisToggleRef.current()).then(fn => unlisteners.push(fn));
    listen('mpris_next',       () => mprisNextRef.current()).then(fn => unlisteners.push(fn));
    listen('mpris_prev',       () => mprisPrevRef.current()).then(fn => unlisteners.push(fn));

    return () => unlisteners.forEach(fn => fn());
  }, []);



  useEffect(() => {
    invoke<string | null>('check_for_update').then(v => setUpdateAvailable(v ?? null)).catch(() => {});
  }, []);

  // Fetch artist thumbnails when stats page opens
  useEffect(() => {
    if (activeNav !== 'stats') return;
    const artistCounts: Record<string, number> = {};
    Object.entries(playCounts).forEach(([url, count]) => {
      const artist = [...quickPicks, ...playHistory].find(t => t.url === url)?.artist;
      if (artist?.trim()) artistCounts[artist] = (artistCounts[artist] || 0) + (count as number);
    });
    const top5 = Object.entries(artistCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([a])=>a);
    top5.forEach(async (artist) => {
      if (artistThumbs[artist]) return;
      try {
        const res: string = await invoke('search_yt_music', { query: artist, searchType: 'artist' });
        const items = JSON.parse(res);
        const thumb = items[0]?.thumbnail;
        if (thumb) setArtistThumbs(prev => ({ ...prev, [artist]: thumb }));
      } catch {}
    });
  }, [activeNav]);
  useEffect(() => {
    if (!showLyrics || !currentTrack) return;
    const title = currentTrack.title;
    const artist = currentTrack.artist;
    if (!title || !artist) return;
    setLyricsLoading(true);
    setLyricsData(null);
    invoke<string>('fetch_lyrics', { title, artist, album: '', duration: trackDurationSeconds || 0, source: lyricsSource })
      .then(raw => {
        try {
          const lines: {time:number;text:string}[] = JSON.parse(raw);
          setLyricsData({ lines, title, artist });
        } catch { setLyricsData({ lines: [], title, artist }); }
      })
      .catch(() => setLyricsData({ lines: [], title, artist }))
      .finally(() => setLyricsLoading(false));
  }, [showLyrics, currentTrack?.url]);

  useEffect(() => {
    if (!isPlaying || !currentTrack || isLoadingTrack) return;
    const url = currentTrack.url;
    const id = setInterval(() => {
      setListenSecs(prev => {
        const next = { ...prev, [url]: (prev[url] || 0) + 5 };
        listenSecsRef.current = next;
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [isPlaying, currentTrack?.url, isLoadingTrack]);

    
  const lastPrefetchUrl = useRef<string | null>(null);
  useEffect(() => {
    const nextUrl = queue[0]?.url;
    
    if (nextUrl && !nextUrl.startsWith('local://') && nextUrl !== lastPrefetchUrl.current) {
      lastPrefetchUrl.current = nextUrl;
      invoke('prefetch_track', { url: nextUrl }).catch(() => {});
    }
  }, [queue]);

  
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => { invoke<AudioInfo>('get_audio_info').then(setAudioInfo).catch(() => {}); }, 6000);
    invoke<AudioInfo>('get_audio_info').then(setAudioInfo).catch(() => {});
    return () => clearInterval(id);
  }, [isPlaying]);

  
  const setPlaybackSpeed = useCallback((s: number) => {
    setPlaybackSpeedState(s);
    invoke('set_playback_speed', { speed: s }).catch(() => {});
    showToast(`Speed: ${s}x`);
  }, [showToast]);

  const setSleepTimerMinutes = useCallback((m: number) => {
    invoke('set_sleep_timer', { seconds: m * 60 })
      .then(() => { setSleepTimerState(m * 60); showToast(`Sleep timer: ${m}m`); })
      .catch(() => {});
  }, [showToast]);

  const cancelSleepTimer = useCallback(() => {
    invoke('cancel_sleep_timer').then(() => { setSleepTimerState(-1); showToast('Sleep timer cancelled'); }).catch(() => {});
  }, [showToast]);

  
  const handleBackup = useCallback(async () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        playlists, queue, playHistory, playCounts, listenSecs, dailyPlays, firstSeen,
        shuffle, repeatMode, volume, playbackSpeed, eq,
        downloadQuality, downloadFormat, downloadPath, backupPath,
        embedThumbnail, duplicateDetect,
        loudnormEnabled, streamQuality, skipSilence,
        searchHistory, quickPicks, currentTrack,
      };
      const json = JSON.stringify(data, null, 2);
      const sep = navigator.platform.includes('Win') ? '\\' : '/';
      const resolvedBase = backupPath || downloadPath || '';
      if (resolvedBase) {
        const filePath = resolvedBase.replace(/[/\\]$/, '') + sep + 'veluna_backup.json';
        await invoke('write_text_file', { path: filePath, content: json });
        showToast(`Backup saved to ${filePath}`);
      } else {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'veluna_backup.json'; a.click();
        URL.revokeObjectURL(url);
        showToast('Backup saved — set a Backup Location in Storage settings to choose a folder');
      }
    } catch (e) { showToast(`Backup failed: ${e}`); }
  }, [playlists, queue, playHistory, playCounts, listenSecs, dailyPlays, firstSeen,
      shuffle, repeatMode, volume, playbackSpeed, eq,
      downloadQuality, downloadFormat, downloadPath, backupPath,
      embedThumbnail, duplicateDetect, loudnormEnabled, streamQuality, skipSilence,
      searchHistory, quickPicks, currentTrack, showToast]);

  // Must be synchronous so the file picker works in Tauri (async breaks gesture context)
  const handleRestore = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async (e) => {
      document.body.removeChild(input);
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.version !== 1) { showToast('Invalid or incompatible backup file'); return; }

        // Restore every field and persist each to localStorage immediately
        const ls = <T,>(key: string, val: T): T => { saveLS(key, val); return val; };

        if (data.playlists)       setPlaylists(ls('vg_playlists', data.playlists));
        if (data.queue)           setQueue(ls('vg_queue', data.queue));
        if (data.playHistory)     setPlayHistory(ls('vg_playHistory', data.playHistory));
        if (data.playCounts)      setPlayCounts(ls('vg_playCounts', data.playCounts));
        if (data.listenSecs)      setListenSecs(ls('vg_listenSecs', data.listenSecs));
        if (data.dailyPlays)      setDailyPlays(ls('vg_dailyPlays', data.dailyPlays));
        if (data.firstSeen)       setFirstSeen(ls('vg_firstSeen', data.firstSeen));
        if (data.shuffle !== undefined) setShuffle(ls('vg_shuffle', data.shuffle));
        if (data.repeatMode)      setRepeatMode(ls('vg_repeat', data.repeatMode));
        if (data.volume !== undefined)  { setVolume(ls('vg_volume', data.volume)); invoke('set_volume', { volume: data.volume }).catch(() => {}); }
        if (data.playbackSpeed)   setPlaybackSpeedState(ls('vg_speed', data.playbackSpeed));
        if (data.eq)              setEqState(ls('vg_eq', data.eq));
        if (data.downloadQuality) setDownloadQuality(ls('vg_dlQuality', data.downloadQuality));
        if (data.downloadFormat)  setDownloadFormatState(ls('vg_dlFormat', data.downloadFormat));
        if (data.downloadPath)    setDownloadPath(ls('vg_dlPath', data.downloadPath));
        if (data.backupPath)      setBackupPath(ls('vg_backupPath', data.backupPath));
        if (data.embedThumbnail !== undefined) setEmbedThumbnailState(ls('vg_embedThumb', data.embedThumbnail));
        if (data.duplicateDetect !== undefined) setDuplicateDetectState(ls('vg_dupDetect', data.duplicateDetect));
        if (data.loudnormEnabled !== undefined) { setLoudnormEnabledState(ls('vg_loudnorm', data.loudnormEnabled)); invoke('set_loudnorm_enabled', { enabled: data.loudnormEnabled }).catch(() => {}); }
        if (data.streamQuality)   { setStreamQualityState(ls('vg_streamQuality', data.streamQuality)); invoke('set_stream_quality', { quality: data.streamQuality }).catch(() => {}); }
        if (data.skipSilence !== undefined) { setSkipSilenceState(ls('vg_skipSilence', data.skipSilence)); invoke('set_skip_silence', { enabled: data.skipSilence }).catch(() => {}); }
        if (data.searchHistory)   setSearchHistory(ls('vg_searchHistory', data.searchHistory));
        if (data.quickPicks)      setQuickPicks(ls('vg_quickPicks', data.quickPicks));
        if (data.currentTrack)    { setCurrentTrack(data.currentTrack); currentTrackRef.current = data.currentTrack; }

        showToast('Backup restored — all data loaded');
      } catch (err) {
        showToast(`Restore failed: could not read file (${err})`);
      }
    };
    input.click();
  }, [showToast, setBackupPath]);

  
  const handlePlayTrack = useCallback(async (track: Track, fromQueue = false) => {
    endDetectedRef.current = false;
    setAbLoop({ a: null, b: null }); abLoopRef.current = { a: null, b: null };
    setCurrentTrack(track); currentTrackRef.current = track;
    setCurrentLocalPath(null); currentLocalPathRef.current = null;
    setIsLoadingTrack(true); setIsPlayingSync(false);
    setProgressSeconds(0); progressSecondsRef.current = 0;
    setTrackDurationSeconds(0); trackDurationRef.current = 0;
    setWaveformData([]); setAudioInfo(null);
    setLyricsData(null); // clear stale lyrics on every new track

    // Always track play counts and daily plays, even for autoplay/queue
    setPlayCounts(prev => { const n = { ...prev, [track.url]: (prev[track.url] || 0) + 1 }; saveLS('vg_playCounts', n); return n; });
    const today = new Date().toISOString().slice(0, 10);
    setDailyPlays(prev => { const n = { ...prev, [today]: (prev[today] || 0) + 1 }; saveLS('vg_dailyPlays', n); return n; });
    setFirstSeen(prev => { if (prev[track.url]) return prev; const n = { ...prev, [track.url]: new Date().toISOString() }; saveLS('vg_firstSeen', n); return n; });

    if (!fromQueue) {
      setPlayHistory(prev => [track, ...prev].slice(0, 50));
      
      if (playlistContextRef.current) {
        const idx = playlistContextRef.current.tracks.findIndex(t => t.url === track.url);
        if (idx >= 0) playlistContextRef.current = { ...playlistContextRef.current, index: idx };
        else playlistContextRef.current = null; 
      }
    }
    setQuickPicks(prev => [track, ...prev.filter(t => t.url !== track.url)].slice(0, 20));

    try {
      await invoke('play_audio', { url: track.url });
      await invoke('set_volume', { volume });
      await invoke('set_playback_speed', { speed: playbackSpeed });
      await invoke('set_equalizer', { bass: eq.bass, mid: eq.mid, treble: eq.treble });

      // With persistent mpv + loadfile replace, play_audio returns fast (~200ms).
      // Poll until mpv reports duration > 0 (file opened and demuxed), then explicitly unpause.
      let waited = 0;
      await new Promise<void>(resolve => {
        const t = setInterval(async () => {
          waited += 200;
          try {
            const s: { position: number; duration: number; playing: boolean; paused: boolean } = await invoke('get_playback_state');
            if (s.duration > 0 || s.playing) {
              if (s.duration > 0) { setTrackDurationSeconds(s.duration); trackDurationRef.current = s.duration; }
              // Explicitly unpause if mpv started in paused state
              if (s.paused) { invoke('pause_audio').catch(() => {}); }
              clearInterval(t); resolve(); return;
            }
          } catch {}
          if (waited >= 12000) { clearInterval(t); resolve(); }
        }, 200);
      });

      setIsPlayingSync(true);

      // Poll for codec info — mpv reports 'unknown' until the demuxer finishes.
      // Keep retrying for up to 6s so the player bar never shows "UNKNOWN".
      let codecWaited = 0;
      const codecPoll = setInterval(async () => {
        codecWaited += 400;
        try {
          const info: AudioInfo = await invoke('get_audio_info');
          if (info?.codec && info.codec !== 'unknown' && info.codec !== '') {
            setAudioInfo(info);
            clearInterval(codecPoll);
          }
        } catch {}
        if (codecWaited >= 6000) clearInterval(codecPoll);
      }, 400);

      const bm = bookmarksRef.current[track.url];
      if (bm && bm > 2) {
        setTimeout(() => invoke('seek_audio', { time: bm }).catch(() => {}), 800);
      }
    } catch { setIsPlayingSync(false); }
    finally { setIsLoadingTrack(false); }
  }, [volume, playbackSpeed, eq, setIsPlayingSync]);

  
  const handlePlayLocalTrack = useCallback(async (local: LocalTrack, localList?: LocalTrack[], localIndex?: number) => {
    endDetectedRef.current = false;
    setCurrentLocalPath(local.path); currentLocalPathRef.current = local.path;
    
    if (localList !== undefined) {
      localTracksListRef.current = localList;
      localTrackIndexRef.current = localIndex ?? 0;
    } else if (localTracksListRef.current.length === 0) {
      
      localTracksListRef.current = [local];
      localTrackIndexRef.current = 0;
    } else {
      
      const idx = localTracksListRef.current.findIndex(t => t.path === local.path);
      if (idx >= 0) localTrackIndexRef.current = idx;
    }

    
    setIsLoadingTrack(false); setIsPlayingSync(false);
    setProgressSeconds(0); progressSecondsRef.current = 0;
    setTrackDurationSeconds(0); trackDurationRef.current = 0;
    setAudioInfo(null);

    const synth: Track = {
      id: -1, title: local.title,
      artist: local.artist || local.extension.toUpperCase(),
      duration: local.duration || '0:00',
      url: `local://${local.path}`, cover: '',
    };
    setCurrentTrack(synth); currentTrackRef.current = synth;

    
    if (local.duration && local.duration !== '0:00') {
      const d = parseDurationToSeconds(local.duration);
      if (d > 0) { setTrackDurationSeconds(d); trackDurationRef.current = d; }
    }

    
    invoke<number[]>('get_waveform_thumbnail', { path: local.path })
      .then(setWaveformData).catch(() => setWaveformData([]));

    try {
      await invoke('play_local_file', { path: local.path });
      await invoke('set_volume', { volume });
      await invoke('set_playback_speed', { speed: playbackSpeed });
      
      setIsPlayingSync(true);
      
      setTimeout(async () => {
        try {
          const s: { position: number; duration: number } = await invoke('get_playback_state');
          if (s.duration > 0) { setTrackDurationSeconds(s.duration); trackDurationRef.current = s.duration; }
        } catch {}
      }, 300);
    } catch { setIsPlayingSync(false); }
  }, [volume, playbackSpeed, setIsPlayingSync]);

  const handleDeleteLocalTrack = useCallback(async (t: LocalTrack) => {
    try { await invoke('delete_local_file', { path: t.path }); showToast(`Deleted: ${t.title}`); }
    catch (e) { showToast(`Delete failed: ${e}`); }
  }, [showToast]);

  const handleOpenInFileManager = useCallback((p: string) => { invoke('open_in_file_manager', { path: p }).catch(() => {}); }, []);

  const handleExportM3u = useCallback(async (localTracks: LocalTrack[]) => {
    try {
      const tracks = localTracks.map(t => ({ title: t.title, artist: t.artist || '', url: t.path, duration_secs: t.duration ? Math.round(parseDurationToSeconds(t.duration)) : 0 }));
      await invoke('export_playlist_m3u', { tracks, path: `${downloadPath}/playlist.m3u` });
      showToast('Playlist exported');
    } catch (e) { showToast(`Export failed: ${e}`); }
  }, [downloadPath, showToast]);

  const handleExportPlaylistM3u = useCallback(async (playlist: Playlist) => {
    try {
      const tracks = playlist.tracks.map(t => ({
        title: t.title, artist: t.artist || '',
        url: t.url,
        duration_secs: t.duration ? Math.round(parseDurationToSeconds(t.duration)) : 0,
      }));
      const safeName = playlist.name.replace(/[/\\:*?"<>|]/g, '_');
      const path = `${downloadPath}/${safeName}.m3u`;
      await invoke('export_playlist_m3u', { tracks, path });
      showToast(`Exported "${playlist.name}" to ${path}`);
    } catch (e) { showToast(`Export failed: ${e}`); }
  }, [downloadPath, showToast]);

  const handleImportPlaylistM3u = useCallback(() => {
    // Must be synchronous from user gesture for file picker to work in Tauri
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.m3u,.m3u8';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async (e) => {
      document.body.removeChild(input);
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) { showToast('Empty M3U file'); return; }

        const tracks: Track[] = [];
        let pendingTitle = '';
        let pendingArtist = '';

        for (const line of lines) {
          if (line.startsWith('#EXTINF:')) {
            // #EXTINF:duration,Artist - Title
            const meta = line.slice(line.indexOf(',') + 1);
            const dashIdx = meta.indexOf(' - ');
            if (dashIdx !== -1) {
              pendingArtist = meta.slice(0, dashIdx).trim();
              pendingTitle  = meta.slice(dashIdx + 3).trim();
            } else {
              pendingTitle  = meta.trim();
              pendingArtist = '';
            }
          } else if (!line.startsWith('#')) {
            const url = line;
            // Extract YouTube video ID for cover art
            const ytId = url.match(/(?:[?&]v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || '';
            // If no EXTINF title, derive from URL
            if (!pendingTitle) {
              pendingTitle = ytId
                ? 'YouTube Track'
                : url.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Track';
            }
            tracks.push({
              id: Date.now() + tracks.length,
              title:  pendingTitle,
              artist: pendingArtist,
              duration: '0:00',
              url,
              cover: ytId ? `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg` : '',
            });
            pendingTitle = '';
            pendingArtist = '';
          }
        }

        if (!tracks.length) { showToast('No tracks found in M3U file'); return; }
        const name = file.name.replace(/\.m3u8?$/i, '');
        setPlaylists(prev => [...prev, {
          id: `pl_${Date.now()}`,
          name,
          description: `Imported from ${file.name}`,
          tracks,
        }]);
        showToast(`Imported "${name}" — ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`);
      } catch (err) {
        showToast(`Import failed: ${err}`);
      }
    };
    input.click();
  }, [showToast, setPlaylists]);

  
  const handlePlayInContext = useCallback((track: Track, contextList: Track[]) => {
    const idx = contextList.findIndex(t => t.url === track.url);
    playlistContextRef.current = { tracks: contextList, index: Math.max(0, idx) };
    setQueue([]); 
    handlePlayTrack(track, true);
    
  }, [handlePlayTrack]);

  
  const togglePlayPause = useCallback(async () => {
    if (!currentTrackRef.current) return;
    
    if (!isPlayingRef.current) {
      try {
        const state: { playing: boolean; paused: boolean; position: number; duration: number; eof_reached: boolean } =
          await invoke('get_playback_state');
        // If mpv has no file loaded (position=0, not paused), restart the track from beginning
        if (state.position === 0 && !state.paused) {
          await handlePlayTrack(currentTrackRef.current, true);
          return;
        }
      } catch {
        // mpv not running — restart from beginning
        await handlePlayTrack(currentTrackRef.current, true);
        return;
      }
    }
    try { await invoke('pause_audio'); setIsPlayingSync(!isPlayingRef.current); } catch {}
  }, [setIsPlayingSync, handlePlayTrack]);

  const toggleMute = useCallback(async () => {
    const v = volume === 0 ? previousVolume : 0;
    if (volume > 0) setPreviousVolume(volume);
    setVolume(v);
    try { await invoke('set_volume', { volume: v }); } catch {}
  }, [volume, previousVolume]);

  const handleSkipForward = useCallback(async () => {
    const track = currentTrackRef.current;
    const isLocal = track?.url?.startsWith('local://');

    
    if (isLocal) {
      const list = localTracksListRef.current;
      const idx = localTrackIndexRef.current;
      let nextIdx: number;
      if (shuffle) {
        do { nextIdx = Math.floor(Math.random() * list.length); } while (nextIdx === idx && list.length > 1);
      } else {
        nextIdx = idx + 1;
      }
      if (nextIdx < list.length) {
        localTrackIndexRef.current = nextIdx;
        handlePlayLocalTrack(list[nextIdx], list, nextIdx);
      } else if (repeatModeRef.current === 'all' && list.length > 0) {
        localTrackIndexRef.current = 0;
        handlePlayLocalTrack(list[0], list, 0);
      }
      return;
    }

    
    const ctx = playlistContextRef.current;
    if (ctx && ctx.tracks.length > 1) {
      let nextIdx: number;
      if (shuffle) {
        do { nextIdx = Math.floor(Math.random() * ctx.tracks.length); }
        while (nextIdx === ctx.index && ctx.tracks.length > 1);
      } else {
        nextIdx = ctx.index + 1;
      }
      if (nextIdx < ctx.tracks.length) {
        playlistContextRef.current = { ...ctx, index: nextIdx };
        await handlePlayTrack(ctx.tracks[nextIdx], true);
      } else if (repeatModeRef.current === 'all') {
        playlistContextRef.current = { ...ctx, index: 0 };
        await handlePlayTrack(ctx.tracks[0], true);
      }
      return;
    }

    
    const q = queueRef.current;
    if (q.length > 0) { const [next, ...rest] = q; setQueue(rest); await handlePlayTrack(next, true); }
  }, [handlePlayTrack, handlePlayLocalTrack, shuffle]);

  const handleSkipBack = useCallback(async () => {
    const track = currentTrackRef.current;
    const isLocal = track?.url?.startsWith('local://');

    
    if (isLocal) {
      if (progressSecondsRef.current > 3) {
        await invoke('seek_audio', { time: 0 }).catch(() => {});
        progressSecondsRef.current = 0; setProgressSeconds(0);
        return;
      }
      const list = localTracksListRef.current;
      const idx = localTrackIndexRef.current;
      if (idx > 0) {
        const prevIdx = idx - 1;
        localTrackIndexRef.current = prevIdx;
        handlePlayLocalTrack(list[prevIdx], list, prevIdx);
      } else {
        await invoke('seek_audio', { time: 0 }).catch(() => {});
        progressSecondsRef.current = 0; setProgressSeconds(0);
      }
      return;
    }

    
    if (progressSecondsRef.current > 3) {
      await invoke('seek_audio', { time: 0 }).catch(() => {});
      progressSecondsRef.current = 0; setProgressSeconds(0);
      return;
    }

    
    const ctx = playlistContextRef.current;
    if (ctx && ctx.index > 0) {
      const prevIdx = ctx.index - 1;
      playlistContextRef.current = { ...ctx, index: prevIdx };
      await handlePlayTrack(ctx.tracks[prevIdx], true);
      return;
    }

    
    if (playHistory.length > 0) {
      const [prev, ...rest] = playHistory; setPlayHistory(rest); await handlePlayTrack(prev, true);
    } else {
      await invoke('seek_audio', { time: 0 }).catch(() => {});
      progressSecondsRef.current = 0; setProgressSeconds(0);
    }
  }, [playHistory, handlePlayTrack, handlePlayLocalTrack]);

  mprisToggleRef.current = togglePlayPause;
  mprisNextRef.current   = handleSkipForward;
  mprisPrevRef.current   = handleSkipBack;

  const toggleShuffle = useCallback(() => setShuffle(p => { showToast(!p ? 'Shuffle on' : 'Shuffle off'); return !p; }), [showToast]);
  const cycleRepeat = useCallback(() => setRepeatMode(p => {
    const n: RepeatMode = p === 'off' ? 'all' : p === 'all' ? 'one' : 'off';
    repeatModeRef.current = n;
    showToast(n === 'off' ? 'Repeat off' : n === 'all' ? 'Repeat all' : 'Repeat one');
    return n;
  }), [showToast]);

  
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.code === 'Space' && !isInput) { e.preventDefault(); togglePlayPause(); }
      if (e.code === 'ArrowRight' && !isInput && currentTrackRef.current) { e.preventDefault(); invoke('seek_relative', { seconds: 10 }).catch(() => {}); }
      if (e.code === 'ArrowLeft' && !isInput && currentTrackRef.current) { e.preventDefault(); invoke('seek_relative', { seconds: -10 }).catch(() => {}); }
      if (e.code === 'KeyM' && !isInput) toggleMute();
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === '?' && !isInput) { e.preventDefault(); setShowShortcuts(s => !s); }
      if (e.code === 'Escape') { setShowShortcuts(false); setConfirmModal(null); }

    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [togglePlayPause, toggleMute]);



  
  const handleTrackEnd = useCallback(() => {
    if (endDetectedRef.current) return;
    endDetectedRef.current = true;
    const track = currentTrackRef.current;
    const repeat = repeatModeRef.current;
    const isLocal = track?.url?.startsWith('local://');

    if (repeat === 'one' && track) {
      invoke('seek_to_start').catch(() => {
        invoke('seek_audio', { time: 0 }).catch(() => {});
      });
      progressSecondsRef.current = 0;
      setProgressSeconds(0);
      setIsPlayingSync(true);
      setTimeout(() => { endDetectedRef.current = false; }, 1500);
      return;
    }

    
    if (isLocal) {
      const list = localTracksListRef.current;
      const idx = localTrackIndexRef.current;
      if (list.length > 1) {
        let nextIdx: number;
        if (shuffle) {
          
          do { nextIdx = Math.floor(Math.random() * list.length); } while (nextIdx === idx && list.length > 1);
        } else {
          nextIdx = idx + 1;
        }
        if (nextIdx < list.length) {
          localTrackIndexRef.current = nextIdx;
          setTimeout(() => handlePlayLocalTrack(list[nextIdx], list, nextIdx), 0);
          return;
        } else if (repeat === 'all') {
          localTrackIndexRef.current = 0;
          setTimeout(() => handlePlayLocalTrack(list[0], list, 0), 0);
          return;
        }
      } else if (repeat === 'all' && list.length === 1) {
        
        invoke('seek_to_start').catch(() => {});
        progressSecondsRef.current = 0; setProgressSeconds(0);
        setIsPlayingSync(true);
        setTimeout(() => { endDetectedRef.current = false; }, 1500);
        return;
      }
      setIsPlayingSync(false);
      return;
    }

    
    const q = queueRef.current;
    if (q.length > 0) {
      const [next, ...rest] = q;
      queueRef.current = rest;
      setQueue(rest);
      setTimeout(() => handlePlayTrack(next, true), 0);
      return;
    }

    
    const ctx = playlistContextRef.current;
    if (ctx && ctx.tracks.length > 1) {
      let nextIdx: number;
      if (shuffle) {
        do { nextIdx = Math.floor(Math.random() * ctx.tracks.length); }
        while (nextIdx === ctx.index && ctx.tracks.length > 1);
      } else {
        nextIdx = ctx.index + 1;
      }
      if (nextIdx < ctx.tracks.length) {
        playlistContextRef.current = { ...ctx, index: nextIdx };
        setTimeout(() => handlePlayTrack(ctx.tracks[nextIdx], true), 0);
        return;
      } else if (repeat === 'all') {
        playlistContextRef.current = { ...ctx, index: 0 };
        setTimeout(() => handlePlayTrack(ctx.tracks[0], true), 0);
        return;
      }
    }

    if (repeat === 'all' && track) {
      setTimeout(() => handlePlayTrack(track, true), 0);
      return;
    }

    
    setIsPlayingSync(false);
  }, [handlePlayTrack, handlePlayLocalTrack, setIsPlayingSync, shuffle]);

  
  useEffect(() => {
    const poll = async () => {
      if (isDraggingProgressRef.current) return;
      try {
        const s: { playing: boolean; paused: boolean; position: number; duration: number; eof_reached: boolean } =
          await invoke('get_playback_state');

        progressSecondsRef.current = s.position;
        setProgressSeconds(s.position);
        
        const ab = abLoopRef.current;
        if (ab.a !== null && ab.b !== null && s.position >= ab.b) {
          invoke('seek_audio', { time: ab.a }).catch(() => {});
        }

        if (s.duration > 0 && s.duration !== trackDurationRef.current) {
          trackDurationRef.current = s.duration; setTrackDurationSeconds(s.duration);
        }

        
        if (!isLoadingTrack && !endDetectedRef.current) {
          const playing = !s.paused;
          if (playing !== isPlayingRef.current) setIsPlayingSync(playing);
        }

        
        if (!s.eof_reached && !endDetectedRef.current && s.position > 3 && s.duration > 0
            && crossfadeSeconds > 0 && s.position >= s.duration - crossfadeSeconds - 0.5
            && s.position < s.duration - 0.2) {
          
          const fadeSteps = Math.max(1, Math.round(crossfadeSeconds * 5));
          const volStep = (volume / fadeSteps);
          let step = 0;
          const fadeInterval = setInterval(() => {
            step++;
            const newVol = Math.max(0, volume - volStep * step);
            invoke('set_volume', { volume: newVol }).catch(() => {});
            if (step >= fadeSteps) {
              clearInterval(fadeInterval);
              invoke('set_volume', { volume }).catch(() => {}); 
              if (!endDetectedRef.current) handleTrackEnd();
            }
          }, (crossfadeSeconds * 1000) / fadeSteps);
          
          return;
        }
        
        if (s.eof_reached && !endDetectedRef.current && s.position > 3) {
          handleTrackEnd();
          return;
        }
        
        if (!s.eof_reached && !endDetectedRef.current && s.position > 3 && s.duration > 0 && s.position >= s.duration - 1.0) {
          handleTrackEnd();
        }
      } catch {}
    };

    const id = setInterval(poll, isPlaying ? 500 : 2000);
    return () => clearInterval(id);
  }, [isPlaying, isLoadingTrack, handleTrackEnd, setIsPlayingSync]);

  
  const handleSelectDirectory = useCallback(async () => {
    try {
      const sel = await open({ directory: true, multiple: false, defaultPath: downloadPath });
      if (sel) setDownloadPath(sel as string);
    } catch {}
  }, [downloadPath]);

  
  const updateProgressFromEvent = useCallback((clientX: number) => {
    if (!progressRef.current || !currentTrackRef.current) return undefined;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const total = trackDurationRef.current || parseDurationToSeconds(currentTrackRef.current.duration);
    const t = total * pct;
    progressSecondsRef.current = t; setProgressSeconds(t);
    return t;
  }, []);

  const updateVolumeFromEvent = useCallback((clientX: number) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const v = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setVolume(v); invoke('set_volume', { volume: v }).catch(() => {});
  }, []);

  // Scroll wheel on volume — must be non-passive to call preventDefault
  useEffect(() => {
    const el = volumeRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setVolume(prev => {
        const next = Math.max(0, Math.min(100, prev + (e.deltaY < 0 ? 5 : -5)));
        invoke('set_volume', { volume: next }).catch(() => {});
        return next;
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDraggingProgressRef.current) updateProgressFromEvent(e.clientX);
      if (isDraggingVolume) updateVolumeFromEvent(e.clientX);
    };
    const onUp = async (e: MouseEvent) => {
      if (isDraggingProgressRef.current) {
        const t = updateProgressFromEvent(e.clientX);
        if (t !== undefined) await invoke('seek_audio', { time: t }).catch(() => {});
        isDraggingProgressRef.current = false; setIsDraggingProgress(false);
      }
      if (isDraggingVolume) setIsDraggingVolume(false);
    };
    if (isDraggingProgress || isDraggingVolume) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDraggingProgress, isDraggingVolume, updateProgressFromEvent, updateVolumeFromEvent]);

  
  const searchMusic = useCallback(async (override?: string) => {
    const q = (override ?? searchQuery).trim();
    if (!q || isSearching) return;
    setIsSearching(true); setTracks([]); setShowHistory(false); setHasSearched(true);
    setSearchHistory(prev => [q, ...prev.filter(h => h !== q)].slice(0, 8));
    try {
      const res: string = await invoke('search_youtube', { query: q });
      const parsed = res.trim().split('\n').filter(Boolean).map((line, i) => {
        const [title, artist, duration, id] = line.split('====');
        const cleanId = id?.trim();
        return { id: i, title: title?.trim() || 'Unknown', artist: artist?.trim() || 'Unknown', duration: duration?.trim() || '0:00', url: `https://youtube.com/watch?v=${cleanId}`, cover: `https://i.ytimg.com/vi/${cleanId}/mqdefault.jpg` };
      });
      setTracks(parsed);
    } catch { setTracks([]); }
    finally { setIsSearching(false); }
  }, [searchQuery, isSearching]);

  
  const openCtx = useCallback((e: React.MouseEvent, menu: Omit<CtxMenu, 'x' | 'y'>) => {
    e.preventDefault(); e.stopPropagation();
    const { x, y } = clampMenu(e.clientX, e.clientY);
    setCtxMenu({ x, y, ...menu });
  }, []);

  
  const handleDownload = useCallback(async (track: Track) => {
    if (duplicateDetect) {
      try {
        const scanned: LocalTrack[] = await invoke('scan_downloads', { path: downloadPath });
        const existing = scanned.map(t => t.title.toLowerCase());
        if (existing.includes(track.title.toLowerCase())) {
          showToast(`Already downloaded: ${track.title}`);
          return;
        }
      } catch { /* proceed if check fails */ }
    }
    setDownloadingTracks(p => ({ ...p, [track.url]: 1 }));
    // Simulate smooth progress while yt-dlp runs (actual progress not available via IPC)
    let prog = 1;
    const progInterval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 8, 90);
      setDownloadingTracks(p => p[track.url] !== undefined ? { ...p, [track.url]: prog } : p);
    }, 400);
    try {
      await invoke('download_song', { url: track.url, quality: downloadQuality, format: downloadFormat, embedThumbnail, path: downloadPath });
      clearInterval(progInterval);
      setDownloadingTracks(p => ({ ...p, [track.url]: 100 }));
      setTimeout(() => setDownloadingTracks(p => { const n = {...p}; delete n[track.url]; return n; }), 1200);
      showToast(`Downloaded: ${track.title}`);
    } catch {
      clearInterval(progInterval);
      setDownloadingTracks(p => { const n = {...p}; delete n[track.url]; return n; });
      showToast('Download failed');
    }
  }, [downloadQuality, downloadFormat, embedThumbnail, duplicateDetect, downloadPath, showToast]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      
      if (typeof navigator?.clipboard?.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        
        const el = document.createElement('textarea');
        el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
        document.body.appendChild(el); el.select();
        document.execCommand('copy'); document.body.removeChild(el);
      }
      showToast('Copied!');
    } catch { showToast('Copy failed'); }
  }, [showToast]);
  const openInYouTube = useCallback(async (u: string) => {
    if (!u || (!u.startsWith('http://') && !u.startsWith('https://'))) return;
    try {
      await invoke('open_url_in_browser', { url: u });
    } catch {
      try { await openUrl(u); } catch { window.open(u, '_blank'); }
    }
  }, []);

  
  const confirmCreatePlaylist = useCallback(() => {
    if (!newPlaylistName.trim()) return;
    setPlaylists(p => [...p, { id: `p${Date.now()}`, name: newPlaylistName.trim(), description: newPlaylistDesc.trim(), tracks: [] }]);
    setIsPlaylistModalOpen(false); setNewPlaylistName(''); setNewPlaylistDesc('');
    showToast(`Playlist "${newPlaylistName.trim()}" created`);
  }, [newPlaylistName, newPlaylistDesc, showToast]);

  const deletePlaylist = useCallback((id: string) => {
    if (id === 'p1') return;
    setPlaylists(p => p.filter(x => x.id !== id));
    setOpenPlaylistId(prev => prev === id ? null : prev);
    showToast('Playlist deleted');
  }, [showToast]);

  const confirmRenamePlaylist = useCallback(() => {
    if (!renameVal.trim() || !renamingPlaylist) return;
    setPlaylists(p => p.map(x => x.id === renamingPlaylist.id ? { ...x, name: renameVal.trim(), description: renameDescVal.trim() } : x));
    setRenamingPlaylist(null); showToast('Playlist updated');
  }, [renameVal, renameDescVal, renamingPlaylist, showToast]);

  const toggleLikeTrack = useCallback((t: Track) => {
    setPlaylists(p => p.map(x => {
      if (x.id !== 'p1') return x;
      const liked = x.tracks.some(y => y.url === t.url);
      return { ...x, tracks: liked ? x.tracks.filter(y => y.url !== t.url) : [...x.tracks, t] };
    }));
  }, []);

  const addTrackToPlaylist = useCallback((pid: string, t: Track) => {
    setPlaylists(p => p.map(x => {
      if (x.id !== pid) return x;
      if (x.tracks.some(y => y.url === t.url)) { showToast('Already in playlist'); return x; }
      showToast(`Added to ${x.name}`); return { ...x, tracks: [...x.tracks, t] };
    }));
    setAddToPlaylistTrack(null); setCtxMenu(null);
  }, [showToast]);

  const removeFromPlaylist = useCallback((pid: string, url: string) => {
    setPlaylists(p => p.map(x => x.id !== pid ? x : { ...x, tracks: x.tracks.filter(t => t.url !== url) }));
    showToast('Removed from playlist');
  }, [showToast]);

  const handleCoverUpload = useCallback((pid: string) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(inp);
    inp.onchange = e => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) {
        const r = new FileReader();
        r.onload = ev => {
          const d = ev.target?.result as string;
          if (d) { setPlaylists(p => p.map(x => x.id === pid ? { ...x, customCover: d } : x)); showToast('Cover updated'); }
        };
        r.readAsDataURL(f);
      }
      inp.remove();
    };
    inp.oncancel = () => inp.remove();
    inp.click();
  }, [showToast]);

  const isTrackLiked = useCallback((url: string) => playlists.find(p => p.id === 'p1')?.tracks.some(t => t.url === url) || false, [playlists]);
  const getPlaylistCover = (p: Playlist) => p.id === 'p1' ? null : (p.customCover || p.tracks[0]?.cover || null);

  const playAll = useCallback((list: Track[]) => {
    if (!list.length) return;
    const sorted = shuffle ? [...list].sort(() => Math.random() - 0.5) : [...list];
    
    playlistContextRef.current = { tracks: sorted, index: 0 };
    handlePlayTrack(sorted[0], true); setQueue(sorted.slice(1));
    showToast(shuffle ? 'Shuffle playing all' : 'Playing all');
  }, [shuffle, handlePlayTrack, showToast]);

  const removeFromQueue = useCallback((url: string) => setQueue(p => p.filter(q => q.url !== url)), []);

  const calculateProgressPercent = useCallback(() => {
    const total = trackDurationSeconds || parseDurationToSeconds(currentTrack?.duration || '0:00');
    return total === 0 ? 0 : Math.min((progressSeconds / total) * 100, 100);
  }, [progressSeconds, trackDurationSeconds, currentTrack]);

  const openPlaylist = playlists.find(p => p.id === openPlaylistId);

  
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",width:"100%",background:"#0c0b0b",color:"#e2ddd9",overflow:"hidden",fontSize:"15px"}}
      onContextMenu={e => e.preventDefault()}>
      <style>{`
        :root{
          --bg:#0c0b0b;--bg1:#111010;--bg2:#161414;--bg3:#1c1a1a;--bg4:#232020;--bg5:#2a2727;
          --fg:#e2ddd9;--fg2:#9e9894;--fg3:#5c5755;--fg4:#363230;
          --line:#1c1a1a;--line2:#252222;
          --v-bg0:#0c0b0b;--v-bg1:#111010;--v-bg2:#161414;--v-bg3:#1c1a1a;--v-bg4:#232020;--v-bg5:#2a2727;
          --v-fg:#e2ddd9;--v-fg2:#9e9894;--v-fg3:#5c5755;--v-fg4:#363230;
          --v-bdr:#1c1a1a;--v-bdr2:#252222;--v-bdr3:#2e2b2b;
        }
        html,body{background:#0c0b0b!important;color:#e2ddd9!important;color-scheme:dark!important;height:100%;overflow:hidden;margin:0;padding:0;}
        #root{height:100%;overflow:hidden;}
        [class*="bg-neutral-950"],[class*="bg-neutral-900"]{background-color:#111010!important;}
        [class*="bg-neutral-800"]{background-color:#1c1a1a!important;}
        [class*="bg-neutral-700"],[class*="bg-neutral-600"]{background-color:#232020!important;}
        .bg-white,[class~="bg-white"]{background-color:#e2ddd9!important;}
        [class*="bg-gradient-to"]{background-image:none!important;}
        [class*="hover:bg-neutral-900"]:hover,[class*="hover:bg-neutral-800"]:hover,[class*="hover:bg-white"]:hover,[class*="hover:bg-neutral-900\\/50"]:hover{background-color:#1c1a1a!important;}
        [class*="hover:bg-white\\/5"]:hover,[class*="hover:bg-white\\/\\[0.04\\]"]:hover,[class*="hover:bg-white\\/\\[0.03\\]"]:hover,[class*="hover:bg-white\\/\\[0.02\\]"]:hover{background-color:rgba(255,255,255,0.03)!important;}
        [class*="hover:bg-neutral-800\\/80"]:hover{background-color:#232020!important;}
        [class~="text-white"],[class*="text-neutral-100"],[class*="text-neutral-200"]{color:#e2ddd9!important;}
        [class*="text-neutral-300"],[class*="text-neutral-400"]{color:#9e9894!important;}
        [class*="text-neutral-500"]{color:#5c5755!important;}
        [class*="text-neutral-600"],[class*="text-neutral-700"]{color:#363230!important;}
        [class~="text-black"]{color:#0c0b0b!important;}
        [class*="hover:text-white"]:hover,[class*="hover:text-neutral-200"]:hover{color:#e2ddd9!important;}
        [class*="hover:text-neutral-300"]:hover{color:#9e9894!important;}
        [class*="hover:text-neutral-400"]:hover{color:#5c5755!important;}
        [class*="text-amber-400"],[class*="text-cyan-400"],[class*="text-emerald-400"],[class*="text-violet-400"],[class*="text-purple-400"],[class*="text-blue-400"],[class*="text-blue-500"]{color:#9e9894!important;}
        [class*="text-red-400"],[class*="text-red-500"],[class*="text-red-600"]{color:#5c5755!important;}
        [class*="hover:text-red-400"]:hover,[class*="hover:text-red-300"]:hover{color:#b05555!important;}
        [class*="bg-amber-500"],[class*="bg-cyan-500"],[class*="bg-emerald-500"],[class*="bg-violet-500"],[class*="bg-blue-500"],[class*="bg-purple-500"],[class*="bg-red-600"],[class*="bg-red-500"]{background-color:#1c1a1a!important;}
        [class*="border-amber-500"],[class*="border-red-500"],[class*="border-red-600"]{border-color:#2e2b2b!important;}
        [class*="bg-red-500\\/10"]{background-color:rgba(140,40,40,0.07)!important;}[class*="border-red-500\\/20"]{border-color:rgba(140,40,40,0.18)!important;}
        [class*="bg-amber-500\\/10"]{background-color:rgba(226,221,217,0.05)!important;}
        [class*="hover:bg-red-500\\/20"]:hover{background-color:rgba(140,40,40,0.12)!important;}
        .text-\\[\\#d4cfcf\\],[class*="text-\\[#d4cfcf\\]"]{color:#e2ddd9!important;}
        [class*="bg-\\[#d4cfcf\\]\\/10"]{background-color:rgba(226,221,217,0.07)!important;}
        [class*="bg-\\[#d4cfcf\\]\\/20"]{background-color:rgba(226,221,217,0.11)!important;}
        [class*="bg-\\[#d4cfcf\\]\\/\\[0.07\\]"]{background-color:rgba(226,221,217,0.05)!important;}
        [class*="bg-\\[#d4cfcf\\]\\/\\[0.08\\]"]{background-color:rgba(226,221,217,0.06)!important;}
        [class*="bg-\\[#d4cfcf\\]\\/80"]{background-color:rgba(226,221,217,0.68)!important;}
        [class*="border-\\[#d4cfcf\\]\\/15"]{border-color:rgba(226,221,217,0.1)!important;}
        [class*="border-\\[#d4cfcf\\]\\/20"]{border-color:rgba(226,221,217,0.13)!important;}
        [class*="border-\\[#d4cfcf\\]\\/30"]{border-color:rgba(226,221,217,0.18)!important;}
        [class*="hover:border-\\[#d4cfcf\\]\\/60"]:hover{border-color:rgba(226,221,217,0.32)!important;}
        [class*="hover:bg-\\[#d4cfcf\\]\\/20"]:hover{background-color:rgba(226,221,217,0.11)!important;}
        [class*="ring-\\[#d4cfcf\\]"]{--tw-ring-color:rgba(226,221,217,0.15)!important;}
        [class*="border-neutral-800"]{border-color:#1c1a1a!important;}
        [class*="border-neutral-700"]{border-color:#252222!important;}
        [class*="border-neutral-600"]{border-color:#2e2b2b!important;}
        [class*="divide-neutral-800"]>*+*{border-color:#1c1a1a!important;}
        [class*="hover:border-neutral-700"]:hover{border-color:#252222!important;}
        [class*="bg-black\\/85"],[class*="bg-black\\/80"]{background-color:rgba(4,3,3,0.88)!important;}
        [class*="bg-black\\/70"]{background-color:rgba(4,3,3,0.76)!important;}
        input,textarea,select{background-color:#1c1a1a!important;color:#e2ddd9!important;border-color:#252222!important;}
        input::placeholder,textarea::placeholder{color:#363230!important;opacity:1!important;}
        input:focus,textarea:focus{border-color:#2e2b2b!important;box-shadow:0 0 0 2px rgba(226,221,217,0.06)!important;outline:none!important;}
        .h-px,[class~="h-px"]{background-color:#1c1a1a!important;}
        [class*="shadow-\\[0_0_"]{box-shadow:0 4px 24px rgba(0,0,0,0.6)!important;filter:none!important;}
        [class*="drop-shadow-\\[0_0_"]{filter:none!important;}
        [class*="shadow-\\[inset_2px_0_0_#d4cfcf\\]"]{box-shadow:inset 2px 0 0 #9e9894!important;}
        [class*="bg-red-500\\/10"][class*="border-red-500\\/30"]{background:rgba(140,40,40,0.07)!important;border-color:rgba(140,40,40,0.2)!important;color:#a05050!important;}
        [class*="hover:bg-red-500\\/20"]:hover{background:rgba(140,40,40,0.14)!important;}

        /* ── New component classes ── */
        .v-track{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:10px;border:1px solid transparent;transition:background .12s,border-color .12s;cursor:pointer;}
        .v-track:hover{background:rgba(226,221,217,0.04);border-color:rgba(226,221,217,0.07);}
        .v-track--active{background:rgba(226,221,217,0.06);border-color:rgba(226,221,217,0.14);}
        .v-track__num{width:26px;text-align:center;font-size:12px;font-variant-numeric:tabular-nums;color:#363230;flex-shrink:0;}
        .v-track--active .v-track__num{color:#e2ddd9;}
        .v-track__art{width:46px;height:46px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#1c1a1a;border:1px solid rgba(255,255,255,0.06);}
        .v-track__art img{width:100%;height:100%;object-fit:cover;}
        .v-track__info{flex:1;min-width:0;}
        .v-track__title{font-size:14px;font-weight:600;color:#e2ddd9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;}
        .v-track--active .v-track__title{color:#fff;}
        .v-track__artist{font-size:12.5px;color:#5c5755;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .v-track__dur{font-size:11px;color:#363230;font-variant-numeric:tabular-nums;flex-shrink:0;}
        .v-track__actions{display:flex;align-items:center;gap:2px;opacity:0;transition:opacity .12s;flex-shrink:0;}
        .v-track:hover .v-track__actions,.v-track--active .v-track__actions{opacity:1;}
        .v-track__btn{width:28px;height:28px;border-radius:7px;border:none;background:transparent;color:#5c5755;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .1s,color .1s;}
        .v-track__btn:hover{background:rgba(226,221,217,0.08);color:#e2ddd9;}

        .v-card{flex-shrink:0;width:164px;cursor:pointer;animation:fadeUpSm .2s cubic-bezier(0.2,0,0,1) both;}
        .v-card__art{width:164px;height:164px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);position:relative;background:#1c1a1a;transition:transform .18s cubic-bezier(0.2,0,0,1);}
        .v-card:hover .v-card__art{transform:scale(1.03);}
        .v-card__art img{width:100%;height:100%;object-fit:cover;display:block;}
        .v-card__overlay{position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;border-radius:12px;}
        .v-card:hover .v-card__overlay,.v-card--active .v-card__overlay{opacity:1;}
        .v-card__play{width:42px;height:42px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(226,221,217,0.2);display:flex;align-items:center;justify-content:center;color:#e2ddd9;}
        .v-card__active-bar{position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,rgba(226,221,217,0.8),rgba(226,221,217,0.3));border-radius:0 0 12px 12px;}
        .v-card__title{font-size:13px;font-weight:600;color:#e2ddd9;margin-top:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .v-card__artist{font-size:11px;color:#5c5755;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

        .v-section-head{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
        .v-section-head h2{font-size:11px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:#5c5755;flex:1;margin:0;}
        .v-section-head__action{font-size:11px;color:#363230;cursor:pointer;background:none;border:none;padding:0;transition:color .12s;}
        .v-section-head__action:hover{color:#9e9894;}

        .v-nav-btn{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:8px;border:none;background:transparent;color:#5c5755;cursor:pointer;width:100%;text-align:left;font-size:13.5px;font-weight:500;transition:background .12s,color .12s;position:relative;}
        .v-nav-btn:hover{background:rgba(226,221,217,0.05);color:#9e9894;}
        .v-nav-btn--active{background:rgba(226,221,217,0.07);color:#e2ddd9;font-weight:600;}
        .v-nav-btn--active::before{content:'';position:absolute;left:0;top:25%;bottom:25%;width:2px;background:#9e9894;border-radius:0 2px 2px 0;}

        .v-pl-item{display:flex;align-items:center;gap:9px;padding:6px 9px;border-radius:7px;border:none;background:transparent;color:#5c5755;cursor:pointer;width:100%;text-align:left;transition:background .1s,color .1s;}
        .v-pl-item:hover{background:rgba(226,221,217,0.04);color:#9e9894;}
        .v-pl-item--active{background:rgba(226,221,217,0.06);color:#e2ddd9;}
        .v-pl-item__art{width:28px;height:28px;border-radius:5px;overflow:hidden;flex-shrink:0;background:#1c1a1a;border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;}

        .v-topbar{display:flex;align-items:center;gap:10px;padding:10px 18px;flex-shrink:0;border-bottom:1px solid #1c1a1a;z-index:20;}
        .v-topbar__back{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:7px;border:1px solid #252222;background:transparent;color:#5c5755;font-size:13px;font-weight:500;cursor:pointer;transition:border-color .12s,color .12s;}
        .v-topbar__back:hover{border-color:#2e2b2b;color:#9e9894;}
        .v-topbar__back:disabled{opacity:0.3;cursor:not-allowed;}
        .v-topbar__crumb{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#5c5755;}

        .v-player{height:72px;background:#111010;border-top:1px solid #1c1a1a;display:flex;align-items:center;padding:0 18px;position:relative;z-index:20;flex-shrink:0;gap:0;}
        .v-player__track{display:flex;align-items:center;gap:11px;width:230px;flex-shrink:0;}
        .v-player__art{width:44px;height:44px;border-radius:7px;overflow:hidden;flex-shrink:0;background:#1c1a1a;border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;cursor:pointer;}
        .v-player__art img{width:100%;height:100%;object-fit:cover;}
        .v-player__title{font-size:13px;font-weight:600;color:#e2ddd9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .v-player__artist{font-size:11px;color:#5c5755;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;}
        .v-player__center{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;max-width:560px;margin:0 auto;}
        .v-player__controls{display:flex;align-items:center;gap:16px;}
        .v-player__btn{background:none;border:none;cursor:pointer;padding:4px;color:#5c5755;transition:color .12s,transform .1s;display:flex;align-items:center;justify-content:center;}
        .v-player__btn:hover{color:#9e9894;transform:scale(1.1);}
        .v-player__btn--active{color:#e2ddd9!important;}
        .v-player__play{width:38px;height:38px;border-radius:50%;background:#e2ddd9;color:#0c0b0b;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .1s,box-shadow .12s;box-shadow:0 2px 10px rgba(0,0,0,0.5);}
        .v-player__play:hover{transform:scale(1.07);box-shadow:0 4px 16px rgba(0,0,0,0.6);}
        .v-player__play:active{transform:scale(0.94);}
        .v-player__play:disabled{opacity:0.35;cursor:not-allowed;transform:none!important;}
        .v-player__progress{width:100%;display:flex;align-items:center;gap:8px;}
        .v-player__time{font-size:10px;color:#363230;font-variant-numeric:tabular-nums;flex-shrink:0;min-width:28px;}
        .v-player__right{width:220px;display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-shrink:0;}

        .v-ctx{background:#161414;border:1px solid #252222;border-radius:12px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.04);}
        .v-ctx__header{padding:10px 14px;border-bottom:1px solid #1c1a1a;display:flex;align-items:center;gap:10px;}
        .v-ctx__art{width:38px;height:38px;border-radius:7px;overflow:hidden;flex-shrink:0;background:#1c1a1a;}
        .v-ctx__art img{width:100%;height:100%;object-fit:cover;}
        .v-ctx__item{width:100%;display:flex;align-items:center;gap:10px;padding:9px 14px;font-size:13.5px;font-weight:500;color:#9e9894;background:none;border:none;cursor:pointer;text-align:left;transition:background .08s,color .08s;}
        .v-ctx__item:hover{background:rgba(226,221,217,0.05);color:#e2ddd9;}
        .v-ctx__item--danger:hover{background:rgba(160,40,40,0.1);color:#b05555;}
        .v-ctx__sep{height:1px;background:#1c1a1a;margin:3px 0;}

        .v-pl-card{border-radius:10px;padding:12px;cursor:pointer;transition:background .12s;position:relative;}
        .v-pl-card:hover{background:rgba(226,221,217,0.04);}
        .v-pl-card__art{width:100%;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#1c1a1a;border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;margin-bottom:8px;position:relative;}
        .v-pl-card__play-btn{position:absolute;bottom:6px;right:6px;width:32px;height:32px;border-radius:50%;background:#e2ddd9;color:#0c0b0b;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s;box-shadow:0 4px 12px rgba(0,0,0,0.6);}
        .v-pl-card:hover .v-pl-card__play-btn{opacity:1;transform:translateY(0);}
        .v-pl-card__name{font-size:13.5px;font-weight:600;color:#e2ddd9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .v-pl-card__count{font-size:11px;color:#363230;margin-top:2px;}

        .v-stat-card{background:#161414;border:1px solid #1c1a1a;border-radius:12px;padding:18px 20px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.025);}
        .v-stat-card__label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#363230;margin-bottom:8px;}
        .v-stat-card__value{font-size:30px;font-weight:800;color:#e2ddd9;line-height:1;font-variant-numeric:tabular-nums;}
        .v-stat-card__sub{font-size:11px;color:#363230;margin-top:4px;}

        .v-badge{background:rgba(226,221,217,0.1);color:#9e9894;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;font-variant-numeric:tabular-nums;}

        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#2a2727;border-radius:2px;}
        ::-webkit-scrollbar-thumb:hover{background:#2e2b2b;}
        .custom-scrollbar::-webkit-scrollbar{width:3px;}
        .custom-scrollbar::-webkit-scrollbar-track{background:transparent;}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:#2a2727;border-radius:2px;}

        /* Critical layout fallbacks — Tailwind utilities don't load in Tauri webview */
        .flex-1{flex:1 1 0%;min-height:0;min-width:0;}
        .overflow-y-auto{overflow-y:auto;}
        .overflow-x-auto{overflow-x:auto;}
        .overflow-hidden{overflow:hidden;}
        .relative{position:relative;}
        .absolute{position:absolute;}
        .hidden{display:none;}
        .flex{display:flex;}
        .w-full{width:100%;}
        .h-full{height:100%;}

        @keyframes loadbar{0%{transform:translateX(-100%)}60%{transform:translateX(200%)}100%{transform:translateX(500%)}}
        @keyframes dropIn{from{opacity:0;transform:translateY(-6px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUpSm{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px) scale(0.96)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
        @keyframes barBounce{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideLeft{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
        @keyframes queuePulse{0%{transform:scale(1)}40%{transform:scale(1.5)}70%{transform:scale(0.88)}100%{transform:scale(1)}}
        @keyframes velunaPulse{0%,100%{opacity:0.45}50%{opacity:0.18}}
        .queue-badge-pulse{animation:queuePulse 0.4s cubic-bezier(0.2,0,0,1) both;}
        .slider-track:hover .slider-thumb{opacity:1!important;transform:translateY(-50%) scale(1.2)!important;}
        [class*="animate-pulse"]{animation:velunaPulse 2s ease-in-out infinite!important;background-color:#1c1a1a!important;}
        ::selection{background:rgba(226,221,217,0.18)!important;color:#e2ddd9!important;}
        *{-webkit-user-select:none!important;user-select:none!important;}
        input,textarea{-webkit-user-select:text!important;user-select:text!important;}
        kbd{background:#1c1a1a!important;border-color:#2e2b2b!important;color:#9e9894!important;border-radius:4px!important;padding:2px 5px!important;font-size:10px!important;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .home-card{animation:fadeUp 0.22s cubic-bezier(0.2,0,0,1) both;}
        .v-track__dur{font-size:11px;color:#363230;font-variant-numeric:tabular-nums;flex-shrink:0;min-width:36px;text-align:right;}
        .v-pl-card:hover .pl-hover-overlay{opacity:1!important;}
        .v-pl-card:hover .v-pl-card__art{transform:scale(1.02);}
        .v-pl-card:hover .pl-card-del{opacity:1!important;}
        [class*="cursor-pointer"]:hover .pl-cover-ov,.pl-cover-trigger:hover .pl-cover-ov{opacity:1!important;}
        .playlist-card{transition:background .12s;}
      `}</style>

      <div style={{display:"flex",flex:"1 1 0%",minHeight:0,overflow:"hidden"}}>

        {}
        <div style={{width:"230px",flexShrink:0,display:"flex",flexDirection:"column",background:"#111010",borderRight:"1px solid #1c1a1a",padding:"16px 14px",zIndex:10,overflow:"visible",position:"relative"}}>
          {}
          <div style={{display:"flex",alignItems:"center",marginBottom:"22px",flexShrink:0,padding:"0 2px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"9px",cursor:"pointer",flex:1}} onClick={() => navigateTo('home')}>
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" style={{flexShrink:0}}><rect width="28" height="28" rx="6" fill="#e2ddd9"/><polygon points="4,6 8.5,6 14,21 19.5,6 24,6 14,23" fill="#0e0d0d"/><polygon points="8.5,6 11.5,6 14,16 16.5,6 19.5,6 14,21" fill="#e2ddd9"/></svg>
              <span style={{letterSpacing:"0.18em",fontSize:"10.5px",fontWeight:700,color:"#e2ddd9",textTransform:"uppercase"}}>veluna</span>
            </div>
          </div>

          {}
          <div style={{position:"relative",marginBottom:"10px",flexShrink:0,overflow:"visible"}} onClick={e => e.stopPropagation()}>
            <div
              onClick={() => setShowSleepPopover(o => !o)}
              style={sleepTimer>0?{display:'flex',alignItems:'center',gap:'7px',padding:'6px 10px',borderRadius:'7px',border:'1px solid rgba(226,221,217,0.12)',background:'rgba(226,221,217,0.05)',color:'#9e9894',cursor:'pointer',fontSize:'11px',fontWeight:500}:{display:'flex',alignItems:'center',gap:'7px',padding:'6px 10px',borderRadius:'7px',border:'none',background:'transparent',color:'#363230',cursor:'pointer',fontSize:'11px',fontWeight:500}}>
              <Moon size={14} style={sleepTimer > 0 ? {color:'#9e9894',animation:'velunaPulse 2s ease-in-out infinite'} : {color:'#363230'}} />
              <span style={{flex:1}}>{sleepTimer>0?'Sleep in '+Math.ceil(sleepTimer/60)+'m':'Sleep Timer'}</span>
              {sleepTimer > 0
                ? <button onClick={e => { e.stopPropagation(); cancelSleepTimer(); }} style={{fontSize:"11px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",padding:"2px 4px"}}><X size={11}/></button>
                : <ChevronDown size={13} style={{transition:"transform .2s",transform:showSleepPopover?"rotate(180deg)":"none"}}/>}
            </div>
            {showSleepPopover && (
              <div style={{position:"absolute",top:"100%",left:0,marginTop:"6px",zIndex:9999}}>
                <SleepTimerPopover
                  sleepTimer={sleepTimer}
                  onSet={setSleepTimerMinutes}
                  onCancel={cancelSleepTimer}
                  onClose={() => setShowSleepPopover(false)}
                />
              </div>
            )}
          </div>

          <nav style={{display:"flex",flexDirection:"column",gap:"2px",flexShrink:0}}>
            {([
              { id: 'home', label: 'Home', icon: Home },
              { id: 'downloads', label: 'Offline', icon: HardDrive },
              { id: 'stats', label: 'Stats', icon: BarChart2 },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as { id: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => navigateTo(id)}
                className={`v-nav-btn${activeNav===id?' v-nav-btn--active':''}`}>
                <Icon size={17} style={activeNav===id?{color:'#9e9894'}:{color:'#363230'}} />
                <span>{label}</span>
              </button>
            ))}
            <button onClick={() => setIsQueueOpen(o => !o)}
              className={`v-nav-btn${isQueueOpen?' v-nav-btn--active':''}`}>
              <ListOrdered size={17} style={isQueueOpen?{color:'#9e9894'}:{color:'#363230'}} />
              <span style={{flex:1}}>Queue</span>
              {queue.length > 0 && <span key={queuePulseKey} className="queue-badge-pulse v-badge" style={{marginLeft:"auto"}}>{queue.length}</span>}
            </button>
          </nav>

          {}
          <div style={{marginTop:"14px",display:"flex",flexDirection:"column",flex:"1 1 0%",minHeight:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 4px 8px",flexShrink:0,borderBottom:"1px solid #1c1a1a"}}>
              <button onClick={() => { setSidebarPlaylistsExpanded(o => !o); navigateTo('library'); setOpenPlaylistId(null); }}
                style={{display:'flex',alignItems:'center',gap:'7px',flex:1,padding:'4px 8px',borderRadius:'5px',border:'none',background:'transparent',cursor:'pointer',textAlign:'left',color:activeNav==='library'?'#9e9894':'#363230',fontSize:'9.5px',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',transition:'color .12s'}}>
                <ListMusic size={13} style={{color:activeNav==='library'?'#9e9894':'#363230'}}/>
                <span style={{fontWeight:500}}>Playlists</span>
                <ChevronRight size={14} style={{marginLeft:"auto",transition:"transform .2s",transform:sidebarPlaylistsExpanded?"rotate(90deg)":"none"}}/>
              </button>
              <button onClick={e => { e.stopPropagation(); setNewPlaylistName(''); setNewPlaylistDesc(''); setIsPlaylistModalOpen(true); }}
                style={{padding:"4px",border:"none",background:"transparent",cursor:"pointer",color:"#363230",borderRadius:"4px",flexShrink:0}} title="New playlist">
                <PlusCircle size={15} />
              </button>
            </div>
            {sidebarPlaylistsExpanded && (
              <div style={{flex:"1 1 0%",overflowY:"auto",scrollbarWidth:"thin",scrollbarColor:"#252222 transparent"}}>
                <div style={{display:"flex",flexDirection:"column",gap:"1px",paddingBottom:"8px"}}>
                  {playlists.map(pl => {
                    const isOpen = openPlaylistId === pl.id && activeNav === 'library';
                    const cover = getPlaylistCover(pl);
                    return (
                      <button key={pl.id}
                        onClick={() => { setOpenPlaylistId(pl.id); navigateTo('library'); }}
                        onContextMenu={e => openCtx(e, { type: 'sidebar-playlist', playlist: pl })}
                        className={`v-pl-item${isOpen?' v-pl-item--active':''}`}>
                        <div className="v-pl-item__art">
                          {cover ? <img src={cover} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                            : pl.id === 'p1' ? <Heart size={11} style={{color:'#e05555',fill:isOpen?'rgba(220,60,60,0.4)':'none'}}/>
                            : <ListMusic size={11} style={{color:isOpen?'#9e9894':'#363230'}} />}
                        </div>
                        <span style={{fontSize:'12.5px',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{pl.name}</span>
                        {pl.tracks.length > 0 && <span style={{fontSize:'10px',color:isOpen?'#5c5755':'#363230',flexShrink:0,marginLeft:'auto',fontVariantNumeric:'tabular-nums'}}>{pl.tracks.length}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <ImportButton
            onSpotify={() => setShowCsvImportModal(true)}
            onYoutube={() => setShowYtImportModal(true)}
            onM3u={handleImportPlaylistM3u}
          />
        </div>

        {}
        <div style={{flex:"1 1 0%",display:"flex",flexDirection:"column",background:"#0c0b0b",position:"relative",minHeight:0,overflow:"hidden"}}>


          <div className="v-topbar" style={{background:"#0c0b0b",padding:"12px 20px"}}>
            <button
              className="v-topbar__back"
              onClick={() => {
                if (activeNav === 'home' && tracks.length > 0) {
                  setTracks([]); setSearchQuery(''); setIsSearching(false);
                } else {
                  navigateBack();
                }
              }}
              disabled={activeNav === 'home' && tracks.length === 0}
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </button>
            <span className="v-topbar__crumb">
              {activeNav === 'home' ? 'Home' : activeNav === 'downloads' ? 'Offline' : activeNav === 'settings' ? 'Settings' : activeNav === 'stats' ? 'Stats' : activeNav === 'library' ? (openPlaylistId ? 'Playlist' : 'Playlists') : activeNav}
            </span>
          </div>

          {}
          <div key={activeNav + (openPlaylistId || '')} style={{animation:'fadeUp 0.2s cubic-bezier(0.25,0,0,1) both',flex:'1 1 0%',display:'flex',flexDirection:'column',minHeight:0,overflow:'hidden'}}>
          {activeNav === 'home' && (
            <>
              <div style={{padding:"16px 24px 10px",position:"relative",zIndex:30,flexShrink:0}}>
                <div style={{position:"relative",width:"100%",display:"flex",gap:"8px"}} onClick={e=>e.stopPropagation()}>
                  <div style={{position:"relative",flex:1}}>
                    <div style={{position:"absolute",top:0,bottom:0,left:0,paddingLeft:"14px",display:"flex",alignItems:"center",pointerEvents:"none"}}>
                      {isSearching
                        ? <div style={{width:"15px",height:"15px",border:"2px solid rgba(226,221,217,0.5)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                        : <Search size={16} style={{color:showHistory||searchQuery?"#9e9894":"#5c5755",transition:"color .2s"}}/> }
                    </div>
                    <input ref={searchRef} type="text"
                      placeholder="Search YouTube..."
                      value={searchQuery} readOnly={isSearching}
                      onChange={e => setSearchQuery(e.target.value)}
                      onFocus={() => !isSearching && setShowHistory(searchHistory.length > 0)}
                      onKeyDown={e => { if (e.key === 'Enter') { setShowHistory(false); searchMusic(); } if (e.key === 'Escape') setShowHistory(false); }}
                      style={{width:'100%',height:'42px',background:'#161414',color:'#e2ddd9',border:`1px solid ${isSearching?'rgba(226,221,217,0.15)':'#252222'}`,borderRadius:'9px',padding:'0 12px 0 42px',fontSize:'13.5px',outline:'none',opacity:isSearching?0.5:1,cursor:isSearching?'not-allowed':'text',transition:'border-color .15s',boxSizing:'border-box'}}
                    />
                    {showHistory && (
                      <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:'6px',background:'#161414',border:'1px solid #252222',borderRadius:'10px',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.7)',zIndex:100}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderBottom:'1px solid #1c1a1a'}}>
                          <span style={{fontSize:'9.5px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#363230'}}>Recent</span>
                          <button onClick={e=>{e.stopPropagation();setSearchHistory([]);setShowHistory(false);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'11px',color:'#363230',transition:'color .12s'}} onMouseEnter={e=>(e.currentTarget.style.color='#b05555')} onMouseLeave={e=>(e.currentTarget.style.color='#363230')}>Clear</button>
                        </div>
                        {searchHistory.map((h, i) => (
                          <button key={i} onClick={e=>{e.stopPropagation();setSearchQuery(h);setShowHistory(false);searchMusic(h);}}
                            style={{width:'100%',display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left',transition:'background .08s'}}
                            onMouseEnter={e=>(e.currentTarget.style.background='rgba(226,221,217,0.03)')}
                            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                            <Clock size={12} style={{color:'#363230',flexShrink:0}} />
                            <span style={{fontSize:'13px',color:'#9e9894',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{h}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setShowHistory(false); searchMusic(); }}
                    disabled={isSearching || !searchQuery.trim()}
                    style={{height:'42px',padding:'0 16px',borderRadius:'9px',border:'1px solid #252222',background:'#161414',color:isSearching||!searchQuery.trim()?'#363230':'#9e9894',cursor:isSearching||!searchQuery.trim()?'not-allowed':'pointer',fontSize:'13px',fontWeight:600,display:'flex',alignItems:'center',gap:'6px',flexShrink:0,transition:'border-color .15s,color .15s,background .15s',whiteSpace:'nowrap'}}
                    onMouseEnter={e=>{if(!isSearching&&searchQuery.trim()){(e.currentTarget as HTMLElement).style.background='rgba(226,221,217,0.06)';(e.currentTarget as HTMLElement).style.borderColor='#2e2b2b';}}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='#161414';(e.currentTarget as HTMLElement).style.borderColor='#252222';}}>
                    {isSearching ? <div style={{width:'14px',height:'14px',border:'2px solid #5c5755',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} /> : <Search size={15} />}
                    {!isSearching && 'Search'}
                  </button>
                  {updateAvailable && (
                    <button
                      onClick={() => { setActiveNav('settings'); }}
                      title={`Update available — v${updateAvailable}`}
                      style={{flexShrink:0,width:"42px",height:"42px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"9px",border:"1px solid #252222",background:"#161414",cursor:"pointer",position:"relative"}}
                    >
                      <Info size={17} />
                      <span style={{position:"absolute",top:"5px",right:"5px",width:"6px",height:"6px",borderRadius:"50%",background:"#9e9894"}}/>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"22px 28px 28px",zIndex:10}} onClick={()=>setShowHistory(false)}>
                {}
                {!isSearching && tracks.length === 0 && quickPicks.length === 0 && (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:"280px",gap:"20px"}}>
                    <div className="relative">
                      <div style={{width:'56px',height:'56px',borderRadius:'12px',background:'#161414',border:'1px solid #1c1a1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Music size={24} strokeWidth={1} style={{color:'#363230'}} />
                      </div>
                      <div style={{position:"absolute",bottom:"-6px",right:"-6px",width:"26px",height:"26px",background:"rgba(226,221,217,0.06)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Search size={12} className="text-[#d4cfcf]/60" />
                      </div>
                    </div>
                    <div style={{textAlign:"center",display:"flex",flexDirection:"column",gap:"5px"}}>
                      <p style={{fontSize:"13px",fontWeight:600,color:"#5c5755"}}>Search YouTube to start</p>
                      <p style={{fontSize:"11px",color:"#363230"}}>Type above and press <kbd>Ctrl+F</kbd></p>
                    </div>
                  </div>
                )}

                {!isSearching && tracks.length === 0 && quickPicks.length > 0 && isHydrated && (() => {
                  // --- Genre detection via keyword matching on title + artist ---
                  const GENRES: { id: string; label: string; keywords: string[] }[] = [
                    { id: 'hiphop',    label: 'Hip-Hop / Rap',    keywords: ['rap','hip hop','hip-hop','trap','drill','freestyle','cypher','bars','lil ','young ','big ','21 savage','kendrick','drake','kanye','jay-z','eminem','nicki','cardi','asap','uzi','juice','polo g','gunna','future','offset','quavo','takeoff','21savage','dababy','roddy','pooh shiesty','moneybagg'] },
                    { id: 'synthwave', label: 'Synthwave',        keywords: ['synthwave','retrowave','outrun','neon','vaporwave','dreamwave','80s','retro wave','chillwave','darksynth','perturbator','kavinsky','gunship','carpenter brut','the midnight','timecop1983','FM-84','dreamwave','miami','nightcall'] },
                    { id: 'lofi',      label: 'Lo-Fi',            keywords: ['lofi','lo-fi','lo fi','chill beats','study beats','study music','sleep music','relax beats','chillhop','cafe music','coffee','anime lofi','jazz hop','nujabes'] },
                    { id: 'pop',       label: 'Pop',              keywords: ['pop','taylor swift','ariana','billie eilish','the weeknd','olivia rodrigo','dua lipa','harry styles','justin bieber','ed sheeran','selena','shawn mendes','camila','chainsmokers','imagine dragons','maroon 5','post malone'] },
                    { id: 'rock',      label: 'Rock',             keywords: ['rock','metal','punk','grunge','alternative','linkin park','nirvana','green day','foo fighters','system of a down','metallica','acdc','ac/dc','guns n roses','queen','led zeppelin','arctic monkeys','radiohead','muse','twenty one pilots','bring me','parkway drive','bmth','slipknot'] },
                    { id: 'rnb',       label: 'R&B / Soul',       keywords: ['r&b','rnb','soul','neo soul','smooth','frank ocean','sza','daniel caesar','jorja smith','h.e.r.','bryson tiller','partynextdoor','brent faiyaz','khalid','usher','alicia keys','john legend','maxwell','erykah badu','d\'angelo'] },
                    { id: 'edm',       label: 'EDM / Dance',      keywords: ['edm','electronic','dance','techno','house','trance','dubstep','dnb','drum and bass','bass','club','rave','festival','martin garrix','david guetta','tiesto','avicii','marshmello','skrillex','deadmau5','flume','diplo','zedd','alan walker','kygo','dj'] },
                    { id: 'jazz',      label: 'Jazz',             keywords: ['jazz','blues','swing','bebop','miles davis','coltrane','bill evans','thelonious','monk','duke ellington','charlie parker','herbie hancock','wynton','louis armstrong','nina simone'] },
                    { id: 'classical', label: 'Classical',        keywords: ['classical','orchestra','symphony','beethoven','mozart','bach','chopin','debussy','brahms','schubert','vivaldi','handel','liszt','tchaikovsky','strauss','mahler','piano sonata','concerto','sonata','nocturne','étude'] },
                    { id: 'kpop',      label: 'K-Pop',            keywords: ['kpop','k-pop','bts','blackpink','exo','nct','stray kids','twice','red velvet','aespa','ive','new jeans','newjeans','itzy','mamamoo','seventeen','got7','shinee','bigbang','2ne1','super junior','astro','monsta x','ateez'] },
                    { id: 'afrobeats', label: 'Afrobeats',        keywords: ['afrobeats','afrobeat','amapiano','burna boy','wizkid','davido','rema','omah lay','ckay','tems','ayra starr','afropop','naija','afro','fireboy'] },
                    { id: 'latin',     label: 'Latin',            keywords: ['latin','reggaeton','salsa','bachata','cumbia','bad bunny','j balvin','maluma','ozuna','daddy yankee','nicky jam','jhay cortez','anuel','karol g','rosalia','shakira','marc anthony','romeo santos'] },
                    { id: 'slowed',    label: 'Slowed + Reverb',  keywords: ['slowed','reverb','slowed and reverb','slowed reverb','slowed + reverb','night drive','late night','4am','3am','2am','midnight drive','sad slowed'] },
                    { id: 'phonk',     label: 'Phonk',            keywords: ['phonk','memphis','drift phonk','aggressive phonk','gym phonk','dark phonk','sakkijarven polkka','kordhell','ghostemane','bones','night lovell'] },
                  ];

                  // Map local files to Track shape for genre matching
                  const localAsTrack: Track[] = localTracksListRef.current.map((lt, i) => ({
                    id: -(i + 1), title: lt.title, artist: lt.artist || '',
                    url: `local://${lt.path}`, cover: '', duration: lt.duration || '',
                  }));

                  // Build the fullest possible track pool:
                  // quickPicks + playHistory + ALL local files + ALL playlist tracks
                  const allTracksForGenre = [...new Map([
                    ...quickPicks,
                    ...playHistory,
                    ...localAsTrack,
                    ...playlists.flatMap(p => p.tracks),
                  ].map(t => [t.url, t])).values()];

                  const genreScores: Record<string, { score: number; tracks: Track[] }> = {};
                  GENRES.forEach(g => { genreScores[g.id] = { score: 0, tracks: [] }; });

                  allTracksForGenre.forEach(track => {
                    const text = (track.title + ' ' + track.artist).toLowerCase();
                    const playCount = playCounts[track.url] || 1;
                    GENRES.forEach(g => {
                      if (g.keywords.some(kw => text.includes(kw))) {
                        genreScores[g.id].score += playCount;
                        if (!genreScores[g.id].tracks.find(t => t.url === track.url)) {
                          genreScores[g.id].tracks.push(track);
                        }
                      }
                    });
                  });

                  // Sort tracks within each genre by play count descending
                  GENRES.forEach(g => {
                    genreScores[g.id].tracks.sort((a, b) => (playCounts[b.url] || 0) - (playCounts[a.url] || 0));
                  });

                  const activeGenres = GENRES
                    .filter(g => genreScores[g.id].tracks.length >= 2)
                    .sort((a, b) => genreScores[b.id].score - genreScores[a.id].score)
                    .slice(0, 5);

                  const topTracks = Object.entries(playCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([url]) => allTracksForGenre.find(t => t.url === url))
                    .filter(Boolean) as Track[];
                  const recentHistory = playHistory.slice(0, 5);

                  return (
                    <div style={{display:"flex",flexDirection:"column",gap:"28px",paddingTop:"4px"}}>

                      {/* Recently Played */}
                      <div>
                        <div className="v-section-head">
                          <h2>Recently Played</h2>
                          <button className="v-section-head__action" onClick={() => setQuickPicks([])}>Clear</button>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                          {quickPicks.slice(0, 8).map((track, cardIdx) => {
                            const isActive = currentTrack?.url === track.url;
                            return (
                              <div key={track.url}
                                onClick={() => handlePlayInContext(track, quickPicks.slice(0, 8))}
                                onContextMenu={e => openCtx(e, { type: 'quickpick', track })}
                                style={{
                                  display:'flex',alignItems:'center',gap:'10px',
                                  padding:'8px 10px',borderRadius:'9px',cursor:'pointer',
                                  background:isActive?'rgba(226,221,217,0.06)':'rgba(255,255,255,0.025)',
                                  border:`1px solid ${isActive?'rgba(226,221,217,0.12)':'rgba(255,255,255,0.05)'}`,
                                  transition:'background .12s,border-color .12s',
                                  animation:`fadeUpSm .18s cubic-bezier(0.2,0,0,1) ${cardIdx*35}ms both`,
                                }}
                                onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';}}}
                                onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background='rgba(255,255,255,0.025)';e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';}}}
                              >
                                <div style={{width:'42px',height:'42px',borderRadius:'7px',overflow:'hidden',flexShrink:0,position:'relative',background:'#1c1a1a'}}>
                                  <img src={track.cover} alt={track.title} style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy" />
                                  {(isActive&&isPlaying) && (
                                    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                      <div style={{display:'flex',gap:'2px',alignItems:'flex-end',height:'10px'}}>
                                        {[100,65,80].map((h,i)=><div key={i} style={{width:'2px',background:'#9e9894',borderRadius:'1px',height:`${h}%`,animation:`barBounce ${0.7+i*0.12}s ease-in-out ${i*110}ms infinite`,transformOrigin:'bottom'}}/>)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:'12.5px',fontWeight:600,color:isActive?'#e2ddd9':'#c8c4c0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.3}}>{track.title}</div>
                                  <div style={{fontSize:'11px',color:'#5c5755',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:'2px'}}>{track.artist}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Genre shelves — auto-detected from listening history */}
                      {activeGenres.map((genre, gIdx) => {
                        const genreTracks = genreScores[genre.id].tracks.slice(0, 10);
                        return (
                          <div key={genre.id} style={{ animation: `fadeUp 0.22s cubic-bezier(0.2,0,0,1) ${gIdx * 60 + 100}ms both` }}>
                            <div className="v-section-head">
                              <h2>{genre.label}</h2>
                              <span style={{fontSize:'10px',color:'#363230'}}>{genreTracks.length}</span>
                            </div>
                            <div style={{display:"flex",gap:"10px",overflowX:"auto",paddingBottom:"6px",scrollbarWidth:"none"}}>
                              {genreTracks.map((track, tIdx) => {
                                const isActive = currentTrack?.url === track.url;
                                return (
                                  <div key={track.url}
                                    onClick={() => handlePlayInContext(track, genreTracks)}
                                    onContextMenu={e => openCtx(e, { type: 'track', track })}
                                    className={`v-card${isActive?' v-card--active':''}`}
                                    style={{ animationDelay:`${tIdx*25+gIdx*60}ms` }}>
                                    <div className="v-card__art">
                                      <img src={track.cover} alt={track.title} loading="lazy" />
                                      <div className="v-card__overlay">
                                        {isActive&&isPlaying
                                          ? <div style={{display:'flex',gap:'3px',alignItems:'flex-end',height:'18px'}}>{[100,65,80].map((h,j)=><div key={j} style={{width:'3px',background:'#e2ddd9',borderRadius:'1px',height:`${h}%`,animation:`barBounce ${0.7+j*0.12}s ease-in-out ${j*110}ms infinite`,transformOrigin:'bottom'}}/>)}</div>
                                          : <div className="v-card__play"><Play size={16} style={{fill:'#e2ddd9',color:'#e2ddd9',marginLeft:'2px'}}/></div>}
                                      </div>
                                      {isActive&&<div className="v-card__active-bar"/>}
                                    </div>
                                    <div className="v-card__title">{track.title}</div>
                                    <div className="v-card__artist">{track.artist}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Most Played */}
                      {topTracks.length >= 3 && (
                        <div style={{ animation: 'fadeUp 0.22s cubic-bezier(0.2,0,0,1) 200ms both' }}>
                          <div className="v-section-head">
                            <h2>Most Played</h2>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                            {topTracks.map((track, i) => {
                              const isActive = currentTrack?.url === track.url;
                              const count = playCounts[track.url] || 0;
                              const maxCount = playCounts[topTracks[0].url] || 1;
                              return (
                                <div key={track.url}
                                  onClick={() => handlePlayInContext(track, topTracks)}
                                  onContextMenu={e => openCtx(e, { type: 'track', track })}
                                  className={`v-track${isActive?' v-track--active':''}`}
                                  style={{animationDelay:`${i*40}ms`}}>
                                  <div className="v-track__num">{isActive&&isPlaying?<div style={{display:'flex',gap:'2px',alignItems:'flex-end',height:'12px',justifyContent:'center'}}>{[100,65,80].map((h,j)=><div key={j} style={{width:'2px',background:'#9e9894',borderRadius:'1px',height:`${h}%`,animation:`barBounce ${0.7+j*0.12}s ease-in-out ${j*110}ms infinite`,transformOrigin:'bottom'}}/>)}</div>:i+1}</div>
                                  <div className="v-track__art"><img src={track.cover} alt={track.title} loading="lazy"/></div>
                                  <div className="v-track__info">
                                    <div className="v-track__title">{track.title}</div>
                                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'3px'}}>
                                      <div style={{flex:1,height:'2px',background:'#232020',borderRadius:'1px',overflow:'hidden'}}>
                                        <div style={{height:'100%',background:'rgba(226,221,217,0.4)',borderRadius:'1px',width:`${(count/maxCount)*100}%`,transition:'width .5s'}}/>
                                      </div>
                                      <span style={{fontSize:'10px',color:'#363230',fontVariantNumeric:'tabular-nums',flexShrink:0}}>{count}×</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Play History */}
                      {recentHistory.length >= 3 && (
                        <div style={{ animation: 'fadeUp 0.22s cubic-bezier(0.2,0,0,1) 250ms both' }}>
                          <div className="v-section-head">
                            <h2>Play History</h2>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                            {recentHistory.map((track, i) => {
                              const isActive = currentTrack?.url === track.url;
                              return (
                                <div key={track.url + i}
                                  onClick={() => handlePlayInContext(track, recentHistory)}
                                  onContextMenu={e => openCtx(e, { type: 'track', track })}
                                  className={`v-track${isActive?' v-track--active':''}`}
                                  style={{animationDelay:`${i*40}ms`}}>
                                  <div className="v-track__art"><img src={track.cover} alt={track.title} loading="lazy"/></div>
                                  <div className="v-track__info">
                                    <div className="v-track__title">{track.title}</div>
                                    <div className="v-track__artist">{track.artist}</div>
                                  </div>
                                  <div style={{opacity:isActive&&isPlaying?1:0,transition:'opacity .12s'}}>
                                    {isActive&&isPlaying&&<div style={{display:'flex',gap:'2px',alignItems:'flex-end',height:'12px'}}>{[100,65,80].map((h,j)=><div key={j} style={{width:'2px',background:'#9e9894',borderRadius:'1px',height:`${h}%`,animation:`barBounce ${0.7+j*0.12}s ease-in-out ${j*110}ms infinite`,transformOrigin:'bottom'}}/>)}</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })()}

                {}
                {(isSearching || tracks.length > 0) && (
                  <div className="v-section-head">
                    <h2>{isSearching ? 'Searching...' : `Results`}</h2>
                    {isSearching && <div style={{display:"flex",gap:"3px",alignItems:"flex-end",height:"16px"}}>{[100, 60, 80, 50].map((h, i) => <div key={i} style={{ width:"4px",borderRadius:"2px",background:"rgba(226,221,217,0.4)",height: `${h}%`, animation: `barBounce ${0.65 + i * 0.1}s ease-in-out ${i * 100}ms infinite`, transformOrigin: "bottom" }} />)}</div>}
                    {tracks.length > 0 && !isSearching && (
                      <button onClick={() => playAll(tracks)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 10px',background:'rgba(226,221,217,0.06)',border:'1px solid rgba(226,221,217,0.12)',color:'#9e9894',borderRadius:'7px',cursor:'pointer',fontSize:'11px',fontWeight:600,transition:'background .12s'}}>
                        <Play size={11} style={{fill:'currentColor'}} /> Play All
                      </button>
                    )}
                  </div>
                )}
                {(tracks.length > 0 || isSearching) && (
                  <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"0 12px 6px",borderBottom:"1px solid #1c1a1a",marginBottom:"4px"}}>
                    <div style={{width:"26px",flexShrink:0}}/><div style={{width:"38px",flexShrink:0}}/>
                    <p style={{flex:1,fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#363230"}}>Title</p>
                    <div style={{width:"60px",flexShrink:0}}/>
                    <Clock size={12} style={{color:"#363230",width:"36px",flexShrink:0}}/>
                  </div>
                )}
                {isSearching && <div style={{display:"flex",flexDirection:"column",gap:"3px",marginTop:"4px"}}>{Array.from({ length: 8 }).map((_, i) => <TrackRowSkeleton key={i} index={i} />)}</div>}
                {!isSearching && tracks.length > 0 && (
                  <div style={{display:"flex",flexDirection:"column",gap:"3px",marginTop:"4px"}}>
                    {tracks.map((track, i) => (
                      <TrackRow key={track.id} track={track} index={i}
                        isActive={currentTrack?.url === track.url}
                        isHovered={hoveredTrackUrl === track.url}
                        isLoadingTrack={isLoadingTrack} isPlaying={isPlaying}
                        isLiked={isTrackLiked(track.url)} isDownloading={(downloadingTracks[track.url] ?? 0)}
                        onPlay={() => handlePlayInContext(track, tracks)}
                        onHoverEnter={() => setHoveredTrackUrl(track.url)}
                        onHoverLeave={() => setHoveredTrackUrl(null)}
                        onLike={() => toggleLikeTrack(track)}
                        onDownload={() => handleDownload(track)}
                        onCtx={e => openCtx(e, { type: 'track', track })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {}
          {activeNav === 'downloads' && (
            <DownloadsPanel
              downloadPath={downloadPath} onPlayLocalTrack={handlePlayLocalTrack}
              onDeleteLocalTrack={handleDeleteLocalTrack} currentTrackPath={currentLocalPath}
              isPlaying={isPlaying} isLoadingTrack={isLoadingTrack}
              onOpenInFileManager={handleOpenInFileManager} onExportM3u={handleExportM3u}
              onChangeFolder={handleSelectDirectory}
            />
          )}

          {}
          {activeNav === 'library' && (
            openPlaylist ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"22px 28px",zIndex:10}}>
                <button onClick={() => { setOpenPlaylistId(null); setPlaylistSearchQ(''); }} style={{display:"flex",alignItems:"center",gap:"7px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",marginBottom:"20px",padding:0,transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <ChevronLeft size={18} style={{flexShrink:0}}/>
                  <span style={{fontSize:"13px",fontWeight:500}}>Playlists</span>
                </button>
                <div style={{display:"flex",alignItems:"flex-end",gap:"18px",marginBottom:"18px"}}>
                  <div style={{width:"100px",height:"100px",borderRadius:"12px",background:"#1c1a1a",border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",overflow:"hidden",cursor:openPlaylist.id!=="p1"?"pointer":"default"}}
                    onClick={()=>openPlaylist.id!=='p1'&&handleCoverUpload(openPlaylist.id)} onMouseEnter={e=>{const ov=e.currentTarget.querySelector('.pl-cover-ov') as HTMLElement;if(ov)ov.style.opacity='1';}} onMouseLeave={e=>{const ov=e.currentTarget.querySelector('.pl-cover-ov') as HTMLElement;if(ov)ov.style.opacity='0';}}>
                    {getPlaylistCover(openPlaylist)
                      ? <img src={getPlaylistCover(openPlaylist)!} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                      : openPlaylist.id === 'p1' ? <Heart size={48} style={{color:'#9e9894',fill:'rgba(226,221,217,0.12)'}} /> : <ListMusic size={48} style={{color:'#5c5755'}} />}
                    {openPlaylist.id !== 'p1' && <div className="pl-cover-ov" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",opacity:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"opacity .15s"}}><ImagePlus size={20} style={{color:"#e2ddd9"}}/></div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"#5c5755",marginBottom:"4px"}}>Playlist</p>
                    <h2 style={{fontSize:"20px",fontWeight:800,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",margin:0}}>{openPlaylist.name}</h2>
                    {openPlaylist.description && openPlaylist.description.trim() && (
                      <p style={{fontSize:"12px",color:"#5c5755",marginTop:"3px"}}>{openPlaylist.description}</p>
                    )}
                    <p style={{fontSize:"12px",color:"#363230",marginTop:"2px"}}>{openPlaylist.tracks.length} {openPlaylist.tracks.length === 1 ? 'track' : 'tracks'}</p>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"14px"}}>
                      <button onClick={() => playAll(openPlaylist.tracks)} disabled={!openPlaylist.tracks.length}
                        style={{display:"flex",alignItems:"center",gap:"7px",padding:"7px 16px",background:"#e2ddd9",color:"#0c0b0b",fontWeight:700,borderRadius:"8px",border:"none",cursor:"pointer",fontSize:"12.5px",opacity:openPlaylist.tracks.length?1:0.4}}>
                        <Play size={16} fill="currentColor" /> Play All
                      </button>
                      <button onClick={() => { setRenamingPlaylist(openPlaylist); setRenameVal(openPlaylist.name); setRenameDescVal(openPlaylist.description); }}
                        style={{display:"flex",alignItems:"center",gap:"6px",padding:"7px 12px",color:"#5c5755",borderRadius:"8px",background:"transparent",border:"1px solid #252222",fontSize:"12.5px",fontWeight:500,cursor:"pointer",transition:"color .12s,border-color .12s"}} onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#2e2b2b";}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}>
                        <Pencil size={14} /> Edit
                      </button>
                      {openPlaylist.id !== 'p1' && (
                        <button onClick={() => { deletePlaylist(openPlaylist.id); setOpenPlaylistId(null); }}
                          style={{display:"flex",alignItems:"center",gap:"6px",padding:"7px 12px",color:"#5c5755",borderRadius:"8px",background:"transparent",border:"1px solid #252222",fontSize:"12.5px",fontWeight:500,cursor:"pointer",transition:"color .12s,border-color .12s"}} onMouseEnter={e=>{e.currentTarget.style.color="#a05050";e.currentTarget.style.borderColor="rgba(160,40,40,0.3)";}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}>
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {openPlaylist.tracks.length === 0
                  ? <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"140px",color:"#363230",gap:"10px"}}><Music size={28} strokeWidth={1} /><p style={{fontSize:"13px"}}>No tracks yet.</p></div>
                  : (() => {
                      const q = playlistSearchQ.trim().toLowerCase();
                      const filteredTracks = q
                        ? openPlaylist.tracks.filter(t => {
                            const title = (t.title || '').toLowerCase();
                            const artist = (t.artist || '').toLowerCase();
                            return title.includes(q) || artist.includes(q);
                          })
                        : openPlaylist.tracks;
                      return (
                        <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                          <div style={{position:"relative",marginBottom:"10px"}}>
                            <Search size={14} style={{position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"#5c5755",pointerEvents:"none"}} />
                            <input
                              type="text"
                              value={playlistSearchQ}
                              onChange={e => setPlaylistSearchQ(e.target.value)}
                              placeholder="Search in playlist..."
                              style={{width:"100%",background:"#161414",border:"1px solid #252222",borderRadius:"9px",padding:"9px 32px",fontSize:"13.5px",color:"#e2ddd9",outline:"none",boxSizing:"border-box"}}
                            />
                            {playlistSearchQ && (
                              <button onClick={() => setPlaylistSearchQ('')} style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#5c5755",display:"flex"}}>
                                <X size={13} />
                              </button>
                            )}
                          </div>
                          {filteredTracks.length === 0
                            ? <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"110px",color:"#363230",gap:"7px"}}><Search size={24} strokeWidth={1} /><p style={{fontSize:"13px",color:"#5c5755"}}>No results for "{playlistSearchQ}"</p></div>
                            : filteredTracks.map((t, i) => {
                                const origIdx = openPlaylist.tracks.indexOf(t);
                                return (
                                  <div key={t.url + origIdx}
                                    style={{position:"relative",display:"flex",alignItems:"center",gap:"3px"}}
                                    onMouseEnter={() => { if (dragPlaylistIdx.current !== null) { dragOverPlaylistIdxRef.current = origIdx; setDragOverPlaylistIdx(origIdx); } }}>
                                    {dragOverPlaylistIdx === origIdx && dragPlaylistIdx.current !== null && dragPlaylistIdx.current !== origIdx && (
                                      <div style={{position:"absolute",top:0,left:"32px",right:0,height:"2px",background:"rgba(226,221,217,0.5)",borderRadius:"1px",zIndex:10,pointerEvents:"none"}}/>
                                    )}
                                    {!playlistSearchQ && (
                                      <div
                                        style={{padding:"4px 6px",cursor:"grab",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:0.2,transition:"opacity .12s"}}
                                        onMouseEnter={e=>(e.currentTarget.style.opacity="0.7")} onMouseLeave={e=>(e.currentTarget.style.opacity="0.2")}
                                        onMouseDown={e => {
                                          e.preventDefault();
                                          dragPlaylistIdx.current = origIdx;
                                          dragOverPlaylistIdxRef.current = origIdx;
                                          setDragOverPlaylistIdx(origIdx);
                                          const onUp = () => {
                                            const from = dragPlaylistIdx.current;
                                            const to = dragOverPlaylistIdxRef.current;
                                            dragPlaylistIdx.current = null;
                                            dragOverPlaylistIdxRef.current = null;
                                            setDragOverPlaylistIdx(null);
                                            window.removeEventListener('mouseup', onUp);
                                            if (from === null || to === null || from === to) return;
                                            setPlaylists(prev => prev.map(pl => {
                                              if (pl.id !== openPlaylist.id) return pl;
                                              const arr = [...pl.tracks];
                                              const [moved] = arr.splice(from, 1);
                                              arr.splice(to, 0, moved);
                                              return { ...pl, tracks: arr };
                                            }));
                                          };
                                          window.addEventListener('mouseup', onUp);
                                        }}>
                                        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" style={{color:"#5c5755"}}>
                                          <circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/>
                                          <circle cx="3" cy="8" r="1.3"/><circle cx="7" cy="8" r="1.3"/>
                                          <circle cx="3" cy="13" r="1.3"/><circle cx="7" cy="13" r="1.3"/>
                                        </svg>
                                      </div>
                                    )}
                                    <div style={{flex:1,minWidth:0}}>
                                      <TrackRow track={t} index={i} showRemove onRemove={() => removeFromPlaylist(openPlaylist.id, t.url)}
                                        isActive={currentTrack?.url === t.url} isHovered={hoveredTrackUrl === t.url}
                                        isLoadingTrack={isLoadingTrack} isPlaying={isPlaying}
                                        isLiked={isTrackLiked(t.url)} isDownloading={(downloadingTracks[t.url] ?? 0)}
                                        onPlay={() => handlePlayInContext(t, openPlaylist.tracks)}
                                        onHoverEnter={() => setHoveredTrackUrl(t.url)} onHoverLeave={() => setHoveredTrackUrl(null)}
                                        onLike={() => toggleLikeTrack(t)} onDownload={() => handleDownload(t)}
                                        onCtx={e => openCtx(e, { type: 'track', track: t })} />
                                    </div>
                                  </div>
                                );
                              })
                          }
                        </div>
                      );
                    })()
                }
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"22px 28px",zIndex:10}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
                  <h2 style={{fontSize:'20px',fontWeight:800,color:'#e2ddd9',margin:0}}>Playlists</h2>
                  <button onClick={() => { setNewPlaylistName(''); setNewPlaylistDesc(''); setIsPlaylistModalOpen(true); }}
                    style={{padding:'7px 14px',background:'transparent',border:'1px solid #252222',color:'#9e9894',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:600,display:'flex',alignItems:'center',gap:'7px',transition:'border-color .12s,color .12s,background .12s'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#2e2b2b';(e.currentTarget as HTMLElement).style.color='#e2ddd9';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#252222';(e.currentTarget as HTMLElement).style.color='#9e9894';}}>
                    <PlusCircle size={13} /> New Playlist
                  </button>
                </div>
                <div style={{display:"grid",gap:"10px",gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))"}}>
                  {playlists.map((pl, plIdx) => {
                    const cover = getPlaylistCover(pl);
                    const isDragTarget = dragOverPlaylistCardIdx === plIdx && dragPlaylistCardIdx.current !== null && dragPlaylistCardIdx.current !== plIdx;
                    return (
                      <div key={pl.id}
                        onMouseEnter={() => { if (dragPlaylistCardIdx.current !== null) { dragOverPlaylistCardIdxRef.current = plIdx; setDragOverPlaylistCardIdx(plIdx); } }}
                        className={`v-pl-card${isDragTarget?' ring-2 ring-[#e2ddd9]/30':''}`}
                        style={{ animation: `fadeUp 0.2s cubic-bezier(0.2,0,0,1) ${plIdx * 30}ms both` }}
                        onClick={() => { if (dragPlaylistCardIdx.current === null) setOpenPlaylistId(pl.id); }}
                        onContextMenu={e => openCtx(e, { type: 'playlist', playlist: pl })}>
                        <div
                          style={{width:"100%",aspectRatio:"1",borderRadius:"7px",overflow:"hidden",background:"#1c1a1a",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",marginBottom:"8px",cursor:"grab"}}
                          onMouseDown={e => {
                            e.preventDefault();
                            dragPlaylistCardIdx.current = plIdx;
                            dragOverPlaylistCardIdxRef.current = plIdx;
                            setDragOverPlaylistCardIdx(plIdx);
                            const onUp = () => {
                              const from = dragPlaylistCardIdx.current;
                              const to = dragOverPlaylistCardIdxRef.current;
                              dragPlaylistCardIdx.current = null;
                              dragOverPlaylistCardIdxRef.current = null;
                              setDragOverPlaylistCardIdx(null);
                              window.removeEventListener('mouseup', onUp);
                              if (from === null || to === null || from === to) return;
                              setPlaylists(prev => {
                                const arr = [...prev];
                                const [moved] = arr.splice(from, 1);
                                arr.splice(to, 0, moved);
                                return arr;
                              });
                            };
                            window.addEventListener('mouseup', onUp);
                          }}>
                          {cover
                            ? <img src={cover} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                            : pl.id==='p1'
                              ? <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,rgba(140,30,30,0.5) 0%,#1c1a1a 100%)"}}><Heart size={22} style={{color:"#e05555",fill:"rgba(220,60,60,0.35)"}}/></div>
                              : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.03)"}}><ListMusic size={24} style={{color:"#363230"}}/></div>}
                          <div className="pl-hover-overlay" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",opacity:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"opacity .15s"}}>
                            <button onClick={e=>{e.stopPropagation();playAll(pl.tracks);}}
                              style={{width:"36px",height:"36px",background:"#e2ddd9",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",boxShadow:"0 4px 14px rgba(0,0,0,0.6)",transition:"transform .1s"}}
                              onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.08)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
                              <Play size={14} style={{fill:"#0c0b0b",color:"#0c0b0b",marginLeft:"2px"}}/>
                            </button>
                          </div>
                        </div>
                        <div style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.3}}>{pl.name}</div>
                        <div style={{fontSize:"11px",color:"#5c5755",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {pl.description?pl.description:`${pl.tracks.length} track${pl.tracks.length!==1?'s':''}`}
                        </div>
                        {pl.id!=='p1'&&(
                          <button onClick={e=>{e.stopPropagation();deletePlaylist(pl.id);}}
                            className="pl-card-del"
                            style={{position:"absolute",top:"6px",right:"6px",opacity:0,width:"22px",height:"22px",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)",borderRadius:"5px",border:"none",cursor:"pointer",color:"#5c5755",transition:"color .12s,opacity .12s"}}
                            onMouseEnter={e=>(e.currentTarget.style.color="#b05555")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                            <Trash2 size={10}/>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {}
          {activeNav === 'stats' && (() => {
            const totalSecs = Object.values(listenSecs).reduce((s: number, n) => s + (n as number), 0);
            const totalPlays = Object.values(playCounts).reduce((s: number, n) => s + (n as number), 0);
            const hrs = Math.floor(totalSecs / 3600);
            const mins = Math.floor((totalSecs % 3600) / 60);

            // Build a comprehensive track lookup from all known sources
            const allKnownTracks: Track[] = [...new Map(
              [...quickPicks, ...playHistory].map((t: Track) => [t.url, t])
            ).values()];

            // Top 5 tracks — only include entries where we have track metadata
            const topTracks: { track: Track; count: number }[] = Object.entries(playCounts)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 5)
              .reduce((acc: { track: Track; count: number }[], [url, count]) => {
                const track = allKnownTracks.find(t => t.url === url);
                if (track) acc.push({ track, count: count as number });
                return acc;
              }, []);

            // Top 5 artists
            const artistCounts: Record<string, number> = {};
            Object.entries(playCounts).forEach(([url, count]) => {
              const artist = allKnownTracks.find(t => t.url === url)?.artist;
              if (artist && artist.trim()) {
                artistCounts[artist] = (artistCounts[artist] || 0) + (count as number);
              }
            });
            const topArtists: [string, number][] = Object.entries(artistCounts)
              .sort((a, b) => b[1] - a[1]).slice(0, 5);

            // Last 7 days bar chart
            const today = new Date();
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(today);
              d.setDate(today.getDate() - (6 - i));
              const key = d.toISOString().slice(0, 10);
              return { label: d.toLocaleDateString('en', { weekday: 'short' }), count: (dailyPlays[key] as number) || 0 };
            });
            const maxDay = Math.max(...days.map(d => d.count), 1);

            const resetStats = () => {
              setConfirmModal({
                message: 'Reset all stats? This will clear play counts, listen time, history, and daily plays. Cannot be undone.',
                onConfirm: () => {
                  setPlayCounts({}); saveLS('vg_playCounts', {});
                  setListenSecs({}); saveLS('vg_listenSecs', {});
                  setDailyPlays({}); saveLS('vg_dailyPlays', {});
                  setFirstSeen({}); saveLS('vg_firstSeen', {});
                  setPlayHistory([]); saveLS('vg_playHistory', []);
                  showToast('Stats reset');
                }
              });
            };

            const hasAnyStats = totalPlays > 0 || totalSecs > 0 || Object.keys(dailyPlays).some(k => (dailyPlays[k] as number) > 0);
            if (!hasAnyStats) {
              return (
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"12px"}}>
                  <BarChart2 size={36} style={{color:"#363230"}} strokeWidth={1}/>
                  <p style={{fontSize:"12px",color:"#5c5755"}}>Play something to start tracking stats</p>
                </div>
              );
            }

            return (
              <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"22px 28px"}}>
                {/* Header with reset button */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
                  <h1 style={{fontSize:"18px",fontWeight:800,color:"#e2ddd9",margin:0}}>Stats</h1>
                  <button onClick={resetStats}
                    style={{fontSize:"11px",color:"#363230",cursor:"pointer",padding:"5px 10px",borderRadius:"7px",border:"1px solid #252222",background:"transparent",transition:"color .12s,border-color .12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.color="#b05555";e.currentTarget.style.borderColor="rgba(180,40,40,0.3)"}}
                    onMouseLeave={e=>{e.currentTarget.style.color="#363230";e.currentTarget.style.borderColor="#252222"}}>
                    Reset
                  </button>
                </div>

                {/* Summary cards */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'28px'}}>
                  {([
                    { label: 'Time Listened', value: hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`, sub: 'total' },
                    { label: 'Tracks Played', value: totalPlays.toLocaleString(), sub: 'all time' },
                    { label: 'Unique Tracks', value: Object.keys(playCounts).length.toLocaleString(), sub: 'tracked' },
                  ] as { label: string; value: string; sub: string }[]).map(({ label, value, sub }) => (
                    <div key={label} className="v-stat-card">
                      <div className="v-stat-card__label">{label}</div>
                      <div className="v-stat-card__value">{value}</div>
                      <div className="v-stat-card__sub">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Daily plays bar chart */}
                <div style={{marginBottom:"20px"}}>
                  <div className="v-section-head">
                    <h2>Last 7 Days</h2>
                    <span style={{fontSize:"11px",color:"#363230",marginLeft:"auto"}}>{days.reduce((s,d)=>s+d.count,0)} plays</span>
                  </div>
                  <div style={{background:"#161414",border:"1px solid #1c1a1a",borderRadius:"12px",padding:"16px"}}>
                    <div style={{display:"flex",alignItems:"flex-end",gap:"8px",height:"130px"}}>
                      {days.map(({ label, count }, di) => {
                        const isToday = di === 6;
                        const barH = count === 0 ? 6 : Math.max(20, Math.round((count / maxDay) * 110));
                        return (
                          <div key={label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:"4px",height:"100%"}}>
                            {count > 0 && (
                              <span className="text-[11px] font-bold tabular-nums" style={{color: isToday ? '#e2ddd9' : '#5c5755'}}>{count}</span>
                            )}
                            <div style={{
                                width:'100%',height:`${barH}px`,borderRadius:'6px 6px 0 0',
                                background:count===0?'rgba(255,255,255,0.04)':isToday?'linear-gradient(180deg,rgba(226,221,217,0.9),rgba(226,221,217,0.4))':'rgba(226,221,217,0.22)',
                                transition:'height .5s cubic-bezier(0.2,0,0,1)',
                              }} />
                            <span style={{fontSize:"10px",fontWeight:600,color:isToday?"#9e9894":"#363230"}}>{label}</span>
                            {isToday && <span style={{fontSize:'8px',color:'rgba(226,221,217,0.4)',fontWeight:700,marginTop:'-2px'}}>TODAY</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
                  {/* Top tracks */}
                  {topTracks.length > 0 && (
                    <div>
                      <div className="v-section-head">
                        <h2>Top Tracks</h2>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                        {topTracks.map(({ track, count }, i) => (
                          <div key={track.url}
                            onClick={() => handlePlayInContext(track, topTracks.map(x => x.track))}
                            className="v-track">
                            <div className="v-track__num">{i+1}</div>
                            <div className="v-track__art"><img src={track.cover} alt="" loading="lazy"/></div>
                            <div className="v-track__info">
                              <div className="v-track__title">{track.title}</div>
                              <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'3px'}}>
                                <div style={{flex:1,height:'2px',background:'#232020',borderRadius:'1px',overflow:'hidden'}}>
                                  <div style={{height:'100%',background:'rgba(226,221,217,0.35)',borderRadius:'1px',width:`${(count/(topTracks[0]?.count||1))*100}%`}}/>
                                </div>
                                <span style={{fontSize:'10px',color:'#363230',fontVariantNumeric:'tabular-nums',flexShrink:0}}>{count}×</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top artists */}
                  {topArtists.length > 0 && (
                    <div>
                      <div className="v-section-head">
                        <h2>Top Artists</h2>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                        {topArtists.map(([artist, count], i) => {
                          const thumb = artistThumbs[artist];
                          return (
                          <div key={artist} className="v-track"
                            onClick={() => { setSearchQuery(artist); searchMusic(artist); setActiveNav('home'); }}>
                            <div className="v-track__num">{i+1}</div>
                            <div style={{width:"36px",height:"36px",borderRadius:"50%",background:"#1c1a1a",border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                              {thumb ? <img src={thumb} alt={artist} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:"11px",fontWeight:700,color:"#5c5755"}}>{artist.slice(0,2).toUpperCase()}</span>}
                            </div>
                            <div className="v-track__info">
                              <div className="v-track__title">{artist}</div>
                              <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"3px"}}>
                                <div style={{flex:1,height:"2px",background:"#232020",borderRadius:"1px",overflow:"hidden"}}>
                                  <div style={{height:"100%",background:"rgba(226,221,217,0.3)",borderRadius:"1px",width:`${(count/(topArtists[0]?.[1]||1))*100}%`}}/>
                                </div>
                                <span style={{fontSize:"10px",color:"#363230",fontVariantNumeric:"tabular-nums",flexShrink:0}}>{count}×</span>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent history */}
                {playHistory.length > 0 && (
                  <div style={{marginTop:"16px"}}>
                    <div className="v-section-head">
                      <h2>Recent Plays</h2>
                      <button onClick={() => { setPlayHistory([]); saveLS('vg_playHistory', []); }}
                        style={{marginLeft:"auto",fontSize:"11px",color:"#363230",background:"none",border:"none",cursor:"pointer",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#363230")}>Clear</button>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                      {playHistory.slice(0, 8).map((track: Track, i: number) => (
                        <div key={track.url + i}
                          onClick={() => handlePlayInContext(track, playHistory.slice(0, 8))}
                          className="v-track">
                          <div className="v-track__art"><img src={track.cover} alt="" loading="lazy"/></div>
                          <div className="v-track__info">
                              <div className="v-track__title">{track.title}</div>
                            <div className="v-track__artist">{track.artist}</div>
                          </div>
                          <Play size={12} style={{color:'#363230',flexShrink:0}}/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {activeNav === 'settings' && (
            <SettingsPanel
              downloadQuality={downloadQuality} setDownloadQuality={setDownloadQuality}
              downloadPath={downloadPath} handleSelectDirectory={handleSelectDirectory}
              downloadFormat={downloadFormat} setDownloadFormat={setDownloadFormatState}
              embedThumbnail={embedThumbnail} setEmbedThumbnail={setEmbedThumbnailState}
              duplicateDetect={duplicateDetect} setDuplicateDetect={setDuplicateDetectState}
              onBackup={handleBackup} onRestore={handleRestore}
              onReset={() => setConfirmModal({ message: 'Reset all Veluna data? This cannot be undone.', onConfirm: () => { localStorage.clear(); window.location.reload(); } })}
              backupPath={backupPath} setBackupPath={setBackupPath}
              loudnormEnabled={loudnormEnabled} setLoudnormEnabled={setLoudnormEnabledState}
              streamQuality={streamQuality} setStreamQuality={setStreamQualityState}
              skipSilence={skipSilence} setSkipSilence={setSkipSilenceState}
              eq={eq} setEq={v => { setEqState(v); saveLS('vg_eq', v); }}
              showToast={showToast}
              updateAvailable={updateAvailable}
              appVersion={appVersion}
              lyricsSource={lyricsSource} setLyricsSource={setLyricsSource}
              trayEnabled={trayEnabled} setTrayEnabled={setTrayEnabled}
              audioDevices={audioDevices} setAudioDevices={setAudioDevices}
            />
          )}
          </div>
        </div>

        {}
        <div style={{flexShrink:0,background:'#111010',borderLeft:'1px solid #1c1a1a',display:'flex',flexDirection:'column',overflow:'hidden',width:isQueueOpen?'260px':'0',transition:'width 0.28s cubic-bezier(0.2,0,0,1)'}}>
          {isQueueOpen && (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #1c1a1a',flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
                  <ListOrdered size={16} style={{color:'#9e9894'}} />
                  <span style={{fontWeight:700,color:'#e2ddd9',fontSize:'13px'}}>Queue</span>
                  {queue.length > 0 && <span className="v-badge">{queue.length}</span>}
                </div>
                {queue.length > 0 && <button onClick={() => { setQueue([]); showToast('Queue cleared'); }} style={{background:'none',border:'none',cursor:'pointer',fontSize:'11px',color:'#363230',transition:'color .12s'}} onMouseEnter={e=>(e.currentTarget.style.color='#b05555')} onMouseLeave={e=>(e.currentTarget.style.color='#363230')}>Clear</button>}
              </div>
              {currentTrack && (
                <div style={{padding:'10px 14px',borderBottom:'1px solid #1c1a1a',flexShrink:0}}>
                  <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#363230',marginBottom:'8px'}}>Now Playing</div>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px',borderRadius:'8px',background:'rgba(226,221,217,0.04)',border:'1px solid rgba(226,221,217,0.08)'}}>
                    <div style={{position:'relative',width:'38px',height:'38px',borderRadius:'6px',overflow:'hidden',flexShrink:0,background:'#1c1a1a',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {currentTrack.cover ? <img src={currentTrack.cover} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" /> : <FileMusic size={16} style={{color:'#5c5755'}} />}
                      {!isLoadingTrack && isPlaying && (
                        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <div style={{display:'flex',gap:'2px',alignItems:'flex-end',height:'12px'}}>{[100,60,80].map((h,i)=><div key={i} style={{width:'2px',background:'#9e9894',borderRadius:'1px',height:`${h}%`,animation:`barBounce ${0.7+i*0.12}s ease-in-out ${i*110}ms infinite`,transformOrigin:'bottom'}}/>)}</div>
                        </div>
                      )}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'12px',fontWeight:700,color:'#e2ddd9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentTrack.title}</div>
                      <div style={{fontSize:'11px',color:'#5c5755',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:'2px'}}>{currentTrack.artist}</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {queue.length === 0
                  ? <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"140px",color:"#363230",gap:"8px"}}><ListOrdered size={26} strokeWidth={1} /><p style={{fontSize:"13px"}}>Queue is empty</p></div>
                  : <>
                      <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#363230',padding:'12px 14px 6px'}}>Up Next</div>
                      {queue.map((track, i) => (
                        <div key={`${track.url}-${i}`}
                          className={`v-queue-item${currentTrack?.url===track.url?' v-queue-item--active':''}`} style={{position:'relative'}}
                          onMouseEnter={() => { if (dragQueueIdx.current !== null) { dragOverQueueIdxRef.current = i; setDragOverQueueIdx(i); } }}
                          onContextMenu={e => openCtx(e, { type: 'queue-track', track })}>
                          {dragOverQueueIdx === i && dragQueueIdx.current !== null && dragQueueIdx.current !== i && (
                            <div style={{position:"absolute",top:0,left:0,right:0,height:"1.5px",background:"rgba(226,221,217,0.5)",borderRadius:"1px",zIndex:10,pointerEvents:"none"}} />
                          )}
                          <div style={{width:"20px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}
                            onMouseDown={e => {
                              e.preventDefault();
                              dragQueueIdx.current = i;
                              dragOverQueueIdxRef.current = i;
                              setDragOverQueueIdx(i);
                              const onUp = () => {
                                const from = dragQueueIdx.current;
                                const to = dragOverQueueIdxRef.current;
                                dragQueueIdx.current = null;
                                dragOverQueueIdxRef.current = null;
                                setDragOverQueueIdx(null);
                                window.removeEventListener('mouseup', onUp);
                                if (from === null || to === null || from === to) return;
                                setQueue(prev => {
                                  const next = [...prev];
                                  const [moved] = next.splice(from, 1);
                                  next.splice(to, 0, moved);
                                  return next;
                                });
                              };
                              window.addEventListener('mouseup', onUp);
                            }}>
                            <div style={{width:"18px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"grab"}}
                              onMouseEnter={e=>{(e.currentTarget.firstChild as HTMLElement).style.display="none";(e.currentTarget.lastChild as HTMLElement).style.display="block";}}
                              onMouseLeave={e=>{(e.currentTarget.firstChild as HTMLElement).style.display="block";(e.currentTarget.lastChild as HTMLElement).style.display="none";}}>
                              <span style={{fontSize:"11px",color:"#363230",fontVariantNumeric:"tabular-nums",display:"block"}}>{i+1}</span>
                              <svg width="9" height="13" viewBox="0 0 10 14" fill="#5c5755" style={{display:"none"}}><circle cx="3" cy="2.5" r="1.2"/><circle cx="7" cy="2.5" r="1.2"/><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="3" cy="11.5" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/></svg>
                            </div>
                          </div>
                          <div style={{width:"38px",height:"38px",borderRadius:"6px",overflow:"hidden",flexShrink:0,border:"1px solid rgba(255,255,255,0.05)",cursor:"pointer"}} onClick={()=>{if(dragQueueIdx.current===null){setQueue(p=>p.filter((_,idx)=>idx!==i));handlePlayTrack(track,true);}}}>
                            <img src={track.cover} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                          </div>
                          <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>{if(dragQueueIdx.current===null){setQueue(p=>p.filter((_,idx)=>idx!==i));handlePlayTrack(track,true);}}}>
                            <div style={{fontSize:"12.5px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:currentTrack?.url===track.url?"#e2ddd9":"#c8c4c0"}}>{track.title}</div>
                            <div style={{fontSize:"11px",color:"#5c5755",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:"1px"}}>{track.artist}</div>
                          </div>
                          <button onClick={e=>{e.stopPropagation();removeFromQueue(track.url());}} style={{opacity:0,padding:"4px",border:"none",background:"none",cursor:"pointer",color:"#363230",flexShrink:0,borderRadius:"4px",display:"flex",transition:"color .12s"}}
                            onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.color="#b05555";}} onMouseLeave={e=>{e.currentTarget.style.opacity="0";e.currentTarget.style.color="#363230";}}><X size={12}/></button>
                        </div>
                      ))}
                    </>}
              </div>
            </>
          )}
        </div>
      </div>

      {}
      <div style={{height:"78px",background:"#111010",borderTop:"1px solid #1c1a1a",display:"flex",alignItems:"center",padding:"0 18px",position:"relative",zIndex:20,flexShrink:0,gap:0}}>
        {/* Loading bar */}
        {isLoadingTrack && (
          <div style={{position:"absolute",top:0,left:0,width:"100%",height:"1px",overflow:"hidden",background:"#1c1a1a"}}>
            <div style={{height:"100%",background:"rgba(226,221,217,0.4)",animation:"loadbar 1.6s ease-in-out infinite",width:"35%"}}/>
          </div>
        )}
        {isPlaying&&!isLoadingTrack&&<div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"rgba(226,221,217,0.06)"}}/>}

        {/* ── LEFT: art + info + like ── */}
        <div style={{display:"flex",alignItems:"center",gap:"10px",width:"240px",flexShrink:0,minWidth:0}}>
          {currentTrack ? (
            <>
              {/* Art */}
              <div style={{position:"relative",width:"46px",height:"46px",borderRadius:"8px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)",flexShrink:0,cursor:"pointer",background:"#1c1a1a",display:"flex",alignItems:"center",justifyContent:"center"}}
                onClick={()=>{ if(!currentTrack.url.startsWith('local://')) setInfoModalTrack(currentTrack); }}
                onContextMenu={e=>{ if(!currentTrack.url.startsWith('local://')) openCtx(e,{type:'track',track:currentTrack}); }}
                onMouseEnter={e=>{ const ov=e.currentTarget.querySelector<HTMLElement>('.art-ov'); if(ov) ov.style.opacity='1'; }}
                onMouseLeave={e=>{ const ov=e.currentTarget.querySelector<HTMLElement>('.art-ov'); if(ov) ov.style.opacity='0'; }}>
                {currentTrack.cover
                  ? <img src={currentTrack.cover} alt={currentTrack.title} style={{width:"100%",height:"100%",objectFit:"cover",opacity:isLoadingTrack?0.4:1,transition:"opacity .2s"}}/>
                  : <FileMusic size={18} style={{color:"#5c5755"}}/>}
                {isLoadingTrack
                  ? <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <div style={{width:"16px",height:"16px",border:"2px solid #9e9894",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                    </div>
                  : !currentTrack.url.startsWith('local://')
                    ? <div className="art-ov" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .15s"}}>
                        <Info size={14} style={{color:"#e2ddd9"}}/>
                      </div>
                    : null}
              </div>
              {/* Info */}
              <div key={currentTrack.url} style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:"1px",animation:"fadeIn 0.25s ease both"}}>
                <div style={{fontWeight:600,color:"#e2ddd9",fontSize:"14px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:"1.3"}}>{currentTrack.title}</div>
                {isLoadingTrack
                  ? <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                      <div style={{display:"flex",gap:"2px",alignItems:"flex-end",height:"10px"}}>
                        {[1,0.6,0.8,0.5].map((h,i)=><span key={i} style={{width:"2px",background:"rgba(226,221,217,0.5)",borderRadius:"1px",display:"inline-block",height:`${h*100}%`,animation:`barBounce ${0.65+i*0.1}s ease-in-out ${i*100}ms infinite`,transformOrigin:"bottom"}}/>)}
                      </div>
                      <span style={{fontSize:"10px",color:"rgba(226,221,217,0.5)"}}>Buffering</span>
                    </div>
                  : <div style={{fontSize:"11px",color:"#5c5755",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentTrack.artist||"Unknown artist"}</div>}
                {audioInfo&&!isLoadingTrack&&(
                  <div style={{fontSize:"9.5px",color:"#363230",fontFamily:"monospace"}}>
                    {audioInfo.codec.toUpperCase()}{audioInfo.samplerate>0?` · ${Math.round(audioInfo.samplerate/1000)}kHz`:''}
                  </div>
                )}
              </div>
              {/* Like + Download */}
              {!currentTrack.url.startsWith('local://') && (
                <div style={{display:"flex",alignItems:"center",gap:"2px",flexShrink:0}}>
                  <button onClick={()=>toggleLikeTrack(currentTrack)} style={{background:"none",border:"none",cursor:"pointer",padding:"5px",display:"flex",color:"#5c5755",transition:"color .12s,transform .1s"}}
                    onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.15)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
                    <Heart size={16} style={isTrackLiked(currentTrack.url)?{color:"#e05555",fill:"#e05555"}:{color:"#5c5755"}}/>
                  </button>
                  {(()=>{ const dl=downloadingTracks[currentTrack.url]; return (
                    <button onClick={()=>handleDownload(currentTrack)} title="Download" style={{background:"none",border:"none",cursor:"pointer",padding:"5px",display:"flex",color:"#5c5755",transition:"color .12s,transform .1s"}}
                      onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.15)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
                      {dl>0
                        ? <svg width="15" height="15" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="none" stroke="#2a2727" strokeWidth="1.5"/><circle cx="7" cy="7" r="5.5" fill="none" stroke="#9e9894" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={`${2*Math.PI*5.5}`} strokeDashoffset={`${2*Math.PI*5.5*(1-Math.min(dl,100)/100)}`} style={{transformOrigin:"7px 7px",transform:"rotate(-90deg)",transition:"stroke-dashoffset .3s"}}/>{dl>=100&&<path d="M4.5 7l2 2 3-3" stroke="#9e9894" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>}</svg>
                        : <Download size={15}/>}
                    </button>
                  ); })()}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{width:"42px",height:"42px",borderRadius:"7px",border:"1px solid #1c1a1a",background:"#161414",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Music size={16} style={{color:"#363230"}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,color:"#363230",fontSize:"12.5px"}}>Nothing playing</div>
                <div style={{fontSize:"11px",color:"#2a2727"}}>Search YouTube to start</div>
              </div>
            </>
          )}
        </div>

        {/* ── CENTER: controls + progress ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"7px",padding:"0 16px",minWidth:0}}>
          {/* Transport controls */}
          <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
            <button onClick={toggleShuffle} title="Shuffle" style={{background:"none",border:"none",cursor:"pointer",color:shuffle?"#e2ddd9":"#363230",padding:"3px",display:"flex",transition:"color .12s,transform .1s"}}
              onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.15)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
              <Shuffle size={14}/>
            </button>
            <button onClick={handleSkipBack} title="Previous" style={{background:"none",border:"none",cursor:currentTrack?"pointer":"not-allowed",color:currentTrack?"#9e9894":"#2a2727",padding:"3px",display:"flex",transition:"color .12s,transform .1s"}}
              onMouseEnter={e=>{if(currentTrack)e.currentTarget.style.transform="scale(1.15)";}} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
              <SkipBack size={16}/>
            </button>
            <button onClick={togglePlayPause} disabled={!currentTrack||isLoadingTrack}
              style={{width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:"#e2ddd9",color:"#0c0b0b",border:"none",cursor:(!currentTrack||isLoadingTrack)?"not-allowed":"pointer",flexShrink:0,opacity:(!currentTrack||isLoadingTrack)?0.4:1,boxShadow:"0 2px 10px rgba(0,0,0,0.5)",transition:"transform .1s,box-shadow .12s"}}
              onMouseEnter={e=>{if(currentTrack&&!isLoadingTrack){e.currentTarget.style.transform="scale(1.07)";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.6)";} }}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,0.5)";}}>
              {isLoadingTrack
                ? <div style={{width:"14px",height:"14px",border:"2px solid #0c0b0b",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                : isPlaying ? <Pause fill="currentColor" size={16}/> : <Play fill="currentColor" size={16} style={{marginLeft:"2px"}}/>}
            </button>
            <button onClick={handleSkipForward} title="Next" style={{background:"none",border:"none",cursor:(queue.length>0||playlistContextRef.current!==null)?"pointer":"not-allowed",color:(queue.length>0||playlistContextRef.current!==null)?"#9e9894":"#2a2727",padding:"3px",display:"flex",transition:"color .12s,transform .1s"}}
              onMouseEnter={e=>{if(queue.length>0||playlistContextRef.current!==null)e.currentTarget.style.transform="scale(1.15)";}} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
              <SkipForward size={16}/>
            </button>
            <button onClick={cycleRepeat} title={`Repeat: ${repeatMode}`} style={{background:"none",border:"none",cursor:"pointer",color:repeatMode!=='off'?"#e2ddd9":"#363230",padding:"3px",display:"flex",transition:"color .12s,transform .1s"}}
              onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.15)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
              {repeatMode==='one' ? <Repeat1 size={14}/> : <Repeat size={14}/>}
            </button>
          </div>

          {/* Progress row */}
          <div style={{width:"100%",display:"flex",alignItems:"center",gap:"7px"}}>
            {/* Speed */}
            <SpeedSelector speed={playbackSpeed} onChange={setPlaybackSpeed}/>
            {/* A-B loop */}
            <button
              title={abLoop.a===null?'Set A (loop start)':abLoop.b===null?'Set B (loop end)':'Clear A-B loop'}
              onClick={()=>{
                if(abLoop.a===null){const a=progressSecondsRef.current;setAbLoop({a,b:null});abLoopRef.current={a,b:null};showToast(`Loop A: ${formatTime(a)}`);}
                else if(abLoop.b===null){const b=progressSecondsRef.current;if(b>(abLoop.a??0)+1){setAbLoop(p=>({...p,b}));abLoopRef.current={...abLoopRef.current,b};showToast(`Loop: ${formatTime(abLoop.a!)} → ${formatTime(b)}`);}else{showToast('B must be after A');}}
                else{setAbLoop({a:null,b:null});abLoopRef.current={a:null,b:null};showToast('Loop cleared');}
              }}
              style={{
                display:"flex",alignItems:"center",gap:"3px",padding:"2px 6px",
                borderRadius:"5px",border:"1px solid",
                fontSize:"10px",fontWeight:700,flexShrink:0,cursor:"pointer",
                background:abLoop.b!==null?"rgba(226,221,217,0.08)":abLoop.a!==null?"rgba(226,221,217,0.04)":"transparent",
                borderColor:abLoop.b!==null?"rgba(226,221,217,0.25)":abLoop.a!==null?"rgba(226,221,217,0.12)":"#252222",
                color:abLoop.b!==null?"#e2ddd9":abLoop.a!==null?"#9e9894":"#363230",
                transition:"all .12s",
              }}>
              A·B{abLoop.b!==null?" ✓":abLoop.a!==null?" …":""}
            </button>
            {/* Time elapsed */}
            <span style={{fontSize:"10px",color:"#363230",flexShrink:0,fontVariantNumeric:"tabular-nums",minWidth:"30px",textAlign:"right"}}>
              {currentTrack?formatTime(progressSeconds):'0:00'}
            </span>
            {/* Progress track */}
            <div ref={progressRef} className="slider-track"
              style={{position:"relative",flex:"1 1 0%",height:"3px",background:"#232020",borderRadius:"2px",cursor:currentTrack?"pointer":"default"}}
              onMouseDown={e=>{if(!currentTrack)return;isDraggingProgressRef.current=true;setIsDraggingProgress(true);updateProgressFromEvent(e.clientX);}}
              onMouseMove={e=>{
                if(!progressRef.current||!currentTrack)return;
                const rect=progressRef.current.getBoundingClientRect();
                const pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
                const total=trackDurationRef.current||parseDurationToSeconds(currentTrack.duration);
                const el=progressRef.current.querySelector<HTMLElement>('.prog-tooltip');
                if(el){el.textContent=formatTime(total*pct);el.style.left=`${pct*100}%`;}
              }}
              onMouseEnter={e=>{const el=e.currentTarget.querySelector<HTMLElement>('.prog-tooltip');if(el)el.style.opacity='1';}}
              onMouseLeave={e=>{const el=e.currentTarget.querySelector<HTMLElement>('.prog-tooltip');if(el)el.style.opacity='0';}}>
              {/* Hover tooltip */}
              {currentTrack&&<div className="prog-tooltip" style={{position:"absolute",top:"-26px",left:"0%",transform:"translateX(-50%)",background:"#1c1a1a",border:"1px solid #252222",borderRadius:"5px",padding:"2px 6px",fontSize:"10px",fontWeight:700,color:"#9e9894",pointerEvents:"none",whiteSpace:"nowrap",zIndex:10,opacity:0,transition:"opacity .15s"}}/>}
              {waveformData.length>0&&<WaveformBar waveform={waveformData} progressPercent={calculateProgressPercent()} isDragging={isDraggingProgress}/>}
              {/* Fill + thumb */}
              <div style={{position:"absolute",top:0,left:0,height:"100%",background:"#e2ddd9",borderRadius:"2px",pointerEvents:"none",width:`${calculateProgressPercent()}%`,transition:isDraggingProgress?'none':'width 0.5s linear'}}>
                <div className="slider-thumb" style={{position:"absolute",right:"-5px",top:"50%",transform:"translateY(-50%)",width:"11px",height:"11px",background:"#fff",borderRadius:"50%",opacity:0,pointerEvents:"none",transition:"opacity .12s"}}/>
              </div>
            </div>
            {/* Duration */}
            <span style={{fontSize:"10px",color:"#363230",flexShrink:0,fontVariantNumeric:"tabular-nums",minWidth:"30px"}}>
              {currentTrack?formatTime(trackDurationSeconds||parseDurationToSeconds(currentTrack.duration)):'0:00'}
            </span>
          </div>
        </div>

        {/* ── RIGHT: lyrics + crossfade + mute + volume ── */}
        <div style={{width:"210px",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"12px",flexShrink:0}}>
          {crossfadeSeconds>0&&(
            <span style={{fontSize:"9.5px",color:"#5c5755",fontWeight:700,fontVariantNumeric:"tabular-nums",flexShrink:0}} title={`Crossfade: ${crossfadeSeconds}s`}>
              ×{crossfadeSeconds}s
            </span>
          )}
          <button onClick={()=>{if(currentTrack)setShowLyrics(o=>!o);}} disabled={!currentTrack} title="Lyrics"
            style={{background:"none",border:"none",cursor:currentTrack?"pointer":"not-allowed",color:showLyrics?"#9e9894":"#363230",flexShrink:0,display:"flex",padding:"3px",transition:"color .12s",opacity:currentTrack?1:0.4}}
            onMouseEnter={e=>{if(currentTrack)e.currentTarget.style.color="#9e9894";}} onMouseLeave={e=>{if(!showLyrics)e.currentTarget.style.color="#363230";}}>
            <Mic2 size={15}/>
          </button>
          <button onClick={toggleMute} title={volume===0?"Unmute":"Mute"}
            style={{background:"none",border:"none",cursor:"pointer",flexShrink:0,padding:"3px",color:"#5c5755",display:"flex",transition:"color .12s"}}
            onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
            {volume===0 ? <VolumeX size={15}/> : <Volume2 size={15}/>}
          </button>
          {/* Volume + tooltip */}
          <div style={{position:"relative",display:"flex",alignItems:"center",gap:"5px",flexShrink:0}}>
            <div ref={volumeRef}
              className="slider-track"
              style={{position:"relative",width:"64px",height:"3px",background:"#232020",borderRadius:"2px",cursor:"pointer"}}
              onMouseDown={e=>{setIsDraggingVolume(true);updateVolumeFromEvent(e.clientX);}}
              onMouseEnter={e=>{const tip=e.currentTarget.nextElementSibling as HTMLElement;if(tip)tip.style.opacity='1';}}
              onMouseLeave={e=>{const tip=e.currentTarget.nextElementSibling as HTMLElement;if(tip)tip.style.opacity='0';}}>
              <div style={{position:"absolute",top:0,left:0,height:"100%",borderRadius:"2px",pointerEvents:"none",width:`${volume}%`,background:volume>0?"#e2ddd9":"#232020",transition:isDraggingVolume?"none":"width 0.15s ease-out"}}>
                <div className="slider-thumb" style={{position:"absolute",right:"-5px",top:"50%",transform:"translateY(-50%)",width:"11px",height:"11px",background:"#fff",borderRadius:"50%",opacity:0,pointerEvents:"none",transition:"opacity .12s"}}/>
              </div>
            </div>
            <div style={{position:"absolute",bottom:"14px",left:"50%",transform:"translateX(-50%)",background:"#1c1a1a",border:"1px solid #252222",borderRadius:"5px",padding:"2px 6px",fontSize:"10px",fontWeight:700,color:"#9e9894",pointerEvents:"none",whiteSpace:"nowrap",opacity:0,transition:"opacity .15s",zIndex:10}}>
              {Math.round(volume)}%
            </div>
          </div>
        </div>
      </div>

      {}
      {ctxMenu && (() => {
        const { track, playlist } = ctxMenu;
        if ((ctxMenu.type === 'track' || ctxMenu.type === 'quickpick' || ctxMenu.type === 'queue-track') && track) {
          return (
            <div className="v-ctx" style={{position:'fixed',zIndex:9999,width:'220px',top:ctxMenu.y,left:ctxMenu.x}} onClick={e => e.stopPropagation()}>
              <div className="v-ctx__header">
                <div className="v-ctx__art"><img src={track.cover} alt="" /></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#e2ddd9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</div>
                  <div style={{fontSize:'11px',color:'#5c5755',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:'2px'}}>{track.artist}</div>
                </div>
              </div>
              <button onClick={() => { handlePlayTrack(track); setCtxMenu(null); }} className="v-ctx__item"><Play size={14} /> Play Now</button>
              <button onClick={() => { setQueue(p => [track, ...p]); showToast('Playing next'); setCtxMenu(null); }} className="v-ctx__item"><PlaySquare size={14} /> Play Next</button>
              <button onClick={() => { setQueue(p => [...p, track]); showToast('Added to queue'); setCtxMenu(null); }} className="v-ctx__item"><ListPlus size={14} /> Add to Queue</button>
              <button onClick={() => { toggleLikeTrack(track); setCtxMenu(null); }} className="v-ctx__item">
                <Heart size={14} style={isTrackLiked(track.url)?{color:'#e2ddd9',fill:'#e2ddd9'}:{}} />
                {isTrackLiked(track.url) ? 'Remove from Liked' : 'Like'}
              </button>
              <button onClick={e => { e.stopPropagation(); setAddToPlaylistTrack(track); setCtxMenu(null); }} className="v-ctx__item"><PlusCircle size={14} /> Add to Playlist</button>
              {ctxMenu.type === 'queue-track' && (
                <button onClick={() => { removeFromQueue(track.url); setCtxMenu(null); }} className="v-ctx__item v-ctx__item--danger"><X size={14} /> Remove from Queue</button>
              )}
              <div className="v-ctx__sep" />
              <button onClick={() => { setInfoModalTrack(track); setCtxMenu(null); }} className="v-ctx__item"><Info size={14} /> Track Info</button>
              <button onClick={() => { copyToClipboard(track.url); setCtxMenu(null); }} className="v-ctx__item"><Share2 size={14} /> Copy Link</button>
              <button onClick={() => { handleDownload(track); setCtxMenu(null); }} className="v-ctx__item">
                {(downloadingTracks[track.url] ?? 0) > 0
                  ? <svg width="16" height="16" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="6" fill="none" stroke="#333" strokeWidth="1.5"/>
                      <circle cx="8" cy="8" r="6" fill="none" stroke="#9e9894" strokeWidth="1.5" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 6}`}
                        strokeDashoffset={`${2 * Math.PI * 6 * (1 - Math.min(downloadingTracks[track.url] ?? 0, 100) / 100)}`}
                        style={{ transformOrigin: '8px 8px', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 0.3s ease' }}
                      />
                    </svg>
                  : <Download size={15} />}
                Download MP3
              </button>
              <button onClick={() => { openInYouTube(track.url); setCtxMenu(null); }} className="v-ctx__item"><ExternalLink size={13}/> Open in YouTube</button>
            </div>
          );
        }
        if ((ctxMenu.type === 'playlist' || ctxMenu.type === 'sidebar-playlist') && playlist) {
          return (
            <div className="v-ctx" style={{position:"fixed",zIndex:9999,width:"200px",top:ctxMenu.y,left:ctxMenu.x}} onClick={e=>e.stopPropagation()}>
              <div className="v-ctx__header">
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"13px",fontWeight:700,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{playlist.name}</div>
                  <div style={{fontSize:"10px",color:"#5c5755",marginTop:"1px"}}>{playlist.tracks.length} tracks</div>
                </div>
              </div>
              <button className="v-ctx__item" onClick={()=>{playAll(playlist.tracks);setCtxMenu(null);}}><Play size={13}/>Play All</button>
              <button className="v-ctx__item" onClick={()=>{const s=[...playlist.tracks].sort(()=>Math.random()-0.5);if(s.length){handlePlayTrack(s[0]);setQueue(s.slice(1));}setCtxMenu(null);}}><Shuffle size={13}/>Shuffle</button>
              <button className="v-ctx__item" onClick={()=>{setQueue(p=>[...p,...playlist.tracks]);showToast(`Added ${playlist.tracks.length}`);setCtxMenu(null);}}><ListPlus size={13}/>Add to Queue</button>
              <div className="v-ctx__sep"/>
              <button className="v-ctx__item" onClick={()=>{setRenamingPlaylist(playlist);setRenameVal(playlist.name);setRenameDescVal(playlist.description);setCtxMenu(null);}}><Pencil size={13}/>Edit</button>
              <button className="v-ctx__item" onClick={()=>{setShowDuplicatesPlaylist(playlist);setCtxMenu(null);}}><Copy size={13}/>Find Duplicates</button>
              <button className="v-ctx__item" onClick={()=>{setBulkEditPlaylist(playlist);setCtxMenu(null);}}><Pencil size={13}/>Bulk Edit Tags</button>
              <button className="v-ctx__item" onClick={()=>{handleCoverUpload(playlist.id);setCtxMenu(null);}}><ImagePlus size={13}/>Change Cover</button>
              <div className="v-ctx__sep"/>
              <button className="v-ctx__item" onClick={()=>{handleExportPlaylistM3u(playlist);setCtxMenu(null);}}><FileOutput size={13}/>Export M3U</button>
              {playlist.id!=='p1'&&<button className="v-ctx__item v-ctx__item--danger" onClick={()=>{deletePlaylist(playlist.id);setCtxMenu(null);}}><Trash2 size={13}/>Delete</button>}
            </div>
          );
        }
        return null;
      })()}

      {}
      {addToPlaylistTrack && (
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,3,3,0.9)"}} onClick={()=>setAddToPlaylistTrack(null)}>
          <div className="v-ctx" style={{width:"280px"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderBottom:"1px solid #1c1a1a"}}>
              <div>
                <div style={{fontWeight:700,color:"#e2ddd9",fontSize:"13px"}}>Add to Playlist</div>
                <div style={{fontSize:"11px",color:"#5c5755",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"170px"}}>{addToPlaylistTrack.title}</div>
              </div>
              <button onClick={()=>setAddToPlaylistTrack(null)} style={{width:"26px",height:"26px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"7px",border:"none",background:"transparent",color:"#5c5755",cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(226,221,217,0.06)";e.currentTarget.style.color="#e2ddd9";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#5c5755";}}><X size={13}/></button>
            </div>
            <div style={{padding:"4px 0",maxHeight:"220px",overflowY:"auto"}} className="custom-scrollbar">
              {playlists.map(p => {
                const alreadyIn = p.tracks.some(t => t.url === addToPlaylistTrack.url);
                return (
                  <button key={p.id} onClick={() => !alreadyIn && addTrackToPlaylist(p.id, addToPlaylistTrack)}
                    disabled={alreadyIn}
                    className="v-ctx__item" style={{opacity:alreadyIn?0.4:1,cursor:alreadyIn?"not-allowed":"pointer"}}>
                    <div style={{width:"24px",height:"24px",borderRadius:"5px",overflow:"hidden",flexShrink:0,background:"#1c1a1a",border:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {p.id === 'p1' ? <Heart size={12} style={{color:"#9e9894"}}/> : <ListMusic size={13} className="text-neutral-500" />}
                    </div>
                    <span style={{fontSize:"13px",color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{p.name}</span>
                    {alreadyIn?<span style={{fontSize:"9.5px",color:"#9e9894",fontWeight:700,flexShrink:0}}>Added</span>
                      :<span style={{fontSize:"10px",color:"#363230",flexShrink:0}}>{p.tracks.length}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{padding:"4px 0",borderTop:"1px solid #1c1a1a"}}>
              <button onClick={() => { setAddToPlaylistTrack(null); setNewPlaylistName(''); setNewPlaylistDesc(''); setIsPlaylistModalOpen(true); }}
                style={{display:"flex",alignItems:"center",gap:"7px",color:"#9e9894",fontSize:"12px",fontWeight:600,textDecoration:"none"}}>
                <PlusCircle size={14} /> New Playlist
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {infoModalTrack && (() => {
        const ytId = infoModalTrack.url?.match(/[?&]v=([^&]+)/)?.[1] || infoModalTrack.url?.split('youtu.be/')?.[1]?.split('?')?.[0] || '';
        const ytUrl = ytId ? `https://youtube.com/watch?v=${ytId}` : infoModalTrack.url;
        const isYt = !!ytId;
        const trackAudioInfo = infoModalTrack.url === currentTrack?.url ? audioInfo : null;
        return (
          <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"rgba(0,0,0,0.8)",backdropFilter:"blur(20px)"}}
            onClick={() => setInfoModalTrack(null)}>
            <div style={{borderRadius:"14px",width:"100%",maxWidth:"420px",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.9)",display:"flex",flexDirection:"column",background:"#0c0c0c",border:"1px solid rgba(255,255,255,0.08)"}}
              onClick={e => e.stopPropagation()}>

              {}
              <div style={{position:"relative",height:"130px",width:"100%",flexShrink:0,overflow:"hidden"}}>
                <img src={infoModalTrack.cover} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.25,filter:"blur(20px)",transform:"scale(1.1)"}} alt=""/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent,#161414)"}}/>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <img src={infoModalTrack.cover} style={{width:"80px",height:"80px",borderRadius:"10px",objectFit:"cover",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 8px 24px rgba(0,0,0,0.6)"}} alt=""/>
                </div>
                <button onClick={()=>setInfoModalTrack(null)}
                  style={{position:"absolute",top:"10px",right:"10px",width:"26px",height:"26px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",cursor:"pointer",color:"#9e9894",transition:"color .12s"}}
                  onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#9e9894")}>
                  <X size={13}/>
                </button>
              </div>
              <div style={{padding:"10px 16px 12px",textAlign:"center"}}>
                <div style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",lineHeight:1.3}}>{infoModalTrack.title}</div>
                <div style={{fontSize:"12px",color:"#5c5755",marginTop:"2px"}}>{infoModalTrack.artist}</div>
              </div>

              {}
              <div style={{display:"flex",gap:"5px",padding:"0 14px 12px",flexWrap:"wrap",justifyContent:"center"}}>
                {[
                  infoModalTrack.duration&&infoModalTrack.duration!=='0:00'&&{icon:<Clock size={9}/>,label:infoModalTrack.duration},
                  isYt&&{icon:<Youtube size={9}/>,label:"YouTube"},
                  trackAudioInfo?.codec&&trackAudioInfo.codec!=='unknown'&&{icon:<BarChart2 size={9}/>,label:`${trackAudioInfo.codec.toUpperCase()}${trackAudioInfo.bitrate>0?` · ${Math.round(trackAudioInfo.bitrate/1000)}k`:''}`},
                  trackAudioInfo?.samplerate>0&&{icon:<Gauge size={9}/>,label:`${(trackAudioInfo.samplerate/1000).toFixed(1)}kHz`},
                  trackAudioInfo?.channels&&{icon:<AlignLeft size={9}/>,label:trackAudioInfo.channels},
                  trackAudioInfo?.format&&{icon:<FileCode2 size={9}/>,label:trackAudioInfo.format},
                ].filter(Boolean).map((item:any,i)=>(
                  <span key={i} style={{display:"flex",alignItems:"center",gap:"4px",background:"#1c1a1a",border:"1px solid #252222",padding:"3px 8px",borderRadius:"20px",fontSize:"10px",fontWeight:600,color:"#9e9894"}}>
                    {item.icon}{item.label}
                  </span>
                ))}
              </div>

              {}
              <div style={{margin:"0 14px 12px",borderRadius:"10px",overflow:"hidden",border:"1px solid #1c1a1a"}}>
                {[
                  { icon: Music, label: 'Title', value: infoModalTrack.title, color: 'text-neutral-400', bg: 'bg-neutral-800/10' },
                  { icon: FileBadge2, label: 'Artist', value: infoModalTrack.artist, color: 'text-neutral-400', bg: 'bg-purple-500/10' },
                  ...(ytId ? [{ icon: Hash, label: 'Video ID', value: ytId, color: 'text-neutral-400', bg: 'bg-neutral-800/50' }] : []),
                ].map(({ icon: Icon, label, value, color, bg }) => (
                  <div key={label}
                    style={{display:"flex",alignItems:"flex-start",gap:"10px",padding:"10px",borderRadius:"9px",cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.03)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                    onClick={() => copyToClipboard(value)}
                    title={`Click to copy ${label}`}>
                    <div style={{width:"28px",height:"28px",borderRadius:"7px",background:"rgba(226,221,217,0.06)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#5c5755"}}><Icon size={13}/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"9.5px",color:"#363230",letterSpacing:".08em",textTransform:"uppercase",fontWeight:700}}>{label}</div>
                      <div style={{fontSize:"12.5px",fontWeight:600,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:"2px"}}>{value||'—'}</div>
                    </div>
                    <Copy size={11} style={{color:"#363230",flexShrink:0,transition:"color .12s"}}/>
                  </div>
                ))}
              </div>

              {}
              <div style={{padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:"4px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                  <CopyButton text={ytId || ''} label="Copy ID" icon={Copy} disabled={!ytId} />
                  <CopyButton text={ytUrl} label="Copy Link" icon={Share2} />
                </div>
                <button
                  onClick={() => { openInYouTube(ytUrl); }}
                  disabled={!ytUrl}
                  style={{width:"100%",padding:"9px",borderRadius:"9px",fontSize:"13px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",border:"none",background:"rgb(220,38,38)",color:"white",cursor:ytUrl?"pointer":"not-allowed",opacity:ytUrl?1:0.4}}>
                  <svg width="14" height="11" viewBox="0 0 18 14" fill="white"><path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/></svg>
                  Open in YouTube
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {}
      {showYtImportModal && (
        <YtImportModal
          onClose={() => setShowYtImportModal(false)}
          onSavePlaylist={(name, desc, tracks) => {
            const id = `yt_${Date.now()}`;
            setPlaylists(prev => [...prev, { id, name, description: desc || 'Imported from YouTube', tracks }]);
            showToast(`"${name}" saved — ${tracks.length} tracks`);
          }}
          showToast={showToast}
        />
      )}
      {showCsvImportModal && (
        <CsvImportModal
          onClose={() => setShowCsvImportModal(false)}
          onSavePlaylist={(name, desc, tracks) => {
            const id = `csv_${Date.now()}`;
            setPlaylists(prev => [...prev, { id, name, description: desc || 'Imported from Spotify', tracks }]);
            showToast(`"${name}" saved — ${tracks.length} tracks`);
            setBgImport(null);
            setPendingSpotifyImport(null);
          }}
          onMatchingDone={(tracks, matched, failed) => {
            // Store in parent state so name popup shows even if modal was minimized
            setPendingSpotifyImport({ tracks, matchedCount: matched, failedCount: failed });
            setShowCsvImportModal(false);
          }}
          showToast={showToast}
          onProgress={(matched, total, label) => setBgImport(total > 0 ? { matched, total, label } : null)}
        />
      )}
      {/* Name/desc popup for minimized Spotify imports */}
      {pendingSpotifyImport && !showCsvImportModal && (
        <ImportResultModal
          matchedCount={pendingSpotifyImport.matchedCount}
          failedCount={pendingSpotifyImport.failedCount}
          onSave={(name, desc) => {
            const id = `csv_${Date.now()}`;
            setPlaylists(prev => [...prev, { id, name, description: desc || 'Imported from Spotify', tracks: pendingSpotifyImport.tracks }]);
            showToast(`"${name}" saved — ${pendingSpotifyImport.tracks.length} tracks`);
            setBgImport(null);
            setPendingSpotifyImport(null);
          }}
          onClose={() => setPendingSpotifyImport(null)}
        />
      )}
      {showDuplicatesPlaylist && (() => {
        const seen = new Map<string, Track>();
        const dupes: Track[] = [];
        showDuplicatesPlaylist.tracks.forEach(t => {
          const key = `${t.title.toLowerCase().trim()}|||${t.artist.toLowerCase().trim()}`;
          if (seen.has(key)) dupes.push(t);
          else seen.set(key, t);
        });
        return (
          <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"rgba(4,3,3,0.9)"}} onClick={()=>setShowDuplicatesPlaylist(null)}>
            <div style={{background:"#161414",border:"1px solid #252222",borderRadius:"14px",width:"100%",maxWidth:"500px",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}}>
              <div style={{padding:"13px 16px",borderBottom:"1px solid #1c1a1a",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <h3 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Duplicate Finder</h3>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>{showDuplicatesPlaylist.name}</p>
                </div>
                <button onClick={() => setShowDuplicatesPlaylist(null)} style={{padding:"5px",background:"none",border:"none",cursor:"pointer",color:"#5c5755",display:"flex",borderRadius:"6px",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}><X size={14}/></button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}} className="custom-scrollbar">
                {dupes.length === 0 ? (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0",color:"#5c5755"}}>
                    <CheckCircle size={28} style={{color:"#5c5755",marginBottom:"8px"}}/>
                    <p style={{fontSize:"13px",color:"#9e9894"}}>No duplicates found.</p>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                    <p style={{fontSize:"12px",color:"#9e9894",marginBottom:"10px"}}>{dupes.length} duplicate{dupes.length > 1 ? 's' : ''} found</p>
                    {dupes.map((t, i) => (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px",borderRadius:"8px",background:"#1c1a1a",border:"1px solid rgba(255,255,255,0.05)"}}>
                        <img src={t.cover} style={{width:"38px",height:"38px",borderRadius:"6px",objectFit:"cover",flexShrink:0}} alt=""/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                          <div style={{fontSize:"11px",color:"#5c5755",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.artist}</div>
                        </div>
                        <button onClick={() => {
                          setPlaylists(prev => prev.map(p => p.id === showDuplicatesPlaylist.id
                            ? { ...p, tracks: (() => { let removed = false; return p.tracks.filter(x => { if (!removed && x.url === t.url) { removed = true; return false; } return true; }); })() }
                            : p));
                          setShowDuplicatesPlaylist(prev => prev ? { ...prev, tracks: (() => { let removed = false; return prev.tracks.filter(x => { if (!removed && x.url === t.url) { removed = true; return false; } return true; }); })() } : null);
                          showToast('Duplicate removed');
                        }} style={{fontSize:"11px",padding:"4px 10px",background:"rgba(160,40,40,0.08)",color:"#a05050",border:"1px solid rgba(160,40,40,0.2)",borderRadius:"6px",cursor:"pointer",flexShrink:0,transition:"background .12s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(160,40,40,0.15)")} onMouseLeave={e=>(e.currentTarget.style.background="rgba(160,40,40,0.08)")}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {}
      {bulkEditPlaylist && (() => {
        return (
          <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"rgba(4,3,3,0.9)"}}>
            <div style={{background:"#161414",border:"1px solid #252222",borderRadius:"14px",width:"100%",maxWidth:"680px",maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}}>
              <div style={{padding:"13px 16px",borderBottom:"1px solid #1c1a1a",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <div>
                  <h3 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Bulk Tag Editor</h3>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>{bulkEditPlaylist.tracks.length} tracks in {bulkEditPlaylist.name}</p>
                </div>
                <button onClick={() => setBulkEditPlaylist(null)} style={{padding:"5px",background:"none",border:"none",cursor:"pointer",color:"#5c5755",display:"flex",borderRadius:"6px",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}><X size={14}/></button>
              </div>
              <div style={{flex:1,overflowY:"auto"}} className="custom-scrollbar">
                <table style={{width:"100%",fontSize:"13px",borderCollapse:"collapse"}}>
                  <thead style={{position:"sticky",top:0,background:"#161414",borderBottom:"1px solid #1c1a1a",zIndex:10}}>
                    <tr>
                      <th style={{textAlign:"left",padding:"8px 14px",fontSize:"10px",fontWeight:700,color:"#5c5755",width:"32px",letterSpacing:".06em",textTransform:"uppercase"}}>#</th>
                      <th style={{textAlign:"left",padding:"8px 14px",fontSize:"10px",fontWeight:700,color:"#5c5755",letterSpacing:".06em",textTransform:"uppercase"}}>Title</th>
                      <th style={{textAlign:"left",padding:"8px 14px",fontSize:"10px",fontWeight:700,color:"#5c5755",letterSpacing:".06em",textTransform:"uppercase"}}>Artist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkEditPlaylist.tracks.map((t, i) => (
                      <tr key={t.url} style={{borderBottom:"1px solid #1c1a1a"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.02)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        <td style={{padding:"6px 14px",fontSize:"11px",color:"#363230",fontVariantNumeric:"tabular-nums"}}>{i+1}</td>
                        <td style={{padding:"4px 8px"}}>
                          <input defaultValue={t.title}
                            onBlur={e => {
                              const newTitle = e.target.value.trim();
                              if (newTitle && newTitle !== t.title) {
                                setPlaylists(prev => prev.map(p => p.id === bulkEditPlaylist.id
                                  ? { ...p, tracks: p.tracks.map(x => x.url === t.url ? { ...x, title: newTitle } : x) }
                                  : p));
                                setBulkEditPlaylist(prev => prev ? { ...prev, tracks: prev.tracks.map(x => x.url === t.url ? { ...x, title: newTitle } : x) } : null);
                              }
                            }}
                            style={{width:"100%",background:"transparent",color:"#e2ddd9",fontSize:"12px",padding:"3px 6px",borderRadius:"4px",border:"1px solid transparent",outline:"none"}}/>
                        </td>
                        <td style={{padding:"4px 8px"}}>
                          <input defaultValue={t.artist}
                            onBlur={e => {
                              const newArtist = e.target.value.trim();
                              if (newArtist !== t.artist) {
                                setPlaylists(prev => prev.map(p => p.id === bulkEditPlaylist.id
                                  ? { ...p, tracks: p.tracks.map(x => x.url === t.url ? { ...x, artist: newArtist } : x) }
                                  : p));
                                setBulkEditPlaylist(prev => prev ? { ...prev, tracks: prev.tracks.map(x => x.url === t.url ? { ...x, artist: newArtist } : x) } : null);
                              }
                            }}
                            style={{width:"100%",background:"transparent",color:"#9e9894",fontSize:"12px",padding:"3px 6px",borderRadius:"4px",border:"1px solid transparent",outline:"none"}}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 14px",borderTop:"1px solid #1c1a1a",display:"flex",justifyContent:"flex-end",gap:"8px",flexShrink:0}}>
                <button onClick={() => { showToast('Tags saved'); setBulkEditPlaylist(null); }}
                  style={{padding:"7px 16px",background:"#e2ddd9",color:"#0c0b0b",fontWeight:700,borderRadius:"8px",border:"none",cursor:"pointer",fontSize:"12px"}}>
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {}
      {isPlaylistModalOpen && (
        <div style={{position:"absolute",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,3,3,0.88)"}}>
          <div style={{background:"#161414",border:"1px solid #252222",borderRadius:"14px",padding:"20px",width:"320px",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}}>
            <h3 style={{fontSize:"15px",fontWeight:700,color:"#e2ddd9",margin:"0 0 16px"}}>Create Playlist</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"16px"}}>
              <div>
                <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"5px"}}>Name</label>
                <input autoFocus type="text" value={newPlaylistName} onChange={e=>setNewPlaylistName(e.target.value)} placeholder="e.g. Cyberpunk Mix"
                  style={{width:"100%",background:"#1c1a1a",border:"1px solid #252222",color:"#e2ddd9",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}}
                  onKeyDown={e=>e.key==='Enter'&&confirmCreatePlaylist()}/>
              </div>
              <div>
                <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"flex",alignItems:"center",gap:"5px",marginBottom:"5px"}}><AlignLeft size={10}/> Description <span style={{textTransform:"none",fontWeight:400,color:"#363230"}}>(optional)</span></label>
                <textarea value={newPlaylistDesc} onChange={e=>setNewPlaylistDesc(e.target.value)} placeholder="What's this playlist about?" rows={2}
                  style={{width:"100%",background:"#1c1a1a",border:"1px solid #252222",color:"#e2ddd9",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",resize:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
              <button onClick={()=>setIsPlaylistModalOpen(false)}
                style={{padding:"7px 14px",borderRadius:"8px",border:"1px solid #252222",color:"#5c5755",background:"transparent",fontWeight:600,cursor:"pointer",fontSize:"12px",transition:"border-color .12s,color .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#2e2b2b";}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}>Cancel</button>
              <button onClick={confirmCreatePlaylist} disabled={!newPlaylistName.trim()}
                style={{padding:"7px 14px",borderRadius:"8px",border:"none",background:"#e2ddd9",color:"#0c0b0b",fontWeight:700,cursor:"pointer",fontSize:"12px",opacity:newPlaylistName.trim()?1:0.35}}>Create</button>
            </div>
          </div>
        </div>
      )}

      {}
      {renamingPlaylist && (
        <div style={{position:"absolute",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,3,3,0.88)"}}>
          <div style={{background:"#161414",border:"1px solid #252222",borderRadius:"14px",padding:"20px",width:"320px",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}}>
            <h3 style={{fontSize:"15px",fontWeight:700,color:"#e2ddd9",margin:"0 0 16px"}}>Edit Playlist</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"16px"}}>
              <div>
                <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"5px"}}>Name</label>
                <input autoFocus type="text" value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                  style={{width:"100%",background:"#1c1a1a",border:"1px solid #252222",color:"#e2ddd9",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}}
                  onKeyDown={e=>{if(e.key==='Enter')confirmRenamePlaylist();if(e.key==='Escape')setRenamingPlaylist(null);}}/>
              </div>
              <div>
                <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"5px"}}>Description <span style={{textTransform:"none",fontWeight:400,color:"#363230"}}>(optional)</span></label>
                <textarea value={renameDescVal} onChange={e=>setRenameDescVal(e.target.value)} rows={2}
                  placeholder="e.g. Chill vibes, road trip..."
                  style={{width:"100%",background:"#1c1a1a",border:"1px solid #252222",color:"#e2ddd9",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",resize:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
              <button onClick={()=>setRenamingPlaylist(null)}
                style={{padding:"7px 14px",borderRadius:"8px",border:"1px solid #252222",color:"#5c5755",background:"transparent",fontWeight:600,cursor:"pointer",fontSize:"12px",transition:"border-color .12s,color .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#2e2b2b";}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}>Cancel</button>
              <button onClick={confirmRenamePlaylist}
                style={{padding:"7px 14px",borderRadius:"8px",border:"none",background:"#e2ddd9",color:"#0c0b0b",fontWeight:700,cursor:"pointer",fontSize:"12px"}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {}
      

      {}
      {/* Keyboard Shortcuts Overlay — press ? to toggle */}
      {showShortcuts && (
        <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,3,3,0.88)"}}
          onClick={()=>setShowShortcuts(false)}>
          <div style={{background:"#161414",border:"1px solid #252222",borderRadius:"14px",width:"500px",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}} className="custom-scrollbar"
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:"1px solid #1c1a1a"}}>
              <h2 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Keyboard Shortcuts</h2>
              <button onClick={()=>setShowShortcuts(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#5c5755",display:"flex",padding:"3px",borderRadius:"5px",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}><X size={15}/></button>
            </div>
            <div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",columnGap:"24px",rowGap:"4px"}}>
              {([
                ['Playback', null],
                ['Space', 'Play / Pause'],
                ['←', 'Seek back 10s'],
                ['→', 'Seek forward 10s'],
                ['M', 'Mute / Unmute'],
                ['Navigation', null],
                ['Ctrl+F', 'Focus search'],

                ['?', 'Show this overlay'],
                ['Esc', 'Close any overlay'],
              ] as [string, string | null][]).map(([key, action], i) =>
                action === null ? (
                  <div key={i} style={{gridColumn:"1/-1",marginTop:"10px",marginBottom:"4px",fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#363230"}}>{key}</div>
                ) : (
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #1c1a1a"}}>
                    <span style={{fontSize:"12px",color:"#9e9894"}}>{action}</span>
                    <kbd style={{padding:"2px 7px",borderRadius:"5px",fontSize:"10px",fontWeight:700,background:"#1c1a1a",border:"1px solid #252222",color:"#5c5755",marginLeft:"12px",flexShrink:0,fontFamily:"monospace"}}>{key}</kbd>
                  </div>
                )
              )}
            </div>
            <div style={{padding:"10px 18px",borderTop:"1px solid #1c1a1a",textAlign:"center"}}>
              <p style={{fontSize:"11px",color:"#363230"}}>Press <kbd style={{padding:"2px 6px",borderRadius:"4px",fontSize:"9.5px",background:"#1c1a1a",border:"1px solid #252222",color:"#5c5755",fontFamily:"monospace"}}>?</kbd> or <kbd style={{padding:"2px 6px",borderRadius:"4px",fontSize:"9.5px",background:"#1c1a1a",border:"1px solid #252222",color:"#5c5755",fontFamily:"monospace"}}>Esc</kbd> to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom confirm dialog — replaces window.confirm to avoid double native boxes */}
      {confirmModal && (
        <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,3,3,0.88)"}}
          onClick={()=>setConfirmModal(null)}>
          <div style={{background:"#161414",border:"1px solid #252222",borderRadius:"12px",width:"320px",boxShadow:"0 24px 60px rgba(0,0,0,0.85)",overflow:"hidden"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #1c1a1a"}}>
              <h3 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Confirm</h3>
            </div>
            <div style={{padding:"14px 18px"}}>
              <p style={{fontSize:"13px",color:"#9e9894",lineHeight:1.5,margin:0}}>{confirmModal.message}</p>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"8px",padding:"10px 18px",borderTop:"1px solid #1c1a1a"}}>
              <button onClick={()=>setConfirmModal(null)}
                style={{padding:"7px 14px",borderRadius:"8px",border:"1px solid #252222",color:"#5c5755",background:"transparent",fontWeight:600,cursor:"pointer",fontSize:"12px",transition:"border-color .12s,color .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="#2e2b2b";}}
                onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#252222";}}>
                Cancel
              </button>
              <button onClick={()=>{confirmModal.onConfirm();setConfirmModal(null);}}
                style={{padding:"7px 14px",borderRadius:"8px",background:"rgba(180,40,40,0.1)",border:"1px solid rgba(180,40,40,0.25)",color:"#a05050",fontWeight:700,cursor:"pointer",fontSize:"12px",transition:"background .12s"}}
                onMouseEnter={e=>(e.currentTarget.style.background="rgba(180,40,40,0.18)")}
                onMouseLeave={e=>(e.currentTarget.style.background="rgba(180,40,40,0.1)")}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{position:"fixed",bottom:"80px",left:"50%",transform:"translateX(-50%)",zIndex:300,background:"#1c1a1a",border:"1px solid #2e2b2b",color:"#e2ddd9",fontSize:"12.5px",fontWeight:600,padding:"8px 14px",borderRadius:"10px",boxShadow:"0 8px 24px rgba(0,0,0,0.8)",pointerEvents:"none",animation:"toastIn 0.2s cubic-bezier(0.25,0,0,1) both",whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      {/* Background import progress pill */}
      {bgImport && !showCsvImportModal && (
        <div style={{position:"fixed",bottom:"84px",right:"16px",zIndex:9998,display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"10px",border:"1px solid #252222",background:"#1c1a1a",boxShadow:"0 8px 24px rgba(0,0,0,0.7)",animation:"fadeUp 0.2s ease both"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#9e9894",animation:"velunaPulse 1.5s ease-in-out infinite",flexShrink:0}}/>
          <div style={{display:"flex",flexDirection:"column",gap:"4px",minWidth:"140px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}}>
              <span style={{fontSize:"12px",fontWeight:600,color:"#e2ddd9"}}>Importing Spotify…</span>
              <span style={{fontSize:"10px",color:"#5c5755",fontVariantNumeric:"tabular-nums"}}>{bgImport.matched}/{bgImport.total}</span>
            </div>
            <div style={{height:"2px",borderRadius:"1px",background:"#232020",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:"1px",background:"#9e9894",width:`${(bgImport.matched/bgImport.total)*100}%`,transition:"width .3s"}}/>
            </div>
          </div>
          <button onClick={()=>setBgImport(null)} style={{color:"#363230",background:"none",border:"none",cursor:"pointer",display:"flex",marginLeft:"4px",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#363230")}><X size={12}/></button>
        </div>
      )}


      {/* Live Lyrics Modal — immersive full-screen */}
      {showLyrics && currentTrack && (() => {
        const lines = lyricsData?.lines || [];
        // End glitch fix: once past last line, keep last line active (not index 0)
        let currentIdx = lines.length > 0 ? lines.length - 1 : 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].time > progressSeconds) { currentIdx = Math.max(0, i - 1); break; }
        }
        const pct = trackDurationSeconds > 0 ? Math.min((progressSeconds / trackDurationSeconds) * 100, 100) : 0;
        return (
          <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",userSelect:"none",background:"#0c0b0b"}}>
            {/* Always render gradient base so there's never a black void */}
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"linear-gradient(135deg,#0c0b0b 0%,#111010 100%)"}}/>
            {/* Full-screen blurred cover — overflow visible so blur doesn't get clipped */}
            {currentTrack.cover && (
              <div style={{
                position: 'absolute',
                pointerEvents: 'none',
                inset: '-60px',
                backgroundImage: `url(${currentTrack.cover})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(80px) brightness(0.6) saturate(2.0)',
              }} />
            )}
            {/* Scrim */}
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"rgba(0,0,0,0.38)"}}/>

            {/* Left panel */}
            <div style={{position:"relative",zIndex:10,width:"340px",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px",gap:"18px"}}>
              <button onClick={()=>setShowLyrics(false)}
                style={{position:"absolute",top:"20px",left:"20px",width:"34px",height:"34px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)",background:"rgba(0,0,0,0.45)",backdropFilter:"blur(8px)",transition:"color .12s,background .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(0,0,0,0.65)";}}
                onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.7)";e.currentTarget.style.background="rgba(0,0,0,0.45)";}}>
                <X size={16} />
              </button>

              {/* Album art */}
              <div style={{width:"168px",height:"168px",borderRadius:"16px",overflow:"hidden",flexShrink:0,boxShadow:"0 20px 60px rgba(0,0,0,0.85)",border:"1px solid rgba(255,255,255,0.12)"}}>
                {currentTrack.cover
                  ? <img src={currentTrack.cover} alt={currentTrack.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <div style={{width:"100%",height:"100%",background:"#1c1a1a",display:"flex",alignItems:"center",justifyContent:"center"}}><Music size={32} style={{color:"#363230"}}/></div>}
              </div>

              <div style={{textAlign:"center",width:"100%"}}>
                <p style={{fontSize:"16px",fontWeight:800,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 4px"}}>{currentTrack.title}</p>
                <p style={{fontSize:"12px",marginTop:"3px",color:"rgba(255,255,255,0.45)"}}>{currentTrack.artist}</p>
              </div>

              {/* Progress bar — identical to default player bar */}
              <div style={{width:"100%",display:"flex",flexDirection:"column",gap:"5px"}}>
                <div className="slider-track" style={{position:"relative",width:"100%",height:"3px",borderRadius:"2px",cursor:"pointer",background:"rgba(255,255,255,0.18)"}}
                  onMouseDown={e => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (trackDurationSeconds || 0);
                    invoke('seek_audio', { time: t }).catch(() => {});
                  }}>
                  <div style={{position:"absolute",top:0,left:0,height:"100%",borderRadius:"2px",pointerEvents:"none",width:`${pct}%`,background:"#e2ddd9",transition:"width 0.5s linear"}}>
                    <div className="slider-thumb" style={{position:"absolute",right:"-5px",top:"50%",transform:"translateY(-50%)",width:"11px",height:"11px",background:"#fff",borderRadius:"50%",opacity:0,pointerEvents:"none",transition:"opacity .12s"}}/>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",fontVariantNumeric:"tabular-nums",color:"rgba(255,255,255,0.35)"}}>
                  <span>{formatTime(progressSeconds)}</span>
                  <span>{formatTime(trackDurationSeconds)}</span>
                </div>
              </div>

              {/* Playback controls */}
              <div style={{display:"flex",alignItems:"center",gap:"22px"}}>
                <button onClick={handleSkipBack} style={{color:"rgba(255,255,255,0.6)",background:"none",border:"none",cursor:"pointer",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#fff")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.6)")}><SkipBack size={19}/></button>
                <button onClick={togglePlayPause}
                  style={{width:"46px",height:"46px",borderRadius:"50%",background:"#e2ddd9",display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.5)",transition:"transform .1s"}} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.06)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
                  {isPlaying ? <Pause fill="#0c0b0b" size={19}/> : <Play fill="#0c0b0b" size={19} style={{marginLeft:"2px"}}/>}
                </button>
                <button onClick={handleSkipForward} style={{color:"rgba(255,255,255,0.6)",background:"none",border:"none",cursor:"pointer",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#fff")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.6)")}><SkipForward size={19}/></button>
              </div>

              {/* Audio output — clean dropdown */}
              {audioDevices.length > 0 && (
                <LyricsAudioDropdown
                  devices={audioDevices}
                  switching={switchingDevice}
                  onSwitch={async (id) => {
                    setSwitchingDevice(true);
                    try { await invoke('set_audio_device', { id }); setAudioDevices(prev => prev.map(d => ({ ...d, is_default: d.id === id }))); showToast(`Output: ${audioDevices.find(d=>d.id===id)?.name ?? id}`); }
                    catch (e) { showToast(`Switch failed: ${e}`); }
                    finally { setSwitchingDevice(false); }
                  }}
                />
              )}
            </div>

            {/* Divider */}
            <div style={{position:"relative",zIndex:10,width:"1px",flexShrink:0,margin:"32px 0",background:"rgba(255,255,255,0.07)"}}/>

            {/* Lyrics panel */}
            <div style={{position:"relative",zIndex:10,flex:1,overflow:"hidden"}}>
              {lyricsLoading ? (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"14px",height:"100%"}}>
                  <Loader2 size={24} style={{color:"rgba(255,255,255,0.4)",animation:"spin 1s linear infinite"}}/>
                  <p style={{fontSize:"13px",color:"rgba(255,255,255,0.4)"}}>Fetching lyrics…</p>
                </div>
              ) : lines.length > 0 ? (
                <div style={{position:"relative",height:"100%"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:"120px",zIndex:10,pointerEvents:"none",background:"linear-gradient(to bottom,#0c0b0b 0%,rgba(12,11,11,0.85) 35%,transparent 100%)"}}/>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,height:"120px",zIndex:10,pointerEvents:"none",background:"linear-gradient(to top,#0c0b0b 0%,rgba(12,11,11,0.85) 35%,transparent 100%)"}}/>
                  <div style={{height:"100%",overflowY:"auto",padding:"120px 36px",scrollbarWidth:"none"}}
                    ref={el => {
                      if (!el) return;
                      const active = el.querySelector('[data-active="true"]') as HTMLElement;
                      if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}>
                    {lines.map((line, idx) => {
                      const isCurrent = idx === currentIdx;
                      const isPast = idx < currentIdx;
                      return (
                        <p key={idx}
                          data-active={isCurrent?'true':'false'}
                          onClick={async()=>{await invoke('seek_audio',{time:line.time}).catch(()=>{});}}
                          style={{
                            cursor:"pointer",lineHeight:1.35,padding:"9px 0",userSelect:"none",margin:0,
                            fontSize: '1.45rem',
                            fontWeight: isCurrent ? 700 : 500,
                            color: isCurrent ? '#fff' : isPast ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.48)',
                            transition: 'color 0.3s ease',
                          }}>
                          {line.text || '\u00A0'}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"10px",height:"100%",color:"rgba(255,255,255,0.25)"}}>
                  <Mic2 size={32} strokeWidth={1}/>
                  <p style={{fontSize:"14px",fontWeight:500,color:"rgba(255,255,255,0.4)",margin:0}}>No lyrics found</p>
                  <p style={{fontSize:"12px",color:"rgba(255,255,255,0.18)",margin:0}}>Try Genius or AZLyrics</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}