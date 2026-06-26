import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, ChevronDown, FileOutput, Upload, X, Loader2, CheckCircle2, XCircle, Music } from 'lucide-react';
import { Track } from '../types';
import { cleanArtist } from '../utils';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

export function ImportResultModal({
  matchedCount, failedCount,
  onSave, onClose,
}: { matchedCount: number; failedCount: number; onSave: (name: string, desc: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.9)"}}>
      <div style={{width:"380px",borderRadius:"14px",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.95)",background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--v-bdr2)"}}>
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
              style={{width:"100%",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",color:"#e2ddd9",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"6px"}}>Description <span style={{color:"#363230",textTransform:"none",fontWeight:400}}>(optional)</span></label>
            <input value={desc} onChange={e=>setDesc(e.target.value)}
              placeholder="e.g. Chill vibes, road trip..." maxLength={160}
              style={{width:"100%",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",color:"#e2ddd9",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:"8px",marginTop:"4px"}}>
            <button onClick={onClose}
              style={{flex:1,padding:"8px",borderRadius:"8px",border:"1px solid var(--v-bdr2)",color:"#5c5755",background:"transparent",fontWeight:600,cursor:"pointer",fontSize:"12px",transition:"border-color .12s,color .12s"}}
              onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="var(--v-bdr3)";}}
              onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="var(--v-bdr2)";}}>
              Cancel
            </button>
            <button onClick={()=>{if(name.trim())onSave(name.trim(),desc.trim());}} disabled={!name.trim()}
              style={{flex:1,padding:"8px",borderRadius:"8px",border:"none",background:"#e2ddd9",color:"var(--v-bg0)",fontWeight:700,cursor:"pointer",fontSize:"12px",opacity:name.trim()?1:0.35}}>
              Save Playlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImportButton({ onSpotify, onYoutube, onM3u }: {
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
        style={{width:'100%',borderRadius:'8px',border:`1px solid ${open?'var(--v-bdr3)':'var(--v-bdr2)'}`,padding:'7px 11px',display:'flex',alignItems:'center',gap:'8px',background:open?'rgba(226,221,217,0.04)':'transparent',color:open?'#e2ddd9':'#5c5755',cursor:'pointer',fontSize:'12px',fontWeight:600,transition:'border-color .12s,color .12s,background .12s'}}
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
        }}>
        <PlusCircle size={13} />
        <span style={{flex:1,textAlign:'left'}}>Import Playlist</span>
        <ChevronDown size={12} style={{transition:'transform .2s',transform:open?'rotate(180deg)':'none'}} />
      </button>
      {open && (
        <div style={{
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
          zIndex: 10
        }}>
          {[
            { label:'From Spotify', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>, action:()=>{onSpotify();setOpen(false);} },
            { label:'From YouTube', icon:<svg width="13" height="11" viewBox="0 0 18 14" fill="#ef4444"><path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/></svg>, action:()=>{onYoutube();setOpen(false);} },
            { label:'From M3U File', icon:<FileOutput size={13} style={{color:'#9e9894'}} />, action:()=>{onM3u();setOpen(false);} },
          ].map(({label,icon,action}, idx)=>(
            <button key={label} onClick={action}
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
                transition: 'background .15s, color .15s'
              }}
              onMouseEnter={e=>{
                (e.currentTarget as HTMLElement).style.background='rgba(255, 255, 255, 0.02)';
                (e.currentTarget as HTMLElement).style.color='var(--v-accent)';
              }}
              onMouseLeave={e=>{
                (e.currentTarget as HTMLElement).style.background='transparent';
                (e.currentTarget as HTMLElement).style.color='#9e9894';
              }}>
              <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:'16px',height:'16px',flexShrink:0}}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CopyButton({ text, label, icon: Icon, disabled = false }: {
  text: string; label: string; icon: React.ElementType; disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
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
      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"7px",padding:"8px",borderRadius:"9px",border:"1px solid var(--v-bdr2)",background:"var(--v-bdr2)",color:copied?"#9e9894":"#5c5755",fontSize:"12px",fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.3:1,transition:"border-color .12s,color .12s,background .12s",width:"100%"}}
      onMouseEnter={e=>{if(!disabled){e.currentTarget.style.background="#232020";e.currentTarget.style.color="#9e9894";}}}
      onMouseLeave={e=>{e.currentTarget.style.background="var(--v-bdr2)";e.currentTarget.style.color=copied?"#9e9894":"#5c5755";}}>
      {copied ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9e9894" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!</> : <><Icon size={13}/>{label}</>}
    </button>
  );
}

export function CsvImportModal({
  onClose,
  onSavePlaylist,
  showToast,
  onProgress,
  onMatchingDone,
  visible = true,
}: {
  onClose: () => void;
  onSavePlaylist: (name: string, desc: string, tracks: Track[]) => void;
  showToast: (m: string) => void;
  onProgress?: (matched: number, total: number, label: string) => void;
  onMatchingDone?: (tracks: Track[], matched: number, failed: number) => void;
  visible?: boolean;
}) {
  const [phase, setPhase] = useState<'instructions' | 'matching' | 'saving' | 'done'>('instructions');
  const [results, setResults] = useState<{ title: string; artist: string; status: 'pending' | 'fetching' | 'matched' | 'failed'; url?: string; cover?: string }[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [matchedTracks, setMatchedTracks] = useState<Track[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const abortRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [isUploadHovered, setIsUploadHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [isMinHovered, setIsMinHovered] = useState(false);

  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

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
      return { title: title?.trim() || '', artist: cleanArtist(artist), status: 'pending' as const };
    });

    setResults(initial);
    setPhase('matching');
    abortRef.current = false;

    const CONCURRENCY = 12;
    const total = initial.length;
    let completed = 0;
    const matched: Track[] = [];
    let failed = 0;

    const matchCache = new Map<string, string | null>();

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
        
        if (rTitle.includes('official') || rTitle.includes('audio') || rTitle.includes('lyric')) score += 1;
        if (score > bestScore) { bestScore = score; bestId = id; }
      }
      
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
      if (listRef.current) {
        const el = listRef.current;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        if (isNearBottom) {
          el.scrollTop = el.scrollHeight;
        }
      }
    };

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
    <div className="yt-import-modal-overlay" style={{position:"fixed",inset:0,zIndex:9999,display:visible?"flex":"none",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.75)",backdropFilter:"blur(12px)"}} onClick={phase==='matching'?undefined:onClose}>
      <div className="yt-import-modal-container" style={{width:"640px",maxHeight:"88vh",display:"flex",flexDirection:"column",borderRadius:"16px",overflow:"hidden",boxShadow:"0 30px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)",background:"rgba(22, 20, 20, 0.95)",backdropFilter:"blur(20px)"}}
        onClick={e => e.stopPropagation()}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{width:"34px",height:"34px",borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, #1db954 0%, #191414 100%)",boxShadow:"0 0 14px rgba(29,185,84,0.3)"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            </div>
            <h2 style={{fontSize:"15px",fontWeight:800,color:"#e2ddd9",margin:0,letterSpacing:"-0.01em"}}>Import Spotify Playlist</h2>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            {phase === 'matching' && (
              <button onClick={onClose} title="Minimize — import continues in background"
                onMouseEnter={() => setIsMinHovered(true)}
                onMouseLeave={() => setIsMinHovered(false)}
                style={{
                  width:"28px",
                  height:"28px",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  borderRadius:"50%",
                  border:"none",
                  background: isMinHovered ? "rgba(255,255,255,0.08)" : "transparent",
                  color: isMinHovered ? "#fff" : "#5c5755",
                  cursor:"pointer",
                  transition:"all 0.2s ease"
                }}>
                —
              </button>
            )}
            <button onClick={onClose}
              onMouseEnter={() => setIsCloseHovered(true)}
              onMouseLeave={() => setIsCloseHovered(false)}
              style={{
                width:"28px",
                height:"28px",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                borderRadius:"50%",
                border:"none",
                background: isCloseHovered ? "rgba(255, 255, 255, 0.08)" : "transparent",
                color: isCloseHovered ? "#fff" : "#5c5755",
                cursor:"pointer",
                transform: isCloseHovered ? "rotate(90deg)" : "none",
                transition:"all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
              }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {phase === 'instructions' && (
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"20px",gap:"16px",overflowY:"auto"}} className="custom-scrollbar">
            <p style={{fontSize:"13px",color:"#9e9894",lineHeight:1.6,margin:0}}>
              Veluna uses <span style={{color:"#e2ddd9",fontWeight:600}}>Exportify</span> to import Spotify playlists, no extra software needed.
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              {[
                { n: '1', title: 'Go to Exportify', desc: 'Open exportify.net in your browser', link: 'https://exportify.net', linkLabel: 'exportify.net →' },
                { n: '2', title: 'Log in with Spotify', desc: 'Click "Log in with Spotify" and authorise Exportify to read your playlists.' },
                { n: '3', title: 'Export your playlist', desc: 'Find the playlist and click the green Export button. A .csv file will download.' },
                { n: '4', title: 'Upload the CSV here', desc: 'Click the button below and select the downloaded .csv file.' },
              ].map(step => (
                <div key={step.n} style={{display:"flex",gap:"14px",alignItems:"flex-start"}}>
                  <div style={{
                    width:"26px",
                    height:"26px",
                    borderRadius:"50%",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    flexShrink:0,
                    fontSize:"11px",
                    fontWeight:700,
                    marginTop:"2px",
                    background:"rgba(29, 185, 84, 0.1)",
                    border:"1px solid rgba(29, 185, 84, 0.3)",
                    color:"#1db954"
                  }}>{step.n}</div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:"13px",fontWeight:700,color:"#e2ddd9",margin:0}}>{step.title}</p>
                    <p style={{fontSize:"11.5px",color:"rgba(255,255,255,0.4)",marginTop:"4px",margin:0,lineHeight:1.5}}>{step.desc}</p>
                    {step.link && (
                      <button onClick={() => openUrl(step.link!).catch(() => window.open(step.link!, '_blank'))}
                        className="exportify-btn"
                        style={{
                          fontSize:"12px",
                          marginTop:"10px",
                          display:"inline-flex",
                          alignItems:"center",
                          gap:"4px",
                          fontWeight:700,
                          cursor:"pointer",
                          color:"#1db954",
                          background:"rgba(29, 185, 84, 0.08)",
                          border:"1px solid rgba(29, 185, 84, 0.2)",
                          borderRadius:"8px",
                          padding:"5px 12px",
                          transition:"all 0.2s ease"
                        }}>
                        {step.linkLabel}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" style={{display:"none"}}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <button onClick={() => fileInputRef.current?.click()}
              onMouseEnter={() => setIsUploadHovered(true)}
              onMouseLeave={() => setIsUploadHovered(false)}
              style={{
                marginTop:"12px",
                width:"100%",
                padding:"11px",
                borderRadius:"10px",
                fontSize:"13px",
                fontWeight:700,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:"8px",
                border:"none",
                background:"linear-gradient(135deg, #1ed760 0%, #1db954 100%)",
                color:"#fff",
                cursor:"pointer",
                boxShadow: isUploadHovered ? "0 6px 20px rgba(29, 185, 84, 0.3)" : "none",
                transform: isUploadHovered ? "translateY(-1px)" : "none",
                transition:"all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
              }}>
              <Upload size={16} /> Upload Exportify CSV
            </button>
          </div>
        )}

        {(phase === 'matching' || phase === 'saving' || phase === 'done') && (
          <>
            <div style={{padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
                <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {isDone ? `Done · ${matched.length} matched` : `Matching · ${matched.length + failed.length} / ${results.length}`}
                  {failed.length>0&&<span style={{color:"#a05050",marginLeft:"6px"}}>· {failed.length} not found</span>}
                </span>
                {statusMsg&&<span style={{fontSize:"11px",color:"#1db954",fontFamily:"monospace"}}>{statusMsg}</span>}
              </div>
              <div style={{height:"4px",borderRadius:"2px",background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:"2px",transition:"width .3s",width:`${results.length>0?((matched.length+failed.length)/results.length)*100:0}%`,background:"linear-gradient(90deg, #1ed760 0%, #1db954 100%)"}} />
              </div>
            </div>
            <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"6px 0"}}>
              {results.map((r, i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"8px 20px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"6px",flexShrink:0,overflow:"hidden",background:"rgba(255,255,255,0.02)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 6px rgba(0,0,0,0.3)"}}>
                    {r.cover?<img src={r.cover} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<Music size={14} style={{color:"#5c5755"}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                    {cleanArtist(r.artist) && <div style={{fontSize:"11px",color:"#5c5755",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:"1px"}}>{cleanArtist(r.artist)}</div>}
                  </div>
                  <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:"5px",width:"80px",justifyContent:"flex-end"}}>
                    {r.status==='pending'&&<span style={{fontSize:"11px",color:"rgba(255,255,255,0.1)"}}>·</span>}
                    {r.status === 'fetching' && <Loader2 size={12} style={{animation:"spin 0.8s linear infinite",color:"#1db954"}} />}
                    {r.status === 'matched'  && <CheckCircle2 size={14} style={{ color: '#1db954' }} />}
                    {r.status === 'failed'   && <XCircle size={14} style={{color:"#a05050"}} />}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
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

export function YtImportModal({
  onClose,
  onSavePlaylist,
  showToast,
}: {
  onClose: () => void;
  onSavePlaylist: (name: string, desc: string, tracks: Track[]) => void;
  showToast: (m: string) => void;
}) {
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

export function MetadataEditModal({
  track,
  onSave,
  onClose
}: {
  track: Track;
  onSave: (title: string, artist: string, album: string) => Promise<void>;
  onClose: () => void;
}) {
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
    <div className="yt-import-modal-overlay" style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.75)",backdropFilter:"blur(12px)"}} onClick={onClose}>
      <div className="yt-import-modal-container" style={{width:"420px",borderRadius:"16px",overflow:"hidden",boxShadow:"0 30px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)",background:"rgba(22, 20, 20, 0.95)",backdropFilter:"blur(20px)"}} onClick={e => e.stopPropagation()}>
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
