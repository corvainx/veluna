import React from 'react';
import { ListPlus, FileMusic, ListOrdered, Music, Play, X } from 'lucide-react';
import { Track, Playlist } from '../../types';
import { cleanArtist, getTrackGradient } from '../../utils';

type QueuePanelProps = {
  queue: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoadingTrack: boolean;
  playlistContextRef: React.RefObject<any>;
  playlists: Playlist[];
  handleSaveQueueAsPlaylist: () => void;
  showToast: (msg: string) => void;
  openCtx: (e: React.MouseEvent, menu: any) => void;
  handlePlayTrack: (t: Track, forcePlay?: boolean) => void;
  handlePlayInContext: (track: Track, contextList: Track[]) => void;
  removeFromQueueByIndex: (index: number) => void;
  dragQueueIdx: React.RefObject<number | null>;
  dragOverQueueIdxRef: React.RefObject<number | null>;
  dragOverQueueIdx: number | null;
  setDragOverQueueIdx: React.Dispatch<React.SetStateAction<number | null>>;
  showClearConfirm: boolean;
  setShowClearConfirm: React.Dispatch<React.SetStateAction<boolean>>;
};

export const QueuePanel = ({
  queue,
  setQueue,
  currentTrack,
  isPlaying,
  isLoadingTrack,
  playlistContextRef,
  playlists,
  handleSaveQueueAsPlaylist,
  showToast,
  openCtx,
  handlePlayTrack,
  handlePlayInContext,
  removeFromQueueByIndex,
  dragQueueIdx,
  dragOverQueueIdxRef,
  dragOverQueueIdx,
  setDragOverQueueIdx,
  showClearConfirm,
  setShowClearConfirm,
}: QueuePanelProps) => {
  const contextualTracks = (() => {
    if (!playlistContextRef.current || !currentTrack) return [];
    const { tracks, index } = playlistContextRef.current;
    let idx = tracks.findIndex((t: Track) => t.url === currentTrack.url);
    if (idx === -1) idx = index;
    return tracks.slice(idx + 1, idx + 11);
  })();

  const getContextSourceLabel = () => {
    if (!playlistContextRef.current) return 'Source';
    const ctxTracks = playlistContextRef.current.tracks;
    const matchedPlaylist = playlists.find(p => {
      if (p.tracks.length !== ctxTracks.length) return false;
      return p.tracks.every((t, idx) => t.url === ctxTracks[idx]?.url);
    });
    if (matchedPlaylist) return matchedPlaylist.name;
    return 'Current List';
  };

  return (
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid var(--v-bdr2)',flexShrink:0}}>
        <span style={{fontWeight:700,color:'#e2ddd9',fontSize:'13px',letterSpacing:'.01em'}}>Play Queue</span>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          {queue.length > 0 && (
            <button 
              onClick={handleSaveQueueAsPlaylist}
              title="Save Queue as Playlist"
              style={{background:'none',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:500,color:'#5c5755',transition:'color .12s',display:'flex',alignItems:'center',gap:'3px'}}
              onMouseEnter={e=>(e.currentTarget.style.color='#e2ddd9')}
              onMouseLeave={e=>(e.currentTarget.style.color='#5c5755')}
            >
              <ListPlus size={13} />
              <span>Save</span>
            </button>
          )}
          {queue.length > 0 && (
            showClearConfirm ? (
              <div style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px'}}>
                <span style={{color:'#b05555',fontWeight:500}}>Clear?</span>
                <button 
                  onClick={() => { setQueue([]); setShowClearConfirm(false); showToast('Queue cleared'); }} 
                  style={{background:'none',border:'none',cursor:'pointer',fontWeight:700,color:'#b05555',padding:0}}
                >
                  Yes
                </button>
                <span style={{color:'#363230'}}>|</span>
                <button 
                  onClick={() => setShowClearConfirm(false)} 
                  style={{background:'none',border:'none',cursor:'pointer',fontWeight:500,color:'#5c5755',padding:0}}
                >
                  No
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowClearConfirm(true)} 
                style={{background:'none',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:500,color:'#5c5755',transition:'color .12s'}} 
                onMouseEnter={e=>(e.currentTarget.style.color='#b05555')} 
                onMouseLeave={e=>(e.currentTarget.style.color='#5c5755')}
              >
                Clear
              </button>
            )
          )}
        </div>
      </div>

      {currentTrack && (
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--v-bdr2)',flexShrink:0}}>
          <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#363230',marginBottom:'8px'}}>Now Playing</div>
          <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px',borderRadius:'8px',background:'rgba(226,221,217,0.04)',border:'1px solid rgba(226,221,217,0.08)'}}>
            <div style={{position:'relative',width:'38px',height:'38px',borderRadius:'6px',overflow:'hidden',flexShrink:0,background:'var(--v-bdr2)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {currentTrack.cover ? <img src={currentTrack.cover} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" /> : <FileMusic size={16} style={{color:'#5c5755'}} />}
              {!isLoadingTrack && isPlaying && (
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{display:'flex',gap:'2px',alignItems:'flex-end',height:'12px'}}>{[100,60,80].map((h,i)=><div key={i} style={{width:'2px',background:'#9e9894',borderRadius:'1px',height:`${h}%`,animation:`barBounce ${0.7+i*0.12}s ease-in-out ${i*110}ms infinite`,transformOrigin:'bottom'}}/>)}</div>
                </div>
              )}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'12px',fontWeight:700,color:'#e2ddd9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentTrack.title}</div>
              {cleanArtist(currentTrack.artist) && <div style={{fontSize:'11px',color:'#5c5755',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:'2px'}}>{cleanArtist(currentTrack.artist)}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {queue.length === 0 && contextualTracks.length === 0 ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"180px",color:"#363230",gap:"8px"}}>
            <ListOrdered size={26} strokeWidth={1} />
            <p style={{fontSize:"13px"}}>Queue is empty</p>
          </div>
        ) : (
          <>
            {queue.length > 0 && (
              <>
                <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#5c5755',padding:'14px 16px 8px'}}>Manually Queued</div>
                {queue.map((track, i) => (
                  <div key={`${track.url}-${i}`}
                    className={`v-queue-item${currentTrack?.url===track.url?' v-queue-item--active':''}`} style={{position:'relative'}}
                    onMouseEnter={() => { if (dragQueueIdx.current !== null) { if (dragOverQueueIdxRef.current) (dragOverQueueIdxRef as any).current = i; setDragOverQueueIdx(i); } }}
                    onContextMenu={e => openCtx(e, { type: 'queue-track', track })}>
                    {dragOverQueueIdx === i && dragQueueIdx.current !== null && dragQueueIdx.current !== i && (
                      <div style={{position:"absolute",top:0,left:0,right:0,height:"1.5px",background:"rgba(226,221,217,0.5)",borderRadius:"1px",zIndex:10,pointerEvents:"none"}} />
                    )}
                    <div style={{width:"20px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}
                      onMouseDown={e => {
                        e.preventDefault();
                        if (dragQueueIdx.current !== null) (dragQueueIdx as any).current = i;
                        if (dragOverQueueIdxRef.current) (dragOverQueueIdxRef as any).current = i;
                        setDragOverQueueIdx(i);
                        const onUp = () => {
                          const from = dragQueueIdx.current;
                          const to = dragOverQueueIdxRef.current;
                          if (dragQueueIdx.current !== null) (dragQueueIdx as any).current = null;
                          if (dragOverQueueIdxRef.current) (dragOverQueueIdxRef as any).current = null;
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
                      <div style={{width:"18px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"grab"}}>
                        <span className="v-queue-drag-index" style={{fontSize:"11px",color:"#363230",fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
                        <div className="v-queue-drag-icon">
                          <svg width="9" height="13" viewBox="0 0 10 14" fill="#5c5755"><circle cx="3" cy="2.5" r="1.2"/><circle cx="7" cy="2.5" r="1.2"/><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="3" cy="11.5" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/></svg>
                        </div>
                      </div>
                    </div>
                    <div className="v-queue-cover-container" style={{position:'relative',width:'36px',height:'36px',borderRadius:'6px',overflow:'hidden',flexShrink:0,cursor:'pointer'}}
                      onClick={()=>{if(dragQueueIdx.current===null){setQueue(p=>p.filter((_,idx)=>idx!==i));handlePlayTrack(track,true);}}}>
                      <div style={{
                        width:"100%",height:"100%",border:"1px solid rgba(255,255,255,0.05)",
                        position: "relative",
                        background: getTrackGradient(track.title, track.artist),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <Music size={12} style={{position: 'absolute', color: 'rgba(255,255,255,0.25)'}} />
                        {track.cover && <img src={track.cover} style={{position: 'absolute', inset: 0, width:"100%",height:"100%",objectFit:"cover"}} onError={e => { e.currentTarget.style.display = 'none'; }} alt=""/>}
                      </div>
                      <div className="v-queue-play-overlay" style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',color:'#ffffff'}}>
                        <Play size={12} fill="currentColor" />
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:0,cursor:"pointer",marginLeft:'10px'}} onClick={()=>{if(dragQueueIdx.current===null){setQueue(p=>p.filter((_,idx)=>idx!==i));handlePlayTrack(track,true);}}}>
                      <div style={{fontSize:"12.5px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:currentTrack?.url===track.url?"#e2ddd9":"#c8c4c0"}}>{track.title}</div>
                      {cleanArtist(track.artist) && <div style={{fontSize:"11px",color:"#5c5755",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:"1px"}}>{cleanArtist(track.artist)}</div>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0,marginRight:'14px'}}>
                      <span className="v-queue-duration" style={{fontSize:'11px',color:'#5c5755',fontVariantNumeric:'tabular-nums'}}>
                        {track.duration || '0:00'}
                      </span>
                      <div className="v-queue-actions" style={{alignItems:'center',gap:'4px'}}>
                        <button 
                          onClick={e => { e.stopPropagation(); removeFromQueueByIndex(i); }} 
                          title="Remove from queue"
                          style={{padding:"4px",border:"none",background:"none",cursor:"pointer",color:"#5c5755",borderRadius:"4px",display:"flex",transition:"color .12s"}}
                          onMouseEnter={e => { e.currentTarget.style.color = "#b05555"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#5c5755"; }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {contextualTracks.length > 0 && (
              <>
                <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#5c5755',padding:'20px 16px 8px'}}>
                  Next from {getContextSourceLabel()}
                </div>
                {contextualTracks.map((track: Track, i: number) => (
                  <div key={`${track.url}-${i}`}
                    className="v-queue-item" style={{position:'relative', paddingLeft: '16px'}}
                    onContextMenu={e => openCtx(e, { type: 'track', track })}>
                    
                    <div className="v-queue-cover-container" style={{position:'relative',width:'36px',height:'36px',borderRadius:'6px',overflow:'hidden',flexShrink:0,cursor:'pointer'}}
                      onClick={() => {
                        if (playlistContextRef.current) {
                          handlePlayInContext(track, playlistContextRef.current.tracks);
                        }
                      }}>
                      <div style={{
                        width:"100%",height:"100%",border:"1px solid rgba(255,255,255,0.05)",
                        position: "relative",
                        background: getTrackGradient(track.title, track.artist),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <Music size={12} style={{position: 'absolute', color: 'rgba(255,255,255,0.25)'}} />
                        {track.cover && <img src={track.cover} style={{position: 'absolute', inset: 0, width:"100%",height:"100%",objectFit:"cover"}} onError={e => { e.currentTarget.style.display = 'none'; }} alt=""/>}
                      </div>
                      <div className="v-queue-play-overlay" style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',color:'#ffffff'}}>
                        <Play size={12} fill="currentColor" />
                      </div>
                    </div>
                    
                    <div style={{flex:1,minWidth:0,cursor:"pointer",marginLeft:'10px'}} onClick={() => {
                      if (playlistContextRef.current) {
                        handlePlayInContext(track, playlistContextRef.current.tracks);
                      }
                    }}>
                      <div style={{fontSize:"12.5px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#c8c4c0"}}>{track.title}</div>
                      {cleanArtist(track.artist) && <div style={{fontSize:"11px",color:"#5c5755",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:"1px"}}>{cleanArtist(track.artist)}</div>}
                    </div>

                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0,marginRight:'14px'}}>
                      <span className="v-queue-duration" style={{fontSize:'11px',color:'#5c5755',fontVariantNumeric:'tabular-nums'}}>
                        {track.duration || '0:00'}
                      </span>
                      <div className="v-queue-actions" style={{alignItems:'center',gap:'4px'}}>
                        <button 
                          onClick={e => { e.stopPropagation(); setQueue(prev => [...prev, track]); showToast('Added to queue'); }} 
                          title="Add to queue"
                          style={{padding:"4px",border:"none",background:"none",cursor:"pointer",color:"#5c5755",borderRadius:"4px",display:"flex",transition:"color .12s"}}
                          onMouseEnter={e => { e.currentTarget.style.color = "#e2ddd9"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#5c5755"; }}
                        >
                          <ListPlus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};
