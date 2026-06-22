import React from 'react';
import { invoke } from "@tauri-apps/api/core";
import {
  X, Music, SkipBack, Pause, Play, SkipForward, Loader2, Mic2
} from 'lucide-react';
import { Track } from '../../types';
import { formatTime } from '../../utils';
import { LyricsAudioDropdown } from '../ui/LyricsAudioDropdown';

type LyricsPanelProps = {
  showLyrics: boolean;
  setShowLyrics: (v: boolean) => void;
  currentTrack: Track | null;
  lyricsData: { lines: { time: number; text: string }[] } | null;
  lyricsLoading: boolean;
  progressSeconds: number;
  trackDurationSeconds: number;
  isPlaying: boolean;
  togglePlayPause: () => void;
  handleSkipBack: () => void;
  handleSkipForward: () => void;
  audioDevices: { id: string; name: string; form: string; is_default: boolean }[];
  setAudioDevices: React.Dispatch<React.SetStateAction<{ id: string; name: string; form: string; is_default: boolean }[]>>;
  switchingDevice: boolean;
  setSwitchingDevice: (v: boolean) => void;
  showToast: (msg: string) => void;
};

export function LyricsPanel({
  showLyrics, setShowLyrics,
  currentTrack,
  lyricsData, lyricsLoading,
  progressSeconds, trackDurationSeconds,
  isPlaying, togglePlayPause,
  handleSkipBack, handleSkipForward,
  audioDevices, setAudioDevices,
  switchingDevice, setSwitchingDevice,
  showToast,
}: LyricsPanelProps) {
  
  if (!showLyrics || !currentTrack) return null;

  const lines = lyricsData?.lines || [];
  // End glitch fix: once past last line, keep last line active (not index 0)
  let currentIdx = lines.length > 0 ? lines.length - 1 : 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time > progressSeconds) { currentIdx = Math.max(0, i - 1); break; }
  }
  const pct = trackDurationSeconds > 0 ? Math.min((progressSeconds / trackDurationSeconds) * 100, 100) : 0;

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",userSelect:"none",background:"var(--v-bg0)"}}>
      {/* Base */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"linear-gradient(135deg,var(--v-bg0) 0%,var(--v-bg1) 100%)"}}/>
      {/* Full-screen blurred cover art — the hero background */}
      {currentTrack.cover && (
        <div style={{
          position: 'absolute',
          pointerEvents: 'none',
          inset: '-80px',
          backgroundImage: `url(${currentTrack.cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(90px) saturate(1.6) brightness(0.75)',
          opacity: 0.85,
        }} />
      )}
      {/* Gentle overall darkening for text legibility — smooth, no banding */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"rgba(8,7,7,0.3)"}}/>

      {/* Left panel */}
      <div style={{position:"relative",zIndex:10,width:"340px",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px",gap:"18px"}}>
        <button onClick={()=>setShowLyrics(false)}
          style={{position:"absolute",top:"24px",left:"24px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",color:"rgba(255,255,255,0.6)",background:"rgba(255,255,255,0.06)",backdropFilter:"blur(12px)",transition:"color .15s,background .15s,border-color .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(255,255,255,0.12)";e.currentTarget.style.borderColor="rgba(255,255,255,0.18)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.6)";e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>
          <X size={16} />
        </button>

        {/* Album art */}
        <div style={{width:"208px",height:"208px",borderRadius:"20px",overflow:"hidden",flexShrink:0,boxShadow:"0 28px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",position:"relative"}}>
          {currentTrack.cover
            ? <img src={currentTrack.cover} alt={currentTrack.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : <div style={{width:"100%",height:"100%",background:"var(--v-bdr2)",display:"flex",alignItems:"center",justifyContent:"center"}}><Music size={32} style={{color:"#363230"}}/></div>}
        </div>

        <div style={{textAlign:"center",width:"100%"}}>
          <p style={{fontSize:"19px",fontWeight:800,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 4px",margin:0,letterSpacing:"-0.01em"}}>{currentTrack.title}</p>
          <p style={{fontSize:"13.5px",marginTop:"5px",color:"rgba(255,255,255,0.5)",margin:"5px 0 0"}}>{currentTrack.artist}</p>
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
            {isPlaying ? <Pause fill="var(--v-bg0)" size={19}/> : <Play fill="var(--v-bg0)" size={19} style={{marginLeft:"2px"}}/>}
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
              try {
                await invoke('set_audio_device', { id });
                setAudioDevices(prev => prev.map(d => ({ ...d, is_default: d.id === id })));
                showToast(`Output: ${audioDevices.find(d=>d.id===id)?.name ?? id}`);
              }
              catch (e) { showToast(`Switch failed: ${e}`); }
              finally { setSwitchingDevice(false); }
            }}
          />
        )}
      </div>

      {/* Divider */}
      <div style={{position:"relative",zIndex:10,width:"1px",flexShrink:0,margin:"56px 0",background:"linear-gradient(to bottom,transparent,rgba(255,255,255,0.08),transparent)"}}/>

      {/* Lyrics panel */}
      <div style={{position:"relative",zIndex:10,flex:1,overflow:"hidden"}}>
        {lyricsLoading ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px",height:"100%"}}>
            <Loader2 size={26} style={{color:"rgba(255,255,255,0.35)",animation:"spin 1s linear infinite"}}/>
            <p style={{fontSize:"13.5px",color:"rgba(255,255,255,0.4)",fontWeight:500}}>Fetching lyrics…</p>
          </div>
        ) : lines.length > 0 ? (
          <div style={{position:"relative",height:"100%"}}>
            <div style={{height:"100%",overflowY:"auto",padding:"140px 48px",scrollbarWidth:"none"}}
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
                    onMouseEnter={e=>{if(!isCurrent)(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.8)';}}
                    onMouseLeave={e=>{if(!isCurrent)(e.currentTarget as HTMLElement).style.color=isPast?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.45)';}}
                    style={{
                      cursor:"pointer",lineHeight:1.45,padding:"12px 0",userSelect:"none",margin:0,
                      fontSize: '2rem',
                      letterSpacing: '0.005em',
                      fontWeight: isCurrent ? 800 : 600,
                      color: isCurrent ? '#fff' : isPast ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)',
                      transform: isCurrent ? 'scale(1.04)' : 'scale(1)',
                      transformOrigin: 'left center',
                      transition: 'color 0.35s ease, transform 0.35s ease',
                    }}>
                    {line.text || '\u00A0'}
                  </p>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"14px",height:"100%",color:"rgba(255,255,255,0.25)"}}>
            <div style={{width:"56px",height:"56px",borderRadius:"50%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Mic2 size={24} strokeWidth={1.5} style={{color:"rgba(255,255,255,0.3)"}}/>
            </div>
            <div style={{textAlign:"center"}}>
              <p style={{fontSize:"15px",fontWeight:600,color:"rgba(255,255,255,0.5)",margin:0}}>No lyrics found</p>
              <p style={{fontSize:"12.5px",color:"rgba(255,255,255,0.2)",margin:"4px 0 0"}}>Try Genius or AZLyrics</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
