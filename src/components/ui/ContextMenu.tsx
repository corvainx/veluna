import React from 'react';
import {
  Play, PlaySquare, ListPlus, Heart, PlusCircle, X, Info, Share2,
  Download, Pencil, ExternalLink, Shuffle, Copy, ImagePlus, FileOutput,
  Trash2, ListMusic, Music
} from 'lucide-react';
import { Track, Playlist, CtxMenu } from '../../types';
import { cleanArtist, getTrackGradient } from '../../utils';

type ContextMenuProps = {
  ctxMenu: CtxMenu | null;
  setCtxMenu: (menu: CtxMenu | null) => void;
  addToPlaylistTrack: Track | null;
  setAddToPlaylistTrack: (t: Track | null) => void;
  playlists: Playlist[];
  addTrackToPlaylist: (plId: string, track: Track) => void;
  setNewPlaylistName: (v: string) => void;
  setNewPlaylistDesc: (v: string) => void;
  setIsPlaylistModalOpen: (v: boolean) => void;
  handlePlayTrack: (t: Track) => void;
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  showToast: (msg: string) => void;
  toggleLikeTrack: (t: Track) => void;
  isTrackLiked: (url: string) => boolean;
  removeFromQueue: (url: string) => void;
  setInfoModalTrack: (t: Track | null) => void;
  copyToClipboard: (text: string) => void;
  handleDownload: (t: Track) => void;
  downloadingTracks: { [url: string]: number };
  setMetadataEditingTrack: (t: Track | null) => void;
  openInYouTube: (url: string) => void;
  playAll: (ts: Track[]) => void;
  setRenamingPlaylist: (pl: Playlist | null) => void;
  setRenameVal: (v: string) => void;
  setRenameDescVal: (v: string) => void;
  setShowDuplicatesPlaylist: (pl: Playlist | null) => void;
  setBulkEditPlaylist: (pl: Playlist | null) => void;
  handleCoverUpload: (plId: string) => void;
  handleExportPlaylistM3u: (pl: Playlist) => void;
  deletePlaylist: (plId: string) => void;
};

export function ContextMenu({
  ctxMenu, setCtxMenu,
  addToPlaylistTrack, setAddToPlaylistTrack,
  playlists,
  addTrackToPlaylist,
  setNewPlaylistName, setNewPlaylistDesc, setIsPlaylistModalOpen,
  handlePlayTrack, setQueue, showToast, toggleLikeTrack, isTrackLiked,
  removeFromQueue, setInfoModalTrack, copyToClipboard, handleDownload,
  downloadingTracks, setMetadataEditingTrack, openInYouTube,
  playAll, setRenamingPlaylist, setRenameVal, setRenameDescVal,
  setShowDuplicatesPlaylist, setBulkEditPlaylist, handleCoverUpload,
  handleExportPlaylistM3u, deletePlaylist,
}: ContextMenuProps) {

  if (!ctxMenu && !addToPlaylistTrack) return null;

  return (
    <>
      {ctxMenu && (() => {
        const { track, playlist } = ctxMenu;
        if ((ctxMenu.type === 'track' || ctxMenu.type === 'quickpick' || ctxMenu.type === 'queue-track') && track) {
          return (
            <div className="v-ctx" style={{position:'fixed',zIndex:9999,width:'220px',top:ctxMenu.y,left:ctxMenu.x}} onClick={e => e.stopPropagation()}>
              <div className="v-ctx__header">
                <div className="v-ctx__art" style={{
                  position: 'relative',
                  background: getTrackGradient(track.title, track.artist),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Music size={14} style={{ position: 'absolute', color: 'rgba(255,255,255,0.2)' }} />
                  {track.cover && <img src={track.cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#e2ddd9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</div>
                  {cleanArtist(track.artist) && <div style={{fontSize:'11px',color:'#5c5755',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:'2px'}}>{cleanArtist(track.artist)}</div>}
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
              {!track.url.startsWith('local://') && (
                <>
                  <button onClick={() => { setInfoModalTrack(track); setCtxMenu(null); }} className="v-ctx__item"><Info size={14} /> Track Info</button>
                  <button onClick={() => { copyToClipboard(track.url); setCtxMenu(null); }} className="v-ctx__item"><Share2 size={14} /> Copy Link</button>
                </>
              )}
              {!track.url.startsWith('local://') && (
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
              )}
              {track.url.startsWith('local://') && (
                <button onClick={() => { setMetadataEditingTrack(track); setCtxMenu(null); }} className="v-ctx__item"><Pencil size={13} /> Edit Metadata</button>
              )}
              {!track.url.startsWith('local://') && (
                <button onClick={() => { openInYouTube(track.url); setCtxMenu(null); }} className="v-ctx__item"><ExternalLink size={13}/> Open in YouTube</button>
              )}
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

      {addToPlaylistTrack && (
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.9)"}} onClick={()=>setAddToPlaylistTrack(null)}>
          <div className="v-ctx" style={{width:"280px"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderBottom:"1px solid var(--v-bdr2)"}}>
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
                    <div style={{width:"24px",height:"24px",borderRadius:"5px",overflow:"hidden",flexShrink:0,background:"var(--v-bdr2)",border:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {p.id === 'p1' ? <Heart size={12} style={{color:"#e05555",fill:"rgba(220,60,60,0.2)"}}/> : <ListMusic size={13} className="text-neutral-500" />}
                    </div>
                    <span style={{fontSize:"13px",color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{p.name}</span>
                    {alreadyIn?<span style={{fontSize:"9.5px",color:"#9e9894",fontWeight:700,flexShrink:0}}>Added</span>
                      :<span style={{fontSize:"10px",color:"#363230",flexShrink:0}}>{p.tracks.length}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{padding:"4px 0",borderTop:"1px solid var(--v-bdr2)"}}>
              <button onClick={() => { setAddToPlaylistTrack(null); setNewPlaylistName(''); setNewPlaylistDesc(''); setIsPlaylistModalOpen(true); }}
                style={{display:"flex",alignItems:"center",gap:"7px",color:"#9e9894",fontSize:"12px",fontWeight:600,textDecoration:"none"}}>
                <PlusCircle size={14} /> New Playlist
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
