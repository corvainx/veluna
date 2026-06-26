import React from 'react';
import { Play, Music, Heart, Download, X, MoreVertical } from 'lucide-react';
import { Track } from '../types';
import { cleanArtist, getTrackGradient } from '../utils';

export type TrackRowProps = {
  track: Track;
  index: number;
  showRemove?: boolean;
  onRemove?: () => void;
  isActive: boolean;
  isHovered: boolean;
  isLoadingTrack: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  isDownloading: number;
  onPlay: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onLike: () => void;
  onDownload: () => void;
  onCtx: (e: React.MouseEvent) => void;
};

export const TrackRow = React.memo(({
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
    <div className="v-track__art" style={{
      position: 'relative',
      background: getTrackGradient(track.title, track.artist),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Music size={16} style={{position: 'absolute', color: 'rgba(255,255,255,0.25)'}} />
      {track.cover && <img src={track.cover} alt={track.title} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} onError={e => { e.currentTarget.style.display = 'none'; }} loading="lazy" />}
    </div>
    <div className="v-track__info">
      <div className="v-track__title">{track.title}</div>
      {cleanArtist(track.artist) && <div className="v-track__artist">{cleanArtist(track.artist)}</div>}
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

export const TrackRowSkeleton = ({ index }: { index: number }) => (
  <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'8px 12px',animation:`fadeUpSm 0.18s cubic-bezier(0.2,0,0,1) ${index*40}ms both`}}>
    <div style={{width:'26px',height:'12px',background:'var(--v-bdr2)',borderRadius:'4px',flexShrink:0}} className="animate-pulse"/>
    <div style={{width:'42px',height:'42px',borderRadius:'8px',background:'var(--v-bdr2)',flexShrink:0}} className="animate-pulse"/>
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:'6px'}}>
      <div style={{height:'11px',background:'var(--v-bdr2)',borderRadius:'3px',width:`${55+(index*13)%35}%`}} className="animate-pulse"/>
      <div style={{height:'9px',background:'var(--v-bdr2)',borderRadius:'3px',width:`${30+(index*7)%25}%`}} className="animate-pulse"/>
    </div>
  </div>
);
