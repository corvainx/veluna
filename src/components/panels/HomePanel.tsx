import React from 'react';
import {
  Music, Search, ChevronLeft, ChevronRight, Heart, ListMusic, Play
} from 'lucide-react';
import { Track, Playlist, LocalTrack } from '../../types';
import { GENRES } from '../../constants';
import { cleanArtist, getTrackGradient } from '../../utils';

type HomePanelProps = {
  isHydrated: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  playlists: Playlist[];
  playCounts: Record<string, number>;
  playHistory: Track[];
  quickPicks: Track[];
  setQuickPicks: React.Dispatch<React.SetStateAction<Track[]>>;
  handlePlayInContext: (track: Track, contextList: Track[]) => void;
  openCtx: (e: React.MouseEvent, menu: any) => void;
  prefetchOnHover: (url: string) => void;
  setOpenPlaylistId: (id: string | null) => void;
  setActiveNav: (nav: string) => void;
  localTracksListRef: React.RefObject<LocalTrack[]>;
};

export const HomePanel = ({
  isHydrated,
  currentTrack,
  isPlaying,
  playlists,
  playCounts,
  playHistory,
  quickPicks,
  setQuickPicks,
  handlePlayInContext,
  openCtx,
  prefetchOnHover,
  setOpenPlaylistId,
  setActiveNav,
  localTracksListRef,
}: HomePanelProps) => {
  const localAsTrack: Track[] = (localTracksListRef.current || []).map((lt, i) => ({
    id: -(i + 1), title: lt.title, artist: lt.artist || '',
    url: `local://${lt.path}`, cover: '', duration: lt.duration || '',
  }));

  const allTracksForGenre = [...new Map([
    ...quickPicks,
    ...playHistory,
    ...localAsTrack,
    ...playlists.flatMap(p => p.tracks),
  ].map(t => [t.url, t])).values()];

  const genreScores: Record<string, { score: number; tracks: Track[] }> = {};
  GENRES.forEach(g => { genreScores[g.id] = { score: 0, tracks: [] }; });

  allTracksForGenre.forEach(track => {
    const text = (track.title + ' ' + track.artist).toLowerCase();
    const playCount = playCounts[track.url] || 1;
    GENRES.forEach(g => {
      if (g.keywords.some(kw => text.includes(kw))) {
        genreScores[g.id].score += playCount;
        if (!genreScores[g.id].tracks.find(t => t.url === track.url)) {
          genreScores[g.id].tracks.push(track);
        }
      }
    });
  });

  GENRES.forEach(g => {
    genreScores[g.id].tracks.sort((a, b) => (playCounts[b.url] || 0) - (playCounts[a.url] || 0));
  });

  const activeGenres = GENRES
    .filter(g => genreScores[g.id].tracks.length >= 2)
    .sort((a, b) => genreScores[b.id].score - genreScores[a.id].score)
    .slice(0, 5);

  const topTracks = Object.entries(playCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([url]) => allTracksForGenre.find(t => t.url === url))
    .filter(Boolean) as Track[];
    
  const recentHistory = playHistory.slice(0, 5);
  const hour = new Date().getHours();
  let greeting = 'Welcome back';
  if (hour < 12) {
    greeting = 'Good Morning';
  } else if (hour < 17) {
    greeting = 'Good Afternoon';
  } else {
    greeting = 'Good Evening';
  }

  const scrollShelf = (e: React.MouseEvent, direction: 'left' | 'right') => {
    const btn = e.currentTarget as HTMLElement;
    const parent = btn.parentElement;
    if (parent) {
      const container = parent.querySelector('.shelf-scroll-container') as HTMLElement;
      if (container) {
        const offset = direction === 'left' ? -360 : 360;
        container.scrollBy({ left: offset, behavior: 'smooth' });
      }
    }
  };

  if (!quickPicks.length && isHydrated) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:"280px",gap:"20px"}}>
        <div className="relative">
          <div style={{width:'56px',height:'56px',borderRadius:'12px',background:'var(--v-bg2)',border:'1px solid var(--v-bdr2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Music size={24} strokeWidth={1} style={{color:'#363230'}} />
          </div>
          <div style={{position:"absolute",bottom:"-6px",right:"-6px",width:"26px",height:"26px",background:"rgba(226,221,217,0.06)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Search size={12} className="text-[#d4cfcf]/60" />
          </div>
        </div>
        <div style={{textAlign:"center",display:"flex",flexDirection:"column",gap:"5px"}}>
          <p style={{fontSize:"13px",fontWeight:600,color:"#5c5755"}}>Search YouTube to start</p>
          <p style={{fontSize:"11px",color:"#363230"}}>Type above and press <kbd>Ctrl+F</kbd></p>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"28px",paddingTop:"4px"}}>
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(226,221,217,0.04) 0%, rgba(226,221,217,0.01) 100%)',
        border: '1px solid rgba(226,221,217,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '110px'
      }}>
        <div
          className="banner-glow"
          style={{
            position: 'absolute',
            top: '-30px',
            left: '-30px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(226,221,217,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />
        <div style={{ zIndex: 1 }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#e2ddd9',
            letterSpacing: '-0.02em',
            margin: 0
          }}>{greeting}</h1>
          <p style={{
            fontSize: '13px',
            color: '#9e9894',
            marginTop: '4px',
            margin: '4px 0 0'
          }}>Ready to discover and play your favorite tracks?</p>
        </div>
        <div style={{
          zIndex: 1,
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5c5755' }}>Library Status</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#e2ddd9', marginTop: '2px' }}>
              {localAsTrack.length + playlists.reduce((acc, p) => acc + p.tracks.length, 0)} Tracks
            </span>
          </div>
        </div>
      </div>

      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#e2ddd9',
            letterSpacing: '-0.01em',
            margin: 0
          }}>Recently Played</h2>
          <button
            onClick={() => setQuickPicks([])}
            style={{
              background: 'transparent',
              color: '#5c5755',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid transparent',
              transition: 'color .12s, border-color .12s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#9e9894';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#5c5755';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.background = 'transparent';
            }}
          >Clear</button>
        </div>
        <div className="v-home-quickpicks-grid">
          {quickPicks.slice(0, 12).map((track, cardIdx) => {
            const isActive = currentTrack?.url === track.url;
            return (
              <div
                key={track.url}
                onClick={() => handlePlayInContext(track, quickPicks.slice(0, 12))}
                onContextMenu={e => openCtx(e, { type: 'quickpick', track })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(226,221,217,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? 'rgba(226,221,217,0.12)' : 'rgba(255,255,255,0.04)'}`,
                  transition: 'background .18s, border-color .18s, transform .18s',
                  animation: `fadeUpSm .18s cubic-bezier(0.2,0,0,1) ${cardIdx * 25}ms both`,
                }}
                onMouseEnter={e => {
                  prefetchOnHover(track.url);
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                  }
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  position: 'relative',
                  background: getTrackGradient(track.title, track.artist),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Music size={14} style={{ position: 'absolute', color: 'rgba(255,255,255,0.2)' }} />
                  {track.cover && (
                    <img
                      src={track.cover}
                      alt={track.title}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                      loading="lazy"
                    />
                  )}
                  {isActive && isPlaying && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '2px',
                        alignItems: 'flex-end',
                        height: '10px'
                      }}>
                        {[100, 65, 80].map((h, i) => (
                          <div
                            key={i}
                            style={{
                              width: '2px',
                              background: '#e2ddd9',
                              borderRadius: '1px',
                              height: `${h}%`,
                              animation: `barBounce ${0.7 + i * 0.12}s ease-in-out ${i * 110}ms infinite`,
                              transformOrigin: 'bottom'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isActive ? '#e2ddd9' : '#c8c4c0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3
                  }}>{track.title}</div>
                  {cleanArtist(track.artist) && (
                    <div style={{
                      fontSize: '11px',
                      color: '#5c5755',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '2px'
                    }}>{cleanArtist(track.artist)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="v-home-split-layout">
        <div className="v-home-main-col">
          {activeGenres.map((genre, gIdx) => {
            const genreTracks = genreScores[genre.id].tracks.slice(0, 10);
            return (
              <div
                key={genre.id}
                className="shelf-group"
                style={{
                  position: 'relative',
                  animation: `fadeUp 0.22s cubic-bezier(0.2,0,0,1) ${gIdx * 60 + 100}ms both`
                }}
              >
                <div className="v-section-head" style={{ marginBottom: '12px' }}>
                  <h2 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#e2ddd9',
                    letterSpacing: '-0.01em',
                    margin: 0
                  }}>{genre.label}</h2>
                  <span style={{
                    fontSize: '10px',
                    color: '#5c5755',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.04)'
                  }}>{genreTracks.length}</span>
                </div>
                <button
                  onClick={(e) => scrollShelf(e, 'left')}
                  className="shelf-nav-btn"
                  style={{
                    position: 'absolute',
                    left: '-16px',
                    top: '55%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(22, 20, 20, 0.9)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e2ddd9',
                    cursor: 'pointer',
                    opacity: 0,
                    transition: 'opacity 0.2s, background 0.2s, transform 0.2s',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={(e) => scrollShelf(e, 'right')}
                  className="shelf-nav-btn"
                  style={{
                    position: 'absolute',
                    right: '-16px',
                    top: '55%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(22, 20, 20, 0.9)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e2ddd9',
                    cursor: 'pointer',
                    opacity: 0,
                    transition: 'opacity 0.2s, background 0.2s, transform 0.2s',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
                <div
                  className="shelf-scroll-container"
                  style={{
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    scrollbarWidth: 'none'
                  }}
                >
                  {genreTracks.map((track, tIdx) => {
                    const isActive = currentTrack?.url === track.url;
                    return (
                      <div
                        key={track.url}
                        onClick={() => handlePlayInContext(track, genreTracks)}
                        onContextMenu={e => openCtx(e, { type: 'track', track })}
                        className={`v-card${isActive ? ' v-card--active' : ''}`}
                        style={{
                          animationDelay: `${tIdx * 25 + gIdx * 60}ms`,
                          flexShrink: 0,
                          width: '120px',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '12px',
                          padding: '10px',
                          transition: 'background .2s, border-color .2s, transform .2s',
                        }}
                        onMouseEnter={e => {
                          prefetchOnHover(track.url);
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <div style={{
                          position: 'relative',
                          aspectRatio: '1',
                          width: '100%',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: getTrackGradient(track.title, track.artist),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '8px'
                        }}>
                          <Music size={24} style={{ position: 'absolute', color: 'rgba(255,255,255,0.15)' }} />
                          {track.cover && (
                            <img
                              src={track.cover}
                              alt={track.title}
                              style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={e => { e.currentTarget.style.display = 'none'; }}
                              loading="lazy"
                            />
                          )}
                          {isActive && isPlaying ? (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '12px' }}>
                                {[100, 65, 80].map((h, j) => (
                                  <div
                                    key={j}
                                    style={{
                                      width: '2px',
                                      background: '#e2ddd9',
                                      borderRadius: '1px',
                                      height: `${h}%`,
                                      animation: `barBounce ${0.7 + j * 0.12}s ease-in-out ${j * 110}ms infinite`,
                                      transformOrigin: 'bottom'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.4)',
                                opacity: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                            >
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#e2ddd9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#0c0b0b'
                              }}>
                                <Play size={12} style={{ fill: 'currentColor', marginLeft: '1px' }} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isActive ? '#e2ddd9' : '#c8c4c0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.3
                        }}>{track.title}</div>
                        {cleanArtist(track.artist) && (
                          <div style={{
                            fontSize: '10.5px',
                            color: '#5c5755',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '2px'
                          }}>{cleanArtist(track.artist)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="v-home-sidebar-col">
          {topTracks.length >= 3 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(226,221,217,0.01) 0%, rgba(255,255,255,0.005) 100%)',
              border: '1px solid rgba(226,221,217,0.04)',
              borderRadius: '16px',
              padding: '16px',
              animation: 'fadeUp 0.22s cubic-bezier(0.2,0,0,1) 200ms both'
            }}>
              <h2 style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#e2ddd9',
                letterSpacing: '-0.01em',
                marginBottom: '14px',
                margin: '0 0 14px'
              }}>Most Played</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topTracks.map((track, i) => {
                  const isActive = currentTrack?.url === track.url;
                  const count = playCounts[track.url] || 0;
                  const maxScore = playCounts[topTracks[0].url] || 1;
                  return (
                    <div
                      key={track.url}
                      onClick={() => handlePlayInContext(track, topTracks)}
                      onContextMenu={e => openCtx(e, { type: 'track', track })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(226,221,217,0.04)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => {
                        prefetchOnHover(track.url);
                        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: i === 0 ? '#d4af37' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#5c5755',
                        width: '18px',
                        textAlign: 'center',
                        flexShrink: 0
                      }}>{i + 1}</div>
                      <div style={{
                        position: 'relative',
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: getTrackGradient(track.title, track.artist),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Music size={12} style={{ position: 'absolute', color: 'rgba(255,255,255,0.2)' }} />
                        <img
                          src={track.cover}
                          alt={track.title}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                          loading="lazy"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isActive ? '#e2ddd9' : '#c8c4c0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{track.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <div style={{
                            flex: 1,
                            height: '2px',
                            background: '#1a1817',
                            borderRadius: '1px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              background: 'rgba(226,221,217,0.3)',
                              borderRadius: '1px',
                              width: `${(count / maxScore) * 100}%`,
                              transition: 'width .5s'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '9.5px',
                            color: '#5c5755',
                            fontVariantNumeric: 'tabular-nums',
                            flexShrink: 0
                          }}>{count}×</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recentHistory.length >= 3 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(226,221,217,0.01) 0%, rgba(255,255,255,0.005) 100%)',
              border: '1px solid rgba(226,221,217,0.04)',
              borderRadius: '16px',
              padding: '16px',
              animation: 'fadeUp 0.22s cubic-bezier(0.2,0,0,1) 250ms both'
            }}>
              <h2 style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#e2ddd9',
                letterSpacing: '-0.01em',
                marginBottom: '14px',
                margin: '0 0 14px'
              }}>Play History</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentHistory.map((track, i) => {
                  const isActive = currentTrack?.url === track.url;
                  return (
                    <div
                      key={track.url + i}
                      onClick={() => handlePlayInContext(track, recentHistory)}
                      onContextMenu={e => openCtx(e, { type: 'track', track })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(226,221,217,0.04)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: getTrackGradient(track.title, track.artist),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Music size={12} style={{ position: 'absolute', color: 'rgba(255,255,255,0.2)' }} />
                        <img
                          src={track.cover}
                          alt=""
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                          loading="lazy"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isActive ? '#e2ddd9' : '#c8c4c0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{track.title}</div>
                        {cleanArtist(track.artist) && (
                          <div style={{
                            fontSize: '10.5px',
                            color: '#5c5755',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '1px'
                          }}>{cleanArtist(track.artist)}</div>
                        )}
                      </div>
                      {isActive && isPlaying && (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '12px' }}>
                          {[100, 65, 80].map((h, j) => (
                            <div
                              key={j}
                              style={{
                                width: '2px',
                                background: '#e2ddd9',
                                borderRadius: '1px',
                                height: `${h}%`,
                                animation: `barBounce ${0.7 + j * 0.12}s ease-in-out ${j * 110}ms infinite`,
                                transformOrigin: 'bottom'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeGenres.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(226,221,217,0.01) 0%, rgba(255,255,255,0.005) 100%)',
              border: '1px solid rgba(226,221,217,0.04)',
              borderRadius: '16px',
              padding: '16px',
              animation: 'fadeUp 0.22s cubic-bezier(0.2,0,0,1) 280ms both'
            }}>
              <h2 style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#e2ddd9',
                letterSpacing: '-0.01em',
                marginBottom: '14px',
                margin: '0 0 14px'
              }}>Veluna Insights</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeGenres.slice(0, 3).map(genre => {
                  const score = genreScores[genre.id].score;
                  const maxScore = genreScores[activeGenres[0].id]?.score || 1;
                  const percent = Math.min((score / maxScore) * 100, 100);
                  return (
                    <div key={genre.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                        <span style={{ color: '#c8c4c0', fontWeight: 500 }}>{genre.label}</span>
                        <span style={{ color: '#5c5755', fontVariantNumeric: 'tabular-nums' }}>{score} pts</span>
                      </div>
                      <div style={{ height: '3px', background: 'var(--v-bdr2)', borderRadius: '1.5px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'rgba(226,221,217,0.4)', width: `${percent}%`, borderRadius: '1.5px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{
            background: 'linear-gradient(135deg, rgba(226,221,217,0.01) 0%, rgba(255,255,255,0.005) 100%)',
            border: '1px solid rgba(226,221,217,0.04)',
            borderRadius: '16px',
            padding: '16px',
            animation: 'fadeUp 0.22s cubic-bezier(0.2,0,0,1) 320ms both'
          }}>
            <h2 style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#e2ddd9',
              letterSpacing: '-0.01em',
              marginBottom: '14px',
              margin: '0 0 14px'
            }}>Playlists</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playlists.slice(0, 4).map(pl => {
                const isLiked = pl.id === 'p1';
                return (
                  <div
                    key={pl.id}
                    onClick={() => { setOpenPlaylistId(pl.id); setActiveNav('library'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'transparent',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: isLiked ? 'linear-gradient(135deg, rgba(140,30,30,0.2) 0%, var(--v-bdr2) 100%)' : 'var(--v-bdr2)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isLiked ? (
                        <Heart size={14} style={{ color: '#e05555', fill: 'rgba(220,60,60,0.1)' }} />
                      ) : (
                        <ListMusic size={14} style={{ color: '#9e9894' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#c8c4c0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>{pl.name}</div>
                      <div style={{ fontSize: '10px', color: '#5c5755', marginTop: '1px' }}>
                        {pl.tracks.length} tracks
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: '#363230' }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
