import React from 'react';
import { BarChart2, Clock, Play, ListMusic, Music } from 'lucide-react';
import { Track, Playlist, ListeningEvent } from '../../types';
import { GENRES } from '../../constants';
import { cleanArtist, getTrackGradient, saveLS } from '../../utils';

type StatsPanelProps = {
  listenSecs: { [url: string]: number };
  setListenSecs: React.Dispatch<React.SetStateAction<{ [url: string]: number }>>;
  playCounts: { [url: string]: number };
  setPlayCounts: React.Dispatch<React.SetStateAction<{ [url: string]: number }>>;
  quickPicks: Track[];
  playHistory: Track[];
  setPlayHistory: React.Dispatch<React.SetStateAction<Track[]>>;
  playlists: Playlist[];
  statsTimeRange: 'all' | '7days';
  setStatsTimeRange: (range: 'all' | '7days') => void;
  listeningHistory: ListeningEvent[];
  setListeningHistory: React.Dispatch<React.SetStateAction<ListeningEvent[]>>;
  dailyPlays: { [date: string]: number };
  setDailyPlays: React.Dispatch<React.SetStateAction<{ [date: string]: number }>>;
  setFirstSeen: React.Dispatch<React.SetStateAction<{ [url: string]: string }>>;
  artistThumbs: { [artist: string]: string };
  setSearchQuery: (q: string) => void;
  searchMusic: (q: string) => void;
  setActiveNav: (nav: string) => void;
  setConfirmModal: (modal: { message: string; onConfirm: () => void } | null) => void;
  showToast: (msg: string) => void;
  handlePlayInContext: (t: Track, list: Track[]) => void;
};

export function StatsPanel({
  listenSecs, setListenSecs,
  playCounts, setPlayCounts,
  quickPicks,
  playHistory, setPlayHistory,
  playlists,
  statsTimeRange, setStatsTimeRange,
  listeningHistory, setListeningHistory,
  dailyPlays, setDailyPlays,
  setFirstSeen,
  artistThumbs,
  setSearchQuery, searchMusic, setActiveNav,
  setConfirmModal,
  showToast,
  handlePlayInContext,
}: StatsPanelProps) {

  const totalSecs = Object.values(listenSecs).reduce((s: number, n) => s + (n as number), 0);
  const totalPlays = Object.values(playCounts).reduce((s: number, n) => s + (n as number), 0);

  const allKnownTracksMap = new Map<string, Track>();
  [...quickPicks, ...playHistory, ...playlists.flatMap(p => p.tracks)].forEach(t => {
    if (t && t.url) allKnownTracksMap.set(t.url, t);
  });

  let currentPlayCounts = playCounts;
  let currentTotalSecs = totalSecs;
  let currentTotalPlays = totalPlays;

  if (statsTimeRange !== 'all') {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 7);
    limitDate.setHours(0, 0, 0, 0);
    const limitMs = limitDate.getTime();

    const rangeCounts: Record<string, number> = {};
    let rangeTotalSecs = 0;
    let rangeTotalPlays = 0;

    listeningHistory.forEach(ev => {
      const evTime = new Date(ev.playedAt).getTime();
      if (evTime >= limitMs) {
        rangeCounts[ev.url] = (rangeCounts[ev.url] || 0) + 1;
        rangeTotalSecs += ev.secs;
        rangeTotalPlays += 1;
      }
    });

    currentPlayCounts = rangeCounts;
    currentTotalSecs = rangeTotalSecs;
    currentTotalPlays = rangeTotalPlays;
  }

  const hrs = Math.floor(currentTotalSecs / 3600);
  const mins = Math.floor((currentTotalSecs % 3600) / 60);

  const topTracks: { track: Track; count: number }[] = Object.entries(currentPlayCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
    .reduce((acc: { track: Track; count: number }[], [url, count]) => {
      const track = allKnownTracksMap.get(url);
      if (track) acc.push({ track, count: count as number });
      return acc;
    }, []);

  const artistCounts: Record<string, number> = {};
  Object.entries(currentPlayCounts).forEach(([url, count]) => {
    const artist = allKnownTracksMap.get(url)?.artist;
    if (artist && artist.trim()) {
      artistCounts[artist] = (artistCounts[artist] || 0) + (count as number);
    }
  });
  const topArtists: [string, number][] = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  const genreCounts: Record<string, number> = {};
  GENRES.forEach(g => { genreCounts[g.id] = 0; });
  allKnownTracksMap.forEach(track => {
    const text = (track.title + ' ' + track.artist).toLowerCase();
    const playCount = currentPlayCounts[track.url] || 0;
    if (playCount > 0) {
      GENRES.forEach(g => {
        if (g.keywords.some(kw => text.includes(kw))) {
          genreCounts[g.id] += playCount;
        }
      });
    }
  });
  const topGenres = GENRES
    .map(g => ({ label: g.label, score: genreCounts[g.id] }))
    .filter(g => g.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const chartDaysCount = statsTimeRange === '7days' ? 7 : 30;
  const now = new Date();
  const days = Array.from({ length: chartDaysCount }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() - (chartDaysCount - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      label: chartDaysCount === 7
        ? d.toLocaleDateString('en', { weekday: 'short' })
        : d.getDate().toString(),
      count: (dailyPlays[key] as number) || 0
    };
  });
  const maxDay = Math.max(...days.map(d => d.count), 1);

  const resetStats = () => {
    setConfirmModal({
      message: 'Reset all stats? This will clear play counts, listen time, history, and daily plays. Cannot be undone.',
      onConfirm: () => {
        setPlayCounts({}); saveLS('vg_playCounts', {});
        setListenSecs({}); saveLS('vg_listenSecs', {});
        setDailyPlays({}); saveLS('vg_dailyPlays', {});
        setFirstSeen({}); saveLS('vg_firstSeen', {});
        setPlayHistory([]); saveLS('vg_playHistory', []);
        setListeningHistory([]); saveLS('vg_listeningHistory', []);
        showToast('Stats reset');
      }
    });
  };

  const hourCounts = Array(24).fill(0);
  const targetHistory = statsTimeRange === 'all' ? listeningHistory : listeningHistory.filter(ev => {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 7);
    limitDate.setHours(0, 0, 0, 0);
    return new Date(ev.playedAt).getTime() >= limitDate.getTime();
  });
  targetHistory.forEach(ev => {
    const hr = new Date(ev.playedAt).getHours();
    hourCounts[hr]++;
  });
  const maxHour = hourCounts.reduce((maxIdx, val, idx, arr) => val > arr[maxIdx] ? idx : maxIdx, 0);
  let timeOfDay = 'Night';
  if (maxHour >= 5 && maxHour < 12) timeOfDay = 'Morning';
  else if (maxHour >= 12 && maxHour < 17) timeOfDay = 'Afternoon';
  else if (maxHour >= 17 && maxHour < 22) timeOfDay = 'Evening';

  const uniqueArtists = new Set(targetHistory.map(ev => allKnownTracksMap.get(ev.url)?.artist).filter(Boolean));
  const loyaltyIndex = targetHistory.length > 0 ? (targetHistory.length / new Set(targetHistory.map(ev => ev.url)).size).toFixed(1) : '0';

  const hasAnyStats = totalPlays > 0 || totalSecs > 0 || Object.keys(dailyPlays).some(k => (dailyPlays[k] as number) > 0);
  if (!hasAnyStats) {
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"12px"}}>
        <BarChart2 size={36} style={{color:"#363230"}} strokeWidth={1}/>
        <p style={{fontSize:"12px",color:"#5c5755"}}>Play something to start tracking stats</p>
      </div>
    );
  }

  const icons = {
    'Time Listened': <Clock size={16} style={{color: 'rgba(255,255,255,0.2)'}} />,
    'Tracks Played': <Play size={16} style={{color: 'rgba(255,255,255,0.2)'}} />,
    'Unique Tracks': <ListMusic size={16} style={{color: 'rgba(255,255,255,0.2)'}} />
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"24px 30px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"18px"}}>
        <h1 style={{fontSize:"18px",fontWeight:800,color:"#e2ddd9",margin:0}}>Stats</h1>
        <button onClick={resetStats}
          style={{fontSize:"11px",color:"#363230",cursor:"pointer",padding:"5px 10px",borderRadius:"7px",border:"1px solid var(--v-bdr2)",background:"transparent",transition:"color .12s,border-color .12s"}}
          onMouseEnter={e=>{e.currentTarget.style.color="#b05555";e.currentTarget.style.borderColor="rgba(180,40,40,0.3)"}}
          onMouseLeave={e=>{e.currentTarget.style.color="#363230";e.currentTarget.style.borderColor="var(--v-bdr2)"}}>
          Reset
        </button>
      </div>

      <div style={{display:"flex",gap:"8px",marginBottom:"20px"}}>
        {(['all', '7days'] as const).map(range => {
          const label = range === 'all' ? 'All Time' : 'Last 7 Days';
          const active = statsTimeRange === range;
          return (
            <button key={range} onClick={() => setStatsTimeRange(range)}
              style={{
                padding: "6px 12px",
                borderRadius: "7px",
                border: active ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                color: active ? "#e2ddd9" : "#5c5755",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .12s"
              }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.color = "#9e9894"; }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.color = "#5c5755"; }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'28px'}}>
        {([
          { label: 'Time Listened', value: hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`, sub: statsTimeRange === 'all' ? 'total' : 'in range' },
          { label: 'Tracks Played', value: currentTotalPlays.toLocaleString(), sub: statsTimeRange === 'all' ? 'total' : 'in range' },
          { label: 'Unique Tracks', value: Object.keys(currentPlayCounts).length.toLocaleString(), sub: statsTimeRange === 'all' ? 'total' : 'in range' },
        ] as { label: string; value: string; sub: string }[]).map(({ label, value, sub }) => (
          <div key={label} className="v-stat-card" style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'rgba(var(--v-bg2-rgb), 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.05)',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div className="v-stat-card__label">{label}</div>
              {icons[label as keyof typeof icons]}
            </div>
            <div className="v-stat-card__value" style={{marginTop: '4px'}}>{value}</div>
            <div className="v-stat-card__sub">{sub}</div>
          </div>
        ))}
      </div>

      <div style={{marginBottom:"20px"}}>
        <div className="v-section-head">
          <h2>{chartDaysCount === 7 ? 'Last 7 Days' : 'Last 30 Days'}</h2>
          <span style={{fontSize:"11px",color:"#363230",marginLeft:"auto"}}>{days.reduce((s,d)=>s+d.count,0)} plays</span>
        </div>
        <div style={{background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)",borderRadius:"12px",padding:"16px 16px 24px 16px"}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:chartDaysCount === 30 ? "4px" : "8px",height:"130px"}}>
            {days.map(({ label, count }, di) => {
              const isToday = di === days.length - 1;
              const barH = count === 0 ? 6 : Math.max(8, Math.round((count / maxDay) * 110));
              return (
                <div key={label}
                  style={{
                    flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:"4px",height:"100%",
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => {
                    const tooltip = e.currentTarget.querySelector<HTMLElement>('.bar-tooltip');
                    if (tooltip) { tooltip.style.opacity = '1'; tooltip.style.transform = 'translateY(-4px)'; }
                    const bar = e.currentTarget.querySelector<HTMLElement>('.chart-bar');
                    if (bar) bar.style.filter = 'brightness(1.2)';
                  }}
                  onMouseLeave={e => {
                    const tooltip = e.currentTarget.querySelector<HTMLElement>('.bar-tooltip');
                    if (tooltip) { tooltip.style.opacity = '0'; tooltip.style.transform = 'none'; }
                    const bar = e.currentTarget.querySelector<HTMLElement>('.chart-bar');
                    if (bar) bar.style.filter = 'none';
                  }}
                >
                  <span className="bar-tooltip" style={{
                    position: 'absolute',
                    bottom: `${barH + 24}px`,
                    fontSize: "11px",
                    fontWeight: 700,
                    background: 'var(--v-bdr2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: '#e2ddd9',
                    opacity: 0,
                    pointerEvents: 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 10
                  }}>
                    {count} play{count !== 1 ? 's' : ''}
                  </span>
                  <div className="chart-bar" style={{
                      width:'100%',height:`${barH}px`,borderRadius:'6px 6px 0 0',
                      background:count===0?'rgba(255,255,255,0.04)':isToday?'linear-gradient(180deg,rgba(226,221,217,0.9),rgba(226,221,217,0.4))':'rgba(226,221,217,0.22)',
                      transition:'height .5s cubic-bezier(0.2,0,0,1), filter .15s ease',
                    }} />
                  <span style={{fontSize:chartDaysCount === 30 ? "8.5px" : "10px",fontWeight:600,color:isToday?"#9e9894":"#363230"}}>{label}</span>
                  {isToday && chartDaysCount === 7 && <span style={{position:'absolute',bottom:'-14px',fontSize:'8px',color:'rgba(226,221,217,0.4)',fontWeight:700,whiteSpace:'nowrap'}}>TODAY</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)",borderRadius:"12px",padding:"16px",
        display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px",marginBottom:"20px"
      }}>
        <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
          <span style={{fontSize:"10px",color:"#363230",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase"}}>Favorite Time</span>
          <span style={{fontSize:"14px",fontWeight:800,color:"#e2ddd9"}}>{timeOfDay}</span>
          <span style={{fontSize:"11px",color:"#5c5755"}}>Peak listening hour: {maxHour}:00</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
          <span style={{fontSize:"10px",color:"#363230",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase"}}>Unique Artists</span>
          <span style={{fontSize:"14px",fontWeight:800,color:"#e2ddd9"}}>{uniqueArtists.size}</span>
          <span style={{fontSize:"11px",color:"#5c5755"}}>{statsTimeRange === 'all' ? 'Explored in history' : 'Explored in range'}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
          <span style={{fontSize:"10px",color:"#363230",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase"}}>Loyalty Index</span>
          <span style={{fontSize:"14px",fontWeight:800,color:"#e2ddd9"}}>{loyaltyIndex}×</span>
          <span style={{fontSize:"11px",color:"#5c5755"}}>{statsTimeRange === 'all' ? 'Avg plays per track' : 'Avg plays per track in range'}</span>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:topGenres.length > 0 ? "1fr 1fr 1fr" : "1fr 1fr",gap:"16px"}}>
        {topTracks.length > 0 && (
          <div>
            <div className="v-section-head">
              <h2>Top Tracks</h2>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
              {topTracks.map(({ track, count }, i) => (
                <div key={track.url}
                  onClick={() => handlePlayInContext(track, topTracks.map(x => x.track))}
                  className="v-track">
                  <div className="v-track__num">{i+1}</div>
                  <div className="v-track__art" style={{
                    position: 'relative',
                    background: getTrackGradient(track.title, track.artist),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Music size={16} style={{position: 'absolute', color: 'rgba(255,255,255,0.25)'}} />
                    {track.cover && <img src={track.cover} alt="" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} onError={e => { e.currentTarget.style.display = 'none'; }} loading="lazy"/>}
                  </div>
                  <div className="v-track__info">
                    <div className="v-track__title">{track.title}</div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'3px'}}>
                      <div style={{flex:1,height:'2px',background:'#232020',borderRadius:'1px',overflow:'hidden'}}>
                        <div style={{height:'100%',background:'rgba(226,221,217,0.35)',borderRadius:'1px',width:`${(count/(topTracks[0]?.count||1))*100}%`}}/>
                      </div>
                      <span style={{fontSize:'10px',color:'#363230',fontVariantNumeric:'tabular-nums',flexShrink:0}}>{count}×</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topArtists.length > 0 && (
          <div>
            <div className="v-section-head">
              <h2>Top Artists</h2>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
              {topArtists.map(([artist, count], i) => {
                const thumb = artistThumbs[artist];
                return (
                  <div key={artist} className="v-track"
                    onClick={() => { setSearchQuery(artist); searchMusic(artist); setActiveNav('home'); }}>
                    <div className="v-track__num">{i+1}</div>
                    <div style={{width:"36px",height:"36px",borderRadius:"50%",background:"var(--v-bdr2)",border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                      {thumb ? <img src={thumb} alt={artist} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:"11px",fontWeight:700,color:"#5c5755"}}>{artist.slice(0,2).toUpperCase()}</span>}
                    </div>
                    <div className="v-track__info">
                      <div className="v-track__title">{artist}</div>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"3px"}}>
                        <div style={{flex:1,height:"2px",background:"#232020",borderRadius:"1px",overflow:"hidden"}}>
                          <div style={{height:"100%",background:"rgba(226,221,217,0.3)",borderRadius:"1px",width:`${(count/(topArtists[0]?.[1]||1))*100}%`}}/>
                        </div>
                        <span style={{fontSize:"10px",color:"#363230",fontVariantNumeric:"tabular-nums",flexShrink:0}}>{count}×</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {topGenres.length > 0 && (
          <div>
            <div className="v-section-head">
              <h2>Top Genres</h2>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
              {topGenres.map(({ label, score }, i) => (
                <div key={label} className="v-track" style={{cursor:"pointer"}}
                  onClick={() => { setSearchQuery(label); searchMusic(label); setActiveNav('home'); }}>
                  <div className="v-track__num">{i+1}</div>
                  <div className="v-track__info" style={{paddingLeft:"4px"}}>
                    <div className="v-track__title">{label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"3px"}}>
                      <div style={{flex:1,height:"2px",background:"#232020",borderRadius:"1px",overflow:"hidden"}}>
                        <div style={{height:"100%",background:"rgba(226,221,217,0.3)",borderRadius:"1px",width:`${(score/(topGenres[0]?.score||1))*100}%`}}/>
                      </div>
                      <span style={{fontSize:"10px",color:"#363230",fontVariantNumeric:"tabular-nums",flexShrink:0}}>{score} plays</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {playHistory.length > 0 && (
        <div style={{marginTop:"16px"}}>
          <div className="v-section-head">
            <h2>Recent Plays</h2>
            <button onClick={() => { setPlayHistory([]); saveLS('vg_playHistory', []); }}
              style={{marginLeft:"auto",fontSize:"11px",color:"#363230",background:"none",border:"none",cursor:"pointer",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#9e9894")} onMouseLeave={e=>(e.currentTarget.style.color="#363230")}>Clear</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
            {playHistory.slice(0, 8).map((track: Track, i: number) => (
              <div key={track.url + i}
                onClick={() => handlePlayInContext(track, playHistory.slice(0, 8))}
                className="v-track">
                <div className="v-track__art" style={{
                  position: 'relative',
                  background: getTrackGradient(track.title, track.artist),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Music size={16} style={{position: 'absolute', color: 'rgba(255,255,255,0.25)'}} />
                  {track.cover && <img src={track.cover} alt="" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} onError={e => { e.currentTarget.style.display = 'none'; }} loading="lazy"/>}
                </div>
                <div className="v-track__info">
                  <div className="v-track__title">{track.title}</div>
                  {cleanArtist(track.artist) && <div className="v-track__artist">{cleanArtist(track.artist)}</div>}
                </div>
                <Play size={12} style={{color:'#363230',flexShrink:0}}/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
