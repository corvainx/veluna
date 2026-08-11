import { useState, useRef, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  X,
  Upload,
  Music,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';

import { Track } from '../types';
import { cleanArtist } from '../utils';
import { ImportResultModal } from './ImportResultModal';

type CsvImportModalProps = {
  onClose: () => void;
  onSavePlaylist: (name: string, desc: string, tracks: Track[]) => void;
  showToast: (m: string) => void;
  onProgress?: (matched: number, total: number, label: string) => void;
  onMatchingDone?: (tracks: Track[], matched: number, failed: number) => void;
  visible?: boolean;
};

export function CsvImportModal({
  onClose,
  onSavePlaylist,
  showToast,
  onProgress,
  onMatchingDone,
  visible = true,
}: CsvImportModalProps) {
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
    <div className="yt-import-modal-overlay" style={{position:"fixed",inset:0,zIndex:9999,display:visible?"flex":"none",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.85)"}} onClick={phase==='matching'?undefined:onClose}>
      <div className="yt-import-modal-container" style={{width:"640px",maxHeight:"88vh",display:"flex",flexDirection:"column",borderRadius:"16px",overflow:"hidden",boxShadow:"0 16px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)",background:"var(--v-bg2)"}}
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
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {isDone ? `Done · ${matched.length} matched` : `Matching · ${matched.length + failed.length} / ${results.length}`}
                  {failed.length > 0 && <span style={{color:"#a05050",marginLeft:"6px"}}>· {failed.length} not found</span>}
                </span>
                {statusMsg && <span style={{fontSize:"11px",color:"#1db954",fontFamily:"monospace"}}>{statusMsg}</span>}
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
