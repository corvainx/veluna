import React from 'react';
import {
  Info, Heart, Download, Music, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, Mic2, VolumeX, Volume2
} from 'lucide-react';
import { Track, AudioInfo } from '../../types';
import { formatTime, parseDurationToSeconds } from '../../utils';
import { SpeedSelector } from '../ui/SpeedSelector';
import { WaveformBar } from '../ui/WaveformBar';

type PlayerBarProps = {
  currentTrack: Track | null;
  isLoadingTrack: boolean;
  audioInfo: AudioInfo | null;
  toggleLikeTrack: (t: Track) => void;
  isTrackLiked: (url: string) => boolean;
  downloadingTracks: Record<string, number>;
  handleDownload: (t: Track) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (s: number) => void;
  toggleShuffle: () => void;
  shuffle: boolean;
  handleSkipBack: () => void;
  togglePlayPause: () => void;
  isPlaying: boolean;
  handleSkipForward: () => void;
  cycleRepeat: () => void;
  repeatMode: string;
  abLoop: { a: number | null; b: number | null };
  setAbLoop: React.Dispatch<React.SetStateAction<{ a: number | null; b: number | null }>>;
  progressSeconds: number;
  trackDurationSeconds: number;
  waveformData: number[];
  isDraggingProgress: boolean;
  setIsDraggingProgress: React.Dispatch<React.SetStateAction<boolean>>;
  calculateProgressPercent: () => number;
  progressRef: React.RefObject<HTMLDivElement | null>;
  isDraggingProgressRef: React.RefObject<boolean>;
  progressSecondsRef: React.RefObject<number>;
  trackDurationRef: React.RefObject<number>;
  abLoopRef: React.RefObject<{ a: number | null; b: number | null }>;
  updateProgressFromEvent: (clientX: number) => number | undefined;
  showToast: (msg: string) => void;
  crossfadeSeconds: number;
  showLyrics: boolean;
  setShowLyrics: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMute: () => void;
  volume: number;
  isDraggingVolume: boolean;
  setIsDraggingVolume: React.Dispatch<React.SetStateAction<boolean>>;
  updateVolumeFromEvent: (clientX: number) => void;
  volumeRef: React.RefObject<HTMLDivElement | null>;
  openCtx: (e: React.MouseEvent, menu: any) => void;
  setInfoModalTrack: (t: Track | null) => void;
  playlistContextRef: React.RefObject<any>;
  queue: Track[];
};

export const PlayerBar = ({
  currentTrack,
  isLoadingTrack,
  audioInfo,
  toggleLikeTrack,
  isTrackLiked,
  downloadingTracks,
  handleDownload,
  playbackSpeed,
  setPlaybackSpeed,
  toggleShuffle,
  shuffle,
  handleSkipBack,
  togglePlayPause,
  isPlaying,
  handleSkipForward,
  cycleRepeat,
  repeatMode,
  abLoop,
  setAbLoop,
  progressSeconds,
  trackDurationSeconds,
  waveformData,
  isDraggingProgress,
  setIsDraggingProgress,
  calculateProgressPercent,
  progressRef,
  isDraggingProgressRef,
  progressSecondsRef,
  trackDurationRef,
  abLoopRef,
  updateProgressFromEvent,
  showToast,
  crossfadeSeconds,
  showLyrics,
  setShowLyrics,
  toggleMute,
  volume,
  isDraggingVolume,
  setIsDraggingVolume,
  updateVolumeFromEvent,
  volumeRef,
  openCtx,
  setInfoModalTrack,
  playlistContextRef,
  queue,
}: PlayerBarProps) => {
  return (
    <div className="v-player-dock" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="v-player__track" style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '230px', flexShrink: 0 }}>
        {currentTrack ? (
          <>
            <div className="v-player__art"
              onContextMenu={e => openCtx(e, { type: 'track', track: currentTrack })}
              onClick={() => setInfoModalTrack(currentTrack)}
              style={{ position: 'relative' }}>
              {currentTrack.cover ? <img src={currentTrack.cover} alt="" /> : <Music size={16} style={{ color: '#363230' }} />}
              {!currentTrack.url.startsWith('local://') ? (
                <div className="art-ov" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s' }}>
                  <Info size={14} style={{ color: '#e2ddd9' }} />
                </div>
              ) : null}
            </div>
            <div key={currentTrack.url} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px', animation: 'fadeIn 0.25s ease both' }}>
              <div style={{ fontWeight: 700, color: '#e2ddd9', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.3' }}>{currentTrack.title}</div>
              {isLoadingTrack ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '10px' }}>
                    {[1, 0.6, 0.8, 0.5].map((h, i) => (
                      <span key={i} style={{ width: '2px', background: 'rgba(226,221,217,0.5)', borderRadius: '1px', display: 'inline-block', height: `${h * 100}%`, animation: `barBounce ${0.65 + i * 0.1}s ease-in-out ${i * 100}ms infinite`, transformOrigin: 'bottom' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(226,221,217,0.5)' }}>Buffering</span>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#8a807c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.artist || ''}</div>
              )}
              {audioInfo && !isLoadingTrack && (
                <div>
                  <div className="v-player-codec-badge">
                    {audioInfo.codec.toUpperCase()}{audioInfo.samplerate > 0 ? ` · ${Math.round(audioInfo.samplerate / 1000)}kHz` : ''}
                  </div>
                </div>
              )}
            </div>
            {!currentTrack.url.startsWith('local://') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                <button onClick={() => toggleLikeTrack(currentTrack)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', color: '#5c5755', transition: 'color .12s, transform .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                  <Heart size={16} style={isTrackLiked(currentTrack.url) ? { color: '#e05555', fill: '#e05555' } : { color: '#5c5755' }} />
                </button>
                {(() => {
                  const dl = downloadingTracks[currentTrack.url];
                  return (
                    <button onClick={() => handleDownload(currentTrack)} title="Download" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', color: '#5c5755', transition: 'color .12s, transform .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                      {dl > 0 ? (
                        <svg width="15" height="15" viewBox="0 0 14 14">
                          <circle cx="7" cy="7" r="5.5" fill="none" stroke="#2a2727" strokeWidth="1.5" />
                          <circle cx="7" cy="7" r="5.5" fill="none" stroke="#9e9894" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 5.5}`} strokeDashoffset={`${2 * Math.PI * 5.5 * (1 - Math.min(dl, 100) / 100)}`} style={{ transformOrigin: '7px 7px', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset .3s' }} />
                          {dl >= 100 && <path d="M4.5 7l2 2 3-3" stroke="#9e9894" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
                        </svg>
                      ) : (
                        <Download size={15} />
                      )}
                    </button>
                  );
                })()}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ width: '42px', height: '42px', borderRadius: '7px', border: '1px solid var(--v-bdr2)', background: 'var(--v-bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Music size={16} style={{ color: '#363230' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#363230', fontSize: '12.5px' }}>Nothing playing</div>
              <div style={{ fontSize: '11px', color: '#2a2727' }}>Search YouTube to start</div>
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0 24px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <SpeedSelector speed={playbackSpeed} onChange={setPlaybackSpeed} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '12px', marginRight: '12px' }}>
            <button onClick={toggleShuffle} title="Shuffle" style={{ background: 'none', border: 'none', cursor: 'pointer', color: shuffle ? '#e2ddd9' : '#363230', padding: '3px', display: 'flex', transition: 'color .12s, transform .1s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              <Shuffle size={15} />
            </button>
            <button onClick={handleSkipBack} title="Previous" style={{ background: 'none', border: 'none', cursor: currentTrack ? 'pointer' : 'not-allowed', color: currentTrack ? '#9e9894' : '#2a2727', padding: '3px', display: 'flex', transition: 'color .12s, transform .1s' }}
              onMouseEnter={e => { if (currentTrack) e.currentTarget.style.transform = 'scale(1.15)'; }} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              <SkipBack size={17} />
            </button>
            <button onClick={togglePlayPause} disabled={!currentTrack || isLoadingTrack} className="v-player-btn-play">
              {isLoadingTrack ? (
                <div style={{ width: '16px', height: '16px', border: '2px solid #0c0b0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : isPlaying ? (
                <Pause fill="currentColor" size={18} />
              ) : (
                <Play fill="currentColor" size={18} style={{ marginLeft: '2px' }} />
              )}
            </button>
            <button onClick={handleSkipForward} title="Next" style={{ background: 'none', border: 'none', cursor: (queue.length > 0 || playlistContextRef.current !== null) ? 'pointer' : 'not-allowed', color: (queue.length > 0 || playlistContextRef.current !== null) ? '#9e9894' : '#2a2727', padding: '3px', display: 'flex', transition: 'color .12s, transform .1s' }}
              onMouseEnter={e => { if (queue.length > 0 || playlistContextRef.current !== null) e.currentTarget.style.transform = 'scale(1.15)'; }} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              <SkipForward size={17} />
            </button>
            <button onClick={cycleRepeat} title={`Repeat: ${repeatMode}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: repeatMode !== 'off' ? '#e2ddd9' : '#363230', padding: '3px', display: 'flex', transition: 'color .12s, transform .1s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </button>
          </div>
          <button
            title={abLoop.a === null ? 'Set A (loop start)' : abLoop.b === null ? 'Set B (loop end)' : 'Clear A-B loop'}
            onClick={() => {
              if (abLoop.a === null) {
                const a = progressSecondsRef.current ?? 0;
                setAbLoop({ a, b: null });
                if (abLoopRef.current) abLoopRef.current = { a, b: null };
                showToast(`Loop A: ${formatTime(a)}`);
              } else if (abLoop.b === null) {
                const b = progressSecondsRef.current ?? 0;
                if (b > (abLoop.a ?? 0) + 1) {
                  setAbLoop(p => ({ ...p, b }));
                  if (abLoopRef.current) abLoopRef.current = { ...abLoopRef.current, b };
                  showToast(`Loop: ${formatTime(abLoop.a!)} → ${formatTime(b)}`);
                } else {
                  showToast('B must be after A');
                }
              } else {
                setAbLoop({ a: null, b: null });
                if (abLoopRef.current) abLoopRef.current = { a: null, b: null };
                showToast('Loop cleared');
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 6px',
              borderRadius: '5px', border: '1px solid',
              fontSize: '10px', fontWeight: 700, flexShrink: 0, cursor: 'pointer',
              background: abLoop.b !== null ? 'rgba(226,221,217,0.08)' : abLoop.a !== null ? 'rgba(226,221,217,0.04)' : 'transparent',
              borderColor: abLoop.b !== null ? 'rgba(226,221,217,0.25)' : abLoop.a !== null ? 'rgba(226,221,217,0.12)' : 'var(--v-bdr2)',
              color: abLoop.b !== null ? '#e2ddd9' : abLoop.a !== null ? '#9e9894' : '#363230',
              transition: 'all .12s',
            }}>
            A·B{abLoop.b !== null ? ' ✓' : abLoop.a !== null ? ' …' : ''}
          </button>
        </div>

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#5c5755', flexShrink: 0, fontVariantNumeric: 'tabular-nums', minWidth: '30px', textAlign: 'right' }}>
            {currentTrack ? formatTime(progressSeconds) : '0:00'}
          </span>
          <div ref={el => { if (progressRef) (progressRef as any).current = el; }} className="v-progress-container"
            onMouseDown={e => {
              if (!currentTrack) return;
              if (isDraggingProgressRef.current) (isDraggingProgressRef as any).current = true;
              setIsDraggingProgress(true);
              updateProgressFromEvent(e.clientX);
            }}
            onMouseMove={e => {
              if (!progressRef?.current || !currentTrack) return;
              const rect = progressRef.current.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const total = (trackDurationRef?.current) || parseDurationToSeconds(currentTrack.duration);
              const el = progressRef.current.querySelector<HTMLElement>('.v-progress-tooltip');
              if (el) { el.textContent = formatTime(total * pct); el.style.left = `${pct * 100}%`; }
            }}>
            <div className="v-progress-track">
              {currentTrack && <div className="v-progress-tooltip">{formatTime(progressSeconds)}</div>}
              {waveformData.length > 0 && (
                <WaveformBar waveform={waveformData} progressPercent={calculateProgressPercent()} isDragging={isDraggingProgress} />
              )}
              <div className="v-progress-fill" style={{ width: `${calculateProgressPercent()}%`, transition: isDraggingProgress ? 'none' : 'width 0.5s linear' }}>
                <div className="v-progress-thumb" />
              </div>
            </div>
          </div>
          <span style={{ fontSize: '10px', color: '#5c5755', flexShrink: 0, fontVariantNumeric: 'tabular-nums', minWidth: '30px' }}>
            {currentTrack ? formatTime(trackDurationSeconds || parseDurationToSeconds(currentTrack.duration)) : '0:00'}
          </span>
        </div>
      </div>

      <div style={{ width: '220px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
        {crossfadeSeconds > 0 && (
          <span style={{ fontSize: '9.5px', color: '#5c5755', fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }} title={`Crossfade: ${crossfadeSeconds}s`}>
            ×{crossfadeSeconds}s
          </span>
        )}
        <button onClick={() => { if (currentTrack) setShowLyrics(o => !o); }} disabled={!currentTrack} title="Lyrics"
          style={{ background: 'none', border: 'none', cursor: currentTrack ? 'pointer' : 'not-allowed', color: showLyrics ? '#9e9894' : '#363230', flexShrink: 0, display: 'flex', padding: '3px', transition: 'color .12s', opacity: currentTrack ? 1 : 0.4 }}
          onMouseEnter={e => { if (currentTrack) e.currentTarget.style.color = '#9e9894'; }} onMouseLeave={e => { if (!showLyrics) e.currentTarget.style.color = '#363230'; }}>
          <Mic2 size={16} />
        </button>
        <button onClick={toggleMute} title={volume === 0 ? 'Unmute' : 'Mute'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '3px', color: '#5c5755', display: 'flex', transition: 'color .12s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#9e9894')} onMouseLeave={e => (e.currentTarget.style.color = '#5c5755')}>
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <div ref={el => { if (volumeRef) (volumeRef as any).current = el; }}
            className="slider-track"
            style={{ position: 'relative', width: '72px', height: '4px', background: '#232020', borderRadius: '2px', cursor: 'pointer' }}
            onMouseDown={e => {
              setIsDraggingVolume(true);
              updateVolumeFromEvent(e.clientX);
            }}
            onMouseEnter={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = '1'; }}
            onMouseLeave={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = '0'; }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: '2px', pointerEvents: 'none', width: `${volume}%`, background: volume > 0 ? 'var(--v-accent)' : '#232020', transition: isDraggingVolume ? 'none' : 'width 0.15s ease-out' }}>
              <div className="slider-thumb" style={{ position: 'absolute', right: '-5px', top: '50%', transform: 'translateY(-50%)', width: '11px', height: '11px', background: '#fff', borderRadius: '50%', opacity: 0, pointerEvents: 'none', transition: 'opacity .12s' }} />
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', background: 'var(--v-bdr2)', border: '1px solid var(--v-bdr2)', borderRadius: '5px', padding: '2px 6px', fontSize: '10px', fontWeight: 700, color: '#9e9894', pointerEvents: 'none', whiteSpace: 'nowrap', opacity: 0, transition: 'opacity .15s', zIndex: 10 }}>
            {Math.round(volume)}%
          </div>
        </div>
      </div>
    </div>
  );
};
