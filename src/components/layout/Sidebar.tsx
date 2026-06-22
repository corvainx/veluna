import React from 'react';
import {
  Home, HardDrive, BarChart2, Settings, ListOrdered, ListMusic, PlusCircle, Heart, X, ChevronDown, ChevronRight, Moon
} from 'lucide-react';
import { SleepTimerPopover } from '../ui/SleepTimerPopover';
import { ImportButton } from '../ui/ImportButton';
import { Playlist, Track, CtxMenu } from '../../types';
import { getPlaylistCover } from '../../utils';

type SidebarProps = {
  logoHovered: boolean;
  setLogoHovered: (h: boolean) => void;
  sleepTimer: number;
  showSleepPopover: boolean;
  setShowSleepPopover: React.Dispatch<React.SetStateAction<boolean>>;
  setSleepTimerMinutes: (m: number) => void;
  cancelSleepTimer: () => void;
  activeNav: string;
  navigateTo: (nav: string) => void;
  isQueueOpen: boolean;
  setIsQueueOpen: React.Dispatch<React.SetStateAction<boolean>>;
  queue: Track[];
  queuePulseKey: number;
  sidebarPlaylistsExpanded: boolean;
  setSidebarPlaylistsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  openPlaylistId: string | null;
  setOpenPlaylistId: (id: string | null) => void;
  setIsPlaylistModalOpen: (o: boolean) => void;
  setNewPlaylistName: (n: string) => void;
  setNewPlaylistDesc: (d: string) => void;
  playlists: Playlist[];
  openCtx: (e: React.MouseEvent, menu: Omit<CtxMenu, 'x' | 'y'>) => void;
  onSpotifyImport: () => void;
  onYoutubeImport: () => void;
  onM3uImport: () => void;
};

export const Sidebar = ({
  logoHovered,
  setLogoHovered,
  sleepTimer,
  showSleepPopover,
  setShowSleepPopover,
  setSleepTimerMinutes,
  cancelSleepTimer,
  activeNav,
  navigateTo,
  isQueueOpen,
  setIsQueueOpen,
  queue,
  queuePulseKey,
  sidebarPlaylistsExpanded,
  setSidebarPlaylistsExpanded,
  openPlaylistId,
  setOpenPlaylistId,
  setIsPlaylistModalOpen,
  setNewPlaylistName,
  setNewPlaylistDesc,
  playlists,
  openCtx,
  onSpotifyImport,
  onYoutubeImport,
  onM3uImport,
}: SidebarProps) => {
  return (
    <div style={{width:"248px",flexShrink:0,display:"flex",flexDirection:"column",background:"var(--v-bg1)",borderRight:"1px solid var(--v-bdr)",padding:"18px 16px",zIndex:10,overflow:"visible",position:"relative"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:"22px",flexShrink:0,padding:"0 2px"}}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
          flex: 1,
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: logoHovered ? "scale(1.03)" : "none"
        }}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          onClick={() => navigateTo('home')}>
          <svg width="38" height="38" viewBox="0 0 28 28" fill="none" style={{
            flexShrink: 0
          }}>
            <rect width="28" height="28" rx="6" fill="var(--v-accent)"/>
            <polygon points="4,6 8.5,6 14,21 19.5,6 24,6 14,23" fill="#0e0d0d"/>
            <polygon points="8.5,6 11.5,6 14,16 16.5,6 19.5,6 14,21" fill="var(--v-accent)"/>
          </svg>
          <span style={{
            letterSpacing: "0.22em",
            fontSize: "19px",
            fontWeight: 900,
            color: "#ffffff",
            textTransform: "uppercase"
          }}>veluna</span>
        </div>
      </div>

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
        ] as { id: string; label: string; icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }> }[]).map(({ id, label, icon: Icon }) => (
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

      <div style={{marginTop:"14px",display:"flex",flexDirection:"column",flex:"1 1 0%",minHeight:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 4px 8px",flexShrink:0,borderBottom:"1px solid var(--v-bdr2)"}}>
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
          <div style={{flex:"1 1 0%",overflowY:"auto",scrollbarWidth:"thin",scrollbarColor:"var(--v-bdr2) transparent"}}>
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
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:"13px"}}>{pl.name}</span>
                    {pl.tracks.length > 0 && <span style={{fontSize:"10px",color:"#363230",fontVariantNumeric:"tabular-nums"}}>{pl.tracks.length}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ImportButton
        onSpotify={onSpotifyImport}
        onYoutube={onYoutubeImport}
        onM3u={onM3uImport}
      />
    </div>
  );
};
