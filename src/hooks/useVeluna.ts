import React, { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";

import { Track, LocalTrack, ListeningEvent, Playlist, RepeatMode, CtxMenu, AudioInfo } from '../types';
import { __APP_VERSION__ } from '../constants';
import {
  parseDurationToSeconds, cleanArtist, loadLS, saveLS, clampMenu
} from '../utils';

export function useVeluna() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [localRefreshNonce, setLocalRefreshNonce] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadLS('vg_searchHistory', []));
  const [showHistory, setShowHistory] = useState(false);
  const [, setHasSearched] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => loadLS('vg_currentTrack', null));
  const [currentLocalPath, setCurrentLocalPath] = useState<string | null>(null);
  const currentLocalPathRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const setIsPlayingSync = useCallback((v: boolean) => { 
    isPlayingRef.current = v; 
    setIsPlaying(v); 
  }, []);

  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [activeNav, setActiveNav] = useState(() => loadLS('vg_startupNav', 'home'));
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState(__APP_VERSION__);

  useEffect(() => {
    import('@tauri-apps/api/app').then(m => m.getVersion()).then(setAppVersion).catch(() => {});
  }, []);

  const [_navHistory, setNavHistory] = useState<string[]>([]);

  const navigateTo = useCallback((nav: string) => {
    setNavHistory(prev => [...prev.slice(-20), activeNav]);
    setActiveNav(nav);
  }, [activeNav]);

  const navigateBack = useCallback(() => {
    setNavHistory(prev => {
      const next = [...prev];
      const dest = next.pop() ?? 'home';
      setActiveNav(dest);
      return next;
    });
  }, []);

  const [trackDurationSeconds, setTrackDurationSeconds] = useState(0);
  const trackDurationRef = useRef(0);
  const [progressSeconds, setProgressSeconds] = useState(0);
  const progressSecondsRef = useRef(0);

  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (activeNav === 'home') {
      setSearchQuery('');
      setTracks([]);
      setIsSearching(false);
    }
  }, [activeNav]);

  const [quickPicks, setQuickPicks] = useState<Track[]>(() => loadLS('vg_quickPicks', []));
  const [queue, setQueue] = useState<Track[]>(() => loadLS('vg_queue', []));
  const [queuePulseKey, setQueuePulseKey] = useState(0);
  const [playHistory, setPlayHistory] = useState<Track[]>(() => loadLS('vg_playHistory', []));
  
  const [playCounts, setPlayCounts] = useState<Record<string, number>>(() => loadLS('vg_playCounts', {}));
  const [listenSecs, setListenSecs] = useState<Record<string, number>>(() => loadLS('vg_listenSecs', {}));
  const [firstSeen, setFirstSeen] = useState<Record<string, string>>(() => loadLS('vg_firstSeen', {}));
  const [dailyPlays, setDailyPlays] = useState<Record<string, number>>(() => loadLS('vg_dailyPlays', {}));
  const [listeningHistory, setListeningHistory] = useState<ListeningEvent[]>(() => loadLS('vg_listeningHistory', []));
  
  useEffect(() => { 
    saveLS('vg_listeningHistory', listeningHistory); 
  }, [listeningHistory]);

  const [statsTimeRange, setStatsTimeRange] = useState<'7days' | 'all'>('all');
  const [theme, setThemeState] = useState<string>(() => loadLS('vg_theme', 'obsidian'));
  const [accentColor, setAccentColorState] = useState<string>(() => loadLS('vg_accentColor', '#e2ddd9'));
  const [customBgColor, setCustomBgColorState] = useState<string>(() => loadLS('vg_customBgColor', '#0c0b0b'));

  const hexToRgbLocal = (hex: string): string => {
    const cleaned = hex.replace('#', '');
    if (cleaned.length !== 6) return "0, 0, 0";
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  };

  const lightenColorLocal = (hex: string, percent: number): string => {
    let num = parseInt(hex.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        r = (num >> 16) + amt,
        g = (num >> 8 & 0x00FF) + amt,
        b = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (r < 255 ? r < 0 ? 0 : r : 255) * 0x10000 + (g < 255 ? g < 0 ? 0 : g : 255) * 0x100 + (b < 255 ? b < 0 ? 0 : b : 255)).toString(16).slice(1);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveLS('vg_theme', theme);
    if (theme === 'custom') {
      const bg0 = customBgColor;
      const bg0Rgb = hexToRgbLocal(bg0);
      const bg1 = lightenColorLocal(bg0, 2);
      const bg2 = lightenColorLocal(bg0, 4);
      const bg2Rgb = hexToRgbLocal(bg2);
      const bg3 = lightenColorLocal(bg0, 6);
      const bg4 = lightenColorLocal(bg0, 8);
      const bg5 = lightenColorLocal(bg0, 10);
      const bdr = lightenColorLocal(bg0, 5);
      const bdr2 = lightenColorLocal(bg0, 8);
      const bdr3 = lightenColorLocal(bg0, 12);

      document.documentElement.style.setProperty('--v-bg0', bg0);
      document.documentElement.style.setProperty('--v-bg0-rgb', bg0Rgb);
      document.documentElement.style.setProperty('--v-bg1', bg1);
      document.documentElement.style.setProperty('--v-bg2', bg2);
      document.documentElement.style.setProperty('--v-bg2-rgb', bg2Rgb);
      document.documentElement.style.setProperty('--v-bg3', bg3);
      document.documentElement.style.setProperty('--v-bg4', bg4);
      document.documentElement.style.setProperty('--v-bg5', bg5);
      document.documentElement.style.setProperty('--v-bdr', bdr);
      document.documentElement.style.setProperty('--v-bdr2', bdr2);
      document.documentElement.style.setProperty('--v-bdr3', bdr3);
      saveLS('vg_customBgColor', customBgColor);
    } else {
      document.documentElement.style.removeProperty('--v-bg0');
      document.documentElement.style.removeProperty('--v-bg0-rgb');
      document.documentElement.style.removeProperty('--v-bg1');
      document.documentElement.style.removeProperty('--v-bg2');
      document.documentElement.style.removeProperty('--v-bg2-rgb');
      document.documentElement.style.removeProperty('--v-bg3');
      document.documentElement.style.removeProperty('--v-bg4');
      document.documentElement.style.removeProperty('--v-bg5');
      document.documentElement.style.removeProperty('--v-bdr');
      document.documentElement.style.removeProperty('--v-bdr2');
      document.documentElement.style.removeProperty('--v-bdr3');
    }
  }, [theme, customBgColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--v-accent', accentColor);
    saveLS('vg_accentColor', accentColor);
  }, [accentColor]);

  const listenSecsRef = useRef(listenSecs);
  useEffect(() => { listenSecsRef.current = listenSecs; }, [listenSecs]);
  const [shuffle, setShuffle] = useState<boolean>(() => loadLS('vg_shuffle', false));
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => loadLS('vg_repeatMode', 'off'));
  const repeatModeRef = useRef<RepeatMode>(loadLS('vg_repeatMode', 'off'));
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [discordRpcEnabled, setDiscordRpcEnabled] = useState<boolean>(() => loadLS('vg_discordRpcEnabled', true));
  const dragQueueIdx = useRef<number | null>(null);
  const dragOverQueueIdxRef = useRef<number | null>(null);
  const [dragOverQueueIdx, setDragOverQueueIdx] = useState<number | null>(null);

  const [volume, setVolume] = useState<number>(() => loadLS('vg_volume', 100));
  const [previousVolume, setPreviousVolume] = useState(100);

  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const isDraggingProgressRef = useRef(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const [playlists, setPlaylists] = useState<Playlist[]>(() =>
    loadLS('vg_playlists', [{ id: 'p1', name: 'Liked Songs', description: '', tracks: [] }])
  );
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [playlistSearchQ, setPlaylistSearchQ] = useState('');
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [renamingPlaylist, setRenamingPlaylist] = useState<Playlist | null>(null);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [showYtImportModal, setShowYtImportModal] = useState(false);
  const [showDuplicatesPlaylist, setShowDuplicatesPlaylist] = useState<Playlist | null>(null);
  const [bulkEditPlaylist, setBulkEditPlaylist] = useState<Playlist | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [renameDescVal, setRenameDescVal] = useState('');
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [sidebarPlaylistsExpanded, setSidebarPlaylistsExpanded] = useState(true);
  
  // Background Spotify import progress pill
  const [bgImport, setBgImport] = useState<{ matched: number; total: number; label: string } | null>(null);
  // Pending spotify save
  const [pendingSpotifyImport, setPendingSpotifyImport] = useState<{ tracks: Track[]; matchedCount: number; failedCount: number } | null>(null);
  // Lyrics state
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsData, setLyricsData] = useState<{ lines: {time:number;text:string}[]; title: string; artist: string } | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  // Artist thumbnail cache for Stats page
  const [artistThumbs, setArtistThumbs] = useState<Record<string, string>>({});

  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [infoModalTrack, setInfoModalTrack] = useState<Track | null>(null);
  const [downloadingTracks, setDownloadingTracks] = useState<Record<string, number>>({});
  const downloadsPanelSetTracksRef = useRef<React.Dispatch<React.SetStateAction<LocalTrack[]>> | null>(null);
  const [hoveredTrackUrl, setHoveredTrackUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [downloadQuality, setDownloadQuality] = useState<string>(() => loadLS('vg_dlQuality', 'High'));
  const [downloadFormat, setDownloadFormatState] = useState<string>(() => loadLS('vg_dlFormat', 'mp3'));
  const [embedThumbnail, setEmbedThumbnailState] = useState<boolean>(() => loadLS('vg_embedThumb', true));
  const [duplicateDetect, setDuplicateDetectState] = useState<boolean>(() => loadLS('vg_dupDetect', true));
  const [autoCheckUpdates, setAutoCheckUpdatesState] = useState<boolean>(() => loadLS('vg_autoCheckUpdates', true));
  const setAutoCheckUpdates = useCallback((v: boolean) => { setAutoCheckUpdatesState(v); saveLS('vg_autoCheckUpdates', v); }, []);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [downloadPath, setDownloadPath] = useState<string>(() => loadLS('vg_dlPath', '~/Downloads'));
  const [backupPath, setBackupPathState] = useState<string>(() => loadLS('vg_backupPath', ''));
  const setBackupPath = useCallback((p: string) => { setBackupPathState(p); saveLS('vg_backupPath', p); }, []);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(() => loadLS('vg_speed', 1));
  const [crossfadeSeconds, setCrossfadeSeconds] = useState<number>(() => loadLS('vg_crossfade', 0));
  const [loudnormEnabled, setLoudnormEnabledState] = useState<boolean>(() => loadLS('vg_loudnorm', true));
  const [skipSilence, setSkipSilenceState] = useState<boolean>(() => loadLS('vg_skipSilence', false));
  const [lyricsSource, setLyricsSource] = useState<string>(() => loadLS('vg_lyricsSource', 'lrclib'));
  const [trayEnabled, setTrayEnabled] = useState<boolean>(() => loadLS('vg_trayEnabled', false));
  const [autoplayEnabled, setAutoplayEnabled] = useState<boolean>(() => loadLS('vg_autoplay', true));
  const [metadataEditingTrack, setMetadataEditingTrack] = useState<Track | null>(null);
  const [audioDevices, setAudioDevices] = useState<{ id: string; name: string; form: string; is_default: boolean }[]>([]);
  const [switchingDevice, setSwitchingDevice] = useState(false);

  useEffect(() => {
    invoke<{ id: string; name: string; form: string; is_default: boolean }[]>('list_audio_devices')
      .then(setAudioDevices).catch(() => {});
  }, []);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const bookmarksRef = useRef<Record<string, number>>(loadLS('vg_bookmarks', {}));
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const abLoopRef = useRef<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [eq, setEqState] = useState<{ bass: number; mid: number; treble: number }>(() => loadLS('vg_eq', { bass: 0, mid: 0, treble: 0 }));

  const [sleepTimer, setSleepTimerState] = useState(-1);
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [showSleepPopover, setShowSleepPopover] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const endDetectedRef = useRef(false);
  const currentTrackRef = useRef(currentTrack);
  const queueRef = useRef(queue);

  const localTracksListRef = useRef<LocalTrack[]>([]);
  const localTrackIndexRef = useRef(0);
  
  const playlistContextRef = useRef<{ tracks: Track[]; index: number } | null>(null);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => {
    if (discordRpcEnabled && isPlaying && currentTrack) {
      const coverUrl = currentTrack.cover && !currentTrack.cover.startsWith('data:') && !currentTrack.cover.startsWith('blob:') ? currentTrack.cover : null;
      invoke('update_discord_rpc', {
        title: currentTrack.title,
        artist: cleanArtist(currentTrack.artist) || null,
        coverUrl
      }).catch(() => {});
    } else {
      invoke('clear_discord_rpc').catch(() => {});
    }
  }, [discordRpcEnabled, isPlaying, currentTrack]);
  useEffect(() => { saveLS('vg_discordRpcEnabled', discordRpcEnabled); }, [discordRpcEnabled]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  useEffect(() => { saveLS('vg_playlists', playlists); }, [playlists]);
  const prevQueueLenRef = useRef(0);
  useEffect(() => {
    saveLS('vg_queue', queue);
    if (queue.length > prevQueueLenRef.current) setQueuePulseKey(k => k + 1);
    prevQueueLenRef.current = queue.length;
  }, [queue]);
  useEffect(() => { saveLS('vg_playHistory', playHistory); }, [playHistory]);
  useEffect(() => { saveLS('vg_playCounts', playCounts); }, [playCounts]);
  useEffect(() => { saveLS('vg_listenSecs', listenSecs); }, [listenSecs]);
  useEffect(() => { saveLS('vg_firstSeen', firstSeen); }, [firstSeen]);
  useEffect(() => { saveLS('vg_dailyPlays', dailyPlays); }, [dailyPlays]);
  useEffect(() => { saveLS('vg_shuffle', shuffle); }, [shuffle]);
  useEffect(() => { saveLS('vg_repeatMode', repeatMode); }, [repeatMode]);
  useEffect(() => { saveLS('vg_volume', volume); }, [volume]);
  useEffect(() => { saveLS('vg_autoplay', autoplayEnabled); }, [autoplayEnabled]);
  
  useEffect(() => { saveLS('vg_currentTrack', currentTrack); }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack) return;
    const parseDuration = (d: string): number => {
      const parts = d.split(':').map(Number);
      if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
      if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
      return 0;
    };
    invoke('set_mpris_metadata', {
      title:        currentTrack.title  ?? '',
      artist:       currentTrack.artist ?? '',
      coverUrl:     currentTrack.cover  ?? '',
      durationSecs: parseDuration(currentTrack.duration ?? '0:00'),
      playing:      isPlaying,
    }).catch(() => {});
  }, [currentTrack, isPlaying]);

  useEffect(() => { saveLS('vg_searchHistory', searchHistory); }, [searchHistory]);
  useEffect(() => { saveLS('vg_dlQuality', downloadQuality); }, [downloadQuality]);
  useEffect(() => { saveLS('vg_dlFormat', downloadFormat); }, [downloadFormat]);
  useEffect(() => { saveLS('vg_embedThumb', embedThumbnail); }, [embedThumbnail]);
  useEffect(() => { saveLS('vg_dupDetect', duplicateDetect); }, [duplicateDetect]);
  useEffect(() => { saveLS('vg_dlPath', downloadPath); }, [downloadPath]);
  useEffect(() => { saveLS('vg_quickPicks', quickPicks); }, [quickPicks]);
  useEffect(() => { saveLS('vg_speed', playbackSpeed); }, [playbackSpeed]);
  useEffect(() => { 
    saveLS('vg_loudnorm', loudnormEnabled); 
    invoke('set_loudnorm_enabled', { enabled: loudnormEnabled }).catch(() => {}); 
  }, [loudnormEnabled]);
  useEffect(() => { 
    saveLS('vg_skipSilence', skipSilence); 
    invoke('set_skip_silence', { enabled: skipSilence }).catch(() => {}); 
  }, [skipSilence]);
  useEffect(() => { saveLS('vg_eq', eq); }, [eq]);
  useEffect(() => { saveLS('vg_lyricsSource', lyricsSource); }, [lyricsSource]);
  useEffect(() => { saveLS('vg_trayEnabled', trayEnabled); }, [trayEnabled]);

  // Restore tray on startup
  useEffect(() => {
    if (trayEnabled) invoke('tray_set', { enabled: true }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    setIsCheckingUpdate(true);
    try {
      const v = await invoke<string | null>('check_for_update');
      setUpdateAvailable(v ?? null);
      if (v) {
        showToast(`Update available: v${v}`);
      } else {
        showToast("You're up to date!");
      }
    } catch (e) {
      showToast(`Failed to check updates: ${e}`);
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [showToast]);

  // Fetch artist thumbnails when stats page opens
  useEffect(() => {
    if (activeNav !== 'stats') return;
    const artistCounts: Record<string, number> = {};
    Object.entries(playCounts).forEach(([url, count]) => {
      const artist = [...quickPicks, ...playHistory].find(t => t.url === url)?.artist;
      if (artist?.trim()) artistCounts[artist] = (artistCounts[artist] || 0) + (count as number);
    });
    const top5 = Object.entries(artistCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([a])=>a);
    top5.forEach(async (artist) => {
      if (artistThumbs[artist]) return;
      try {
        const res: string = await invoke('search_yt_music', { query: artist, searchType: 'artist' });
        const items = JSON.parse(res);
        const thumb = items[0]?.thumbnail;
        if (thumb) setArtistThumbs(prev => ({ ...prev, [artist]: thumb }));
      } catch {}
    });
  }, [activeNav, playCounts, quickPicks, playHistory, artistThumbs]);

  useEffect(() => {
    if (!showLyrics || !currentTrack) return;
    const title = currentTrack.title;
    const artist = currentTrack.artist;
    if (!title || !artist) return;
    setLyricsLoading(true);
    setLyricsData(null);
    invoke<string>('fetch_lyrics', { title, artist, album: '', duration: trackDurationSeconds || 0, source: lyricsSource })
      .then(raw => {
        try {
          const lines: {time:number;text:string}[] = JSON.parse(raw);
          setLyricsData({ lines, title, artist });
        } catch { setLyricsData({ lines: [], title, artist }); }
      })
      .catch(() => setLyricsData({ lines: [], title, artist }))
      .finally(() => setLyricsLoading(false));
  }, [showLyrics, currentTrack?.url, trackDurationSeconds, lyricsSource]);

  useEffect(() => {
    if (!isPlaying || !currentTrack || isLoadingTrack) return;
    const url = currentTrack.url;
    const id = setInterval(() => {
      setListenSecs(prev => {
        const next = { ...prev, [url]: (prev[url] || 0) + 5 };
        listenSecsRef.current = next;
        return next;
      });
      setListeningHistory(prev => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        next[0] = { ...next[0], secs: next[0].secs + 5 };
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [isPlaying, currentTrack?.url, isLoadingTrack]);

  const lastPrefetchUrl = useRef<string | null>(null);
  useEffect(() => {
    const nextUrl = queue[0]?.url;
    if (nextUrl && !nextUrl.startsWith('local://') && nextUrl !== lastPrefetchUrl.current) {
      lastPrefetchUrl.current = nextUrl;
      invoke('prefetch_track', { url: nextUrl }).catch(() => {});
    }
  }, [queue]);

  useEffect(() => {
    if (!currentTrack || !playlistContextRef.current) return;
    const ctx = playlistContextRef.current;
    const tracks = ctx.tracks;
    const idx = tracks.findIndex((t: Track) => t.url === currentTrack.url);
    if (idx === -1 || idx >= tracks.length - 1) return;
    const nextUrl = tracks[idx + 1]?.url;
    if (nextUrl && !nextUrl.startsWith('local://') && nextUrl !== lastPrefetchUrl.current) {
      lastPrefetchUrl.current = nextUrl;
      invoke('prefetch_track', { url: nextUrl }).catch(() => {});
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!openPlaylistId) return;
    const pl = playlists.find(p => p.id === openPlaylistId);
    if (!pl) return;
    pl.tracks.slice(0, 5).forEach(track => {
      if (track.url && !track.url.startsWith('local://')) {
        invoke('prefetch_track', { url: track.url }).catch(() => {});
      }
    });
  }, [openPlaylistId, playlists]);

  useEffect(() => {
    if (!isHydrated) return;
    const urls: string[] = [];
    quickPicks.slice(0, 6).forEach(t => {
      if (t.url && !t.url.startsWith('local://') && !urls.includes(t.url)) {
        urls.push(t.url);
      }
    });
    Object.entries(playCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([url]) => {
        if (url && !url.startsWith('local://') && !urls.includes(url)) {
          urls.push(url);
        }
      });
    playHistory.slice(0, 3).forEach(t => {
      if (t.url && !t.url.startsWith('local://') && !urls.includes(t.url)) {
        urls.push(t.url);
      }
    });
    const timers = urls.map((url, idx) => 
      setTimeout(() => {
        invoke('prefetch_track', { url }).catch(() => {});
      }, idx * 1500)
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isHydrated, quickPicks, playCounts, playHistory]);

  const hoverPrefetchRef = useRef<string | null>(null);
  const prefetchOnHover = useCallback((url: string) => {
    if (!url || url.startsWith('local://') || url === hoverPrefetchRef.current) return;
    hoverPrefetchRef.current = url;
    invoke('prefetch_track', { url }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => { invoke<AudioInfo>('get_audio_info').then(setAudioInfo).catch(() => {}); }, 6000);
    invoke<AudioInfo>('get_audio_info').then(setAudioInfo).catch(() => {});
    return () => clearInterval(id);
  }, [isPlaying]);

  const setPlaybackSpeed = useCallback((s: number) => {
    setPlaybackSpeedState(s);
    invoke('set_playback_speed', { speed: s }).catch(() => {});
    showToast(`Speed: ${s}x`);
  }, [showToast]);

  const setSleepTimerMinutes = useCallback((m: number) => {
    invoke('set_sleep_timer', { seconds: m * 60 })
      .then(() => { setSleepTimerState(m * 60); showToast(`Sleep timer: ${m}m`); })
      .catch(() => {});
  }, [showToast]);

  const cancelSleepTimer = useCallback(() => {
    invoke('cancel_sleep_timer').then(() => { setSleepTimerState(-1); showToast('Sleep timer cancelled'); }).catch(() => {});
  }, [showToast]);

  const handleBackup = useCallback(async () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        playlists, queue, playHistory, playCounts, listenSecs, dailyPlays, firstSeen, listeningHistory,
        shuffle, repeatMode, volume, playbackSpeed, eq,
        downloadQuality, downloadFormat, downloadPath, backupPath,
        embedThumbnail, duplicateDetect,
        loudnormEnabled, skipSilence,
        searchHistory, quickPicks, currentTrack,
      };
      const json = JSON.stringify(data, null, 2);
      const sep = navigator.platform.includes('Win') ? '\\' : '/';
      const resolvedBase = backupPath || downloadPath || '';
      if (resolvedBase) {
        const filePath = resolvedBase.replace(/[/\\]$/, '') + sep + 'veluna_backup.json';
        await invoke('write_text_file', { path: filePath, content: json });
        showToast(`Backup saved to ${filePath}`);
      } else {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'veluna_backup.json'; a.click();
        URL.revokeObjectURL(url);
        showToast('Backup saved — set a Backup Location in Storage settings to choose a folder');
      }
    } catch (e) { showToast(`Backup failed: ${e}`); }
  }, [playlists, queue, playHistory, playCounts, listenSecs, dailyPlays, firstSeen, listeningHistory,
      shuffle, repeatMode, volume, playbackSpeed, eq,
      downloadQuality, downloadFormat, downloadPath, backupPath,
      embedThumbnail, duplicateDetect, loudnormEnabled, skipSilence,
      searchHistory, quickPicks, currentTrack, showToast]);

  const handleRestore = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async (e) => {
      document.body.removeChild(input);
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.version !== 1) { showToast('Invalid or incompatible backup file'); return; }

        const ls = <T,>(key: string, val: T): T => { saveLS(key, val); return val; };

        if (data.playlists)       setPlaylists(ls('vg_playlists', data.playlists));
        if (data.queue)           setQueue(ls('vg_queue', data.queue));
        if (data.playHistory)     setPlayHistory(ls('vg_playHistory', data.playHistory));
        if (data.playCounts)      setPlayCounts(ls('vg_playCounts', data.playCounts));
        if (data.listenSecs)      setListenSecs(ls('vg_listenSecs', data.listenSecs));
        if (data.dailyPlays)      setDailyPlays(ls('vg_dailyPlays', data.dailyPlays));
        if (data.firstSeen)       setFirstSeen(ls('vg_firstSeen', data.firstSeen));
        if (data.listeningHistory) setListeningHistory(ls('vg_listeningHistory', data.listeningHistory));
        if (data.shuffle !== undefined) setShuffle(ls('vg_shuffle', data.shuffle));
        if (data.repeatMode)      setRepeatMode(ls('vg_repeat', data.repeatMode));
        if (data.volume !== undefined)  { setVolume(ls('vg_volume', data.volume)); invoke('set_volume', { volume: data.volume }).catch(() => {}); }
        if (data.playbackSpeed)   setPlaybackSpeedState(ls('vg_speed', data.playbackSpeed));
        if (data.eq)              setEqState(ls('vg_eq', data.eq));
        if (data.downloadQuality) setDownloadQuality(ls('vg_dlQuality', data.downloadQuality));
        if (data.downloadFormat)  setDownloadFormatState(ls('vg_dlFormat', data.downloadFormat));
        if (data.downloadPath)    setDownloadPath(ls('vg_dlPath', data.downloadPath));
        if (data.backupPath)      setBackupPath(ls('vg_backupPath', data.backupPath));
        if (data.embedThumbnail !== undefined) setEmbedThumbnailState(ls('vg_embedThumb', data.embedThumbnail));
        if (data.duplicateDetect !== undefined) setDuplicateDetectState(ls('vg_dupDetect', data.duplicateDetect));
        if (data.loudnormEnabled !== undefined) { setLoudnormEnabledState(ls('vg_loudnorm', data.loudnormEnabled)); invoke('set_loudnorm_enabled', { enabled: data.loudnormEnabled }).catch(() => {}); }
        if (data.skipSilence !== undefined) { setSkipSilenceState(ls('vg_skipSilence', data.skipSilence)); invoke('set_skip_silence', { enabled: data.skipSilence }).catch(() => {}); }
        if (data.searchHistory)   setSearchHistory(ls('vg_searchHistory', data.searchHistory));
        if (data.quickPicks)      setQuickPicks(ls('vg_quickPicks', data.quickPicks));
        if (data.currentTrack)    { setCurrentTrack(data.currentTrack); currentTrackRef.current = data.currentTrack; }

        showToast('Backup restored — all data loaded');
      } catch (err) {
        showToast(`Restore failed: could not read file (${err})`);
      }
    };
    input.click();
  }, [showToast, setBackupPath]);

  const fetchAutoplayTracks = useCallback(async (videoId: string) => {
    try {
      const url = `https://www.youtube.com/playlist?list=RD${videoId}`;
      const raw = await invoke<string>('import_youtube_playlist', { url });
      const lines = raw.trim().split('\n').filter(Boolean);
      const parsed = lines.map(l => {
        const parts = l.split('====');
        if (parts.length < 4) return null;
        const [id, title, duration, thumb, artist] = parts;
        const idTrim = id?.trim() || '';
        const thumbTrim = thumb?.trim() || '';
        const cover = (thumbTrim && thumbTrim.startsWith('http'))
          ? thumbTrim
          : (idTrim ? `https://i.ytimg.com/vi/${idTrim}/mqdefault.jpg` : '');

        let parsedArtist = artist?.trim() || '';
        if (parsedArtist.toLowerCase().endsWith(' - topic')) {
          parsedArtist = parsedArtist.slice(0, -8).trim();
        }

        return {
          id: -1,
          title: title?.trim() || 'Unknown',
          artist: cleanArtist(parsedArtist) || 'Autoplay Recommendation',
          url: `https://www.youtube.com/watch?v=${idTrim}`,
          cover,
          duration: duration?.trim() || '3:00',
        } as Track;
      }).filter((t): t is NonNullable<typeof t> => t !== null && !!t.url && !t.url.includes('undefined'));
      return parsed;
    } catch {
      return [];
    }
  }, []);

  const getOrSearchVideoId = useCallback(async (track: Track): Promise<string | null> => {
    const ytIdMatch = track.url.match(/(?:v=|\/vi\/|youtu\.be\/|embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (ytIdMatch) return ytIdMatch[1];
    
    try {
      const q = `${track.title} ${track.artist}`;
      const res = await invoke<string>('search_youtube', { query: q });
      const lines = res.trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const parts = lines[0].split('====');
        if (parts.length >= 4) return parts[3].trim();
      }
    } catch {}
    return null;
  }, []);

  const handlePlayTrack = useCallback(async (track: Track, fromQueue = false) => {
    endDetectedRef.current = false;
    setAbLoop({ a: null, b: null }); 
    abLoopRef.current = { a: null, b: null };
    setCurrentTrack(track); 
    currentTrackRef.current = track;
    setCurrentLocalPath(null); 
    currentLocalPathRef.current = null;
    setIsLoadingTrack(true); 
    setIsPlayingSync(false);
    setProgressSeconds(0); 
    progressSecondsRef.current = 0;
    setTrackDurationSeconds(0); 
    trackDurationRef.current = 0;
    setWaveformData([]); 
    setAudioInfo(null);
    setLyricsData(null); 

    setPlayCounts(prev => { 
      const n = { ...prev, [track.url]: (prev[track.url] || 0) + 1 }; 
      saveLS('vg_playCounts', n); 
      return n; 
    });
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    setDailyPlays(prev => { 
      const n = { ...prev, [today]: (prev[today] || 0) + 1 }; 
      saveLS('vg_dailyPlays', n); 
      return n; 
    });
    setFirstSeen(prev => { 
      if (prev[track.url]) return prev; 
      const n = { ...prev, [track.url]: new Date().toISOString() }; 
      saveLS('vg_firstSeen', n); 
      return n; 
    });
    setListeningHistory(prev => [{ url: track.url, playedAt: new Date().toISOString(), secs: 0 }, ...prev].slice(0, 300));

    if (!fromQueue) {
      setPlayHistory(prev => [track, ...prev.filter(t => t.url !== track.url)].slice(0, 50));
      
      if (playlistContextRef.current) {
        const idx = playlistContextRef.current.tracks.findIndex(t => t.url === track.url);
        if (idx >= 0) playlistContextRef.current = { ...playlistContextRef.current, index: idx };
        else playlistContextRef.current = null; 
      }
    }
    setQuickPicks(prev => [track, ...prev.filter(t => t.url !== track.url)].slice(0, 20));

    try {
      await invoke('play_audio', { url: track.url });
      await invoke('set_volume', { volume });
      await invoke('set_playback_speed', { speed: playbackSpeed });
      await invoke('set_equalizer', { bass: eq.bass, mid: eq.mid, treble: eq.treble });

      let waited = 0;
      await new Promise<void>(resolve => {
        const t = setInterval(async () => {
          waited += 200;
          try {
            const s: { position: number; duration: number; playing: boolean; paused: boolean } = await invoke('get_playback_state');
            if (s.duration > 0 || s.playing) {
              if (s.duration > 0) { 
                setTrackDurationSeconds(s.duration); 
                trackDurationRef.current = s.duration; 
              }
              
              if (s.paused) { 
                invoke('pause_audio').catch(() => {}); 
              }
              clearInterval(t); 
              resolve(); 
              return;
            }
          } catch {}
          if (waited >= 12000) { 
            clearInterval(t); 
            resolve(); 
          }
        }, 200);
      });

      setIsPlayingSync(true);

      let codecWaited = 0;
      const codecPoll = setInterval(async () => {
        codecWaited += 400;
        try {
          const info: AudioInfo = await invoke('get_audio_info');
          if (info?.codec && info.codec !== 'unknown' && info.codec !== '') {
            setAudioInfo(info);
            clearInterval(codecPoll);
          }
        } catch {}
        if (codecWaited >= 6000) clearInterval(codecPoll);
      }, 400);

      const bm = bookmarksRef.current[track.url];
      if (bm && bm > 2) {
        setTimeout(() => invoke('seek_audio', { time: bm }).catch(() => {}), 800);
      }
    } catch { 
      setIsPlayingSync(false); 
    } finally { 
      setIsLoadingTrack(false); 
    }
  }, [volume, playbackSpeed, eq, setIsPlayingSync]);

  const handlePlayLocalTrack = useCallback(async (local: LocalTrack, localList?: LocalTrack[], localIndex?: number) => {
    endDetectedRef.current = false;
    setCurrentLocalPath(local.path); 
    currentLocalPathRef.current = local.path;
    
    if (localList !== undefined) {
      localTracksListRef.current = localList;
      localTrackIndexRef.current = localIndex ?? 0;
    } else if (localTracksListRef.current.length === 0) {
      localTracksListRef.current = [local];
      localTrackIndexRef.current = 0;
    } else {
      const idx = localTracksListRef.current.findIndex(t => t.path === local.path);
      if (idx >= 0) localTrackIndexRef.current = idx;
    }

    setIsLoadingTrack(false); 
    setIsPlayingSync(false);
    setProgressSeconds(0); 
    progressSecondsRef.current = 0;
    setTrackDurationSeconds(0); 
    trackDurationRef.current = 0;
    setAudioInfo(null);

    let cover = '';
    if (local.has_cover) {
      try {
        const coverB64 = await invoke<string | null>('get_audio_cover', { path: local.path });
        if (coverB64) {
          cover = coverB64;
        }
      } catch {}
    }

    const synth: Track = {
      id: -1, 
      title: local.title,
      artist: local.artist || local.extension.toUpperCase(),
      duration: local.duration || '0:00',
      url: `local://${local.path}`, 
      cover,
    };
    setCurrentTrack(synth); 
    currentTrackRef.current = synth;
    setPlayHistory(prev => [synth, ...prev.filter(t => t.url !== synth.url)].slice(0, 50));

    if (local.duration && local.duration !== '0:00') {
      const d = parseDurationToSeconds(local.duration);
      if (d > 0) { 
        setTrackDurationSeconds(d); 
        trackDurationRef.current = d; 
      }
    }

    invoke<number[]>('get_waveform_thumbnail', { path: local.path })
      .then(setWaveformData).catch(() => setWaveformData([]));

    try {
      await invoke('play_local_file', { path: local.path });
      await invoke('set_volume', { volume });
      await invoke('set_playback_speed', { speed: playbackSpeed });
      
      setIsPlayingSync(true);
      
      setTimeout(async () => {
        try {
          const s: { position: number; duration: number } = await invoke('get_playback_state');
          if (s.duration > 0) { 
            setTrackDurationSeconds(s.duration); 
            trackDurationRef.current = s.duration; 
          }
        } catch {}
      }, 300);
    } catch { 
      setIsPlayingSync(false); 
    }
  }, [volume, playbackSpeed, setIsPlayingSync]);

  const handleDeleteLocalTrack = useCallback(async (t: LocalTrack) => {
    try { 
      await invoke('delete_local_file', { path: t.path }); 
      showToast(`Deleted: ${t.title}`); 
    } catch (e) { 
      showToast(`Delete failed: ${e}`); 
    }
  }, [showToast]);

  const handleOpenInFileManager = useCallback((p: string) => { 
    invoke('open_in_file_manager', { path: p }).catch(() => {}); 
  }, []);

  const handleSaveMetadata = useCallback(async (title: string, artist: string, album: string) => {
    if (!metadataEditingTrack) return;
    const path = metadataEditingTrack.url.substring(8);
    try {
      await invoke('write_audio_metadata', { path, title, artist, album });
      const newPath: string = await invoke('rename_local_file', { oldPath: path, newTitle: title.trim() });
      const newUrl = `local://${newPath}`;
      
      const updateSynthesizedTrack = (t: Track | null): Track | null => {
        if (!t || t.url !== metadataEditingTrack.url) return t;
        return { ...t, title, artist, url: newUrl };
      };
      
      if (currentTrack && currentTrack.url === metadataEditingTrack.url) {
        setCurrentTrack(updateSynthesizedTrack(currentTrack));
      }
      
      setQueue(prev => prev.map(t => t.url === metadataEditingTrack.url ? (updateSynthesizedTrack(t) || t) : t));
      setPlayHistory(prev => prev.map(t => t.url === metadataEditingTrack.url ? (updateSynthesizedTrack(t) || t) : t));
      
      setPlaylists(prev => prev.map(pl => ({
        ...pl,
        tracks: pl.tracks.map(t => t.url === metadataEditingTrack.url ? (updateSynthesizedTrack(t) || t) : t)
      })));
      
      if (downloadsPanelSetTracksRef.current) {
        downloadsPanelSetTracksRef.current(prev => prev.map(t => t.path === path ? { ...t, title, artist, path: newPath } : t));
      }
      
      showToast('Metadata updated successfully');
      setMetadataEditingTrack(null);
      setLocalRefreshNonce(prev => prev + 1);
    } catch (e) {
      showToast(`Failed to save metadata: ${e}`);
      throw e;
    }
  }, [metadataEditingTrack, currentTrack, showToast]);

  const handleExportM3u = useCallback(async (localTracks: LocalTrack[]) => {
    try {
      const m3uTracks = localTracks.map(t => ({ 
        title: t.title, 
        artist: t.artist || '', 
        url: t.path, 
        duration_secs: t.duration ? Math.round(parseDurationToSeconds(t.duration)) : 0 
      }));
      await invoke('export_playlist_m3u', { tracks: m3uTracks, path: `${downloadPath}/playlist.m3u` });
      showToast('Playlist exported');
    } catch (e) { 
      showToast(`Export failed: ${e}`); 
    }
  }, [downloadPath, showToast]);

  const handleExportPlaylistM3u = useCallback(async (playlist: Playlist) => {
    try {
      const m3uTracks = playlist.tracks.map(t => ({
        title: t.title, 
        artist: t.artist || '',
        url: t.url,
        duration_secs: t.duration ? Math.round(parseDurationToSeconds(t.duration)) : 0,
      }));
      const safeName = playlist.name.replace(/[/\\:*?"<>|]/g, '_');
      const path = `${downloadPath}/${safeName}.m3u`;
      await invoke('export_playlist_m3u', { tracks: m3uTracks, path });
      showToast(`Exported "${playlist.name}" to ${path}`);
    } catch (e) { 
      showToast(`Export failed: ${e}`); 
    }
  }, [downloadPath, showToast]);

  const handleImportPlaylistM3u = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.m3u,.m3u8';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async (e) => {
      document.body.removeChild(input);
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) { showToast('Empty M3U file'); return; }

        const importedTracks: Track[] = [];
        let pendingTitle = '';
        let pendingArtist = '';

        for (const line of lines) {
          if (line.startsWith('#EXTINF:')) {
            const meta = line.slice(line.indexOf(',') + 1);
            const dashIdx = meta.indexOf(' - ');
            if (dashIdx !== -1) {
              pendingArtist = meta.slice(0, dashIdx).trim();
              pendingTitle  = meta.slice(dashIdx + 3).trim();
            } else {
              pendingTitle  = meta.trim();
              pendingArtist = '';
            }
          } else if (!line.startsWith('#')) {
            const url = line;
            const ytId = url.match(/(?:[?&]v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || '';
            if (!pendingTitle) {
              pendingTitle = ytId
                ? 'YouTube Track'
                : url.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Track';
            }
            importedTracks.push({
              id: Date.now() + importedTracks.length,
              title:  pendingTitle,
              artist: pendingArtist,
              duration: '0:00',
              url,
              cover: ytId ? `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg` : '',
            });
            pendingTitle = '';
            pendingArtist = '';
          }
        }

        if (!importedTracks.length) { showToast('No tracks found in M3U file'); return; }
        const name = file.name.replace(/\.m3u8?$/i, '');
        setPlaylists(prev => [...prev, {
          id: `pl_${Date.now()}`,
          name,
          description: `Imported from ${file.name}`,
          tracks: importedTracks,
        }]);
        showToast(`Imported "${name}" — ${importedTracks.length} track${importedTracks.length !== 1 ? 's' : ''}`);
      } catch (err) {
        showToast(`Import failed: ${err}`);
      }
    };
    input.click();
  }, [showToast]);

  const handlePlayInContext = useCallback((track: Track, contextList: Track[]) => {
    const idx = contextList.findIndex(t => t.url === track.url);
    playlistContextRef.current = { tracks: contextList, index: Math.max(0, idx) };
    setQueue([]);
    setPlayHistory(prev => [track, ...prev.filter(t => t.url !== track.url)].slice(0, 50));
    handlePlayTrack(track, true);
  }, [handlePlayTrack]);

  const togglePlayPause = useCallback(async () => {
    if (!currentTrackRef.current) return;
    
    if (!isPlayingRef.current) {
      try {
        const state: { playing: boolean; paused: boolean; position: number; duration: number; eof_reached: boolean } =
          await invoke('get_playback_state');
        if (state.position === 0 && !state.paused) {
          await handlePlayTrack(currentTrackRef.current, true);
          return;
        }
      } catch {
        await handlePlayTrack(currentTrackRef.current, true);
        return;
      }
    }
    try { 
      await invoke('pause_audio'); 
      setIsPlayingSync(!isPlayingRef.current); 
    } catch {}
  }, [setIsPlayingSync, handlePlayTrack]);

  const toggleMute = useCallback(async () => {
    const v = volume === 0 ? previousVolume : 0;
    if (volume > 0) setPreviousVolume(volume);
    setVolume(v);
    try { await invoke('set_volume', { volume: v }); } catch {}
  }, [volume, previousVolume]);

  const handleSkipForward = useCallback(async () => {
    const track = currentTrackRef.current;
    const isLocal = track?.url?.startsWith('local://');

    if (isLocal) {
      const list = localTracksListRef.current;
      const idx = localTrackIndexRef.current;
      let nextIdx: number;
      if (shuffle) {
        do { nextIdx = Math.floor(Math.random() * list.length); } while (nextIdx === idx && list.length > 1);
      } else {
        nextIdx = idx + 1;
      }
      if (nextIdx < list.length) {
        localTrackIndexRef.current = nextIdx;
        handlePlayLocalTrack(list[nextIdx], list, nextIdx);
      } else if (repeatModeRef.current === 'all' && list.length > 0) {
        localTrackIndexRef.current = 0;
        handlePlayLocalTrack(list[0], list, 0);
      }
      return;
    }

    const ctx = playlistContextRef.current;
    if (ctx && ctx.tracks.length > 1) {
      let nextIdx: number;
      if (shuffle) {
        do { nextIdx = Math.floor(Math.random() * ctx.tracks.length); }
        while (nextIdx === ctx.index && ctx.tracks.length > 1);
      } else {
        nextIdx = ctx.index + 1;
      }
      if (nextIdx < ctx.tracks.length) {
        playlistContextRef.current = { ...ctx, index: nextIdx };
        await handlePlayTrack(ctx.tracks[nextIdx], true);
      } else if (repeatModeRef.current === 'all') {
        playlistContextRef.current = { ...ctx, index: 0 };
        await handlePlayTrack(ctx.tracks[0], true);
      }
      return;
    }

    const q = queueRef.current;
    if (q.length > 0) { 
      const [next, ...rest] = q; 
      setQueue(rest); 
      await handlePlayTrack(next, true); 
    }
  }, [handlePlayTrack, handlePlayLocalTrack, shuffle]);

  const handleSkipBack = useCallback(async () => {
    const track = currentTrackRef.current;
    const isLocal = track?.url?.startsWith('local://');

    if (isLocal) {
      if (progressSecondsRef.current > 3) {
        await invoke('seek_audio', { time: 0 }).catch(() => {});
        progressSecondsRef.current = 0; 
        setProgressSeconds(0);
        return;
      }
      const list = localTracksListRef.current;
      const idx = localTrackIndexRef.current;
      if (idx > 0) {
        const prevIdx = idx - 1;
        localTrackIndexRef.current = prevIdx;
        handlePlayLocalTrack(list[prevIdx], list, prevIdx);
      } else {
        await invoke('seek_audio', { time: 0 }).catch(() => {});
        progressSecondsRef.current = 0; 
        setProgressSeconds(0);
      }
      return;
    }

    if (progressSecondsRef.current > 3) {
      await invoke('seek_audio', { time: 0 }).catch(() => {});
      progressSecondsRef.current = 0; 
      setProgressSeconds(0);
      return;
    }

    const ctx = playlistContextRef.current;
    if (ctx && ctx.index > 0) {
      const prevIdx = ctx.index - 1;
      playlistContextRef.current = { ...ctx, index: prevIdx };
      await handlePlayTrack(ctx.tracks[prevIdx], true);
      return;
    }

    if (playHistory.length > 0) {
      const [prev, ...rest] = playHistory; 
      setPlayHistory(rest); 
      await handlePlayTrack(prev, true);
    } else {
      await invoke('seek_audio', { time: 0 }).catch(() => {});
      progressSecondsRef.current = 0; 
      setProgressSeconds(0);
    }
  }, [playHistory, handlePlayTrack, handlePlayLocalTrack]);

  const toggleShuffle = useCallback(() => setShuffle(p => { 
    showToast(!p ? 'Shuffle on' : 'Shuffle off'); 
    return !p; 
  }), [showToast]);

  const cycleRepeat = useCallback(() => setRepeatMode(p => {
    const n: RepeatMode = p === 'off' ? 'all' : p === 'all' ? 'one' : 'off';
    repeatModeRef.current = n;
    showToast(n === 'off' ? 'Repeat off' : n === 'all' ? 'Repeat all' : 'Repeat one');
    return n;
  }), [showToast]);

  const handleTrackEnd = useCallback(() => {
    if (endDetectedRef.current) return;
    endDetectedRef.current = true;
    const track = currentTrackRef.current;
    const repeat = repeatModeRef.current;
    const isLocal = track?.url?.startsWith('local://');

    if (repeat === 'one' && track) {
      invoke('seek_to_start').catch(() => {
        invoke('seek_audio', { time: 0 }).catch(() => {});
      });
      progressSecondsRef.current = 0;
      setProgressSeconds(0);
      setIsPlayingSync(true);
      setTimeout(() => { endDetectedRef.current = false; }, 1500);
      return;
    }

    if (isLocal) {
      const list = localTracksListRef.current;
      const idx = localTrackIndexRef.current;
      if (list.length > 1) {
        let nextIdx: number;
        if (shuffle) {
          do { nextIdx = Math.floor(Math.random() * list.length); } while (nextIdx === idx && list.length > 1);
        } else {
          nextIdx = idx + 1;
        }
        if (nextIdx < list.length) {
          localTrackIndexRef.current = nextIdx;
          setTimeout(() => handlePlayLocalTrack(list[nextIdx], list, nextIdx), 0);
          return;
        } else if (repeat === 'all') {
          localTrackIndexRef.current = 0;
          setTimeout(() => handlePlayLocalTrack(list[0], list, 0), 0);
          return;
        }
      } else if (repeat === 'all' && list.length === 1) {
        invoke('seek_to_start').catch(() => {});
        progressSecondsRef.current = 0; 
        setProgressSeconds(0);
        setIsPlayingSync(true);
        setTimeout(() => { endDetectedRef.current = false; }, 1500);
        return;
      }
      setIsPlayingSync(false);
      return;
    }

    const q = queueRef.current;
    if (q.length > 0) {
      const [next, ...rest] = q;
      queueRef.current = rest;
      setQueue(rest);
      setTimeout(() => handlePlayTrack(next, true), 0);
      return;
    }

    const ctx = playlistContextRef.current;
    if (ctx && ctx.tracks.length > 1) {
      let nextIdx: number;
      if (shuffle) {
        do { nextIdx = Math.floor(Math.random() * ctx.tracks.length); }
        while (nextIdx === ctx.index && ctx.tracks.length > 1);
      } else {
        nextIdx = ctx.index + 1;
      }
      if (nextIdx < ctx.tracks.length) {
        playlistContextRef.current = { ...ctx, index: nextIdx };
        setTimeout(() => handlePlayTrack(ctx.tracks[nextIdx], true), 0);
        return;
      } else if (repeat === 'all') {
        playlistContextRef.current = { ...ctx, index: 0 };
        setTimeout(() => handlePlayTrack(ctx.tracks[0], true), 0);
        return;
      }
    }

    if (repeat === 'all' && track) {
      setTimeout(() => handlePlayTrack(track, true), 0);
      return;
    }

    if (autoplayEnabled && track) {
      setIsLoadingTrack(true);
      getOrSearchVideoId(track).then(videoId => {
        if (videoId) {
          fetchAutoplayTracks(videoId).then(async (recs) => {
            if (recs.length > 0) {
              const filteredRecs = recs.filter(r => r.url !== track.url && !playHistory.some(h => h.url === r.url));
              const toAdd = filteredRecs.slice(0, 10);
              if (toAdd.length > 0) {
                const [next, ...rest] = toAdd;
                queueRef.current = rest;
                setQueue(rest);
                showToast("Autoplay: Queueing recommendations");
                await handlePlayTrack(next, true);
                return;
              }
            }
            setIsPlayingSync(false);
            setIsLoadingTrack(false);
          });
        } else {
          setIsPlayingSync(false);
          setIsLoadingTrack(false);
        }
      });
      return;
    }

    setIsPlayingSync(false);
  }, [handlePlayTrack, handlePlayLocalTrack, setIsPlayingSync, shuffle, autoplayEnabled, getOrSearchVideoId, fetchAutoplayTracks, playHistory, showToast]);

  useEffect(() => {
    const poll = async () => {
      if (isDraggingProgressRef.current) return;
      try {
        const s: { playing: boolean; paused: boolean; position: number; duration: number; eof_reached: boolean } =
          await invoke('get_playback_state');

        progressSecondsRef.current = s.position;
        setProgressSeconds(s.position);
        
        const ab = abLoopRef.current;
        if (ab.a !== null && ab.b !== null && s.position >= ab.b) {
          invoke('seek_audio', { time: ab.a }).catch(() => {});
        }

        if (s.duration > 0 && s.duration !== trackDurationRef.current) {
          trackDurationRef.current = s.duration; 
          setTrackDurationSeconds(s.duration);
        }

        if (!isLoadingTrack && !endDetectedRef.current) {
          const playing = !s.paused;
          if (playing !== isPlayingRef.current) setIsPlayingSync(playing);
        }

        if (!s.eof_reached && !endDetectedRef.current && s.position > 3 && s.duration > 0
            && crossfadeSeconds > 0 && s.position >= s.duration - crossfadeSeconds - 0.5
            && s.position < s.duration - 0.2) {
          
          const fadeSteps = Math.max(1, Math.round(crossfadeSeconds * 5));
          const volStep = (volume / fadeSteps);
          let step = 0;
          const fadeInterval = setInterval(() => {
            step++;
            const newVol = Math.max(0, volume - volStep * step);
            invoke('set_volume', { volume: newVol }).catch(() => {});
            if (step >= fadeSteps) {
              clearInterval(fadeInterval);
              invoke('set_volume', { volume }).catch(() => {}); 
              if (!endDetectedRef.current) handleTrackEnd();
            }
          }, (crossfadeSeconds * 1000) / fadeSteps);
          
          return;
        }
        
        if (s.eof_reached && !endDetectedRef.current && s.position > 3) {
          handleTrackEnd();
          return;
        }
        
        if (!s.eof_reached && !endDetectedRef.current && s.position > 3 && s.duration > 0 && s.position >= s.duration - 1.0) {
          handleTrackEnd();
        }
      } catch {}
    };

    const id = setInterval(poll, isPlaying ? 500 : 2000);
    return () => clearInterval(id);
  }, [isPlaying, isLoadingTrack, handleTrackEnd, setIsPlayingSync, crossfadeSeconds, volume]);

  const handleSelectDirectory = useCallback(async () => {
    try {
      const sel = await open({ directory: true, multiple: false, defaultPath: downloadPath });
      if (sel) setDownloadPath(sel as string);
    } catch {}
  }, [downloadPath]);

  const updateProgressFromEvent = useCallback((clientX: number) => {
    if (!progressRef.current || !currentTrackRef.current) return undefined;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const total = trackDurationRef.current || parseDurationToSeconds(currentTrackRef.current.duration);
    const t = total * pct;
    progressSecondsRef.current = t; 
    setProgressSeconds(t);
    return t;
  }, []);

  const updateVolumeFromEvent = useCallback((clientX: number) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const v = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setVolume(v); 
    invoke('set_volume', { volume: v }).catch(() => {});
  }, []);

  const searchMusic = useCallback(async (override?: string) => {
    const q = (override ?? searchQuery).trim();
    if (!q || isSearching) return;
    setIsSearching(true); 
    setTracks([]); 
    setShowHistory(false); 
    setHasSearched(true);
    setSearchHistory(prev => [q, ...prev.filter(h => h !== q)].slice(0, 8));
    try {
      const res: string = await invoke('search_youtube', { query: q });
      const parsed = res.trim().split('\n').filter(Boolean).map((line, i) => {
        const [title, artist, duration, id] = line.split('====');
        const cleanId = id?.trim();
        return { 
          id: i, 
          title: title?.trim() || '', 
          artist: cleanArtist(artist), 
          duration: duration?.trim() || '0:00', 
          url: `https://youtube.com/watch?v=${cleanId}`, 
          cover: `https://i.ytimg.com/vi/${cleanId}/mqdefault.jpg` 
        };
      });
      setTracks(parsed);
      parsed.slice(0, 5).forEach(track => {
        if (track.url) invoke('prefetch_track', { url: track.url }).catch(() => {});
      });
    } catch { 
      setTracks([]); 
    } finally { 
      setIsSearching(false); 
    }
  }, [searchQuery, isSearching]);

  const openCtx = useCallback((e: React.MouseEvent, menu: Omit<CtxMenu, 'x' | 'y'>) => {
    e.preventDefault(); 
    e.stopPropagation();
    const { x, y } = clampMenu(e.clientX, e.clientY);
    setCtxMenu({ x, y, ...menu });
  }, []);

  const handleDownload = useCallback(async (track: Track) => {
    if (duplicateDetect) {
      try {
        const scanned: LocalTrack[] = await invoke('scan_downloads', { path: downloadPath });
        const existing = scanned.map(t => t.title.toLowerCase());
        if (existing.includes(track.title.toLowerCase())) {
          showToast(`Already downloaded: ${track.title}`);
          return;
        }
      } catch { /* proceed if check fails */ }
    }
    setDownloadingTracks(p => ({ ...p, [track.url]: 1 }));
    let prog = 1;
    const progInterval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 8, 90);
      setDownloadingTracks(p => p[track.url] !== undefined ? { ...p, [track.url]: prog } : p);
    }, 400);
    try {
      await invoke('download_song', { url: track.url, quality: downloadQuality, format: downloadFormat, embedThumbnail, path: downloadPath });
      clearInterval(progInterval);
      setDownloadingTracks(p => ({ ...p, [track.url]: 100 }));
      setTimeout(() => setDownloadingTracks(p => { const n = {...p}; delete n[track.url]; return n; }), 1200);
      showToast(`Downloaded: ${track.title}`);
    } catch {
      clearInterval(progInterval);
      setDownloadingTracks(p => { const n = {...p}; delete n[track.url]; return n; });
      showToast('Download failed');
    }
  }, [downloadQuality, downloadFormat, embedThumbnail, duplicateDetect, downloadPath, showToast]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (typeof navigator?.clipboard?.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text; 
        el.style.position = 'fixed'; 
        el.style.opacity = '0';
        document.body.appendChild(el); 
        el.select();
        document.execCommand('copy'); 
        document.body.removeChild(el);
      }
      showToast('Copied!');
    } catch { 
      showToast('Copy failed'); 
    }
  }, [showToast]);

  const openInYouTube = useCallback(async (u: string) => {
    if (!u || (!u.startsWith('http://') && !u.startsWith('https://'))) return;
    try {
      await invoke('open_url_in_browser', { url: u });
    } catch {
      try { await openUrl(u); } catch { window.open(u, '_blank'); }
    }
  }, []);

  const confirmCreatePlaylist = useCallback(() => {
    if (!newPlaylistName.trim()) return;
    setPlaylists(p => [...p, { id: `p${Date.now()}`, name: newPlaylistName.trim(), description: newPlaylistDesc.trim(), tracks: [] }]);
    setIsPlaylistModalOpen(false); 
    setNewPlaylistName(''); 
    setNewPlaylistDesc('');
    showToast(`Playlist "${newPlaylistName.trim()}" created`);
  }, [newPlaylistName, newPlaylistDesc, showToast]);

  const deletePlaylist = useCallback((id: string) => {
    if (id === 'p1') return;
    setPlaylists(p => p.filter(x => x.id !== id));
    setOpenPlaylistId(prev => prev === id ? null : prev);
    showToast('Playlist deleted');
  }, [showToast]);

  const confirmRenamePlaylist = useCallback(() => {
    if (!renameVal.trim() || !renamingPlaylist) return;
    setPlaylists(p => p.map(x => x.id === renamingPlaylist.id ? { ...x, name: renameVal.trim(), description: renameDescVal.trim() } : x));
    setRenamingPlaylist(null); 
    showToast('Playlist updated');
  }, [renameVal, renameDescVal, renamingPlaylist, showToast]);

  const toggleLikeTrack = useCallback((t: Track) => {
    setPlaylists(p => p.map(x => {
      if (x.id !== 'p1') return x;
      const liked = x.tracks.some(y => y.url === t.url);
      return { ...x, tracks: liked ? x.tracks.filter(y => y.url !== t.url) : [...x.tracks, t] };
    }));
  }, []);

  const addTrackToPlaylist = useCallback((pid: string, t: Track) => {
    setPlaylists(p => p.map(x => {
      if (x.id !== pid) return x;
      if (x.tracks.some(y => y.url === t.url)) { 
        showToast('Already in playlist'); 
        return x; 
      }
      showToast(`Added to ${x.name}`); 
      return { ...x, tracks: [...x.tracks, t] };
    }));
    setAddToPlaylistTrack(null); 
    setCtxMenu(null);
  }, [showToast]);

  const removeFromPlaylist = useCallback((pid: string, url: string) => {
    setPlaylists(p => p.map(x => x.id !== pid ? x : { ...x, tracks: x.tracks.filter(t => t.url !== url) }));
    showToast('Removed from playlist');
  }, [showToast]);

  const handleCoverUpload = useCallback((pid: string) => {
    const inp = document.createElement('input'); 
    inp.type = 'file'; 
    inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(inp);
    inp.onchange = e => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) {
        const r = new FileReader();
        r.onload = ev => {
          const d = ev.target?.result as string;
          if (d) { 
            setPlaylists(p => p.map(x => x.id === pid ? { ...x, customCover: d } : x)); 
            showToast('Cover updated'); 
          }
        };
        r.readAsDataURL(f);
      }
      inp.remove();
    };
    inp.oncancel = () => inp.remove();
    inp.click();
  }, [showToast]);

  const isTrackLiked = useCallback((url: string) => playlists.find(p => p.id === 'p1')?.tracks.some(t => t.url === url) || false, [playlists]);

  const playAll = useCallback((list: Track[]) => {
    if (!list.length) return;
    const sorted = shuffle ? [...list].sort(() => Math.random() - 0.5) : [...list];
    playlistContextRef.current = { tracks: sorted, index: 0 };
    handlePlayTrack(sorted[0], true); 
    setQueue(sorted.slice(1));
    showToast(shuffle ? 'Shuffle playing all' : 'Playing all');
  }, [shuffle, handlePlayTrack, showToast]);

  const removeFromQueue = useCallback((url: string) => setQueue(p => p.filter(q => q.url !== url)), []);

  const removeFromQueueByIndex = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleSaveQueueAsPlaylist = useCallback(() => {
    if (queue.length === 0) return;
    const name = `Queue - ${new Date().toLocaleDateString()}`;
    const newPlaylist = {
      id: `p${Date.now()}`,
      name,
      description: 'Saved from active queue',
      tracks: [...queue]
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    showToast('Queue saved as playlist');
  }, [queue, setPlaylists, showToast]);

  const calculateProgressPercent = useCallback(() => {
    const total = trackDurationSeconds || parseDurationToSeconds(currentTrack?.duration || '0:00');
    return total === 0 ? 0 : Math.min((progressSeconds / total) * 100, 100);
  }, [progressSeconds, trackDurationSeconds, currentTrack]);

  return {
    isHydrated, setIsHydrated,
    logoHovered, setLogoHovered,
    tracks, setTracks,
    localRefreshNonce, setLocalRefreshNonce,
    searchQuery, setSearchQuery,
    searchHistory, setSearchHistory,
    showHistory, setShowHistory,
    currentTrack, setCurrentTrack,
    currentLocalPath, setCurrentLocalPath,
    isPlaying, setIsPlaying,
    isLoadingTrack, setIsLoadingTrack,
    activeNav, setActiveNav,
    updateAvailable, setUpdateAvailable,
    appVersion, setAppVersion,
    trackDurationSeconds, setTrackDurationSeconds,
    progressSeconds, setProgressSeconds,
    isSearching, setIsSearching,
    quickPicks, setQuickPicks,
    queue, setQueue,
    queuePulseKey, setQueuePulseKey,
    playHistory, setPlayHistory,
    playCounts, setPlayCounts,
    listenSecs, setListenSecs,
    firstSeen, setFirstSeen,
    dailyPlays, setDailyPlays,
    listeningHistory, setListeningHistory,
    statsTimeRange, setStatsTimeRange,
    theme, setThemeState,
    accentColor, setAccentColorState,
    customBgColor, setCustomBgColorState,
    shuffle, setShuffle,
    repeatMode, setRepeatMode,
    isQueueOpen, setIsQueueOpen,
    showClearConfirm, setShowClearConfirm,
    discordRpcEnabled, setDiscordRpcEnabled,
    dragOverQueueIdx, setDragOverQueueIdx,
    volume, setVolume,
    previousVolume, setPreviousVolume,
    isDraggingProgress, setIsDraggingProgress,
    isDraggingVolume, setIsDraggingVolume,
    playlists, setPlaylists,
    openPlaylistId, setOpenPlaylistId,
    playlistSearchQ, setPlaylistSearchQ,
    isPlaylistModalOpen, setIsPlaylistModalOpen,
    confirmModal, setConfirmModal,
    newPlaylistName, setNewPlaylistName,
    newPlaylistDesc, setNewPlaylistDesc,
    renamingPlaylist, setRenamingPlaylist,
    showCsvImportModal, setShowCsvImportModal,
    showYtImportModal, setShowYtImportModal,
    showDuplicatesPlaylist, setShowDuplicatesPlaylist,
    bulkEditPlaylist, setBulkEditPlaylist,
    renameVal, setRenameVal,
    renameDescVal, setRenameDescVal,
    addToPlaylistTrack, setAddToPlaylistTrack,
    sidebarPlaylistsExpanded, setSidebarPlaylistsExpanded,
    bgImport, setBgImport,
    pendingSpotifyImport, setPendingSpotifyImport,
    showLyrics, setShowLyrics,
    lyricsData, setLyricsData,
    lyricsLoading, setLyricsLoading,
    artistThumbs, setArtistThumbs,
    ctxMenu, setCtxMenu,
    infoModalTrack, setInfoModalTrack,
    downloadingTracks, setDownloadingTracks,
    hoveredTrackUrl, setHoveredTrackUrl,
    toast, setToast,
    downloadQuality, setDownloadQuality,
    downloadFormat, setDownloadFormatState,
    embedThumbnail, setEmbedThumbnailState,
    duplicateDetect, setDuplicateDetectState,
    autoCheckUpdates, setAutoCheckUpdatesState,
    isCheckingUpdate, setIsCheckingUpdate,
    downloadPath, setDownloadPath,
    backupPath, setBackupPathState,
    playbackSpeed, setPlaybackSpeedState,
    crossfadeSeconds, setCrossfadeSeconds,
    loudnormEnabled, setLoudnormEnabledState,
    skipSilence, setSkipSilenceState,
    lyricsSource, setLyricsSource,
    trayEnabled, setTrayEnabled,
    autoplayEnabled, setAutoplayEnabled,
    metadataEditingTrack, setMetadataEditingTrack,
    audioDevices, setAudioDevices,
    switchingDevice, setSwitchingDevice,
    showShortcuts, setShowShortcuts,
    abLoop, setAbLoop,
    eq, setEqState,
    sleepTimer, setSleepTimerState,
    audioInfo, setAudioInfo,
    waveformData, setWaveformData,
    showSleepPopover, setShowSleepPopover,
    
    // Refs
    isPlayingRef,
    currentLocalPathRef,
    trackDurationRef,
    progressSecondsRef,
    repeatModeRef,
    dragQueueIdx,
    dragOverQueueIdxRef,
    progressRef,
    volumeRef,
    listenSecsRef,
    toastTimer,
    bookmarksRef,
    abLoopRef,
    currentTrackRef,
    queueRef,
    localTracksListRef,
    localTrackIndexRef,
    playlistContextRef,
    downloadsPanelSetTracksRef,
    searchRef,
    isDraggingProgressRef,

    // Callbacks & Helpers
    setIsPlayingSync,
    navigateTo,
    navigateBack,
    setAutoCheckUpdates,
    setBackupPath,
    showToast,
    handleCheckUpdate,
    prefetchOnHover,
    setPlaybackSpeed,
    setSleepTimerMinutes,
    cancelSleepTimer,
    handleBackup,
    handleRestore,
    fetchAutoplayTracks,
    getOrSearchVideoId,
    handlePlayTrack,
    handlePlayLocalTrack,
    handleDeleteLocalTrack,
    handleOpenInFileManager,
    handleSaveMetadata,
    handleExportM3u,
    handleExportPlaylistM3u,
    handleImportPlaylistM3u,
    handlePlayInContext,
    togglePlayPause,
    toggleMute,
    handleSkipForward,
    handleSkipBack,
    toggleShuffle,
    cycleRepeat,
    handleTrackEnd,
    handleSelectDirectory,
    updateProgressFromEvent,
    updateVolumeFromEvent,
    searchMusic,
    openCtx,
    handleDownload,
    copyToClipboard,
    openInYouTube,
    confirmCreatePlaylist,
    deletePlaylist,
    confirmRenamePlaylist,
    toggleLikeTrack,
    addTrackToPlaylist,
    removeFromPlaylist,
    handleCoverUpload,
    isTrackLiked,
    playAll,
    removeFromQueue,
    removeFromQueueByIndex,
    handleSaveQueueAsPlaylist,
    calculateProgressPercent
  };
}
