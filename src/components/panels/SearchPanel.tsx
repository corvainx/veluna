import React from 'react';
import { Search, Clock, Info, Play, Clock3 } from 'lucide-react';
import { Track } from '../../types';
import { TrackRow, TrackRowSkeleton } from '../ui/TrackRow';

type SearchPanelProps = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearching: boolean;
  searchRef: React.RefObject<HTMLInputElement | null>;
  searchHistory: string[];
  setSearchHistory: React.Dispatch<React.SetStateAction<string[]>>;
  showHistory: boolean;
  setShowHistory: (s: boolean) => void;
  searchMusic: (q?: string) => void;
  updateAvailable: string | null;
  setActiveNav: (nav: string) => void;
  tracks: Track[];
  playAll: (ts: Track[]) => void;
  currentTrack: Track | null;
  isLoadingTrack: boolean;
  isPlaying: boolean;
  isTrackLiked: (url: string) => boolean;
  downloadingTracks: Record<string, number>;
  handleDownload: (t: Track) => void;
  toggleLikeTrack: (t: Track) => void;
  openCtx: (e: React.MouseEvent, menu: any) => void;
  handlePlayInContext: (t: Track, list: Track[]) => void;
  prefetchOnHover: (url: string) => void;
  hoveredTrackUrl: string | null;
  setHoveredTrackUrl: (url: string | null) => void;
};

export const SearchPanel = ({
  searchQuery,
  setSearchQuery,
  isSearching,
  searchRef,
  searchHistory,
  setSearchHistory,
  showHistory,
  setShowHistory,
  searchMusic,
  updateAvailable,
  setActiveNav,
  tracks,
  playAll,
  currentTrack,
  isLoadingTrack,
  isPlaying,
  isTrackLiked,
  downloadingTracks,
  handleDownload,
  toggleLikeTrack,
  openCtx,
  handlePlayInContext,
  prefetchOnHover,
  hoveredTrackUrl,
  setHoveredTrackUrl,
}: SearchPanelProps) => {
  return (
    <>
      <div style={{padding:"16px 24px 10px",position:"relative",zIndex:30,flexShrink:0,display:"flex",justifyContent:"center"}}>
        <div className="v-home-search-container" onClick={e=>e.stopPropagation()}>
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
              style={{width:'100%',height:'42px',background:'var(--v-bg2)',color:'#e2ddd9',border:`1px solid ${isSearching?'rgba(226,221,217,0.15)':'var(--v-bdr2)'}`,borderRadius:'21px',padding:'0 12px 0 42px',fontSize:'13.5px',outline:'none',opacity:isSearching?0.5:1,cursor:isSearching?'not-allowed':'text',transition:'border-color .15s',boxSizing:'border-box'}}
            />
            {showHistory && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:'6px',background:'var(--v-bg2)',border:'1px solid var(--v-bdr2)',borderRadius:'10px',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.7)',zIndex:100}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderBottom:'1px solid var(--v-bdr2)'}}>
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
            style={{height:'42px',padding:'0 16px',borderRadius:'21px',border:'1px solid var(--v-bdr2)',background:'var(--v-bg2)',color:isSearching||!searchQuery.trim()?'#363230':'#9e9894',cursor:isSearching||!searchQuery.trim()?'not-allowed':'pointer',fontSize:'13px',fontWeight:600,display:'flex',alignItems:'center',gap:'6px',flexShrink:0,transition:'border-color .15s,color .15s,background .15s',whiteSpace:'nowrap'}}
            onMouseEnter={e=>{if(!isSearching&&searchQuery.trim()){(e.currentTarget as HTMLElement).style.background='rgba(226,221,217,0.06)';(e.currentTarget as HTMLElement).style.borderColor='var(--v-bdr3)';}}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='var(--v-bg2)';(e.currentTarget as HTMLElement).style.borderColor='var(--v-bdr2)';}}>
            {isSearching ? <div style={{width:'14px',height:'14px',border:'2px solid #5c5755',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} /> : <Search size={15} />}
            {!isSearching && 'Search'}
          </button>
          {updateAvailable && (
            <button
              onClick={() => { setActiveNav('settings'); }}
              title={`Update available — v${updateAvailable}`}
              style={{flexShrink:0,width:"42px",height:"42px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"21px",border:"1px solid var(--v-bdr2)",background:"var(--v-bg2)",cursor:"pointer",position:"relative"}}
            >
              <Info size={17} />
              <span style={{position:"absolute",top:"5px",right:"5px",width:"6px",height:"6px",borderRadius:"50%",background:"#9e9894"}}/>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"24px 30px 30px",zIndex:10}} onClick={()=>setShowHistory(false)}>
        <div className="v-home-search-results">
          <div className="v-section-head">
            <h2>{isSearching ? 'Searching...' : `Results`}</h2>
            {isSearching && <div style={{display:"flex",gap:"3px",alignItems:"flex-end",height:"16px"}}>{[100, 60, 80, 50].map((h, i) => <div key={i} style={{ width:"4px",borderRadius:"2px",background:"rgba(226,221,217,0.4)",height: `${h}%`, animation: `barBounce ${0.65 + i * 0.1}s ease-in-out ${i * 100}ms infinite`, transformOrigin: "bottom" }} />)}</div>}
            {tracks.length > 0 && !isSearching && (
              <button onClick={() => playAll(tracks)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 10px',background:'rgba(226,221,217,0.06)',border:'1px solid rgba(226,221,217,0.12)',color:'#9e9894',borderRadius:'7px',cursor:'pointer',fontSize:'11px',fontWeight:600,transition:'background .12s'}}>
                <Play size={11} style={{fill:'currentColor'}} /> Play All
              </button>
            )}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"0 12px 6px",borderBottom:"1px solid var(--v-bdr2)",marginBottom:"4px"}}>
            <div style={{width:"26px",flexShrink:0}}/><div style={{width:"38px",flexShrink:0}}/>
            <p style={{flex:1,fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#363230"}}>Title</p>
            <div style={{width:"60px",flexShrink:0}}/>
            <Clock3 size={12} style={{color:"#363230",width:"36px",flexShrink:0}}/>
          </div>

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
                  onHoverEnter={() => { setHoveredTrackUrl(track.url); prefetchOnHover(track.url); }}
                  onHoverLeave={() => setHoveredTrackUrl(null)}
                  onLike={() => toggleLikeTrack(track)}
                  onDownload={() => handleDownload(track)}
                  onCtx={e => openCtx(e, { type: 'track', track })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
