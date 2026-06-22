import React, { useState, useRef } from 'react';
import { Heart, ListMusic, Play, Trash2, Music, PlusCircle } from 'lucide-react';
import { Track, Playlist } from '../../types';
import { getPlaylistCover, getTrackGradient, saveLS } from '../../utils';
import { PlaylistDetailPanel } from './PlaylistDetailPanel';

type LibraryPanelProps = {
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  openPlaylistId: string | null;
  setOpenPlaylistId: (id: string | null) => void;
  playlistSearchQ: string;
  setPlaylistSearchQ: (q: string) => void;
  handleCoverUpload: (id: string) => void;
  playAll: (ts: Track[]) => void;
  setRenamingPlaylist: (pl: Playlist | null) => void;
  setRenameVal: (v: string) => void;
  setRenameDescVal: (v: string) => void;
  deletePlaylist: (id: string) => void;
  removeFromPlaylist: (plId: string, url: string) => void;
  currentTrack: Track | null;
  isLoadingTrack: boolean;
  isPlaying: boolean;
  isTrackLiked: (url: string) => boolean;
  toggleLikeTrack: (t: Track) => void;
  downloadingTracks: { [url: string]: number };
  handleDownload: (t: Track) => void;
  hoveredTrackUrl: string | null;
  setHoveredTrackUrl: (url: string | null) => void;
  prefetchOnHover: (url: string) => void;
  handlePlayInContext: (t: Track, list: Track[]) => void;
  openCtx: (e: React.MouseEvent, target: { type: 'track' | 'playlist'; track?: Track; playlist?: Playlist }) => void;
  setNewPlaylistName: (v: string) => void;
  setNewPlaylistDesc: (v: string) => void;
  setIsPlaylistModalOpen: (v: boolean) => void;
  listenSecs: { [url: string]: number };
  playCounts: { [url: string]: number };
  playHistory: Track[];
  setPlayHistory: React.Dispatch<React.SetStateAction<Track[]>>;
  setShowCsvImportModal: (v: boolean) => void;
  setShowYtImportModal: (v: boolean) => void;
  handleImportPlaylistM3u: () => void;
};

export function LibraryPanel({
  playlists, setPlaylists,
  openPlaylistId, setOpenPlaylistId,
  playlistSearchQ, setPlaylistSearchQ,
  handleCoverUpload, playAll,
  setRenamingPlaylist, setRenameVal, setRenameDescVal,
  deletePlaylist, removeFromPlaylist,
  currentTrack, isLoadingTrack, isPlaying,
  isTrackLiked, toggleLikeTrack,
  downloadingTracks, handleDownload,
  hoveredTrackUrl, setHoveredTrackUrl,
  prefetchOnHover, handlePlayInContext,
  openCtx,
  setNewPlaylistName, setNewPlaylistDesc, setIsPlaylistModalOpen,
  listenSecs, playCounts,
  playHistory, setPlayHistory,
  setShowCsvImportModal, setShowYtImportModal,
  handleImportPlaylistM3u,
}: LibraryPanelProps) {
  
  
  const dragPlaylistCardIdx = useRef<number | null>(null);
  const dragOverPlaylistCardIdxRef = useRef<number | null>(null);
  const [dragOverPlaylistCardIdx, setDragOverPlaylistCardIdx] = useState<number | null>(null);
  const [dragPlaylistCardIdxState, setDragPlaylistCardIdxState] = useState<number | null>(null);

  const openPlaylist = playlists.find(p => p.id === openPlaylistId);

  return (
    openPlaylist ? (
      <PlaylistDetailPanel
        openPlaylist={openPlaylist}
        setOpenPlaylistId={setOpenPlaylistId}
        playlistSearchQ={playlistSearchQ}
        setPlaylistSearchQ={setPlaylistSearchQ}
        handleCoverUpload={handleCoverUpload}
        playAll={playAll}
        setRenamingPlaylist={setRenamingPlaylist}
        setRenameVal={setRenameVal}
        setRenameDescVal={setRenameDescVal}
        deletePlaylist={deletePlaylist}
        removeFromPlaylist={removeFromPlaylist}
        currentTrack={currentTrack}
        isLoadingTrack={isLoadingTrack}
        isPlaying={isPlaying}
        isTrackLiked={isTrackLiked}
        toggleLikeTrack={toggleLikeTrack}
        downloadingTracks={downloadingTracks}
        handleDownload={handleDownload}
        hoveredTrackUrl={hoveredTrackUrl}
        setHoveredTrackUrl={setHoveredTrackUrl}
        prefetchOnHover={prefetchOnHover}
        handlePlayInContext={handlePlayInContext}
        openCtx={openCtx}
        setPlaylists={setPlaylists}
      />
    ) : (
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"24px 30px",zIndex:10}}>
        <div className="v-library-container">
          <div className="v-library-main">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
              <h2 style={{fontSize:'20px',fontWeight:800,color:'#e2ddd9',margin:0}}>Playlists</h2>
              <button onClick={() => { setNewPlaylistName(''); setNewPlaylistDesc(''); setIsPlaylistModalOpen(true); }}
                className="v-new-playlist-btn">
                <PlusCircle size={13} /> New Playlist
              </button>
            </div>
            <div style={{display:"grid",gap:"20px",gridTemplateColumns:"repeat(auto-fill, minmax(170px, 1fr))"}}>
              {playlists.map((pl, plIdx) => {
                const cover = getPlaylistCover(pl);
                const isDragTarget = dragOverPlaylistCardIdx === plIdx && dragPlaylistCardIdx.current !== null && dragPlaylistCardIdx.current !== plIdx;
                return (
                  <div key={pl.id}
                    onMouseEnter={() => { if (dragPlaylistCardIdx.current !== null) { dragOverPlaylistCardIdxRef.current = plIdx; setDragOverPlaylistCardIdx(plIdx); } }}
                    className="v-pl-card"
                    style={{ animation: `fadeUp 0.2s cubic-bezier(0.2,0,0,1) ${plIdx * 30}ms both` }}
                    onClick={() => { if (dragPlaylistCardIdx.current === null) setOpenPlaylistId(pl.id); }}
                    onContextMenu={e => openCtx(e, { type: 'playlist', playlist: pl })}>
                    {isDragTarget && (
                      <div style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        background: "var(--v-accent)",
                        borderRadius: "2px",
                        zIndex: 20,
                        pointerEvents: "none",
                        left: plIdx < (dragPlaylistCardIdx.current ?? 0) ? "-12px" : "auto",
                        right: plIdx > (dragPlaylistCardIdx.current ?? 0) ? "-12px" : "auto",
                        boxShadow: "0 0 10px var(--v-accent)"
                      }} />
                    )}
                    <div
                      className="v-pl-card__cover-wrapper"
                      style={{
                        opacity: dragPlaylistCardIdxState === plIdx ? 0.45 : 1,
                        transform: dragPlaylistCardIdxState === plIdx ? "scale(0.94)" : "none",
                        transition: "opacity 0.2s, transform 0.2s"
                      }}
                      onMouseDown={e => {
                        e.preventDefault();
                        dragPlaylistCardIdx.current = plIdx;
                        dragOverPlaylistCardIdxRef.current = plIdx;
                        setDragOverPlaylistCardIdx(plIdx);
                        setDragPlaylistCardIdxState(plIdx);
                        const onUp = () => {
                          const from = dragPlaylistCardIdx.current;
                          const to = dragOverPlaylistCardIdxRef.current;
                          dragPlaylistCardIdx.current = null;
                          dragOverPlaylistCardIdxRef.current = null;
                          setDragOverPlaylistCardIdx(null);
                          setDragPlaylistCardIdxState(null);
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
                      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        {pl.id==='p1'
                          ? <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,rgba(140,30,30,0.4) 0%,rgba(140,30,30,0.1) 100%)"}}><Heart size={22} style={{color:"#e05555",fill:"rgba(220,60,60,0.25)"}}/></div>
                          : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)"}}><ListMusic size={24} style={{color:"#363230"}}/></div>}
                      </div>
                      {cover && (
                        <img src={cover} style={{position: "absolute", inset: 0, width:"100%",height:"100%",objectFit:"cover"}} onError={e => { e.currentTarget.style.display = 'none'; }} alt=""/>
                      )}
                      <div className="pl-hover-overlay" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(2px)",opacity:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .25s ease",zIndex:5}}>
                        <button onClick={e=>{e.stopPropagation();playAll(pl.tracks);}}
                          style={{width:"42px",height:"42px",background:"var(--v-accent)",color:"#0c0b0b",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",boxShadow:"0 6px 16px rgba(0,0,0,0.5)",transition:"all 0.15s cubic-bezier(0.2,0,0,1)"}}
                          onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.1)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.6), 0 0 10px var(--v-accent)";}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 6px 16px rgba(0,0,0,0.5)";}}>
                          <Play size={16} style={{fill:"currentColor",color:"currentColor",marginLeft:"2px"}}/>
                        </button>
                      </div>
                    </div>
                    <div style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.3}}>{pl.name}</div>
                    <div style={{fontSize:"11px",color:"#8a807c",marginTop:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {pl.description?pl.description:`${pl.tracks.length} track${pl.tracks.length!==1?'s':''}`}
                    </div>
                    {pl.id!=='p1'&&(
                      <button onClick={e=>{e.stopPropagation();deletePlaylist(pl.id);}}
                        className="pl-card-del"
                        style={{position:"absolute",top:"10px",right:"10px",opacity:0,width:"26px",height:"26px",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.06)",cursor:"pointer",color:"#8a807c",transition:"all .2s cubic-bezier(0.2,0,0,1)",zIndex:6}}
                        onMouseEnter={e=>{e.currentTarget.style.color="#ff6060";e.currentTarget.style.background="rgba(160,40,40,0.2)";e.currentTarget.style.borderColor="rgba(255,96,96,0.2)";e.currentTarget.style.transform="scale(1.05)";}}
                        onMouseLeave={e=>{e.currentTarget.style.color="#8a807c";e.currentTarget.style.background="rgba(0,0,0,0.6)";e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";e.currentTarget.style.transform="scale(1)";}}>
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="v-library-sidebar">
            <div className="v-library-sidebar-card">
              <h3 style={{fontSize:"11px",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"#8a807c",margin:"0 0 16px 0"}}>Library Insights</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"14px"}}>
                <div className="v-library-stat-item">
                  <span className="v-library-stat-val">{playlists.length}</span>
                  <span className="v-library-stat-lbl">Playlists</span>
                </div>
                <div className="v-library-stat-item">
                  <span className="v-library-stat-val">{playlists.reduce((acc, p) => acc + p.tracks.length, 0)}</span>
                  <span className="v-library-stat-lbl">Total Songs</span>
                </div>
                <div className="v-library-stat-item">
                  <span className="v-library-stat-val">
                    {(() => {
                      const totalMins = Math.round(Object.values(listenSecs).reduce((s: number, n) => s + (n as number), 0) / 60);
                      return totalMins >= 60 ? `${(totalMins / 60).toFixed(1)}h` : `${totalMins}m`;
                    })()}
                  </span>
                  <span className="v-library-stat-lbl">Time Listened</span>
                </div>
                <div className="v-library-stat-item">
                  <span className="v-library-stat-val">
                    {Object.values(playCounts).reduce((s: number, n) => s + (n as number), 0)}
                  </span>
                  <span className="v-library-stat-lbl">Total Plays</span>
                </div>
              </div>
            </div>
            <div className="v-library-sidebar-card" style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h3 style={{fontSize:"11px",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"#8a807c",margin:0}}>Recently Played</h3>
                {playHistory.length > 0 && (
                  <button onClick={() => { setPlayHistory([]); saveLS('vg_playHistory', []); }}
                    style={{background:"none",border:"none",color:"#5c5755",fontSize:"10px",fontWeight:600,cursor:"pointer",transition:"color .12s"}}
                    onMouseEnter={e=>e.currentTarget.style.color="#8a807c"}
                    onMouseLeave={e=>e.currentTarget.style.color="#5c5755"}>
                    Clear
                  </button>
                )}
              </div>
              {playHistory.length === 0 ? (
                <div style={{padding:"20px 0",textAlign:"center",color:"#363230",fontSize:"12px"}}>
                  No recent activity
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                  {playHistory.slice(0, 4).map((track: Track, i: number) => (
                    <div key={track.url + i}
                      onClick={() => handlePlayInContext(track, playHistory.slice(0, 4))}
                      className="v-library-recent-row">
                      <div className="v-library-recent-art" style={{background: getTrackGradient(track.title, track.artist)}}>
                        {track.cover ? <img src={track.cover} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <Music size={12} style={{color:"rgba(255,255,255,0.2)"}} />}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="v-library-recent-title">{track.title}</div>
                        <div className="v-library-recent-artist">{track.artist}</div>
                      </div>
                      <div className="v-library-recent-play">
                        <Play size={10} style={{fill:"currentColor"}} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="v-library-sidebar-card">
              <h3 style={{fontSize:"11px",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"#8a807c",margin:"0 0 12px 0"}}>Import Tools</h3>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                <button onClick={() => setShowCsvImportModal(true)} className="v-library-import-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#1DB954" style={{marginRight:"4px"}}><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  Import from Spotify
                </button>
                <button onClick={() => setShowYtImportModal(true)} className="v-library-import-btn">
                  <svg width="12" height="10" viewBox="0 0 18 14" fill="#ef4444" style={{marginRight:"4px"}}><path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/></svg>
                  Import from YouTube
                </button>
                <button onClick={handleImportPlaylistM3u} className="v-library-import-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{marginRight:"4px"}} stroke="#9e9894" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Import M3U Playlist
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
}
