import React, { useState, useRef } from 'react';
import { ChevronLeft, Heart, ListMusic, ImagePlus, Play, Pencil, Trash2, Music, Search, X } from 'lucide-react';
import { Track, Playlist } from '../../types';
import { getPlaylistCover } from '../../utils';
import { TrackRow } from '../ui/TrackRow';

type PlaylistDetailPanelProps = {
  openPlaylist: Playlist;
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
  downloadingTracks: Record<string, number>;
  handleDownload: (t: Track) => void;
  hoveredTrackUrl: string | null;
  setHoveredTrackUrl: (url: string | null) => void;
  prefetchOnHover: (url: string) => void;
  handlePlayInContext: (t: Track, list: Track[]) => void;
  openCtx: (e: React.MouseEvent, target: any) => void;
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
};

export const PlaylistDetailPanel = ({
  openPlaylist,
  setOpenPlaylistId,
  playlistSearchQ,
  setPlaylistSearchQ,
  handleCoverUpload,
  playAll,
  setRenamingPlaylist,
  setRenameVal,
  setRenameDescVal,
  deletePlaylist,
  removeFromPlaylist,
  currentTrack,
  isLoadingTrack,
  isPlaying,
  isTrackLiked,
  toggleLikeTrack,
  downloadingTracks,
  handleDownload,
  hoveredTrackUrl,
  setHoveredTrackUrl,
  prefetchOnHover,
  handlePlayInContext,
  openCtx,
  setPlaylists,
}: PlaylistDetailPanelProps) => {
  const dragPlaylistIdx = useRef<number | null>(null);
  const dragOverPlaylistIdxRef = useRef<number | null>(null);
  const [dragOverPlaylistIdx, setDragOverPlaylistIdx] = useState<number | null>(null);

  const q = playlistSearchQ.trim().toLowerCase();
  const filteredTracks = q
    ? openPlaylist.tracks.filter(t => {
        const title = (t.title || '').toLowerCase();
        const artist = (t.artist || '').toLowerCase();
        return title.includes(q) || artist.includes(q);
      })
    : openPlaylist.tracks;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"24px 30px",zIndex:10,position:"relative"}}>
      {getPlaylistCover(openPlaylist) ? (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "360px",
          backgroundImage: `url(${getPlaylistCover(openPlaylist)})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(60px) opacity(0.2)",
          pointerEvents: "none",
          zIndex: 0
        }} />
      ) : (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "360px",
          background: openPlaylist.id === "p1"
            ? "linear-gradient(180deg, rgba(224,85,85,0.08) 0%, rgba(0,0,0,0) 100%)"
            : "linear-gradient(180deg, rgba(226,221,217,0.05) 0%, rgba(0,0,0,0) 100%)",
          pointerEvents: "none",
          zIndex: 0
        }} />
      )}
      <button onClick={() => { setOpenPlaylistId(null); setPlaylistSearchQ(''); }}
        style={{
          position: "relative",
          zIndex: 1,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          width:"36px",
          height:"36px",
          borderRadius:"50%",
          color:"#9e9894",
          background:"rgba(255,255,255,0.03)",
          border:"1px solid rgba(255,255,255,0.05)",
          cursor:"pointer",
          marginBottom:"24px",
          padding:0,
          transition:"all .2s cubic-bezier(0.2,0,0,1)"
        }}
        onMouseEnter={e=>{
          e.currentTarget.style.color="#e2ddd9";
          e.currentTarget.style.background="rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";
          e.currentTarget.style.transform="scale(1.05)";
        }}
        onMouseLeave={e=>{
          e.currentTarget.style.color="#9e9894";
          e.currentTarget.style.background="rgba(255,255,255,0.03)";
          e.currentTarget.style.borderColor="rgba(255,255,255,0.05)";
          e.currentTarget.style.transform="scale(1)";
        }}>
        <ChevronLeft size={20} style={{flexShrink:0}}/>
      </button>
      <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"flex-end",gap:"24px",marginBottom:"28px"}}>
        <div style={{
          width:"140px",
          height:"140px",
          borderRadius:"16px",
          background:openPlaylist.id==="p1"?"linear-gradient(135deg,rgba(224,85,85,0.15) 0%,rgba(224,85,85,0.02) 100%)":"rgba(255,255,255,0.02)",
          border:"1px solid rgba(255,255,255,0.06)",
          boxShadow:"0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          flexShrink:0,
          position:"relative",
          overflow:"hidden",
          cursor:openPlaylist.id!=="p1"?"pointer":"default",
          transition:"transform 0.3s cubic-bezier(0.2,0,0,1)"
        }}
          onClick={()=>openPlaylist.id!=='p1'&&handleCoverUpload(openPlaylist.id)}
          onMouseEnter={e=>{
            e.currentTarget.style.transform="scale(1.03)";
            const ov=e.currentTarget.querySelector('.pl-cover-ov') as HTMLElement;
            if(ov)ov.style.opacity='1';
          }}
          onMouseLeave={e=>{
            e.currentTarget.style.transform="scale(1)";
            const ov=e.currentTarget.querySelector('.pl-cover-ov') as HTMLElement;
            if(ov)ov.style.opacity='0';
          }}>
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {openPlaylist.id==='p1'?<Heart size={56} style={{color:'#e05555',fill:'rgba(224,85,85,0.15)'}}/>:<ListMusic size={56} style={{color:'rgba(255,255,255,0.12)'}}/>}
          </div>
          {getPlaylistCover(openPlaylist) && (
            <img src={getPlaylistCover(openPlaylist)!} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.currentTarget.style.display='none';}} alt=""/>
          )}
          {openPlaylist.id !== 'p1' && <div className="pl-cover-ov" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",opacity:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"opacity .15s",zIndex:5}}><ImagePlus size={24} style={{color:"#e2ddd9"}}/></div>}
        </div>
        <div style={{flex:1,minWidth:0,paddingBottom:"4px"}}>
          <span style={{
            fontSize:"10.5px",
            fontWeight:700,
            letterSpacing:".18em",
            textTransform:"uppercase",
            color:openPlaylist.id==='p1'?'#ff5e5e':'#8a807c',
            display:"block",
            marginBottom:"6px"
          }}>
            Playlist
          </span>
          <h2 style={{
            fontSize:"32px",
            fontWeight:900,
            color:"#e2ddd9",
            overflow:"hidden",
            textOverflow:"ellipsis",
            whiteSpace:"nowrap",
            margin:0,
            letterSpacing:"-0.02em"
          }}>
            {openPlaylist.name}
          </h2>
          {openPlaylist.description && openPlaylist.description.trim() && (
            <p style={{
              fontSize:"13px",
              color:"#8a807c",
              marginTop:"6px",
              marginBottom:0,
              lineHeight:"1.4",
              maxWidth:"600px",
              overflowWrap:"anywhere"
            }}>
              {openPlaylist.description}
            </p>
          )}
          <div style={{
            display:"flex",
            alignItems:"center",
            gap:"6px",
            fontSize:"12px",
            color:"#5c5755",
            marginTop:"8px"
          }}>
            <span style={{fontWeight:600,color:"#8a807c"}}>{openPlaylist.tracks.length} {openPlaylist.tracks.length===1?'song':'songs'}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginTop:"18px"}}>
            <button onClick={()=>playAll(openPlaylist.tracks)} disabled={!openPlaylist.tracks.length}
              style={{
                display:"flex",
                alignItems:"center",
                gap:"8px",
                padding:"9px 20px",
                background:"linear-gradient(135deg,#e2ddd9 0%,#c8beba 100%)",
                color:"var(--v-bg0)",
                fontWeight:800,
                borderRadius:"10px",
                border:"none",
                cursor:"pointer",
                fontSize:"13px",
                opacity:openPlaylist.tracks.length?1:0.4,
                boxShadow:"0 4px 15px rgba(226,221,217,0.15)",
                transition:"all 0.2s cubic-bezier(0.2,0,0,1)"
              }}
              onMouseEnter={e=>{
                if(openPlaylist.tracks.length){
                  e.currentTarget.style.transform="translateY(-1px)";
                  e.currentTarget.style.boxShadow="0 6px 20px rgba(226,221,217,0.25)";
                }
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.transform="translateY(0)";
                e.currentTarget.style.boxShadow="0 4px 15px rgba(226,221,217,0.15)";
              }}>
              <Play size={16} fill="currentColor"/> Play All
            </button>
            <button onClick={()=>{setRenamingPlaylist(openPlaylist);setRenameVal(openPlaylist.name);setRenameDescVal(openPlaylist.description);}}
              style={{
                display:"flex",
                alignItems:"center",
                gap:"6px",
                padding:"9px 14px",
                color:"#e2ddd9",
                borderRadius:"10px",
                background:"rgba(255,255,255,0.03)",
                border:"1px solid rgba(255,255,255,0.06)",
                fontSize:"13px",
                fontWeight:600,
                cursor:"pointer",
                transition:"all .2s cubic-bezier(0.2,0,0,1)"
              }}
              onMouseEnter={e=>{
                e.currentTarget.style.background="rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";
                e.currentTarget.style.transform="translateY(-1px)";
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.background="rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";
                e.currentTarget.style.transform="translateY(0)";
              }}>
              <Pencil size={14}/> Edit
            </button>
            {openPlaylist.id !== 'p1' && (
              <button onClick={()=>{deletePlaylist(openPlaylist.id);setOpenPlaylistId(null);}}
                style={{
                  display:"flex",
                  alignItems:"center",
                  gap:"6px",
                  padding:"9px 14px",
                  color:"#ff7070",
                  borderRadius:"10px",
                  background:"rgba(220,60,60,0.02)",
                  border:"1px solid rgba(220,60,60,0.08)",
                  fontSize:"13px",
                  fontWeight:600,
                  cursor:"pointer",
                  transition:"all .2s cubic-bezier(0.2,0,0,1)"
                }}
                onMouseEnter={e=>{
                  e.currentTarget.style.background="rgba(220, 60, 60, 0.15)";
                  e.currentTarget.style.borderColor="rgba(220, 60, 60, 0.3)";
                  e.currentTarget.style.transform="translateY(-1px)";
                }}
                onMouseLeave={e=>{
                  e.currentTarget.style.background="rgba(220,60,60,0.02)";
                  e.currentTarget.style.borderColor="rgba(220,60,60,0.08)";
                  e.currentTarget.style.transform="translateY(0)";
                }}>
                <Trash2 size={14}/> Delete
              </button>
            )}
          </div>
        </div>
      </div>
      {openPlaylist.tracks.length === 0 ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"140px",color:"#363230",gap:"10px",position:"relative",zIndex:1}}>
          <Music size={28} strokeWidth={1}/>
          <p style={{fontSize:"13px"}}>No tracks yet.</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"4px",position:"relative",zIndex:1}}>
          <div style={{position:"relative",marginBottom:"18px"}}>
            <Search size={15} style={{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",color:"#5c5755",pointerEvents:"none"}} />
            <input
              type="text"
              value={playlistSearchQ}
              onChange={e => setPlaylistSearchQ(e.target.value)}
              placeholder="Search in playlist..."
              style={{
                width:"100%",
                background:"rgba(255,255,255,0.02)",
                border:"1px solid rgba(255,255,255,0.05)",
                borderRadius:"21px",
                padding:"10px 38px",
                fontSize:"14px",
                color:"#e2ddd9",
                outline:"none",
                boxSizing:"border-box",
                transition:"all 0.2s cubic-bezier(0.2,0,0,1)"
              }}
              onFocus={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.1)";
              }}
              onBlur={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {playlistSearchQ && (
              <button onClick={() => setPlaylistSearchQ('')} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#5c5755",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                <X size={15} />
              </button>
            )}
          </div>
          <div style={{
            display:"flex",
            alignItems:"center",
            padding:"8px 12px",
            color:"#5c5755",
            fontSize:"11px",
            fontWeight:700,
            letterSpacing:"0.1em",
            textTransform:"uppercase",
            borderBottom:"1px solid rgba(255,255,255,0.03)",
            marginBottom:"6px"
          }}>
            {!playlistSearchQ && <div style={{ width: "22px", flexShrink: 0 }} />}
            <div style={{ width: "30px", flexShrink: 0, textAlign: "center" }}>#</div>
            <div style={{ width: "50px", flexShrink: 0, marginLeft: "14px" }} />
            <div style={{ flex: 1, minWidth: 0, paddingLeft: "14px" }}>Title</div>
            <div style={{ width: "150px", textAlign: "right", paddingRight: "12px" }}>Duration</div>
          </div>
          {filteredTracks.length === 0 ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"110px",color:"#363230",gap:"7px"}}>
              <Search size={24} strokeWidth={1} />
              <p style={{fontSize:"13px",color:"#5c5755"}}>No results for "{playlistSearchQ}"</p>
            </div>
          ) : (
            filteredTracks.map((t, i) => {
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
                      onHoverEnter={() => { setHoveredTrackUrl(t.url); prefetchOnHover(t.url); }} onHoverLeave={() => setHoveredTrackUrl(null)}
                      onLike={() => toggleLikeTrack(t)} onDownload={() => handleDownload(t)}
                      onCtx={e => openCtx(e, { type: 'track', track: t })} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
