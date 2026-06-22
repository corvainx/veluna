import { useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { 
  ChevronLeft, X, BarChart2, Search, Clock, Youtube, Gauge, 
  AlignLeft, FileCode2, Music, FileBadge2, Hash, Copy, Share2
} from 'lucide-react';

import { useVeluna } from './hooks/useVeluna';
import { Sidebar } from './components/layout/Sidebar';
import { PlayerBar } from './components/layout/PlayerBar';
import { HomePanel } from './components/panels/HomePanel';
import { SearchPanel } from './components/panels/SearchPanel';
import { QueuePanel } from './components/panels/QueuePanel';
import { LibraryPanel } from './components/panels/LibraryPanel';
import { DownloadsPanel } from './components/panels/DownloadsPanel';
import { StatsPanel } from './components/panels/StatsPanel';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { ContextMenu } from './components/ui/ContextMenu';

import { YtImportModal } from './components/modals/YtImportModal';
import { CsvImportModal } from './components/modals/CsvImportModal';
import { ImportResultModal } from './components/modals/ImportResultModal';
import { MetadataEditModal } from './components/modals/MetadataEditModal';
import { LyricsPanel } from './components/panels/LyricsPanel';
import { CopyButton } from './components/ui/CopyButton';

import { 
  getTrackGradient, saveLS 
} from './utils';
import { Track } from './types';
import "./App.css";

export default function App() {
  const {
    isHydrated,
    logoHovered, setLogoHovered,
    tracks, setTracks,
    localRefreshNonce,
    searchQuery, setSearchQuery,
    searchHistory, setSearchHistory,
    showHistory, setShowHistory,
    currentTrack,
    currentLocalPath,
    isPlaying,
    isLoadingTrack,
    activeNav, setActiveNav,
    updateAvailable,
    appVersion,
    trackDurationSeconds,
    progressSeconds,
    isSearching, setIsSearching,
    quickPicks, setQuickPicks,
    queue, setQueue,
    queuePulseKey,
    playHistory, setPlayHistory,
    playCounts,
    listenSecs,
    listeningHistory, setListeningHistory,
    statsTimeRange, setStatsTimeRange,
    theme, setThemeState,
    accentColor, setAccentColorState,
    customBgColor, setCustomBgColorState,
    shuffle,
    repeatMode,
    isQueueOpen, setIsQueueOpen,
    showClearConfirm, setShowClearConfirm,
    discordRpcEnabled, setDiscordRpcEnabled,
    dragOverQueueIdx, setDragOverQueueIdx,
    volume, setVolume,
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
    lyricsData,
    lyricsLoading,
    ctxMenu, setCtxMenu,
    infoModalTrack, setInfoModalTrack,
    downloadingTracks,
    hoveredTrackUrl, setHoveredTrackUrl,
    toast,
    downloadQuality, setDownloadQuality,
    downloadFormat, setDownloadFormatState,
    embedThumbnail, setEmbedThumbnailState,
    duplicateDetect, setDuplicateDetectState,
    autoCheckUpdates,
    isCheckingUpdate,
    downloadPath,
    backupPath,
    playbackSpeed,
    crossfadeSeconds,
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
    sleepTimer,
    audioInfo,
    waveformData,
    showSleepPopover, setShowSleepPopover,
    dailyPlays,
    
    // Refs
    trackDurationRef,
    progressSecondsRef,
    dragQueueIdx,
    dragOverQueueIdxRef,
    progressRef,
    volumeRef,
    abLoopRef,
    currentTrackRef,
    playlistContextRef,
    downloadsPanelSetTracksRef,
    searchRef,
    isDraggingProgressRef,
    localTracksListRef,

    // Callbacks
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
  } = useVeluna();

  // Scroll wheel on volume element
  useEffect(() => {
    const el = volumeRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setVolume(prev => {
        const next = Math.max(0, Math.min(100, prev + (e.deltaY < 0 ? 5 : -5)));
        invoke('set_volume', { volume: next }).catch(() => {});
        return next;
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [volumeRef, setVolume]);

  // Volume & progress drag effects
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDraggingProgressRef.current) updateProgressFromEvent(e.clientX);
      if (isDraggingVolume) updateVolumeFromEvent(e.clientX);
    };
    const onUp = async (e: MouseEvent) => {
      if (isDraggingProgressRef.current) {
        const t = updateProgressFromEvent(e.clientX);
        if (t !== undefined) await invoke('seek_audio', { time: t }).catch(() => {});
        isDraggingProgressRef.current = false; 
        setIsDraggingProgress(false);
      }
      if (isDraggingVolume) setIsDraggingVolume(false);
    };
    if (isDraggingProgress || isDraggingVolume) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => { 
      window.removeEventListener('mousemove', onMove); 
      window.removeEventListener('mouseup', onUp); 
    };
  }, [isDraggingProgress, isDraggingVolume, updateProgressFromEvent, updateVolumeFromEvent, isDraggingProgressRef, setIsDraggingProgress, setIsDraggingVolume]);

  // Keyboard Shortcuts Effect
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.code === 'Space' && !isInput) { 
        e.preventDefault(); 
        togglePlayPause(); 
      }
      if (e.code === 'ArrowRight' && !isInput && currentTrackRef.current) { 
        e.preventDefault(); 
        invoke('seek_relative', { seconds: 10 }).catch(() => {}); 
      }
      if (e.code === 'ArrowLeft' && !isInput && currentTrackRef.current) { 
        e.preventDefault(); 
        invoke('seek_relative', { seconds: -10 }).catch(() => {}); 
      }
      if (e.code === 'KeyM' && !isInput) toggleMute();
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') { 
        e.preventDefault(); 
        searchRef.current?.focus(); 
      }
      if (e.key === '?' && !isInput) { 
        e.preventDefault(); 
        setShowShortcuts(s => !s); 
      }
      if (e.code === 'Escape') { 
        setShowShortcuts(false); 
        setConfirmModal(null); 
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [togglePlayPause, toggleMute, currentTrackRef, searchRef, setShowShortcuts, setConfirmModal]);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",width:"100%",background:"var(--v-bg0)",color:"var(--v-fg)",overflow:"hidden",fontSize:"16px"}}
      onContextMenu={e => e.preventDefault()}>


      {/* Main app panel wrapper */}
      <div style={{display:"flex",flex:"1 1 0%",minHeight:0,overflow:"hidden"}}>
        <Sidebar
          logoHovered={logoHovered}
          setLogoHovered={setLogoHovered}
          sleepTimer={sleepTimer}
          showSleepPopover={showSleepPopover}
          setShowSleepPopover={setShowSleepPopover}
          setSleepTimerMinutes={setSleepTimerMinutes}
          cancelSleepTimer={cancelSleepTimer}
          activeNav={activeNav}
          navigateTo={navigateTo}
          isQueueOpen={isQueueOpen}
          setIsQueueOpen={setIsQueueOpen}
          queue={queue}
          queuePulseKey={queuePulseKey}
          sidebarPlaylistsExpanded={sidebarPlaylistsExpanded}
          setSidebarPlaylistsExpanded={setSidebarPlaylistsExpanded}
          openPlaylistId={openPlaylistId}
          setOpenPlaylistId={setOpenPlaylistId}
          setIsPlaylistModalOpen={setIsPlaylistModalOpen}
          setNewPlaylistName={setNewPlaylistName}
          setNewPlaylistDesc={setNewPlaylistDesc}
          playlists={playlists}
          openCtx={openCtx}
          onSpotifyImport={() => setShowCsvImportModal(true)}
          onYoutubeImport={() => setShowYtImportModal(true)}
          onM3uImport={handleImportPlaylistM3u}
        />

        {/* Content Area */}
        <div style={{flex:"1 1 0%",display:"flex",flexDirection:"column",background:"var(--v-bg0)",position:"relative",minHeight:0,overflow:"hidden"}}>
          {/* Top Back/Breadcrumb Bar */}
          <div className="v-topbar" style={{background:"var(--v-bg0)",padding:"14px 22px"}}>
            <button
              className="v-topbar__back"
              onClick={() => {
                if (activeNav === 'home' && tracks.length > 0) {
                  setTracks([]); setSearchQuery(''); setIsSearching(false);
                } else {
                  navigateBack();
                }
              }}
              disabled={activeNav === 'home' && tracks.length === 0}
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </button>
            <span className="v-topbar__crumb">
              {activeNav === 'home' ? 'Home' : activeNav === 'downloads' ? 'Offline' : activeNav === 'settings' ? 'Settings' : activeNav === 'stats' ? 'Stats' : activeNav === 'library' ? (openPlaylistId ? 'Playlist' : 'Playlists') : activeNav}
            </span>
          </div>

          <div key={activeNav + (openPlaylistId || '')} style={{animation:'fadeUp 0.2s cubic-bezier(0.25,0,0,1) both',flex:'1 1 0%',display:'flex',flexDirection:'column',minHeight:0,overflow:'hidden'}}>
            {/* 1. HOME PANEL */}
            {activeNav === 'home' && (
              <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                {(isSearching || tracks.length > 0) ? (
                  <SearchPanel
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isSearching={isSearching}
                    searchRef={searchRef}
                    searchHistory={searchHistory}
                    setSearchHistory={setSearchHistory}
                    showHistory={showHistory}
                    setShowHistory={setShowHistory}
                    searchMusic={searchMusic}
                    updateAvailable={updateAvailable}
                    setActiveNav={setActiveNav}
                    tracks={tracks}
                    playAll={playAll}
                    currentTrack={currentTrack}
                    isLoadingTrack={isLoadingTrack}
                    isPlaying={isPlaying}
                    isTrackLiked={isTrackLiked}
                    downloadingTracks={downloadingTracks}
                    handleDownload={handleDownload}
                    toggleLikeTrack={toggleLikeTrack}
                    openCtx={openCtx}
                    handlePlayInContext={handlePlayInContext}
                    prefetchOnHover={prefetchOnHover}
                    hoveredTrackUrl={hoveredTrackUrl}
                    setHoveredTrackUrl={setHoveredTrackUrl}
                  />
                ) : (
                  <>
                    <div style={{padding:"16px 24px 10px",position:"relative",zIndex:30,flexShrink:0,display:"flex",justifyContent:"center"}}>
                      <div className="v-home-search-container" onClick={e=>e.stopPropagation()}>
                        <div style={{position:"relative",flex:1}}>
                          <div style={{position:"absolute",top:0,bottom:0,left:0,paddingLeft:"14px",display:"flex",alignItems:"center",pointerEvents:"none"}}>
                            {isSearching ? (
                              <div style={{width:"15px",height:"15px",border:"2px solid rgba(226,221,217,0.5)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                            ) : (
                              <Search size={16} style={{color:showHistory||searchQuery?"#9e9894":"#5c5755",transition:"color .2s"}}/>
                            )}
                          </div>
                          <input ref={searchRef} type="text"
                            placeholder="Search YouTube..."
                            value={searchQuery} readOnly={isSearching}
                            onChange={e => setSearchQuery(e.target.value)}
                            onFocus={() => !isSearching && setShowHistory(searchHistory.length > 0)}
                            onKeyDown={e => { 
                              if (e.key === 'Enter') { setShowHistory(false); searchMusic(); } 
                              if (e.key === 'Escape') setShowHistory(false); 
                            }}
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
                            <span style={{position:"absolute",top:"5px",right:"5px",width:"6px",height:"6px",borderRadius:"50%",background:"#9e9894"}}/>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar" style={{padding:"24px 30px 30px",zIndex:10}} onClick={() => setShowHistory(false)}>
                      <HomePanel
                        isHydrated={isHydrated}
                        currentTrack={currentTrack}
                        isPlaying={isPlaying}
                        playlists={playlists}
                        playCounts={playCounts}
                        playHistory={playHistory}
                        quickPicks={quickPicks}
                        setQuickPicks={setQuickPicks}
                        handlePlayInContext={handlePlayInContext}
                        openCtx={openCtx}
                        prefetchOnHover={prefetchOnHover}
                        setOpenPlaylistId={setOpenPlaylistId}
                        setActiveNav={setActiveNav}
                        localTracksListRef={localTracksListRef}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 2. OFFLINE DOWNLOADS PANEL */}
            <div style={{ display: activeNav === 'downloads' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
              <DownloadsPanel
                downloadPath={downloadPath} 
                onPlayLocalTrack={handlePlayLocalTrack}
                onDeleteLocalTrack={handleDeleteLocalTrack} 
                currentTrackPath={currentLocalPath}
                isPlaying={isPlaying} 
                isLoadingTrack={isLoadingTrack}
                onOpenInFileManager={handleOpenInFileManager} 
                onExportM3u={handleExportM3u}
                onChangeFolder={handleSelectDirectory}
                activeNav={activeNav}
                refreshNonce={localRefreshNonce}
                setTracksRef={downloadsPanelSetTracksRef}
                onCtx={(e, localTrack) => {
                  const synth: Track = {
                    id: -1,
                    title: localTrack.title,
                    artist: localTrack.artist || localTrack.extension.toUpperCase(),
                    duration: localTrack.duration || '0:00',
                    url: `local://${localTrack.path}`,
                    cover: localTrack.cover || '',
                  };
                  openCtx(e, { type: 'track', track: synth });
                }}
              />
            </div>

            {/* 3. LIBRARY PANEL */}
            {activeNav === 'library' && (
              <LibraryPanel
                playlists={playlists}
                setPlaylists={setPlaylists}
                openPlaylistId={openPlaylistId}
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
                setNewPlaylistName={setNewPlaylistName}
                setNewPlaylistDesc={setNewPlaylistDesc}
                setIsPlaylistModalOpen={setIsPlaylistModalOpen}
                listenSecs={listenSecs}
                playCounts={playCounts}
                playHistory={playHistory}
                setPlayHistory={setPlayHistory}
                setShowCsvImportModal={setShowCsvImportModal}
                setShowYtImportModal={setShowYtImportModal}
                handleImportPlaylistM3u={handleImportPlaylistM3u}
              />
            )}

            {/* 4. STATS PANEL */}
            {activeNav === 'stats' && (
              <StatsPanel
                listenSecs={listenSecs}
                setListenSecs={setListeningHistory as any}
                playCounts={playCounts}
                setPlayCounts={setPlayHistory as any}
                quickPicks={quickPicks}
                playHistory={playHistory}
                setPlayHistory={setPlayHistory}
                playlists={playlists}
                statsTimeRange={statsTimeRange}
                setStatsTimeRange={setStatsTimeRange}
                listeningHistory={listeningHistory}
                setListeningHistory={setListeningHistory}
                dailyPlays={dailyPlays}
                setDailyPlays={setPlayHistory as any}
                setFirstSeen={setPlayHistory as any}
                artistThumbs={{}}
                setSearchQuery={setSearchQuery}
                searchMusic={searchMusic}
                setActiveNav={setActiveNav}
                setConfirmModal={setConfirmModal}
                showToast={showToast}
                handlePlayInContext={handlePlayInContext}
              />
            )}

            {/* 5. SETTINGS PANEL */}
            {activeNav === 'settings' && (
              <SettingsPanel
                downloadQuality={downloadQuality} 
                setDownloadQuality={setDownloadQuality}
                downloadPath={downloadPath} 
                handleSelectDirectory={handleSelectDirectory}
                downloadFormat={downloadFormat} 
                setDownloadFormat={setDownloadFormatState}
                embedThumbnail={embedThumbnail} 
                setEmbedThumbnail={setEmbedThumbnailState}
                duplicateDetect={duplicateDetect} 
                setDuplicateDetect={setDuplicateDetectState}
                onBackup={handleBackup} 
                onRestore={handleRestore}
                onReset={() => setConfirmModal({ 
                  message: 'Reset all Veluna data? This cannot be undone.', 
                  onConfirm: () => { localStorage.clear(); window.location.reload(); } 
                })}
                backupPath={backupPath} 
                setBackupPath={setBackupPath}
                loudnormEnabled={loudnormEnabled} 
                setLoudnormEnabled={setLoudnormEnabledState}
                skipSilence={skipSilence} 
                setSkipSilence={setSkipSilenceState}
                autoplayEnabled={autoplayEnabled} 
                setAutoplayEnabled={setAutoplayEnabled}
                eq={eq} 
                setEq={v => { setEqState(v); saveLS('vg_eq', v); }}
                showToast={showToast}
                updateAvailable={updateAvailable}
                appVersion={appVersion}
                lyricsSource={lyricsSource} 
                setLyricsSource={setLyricsSource}
                trayEnabled={trayEnabled} 
                setTrayEnabled={setTrayEnabled}
                audioDevices={audioDevices} 
                setAudioDevices={setAudioDevices}
                discordRpcEnabled={discordRpcEnabled} 
                setDiscordRpcEnabled={setDiscordRpcEnabled}
                theme={theme} 
                setThemeState={setThemeState}
                accentColor={accentColor} 
                setAccentColorState={setAccentColorState}
                customBgColor={customBgColor} 
                setCustomBgColorState={setCustomBgColorState}
                autoCheckUpdates={autoCheckUpdates} 
                setAutoCheckUpdates={setAutoCheckUpdates}
                isCheckingUpdate={isCheckingUpdate} 
                handleCheckUpdate={handleCheckUpdate}
              />
            )}
          </div>
        </div>

        {/* Sliding Queue Panel */}
        <div style={{flexShrink:0,background:'var(--v-bg1)',borderLeft:'1px solid var(--v-bdr)',display:'flex',flexDirection:'column',overflow:'hidden',width:isQueueOpen?'300px':'0',transition:'width 0.28s cubic-bezier(0.2,0,0,1)'}}>
          {isQueueOpen && (
            <QueuePanel
              queue={queue}
              setQueue={setQueue}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              isLoadingTrack={isLoadingTrack}
              playlistContextRef={playlistContextRef}
              playlists={playlists}
              handleSaveQueueAsPlaylist={handleSaveQueueAsPlaylist}
              showToast={showToast}
              openCtx={openCtx}
              handlePlayTrack={handlePlayTrack}
              handlePlayInContext={handlePlayInContext}
              removeFromQueueByIndex={removeFromQueueByIndex}
              dragQueueIdx={dragQueueIdx}
              dragOverQueueIdxRef={dragOverQueueIdxRef}
              dragOverQueueIdx={dragOverQueueIdx}
              setDragOverQueueIdx={setDragOverQueueIdx}
              showClearConfirm={showClearConfirm}
              setShowClearConfirm={setShowClearConfirm}
            />
          )}
        </div>
      </div>

      {/* Persistent Audio Controls PlayerBar */}
      <PlayerBar
        currentTrack={currentTrack}
        isLoadingTrack={isLoadingTrack}
        audioInfo={audioInfo}
        toggleLikeTrack={toggleLikeTrack}
        isTrackLiked={isTrackLiked}
        downloadingTracks={downloadingTracks}
        handleDownload={handleDownload}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        toggleShuffle={toggleShuffle}
        shuffle={shuffle}
        handleSkipBack={handleSkipBack}
        togglePlayPause={togglePlayPause}
        isPlaying={isPlaying}
        handleSkipForward={handleSkipForward}
        cycleRepeat={cycleRepeat}
        repeatMode={repeatMode}
        abLoop={abLoop}
        setAbLoop={setAbLoop}
        progressSeconds={progressSeconds}
        trackDurationSeconds={trackDurationSeconds}
        waveformData={waveformData}
        isDraggingProgress={isDraggingProgress}
        setIsDraggingProgress={setIsDraggingProgress}
        calculateProgressPercent={calculateProgressPercent}
        progressRef={progressRef}
        isDraggingProgressRef={isDraggingProgressRef}
        progressSecondsRef={progressSecondsRef}
        trackDurationRef={trackDurationRef}
        abLoopRef={abLoopRef}
        updateProgressFromEvent={updateProgressFromEvent}
        showToast={showToast}
        crossfadeSeconds={crossfadeSeconds}
        showLyrics={showLyrics}
        setShowLyrics={setShowLyrics}
        toggleMute={toggleMute}
        volume={volume}
        isDraggingVolume={isDraggingVolume}
        setIsDraggingVolume={setIsDraggingVolume}
        updateVolumeFromEvent={updateVolumeFromEvent}
        volumeRef={volumeRef}
        openCtx={openCtx}
        setInfoModalTrack={setInfoModalTrack}
        playlistContextRef={playlistContextRef}
        queue={queue}
      />

      {/* Context Menu Overlay */}
      <ContextMenu
        ctxMenu={ctxMenu}
        setCtxMenu={setCtxMenu}
        addToPlaylistTrack={addToPlaylistTrack}
        setAddToPlaylistTrack={setAddToPlaylistTrack}
        playlists={playlists}
        addTrackToPlaylist={addTrackToPlaylist}
        setNewPlaylistName={setNewPlaylistName}
        setNewPlaylistDesc={setNewPlaylistDesc}
        setIsPlaylistModalOpen={setIsPlaylistModalOpen}
        handlePlayTrack={handlePlayTrack}
        setQueue={setQueue}
        showToast={showToast}
        toggleLikeTrack={toggleLikeTrack}
        isTrackLiked={isTrackLiked}
        removeFromQueue={removeFromQueue}
        setInfoModalTrack={setInfoModalTrack}
        copyToClipboard={copyToClipboard}
        handleDownload={handleDownload}
        downloadingTracks={downloadingTracks}
        setMetadataEditingTrack={setMetadataEditingTrack}
        openInYouTube={openInYouTube}
        playAll={playAll}
        setRenamingPlaylist={setRenamingPlaylist}
        setRenameVal={setRenameVal}
        setRenameDescVal={setRenameDescVal}
        setShowDuplicatesPlaylist={setShowDuplicatesPlaylist}
        setBulkEditPlaylist={setBulkEditPlaylist}
        handleCoverUpload={handleCoverUpload}
        handleExportPlaylistM3u={handleExportPlaylistM3u}
        deletePlaylist={deletePlaylist}
      />

      {/* Track Info modal */}
      {infoModalTrack && (() => {
        const ytId = infoModalTrack.url?.match(/[?&]v=([^&]+)/)?.[1] || infoModalTrack.url?.split('youtu.be/')?.[1]?.split('?')?.[0] || '';
        const ytUrl = ytId ? `https://youtube.com/watch?v=${ytId}` : infoModalTrack.url;
        const isYt = !!ytId;
        const trackAudioInfo = infoModalTrack.url === currentTrack?.url ? audioInfo : null;
        return (
          <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"rgba(0,0,0,0.8)",backdropFilter:"blur(20px)"}}
            onClick={() => setInfoModalTrack(null)}>
            <div style={{borderRadius:"14px",width:"100%",maxWidth:"420px",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.9)",display:"flex",flexDirection:"column",background:"#0c0c0c",border:"1px solid rgba(255,255,255,0.08)"}}
              onClick={e => e.stopPropagation()}>
              <div style={{position:"relative",height:"130px",width:"100%",flexShrink:0,overflow:"hidden",background:getTrackGradient(infoModalTrack.title,infoModalTrack.artist),display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"absolute",inset:0,opacity:.25,filter:"blur(20px)",transform:"scale(1.1)",background:getTrackGradient(infoModalTrack.title,infoModalTrack.artist)}}/>
                {infoModalTrack.cover && (
                  <img src={infoModalTrack.cover} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.25,filter:"blur(20px)",transform:"scale(1.1)"}} onError={e => { e.currentTarget.style.display = 'none'; }} alt=""/>
                )}
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent,var(--v-bg2))"}}/>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{position:"relative",width:"80px",height:"80px",borderRadius:"10px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 8px 24px rgba(0,0,0,0.6)",background:getTrackGradient(infoModalTrack.title,infoModalTrack.artist),display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Music size={24} style={{position:"absolute",color:"rgba(255,255,255,0.25)"}}/>
                    {infoModalTrack.cover && (
                      <img src={infoModalTrack.cover} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={e => { e.currentTarget.style.display = 'none'; }} alt=""/>
                    )}
                  </div>
                </div>
                <button onClick={()=>setInfoModalTrack(null)}
                  style={{position:"absolute",top:"10px",right:"10px",width:"26px",height:"26px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",cursor:"pointer",color:"#9e9894",transition:"color .12s"}}
                  onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#9e9894")}>
                  <X size={13}/>
                </button>
              </div>
              <div style={{padding:"10px 16px 12px",textAlign:"center"}}>
                <div style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",lineHeight:1.3}}>{infoModalTrack.title}</div>
                <div style={{fontSize:"12px",color:"#5c5755",marginTop:"2px"}}>{infoModalTrack.artist}</div>
              </div>

              <div style={{display:"flex",gap:"5px",padding:"0 14px 12px",flexWrap:"wrap",justifyContent:"center"}}>
                {[
                  infoModalTrack.duration&&infoModalTrack.duration!=='0:00'&&{icon:<Clock size={9}/>,label:infoModalTrack.duration},
                  isYt&&{icon:<Youtube size={9}/>,label:"YouTube"},
                  trackAudioInfo?.codec&&trackAudioInfo.codec!=='unknown'&&{icon:<BarChart2 size={9}/>,label:`${trackAudioInfo.codec.toUpperCase()}${trackAudioInfo.bitrate>0?` · ${Math.round(trackAudioInfo.bitrate/1000)}k`:''}`},
                  (trackAudioInfo && trackAudioInfo.samplerate && trackAudioInfo.samplerate>0)&&{icon:<Gauge size={9}/>,label:`${(trackAudioInfo.samplerate/1000).toFixed(1)}kHz`},
                  trackAudioInfo?.channels&&{icon:<AlignLeft size={9}/>,label:trackAudioInfo.channels},
                  trackAudioInfo?.format&&{icon:<FileCode2 size={9}/>,label:trackAudioInfo.format},
                ].filter(Boolean).map((item:any,i)=>(
                  <span key={i} style={{display:"flex",alignItems:"center",gap:"4px",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",padding:"3px 8px",borderRadius:"20px",fontSize:"10px",fontWeight:600,color:"#9e9894"}}>
                    {item.icon}{item.label}
                  </span>
                ))}
              </div>

              <div style={{margin:"0 14px 12px",borderRadius:"10px",overflow:"hidden",border:"1px solid var(--v-bdr2)"}}>
                {[
                  { icon: Music, label: 'Title', value: infoModalTrack.title },
                  { icon: FileBadge2, label: 'Artist', value: infoModalTrack.artist },
                  ...(ytId ? [{ icon: Hash, label: 'Video ID', value: ytId }] : []),
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}
                    style={{display:"flex",alignItems:"flex-start",gap:"10px",padding:"10px",borderRadius:"9px",cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.03)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                    onClick={() => copyToClipboard(value)}
                    title={`Click to copy ${label}`}>
                    <div style={{width:"28px",height:"28px",borderRadius:"7px",background:"rgba(226,221,217,0.06)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#5c5755"}}><Icon size={13}/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"9.5px",color:"#363230",letterSpacing:".08em",textTransform:"uppercase",fontWeight:700}}>{label}</div>
                      <div style={{fontSize:"12.5px",fontWeight:600,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:"2px"}}>{value||'—'}</div>
                    </div>
                    <Copy size={11} style={{color:"#363230",flexShrink:0,transition:"color .12s"}}/>
                  </div>
                ))}
              </div>

              <div style={{padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:"4px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                  <CopyButton text={ytId || ''} label="Copy ID" icon={Copy} disabled={!ytId} />
                  <CopyButton text={ytUrl} label="Copy Link" icon={Share2} />
                </div>
                <button
                  onClick={() => { openInYouTube(ytUrl); }}
                  disabled={!ytUrl}
                  style={{width:"100%",padding:"9px",borderRadius:"9px",fontSize:"13px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",border:"none",background:"rgb(220,38,38)",color:"white",cursor:ytUrl?"pointer":"not-allowed",opacity:ytUrl?1:0.4}}>
                  <svg width="14" height="11" viewBox="0 0 18 14" fill="white"><path d="M17.6 2.2C17.4 1.4 16.8.8 16 .6 14.6.2 9 .2 9 .2S3.4.2 2 .6C1.2.8.6 1.4.4 2.2 0 3.6 0 6.5 0 6.5s0 2.9.4 4.3c.2.8.8 1.4 1.6 1.6C3.4 12.8 9 12.8 9 12.8s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-4.3.4-4.3s0-2.9-.4-4.3zM7.2 9.3V3.7l4.7 2.8-4.7 2.8z"/></svg>
                  Open in YouTube
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Playlist Create Modal */}
      {isPlaylistModalOpen && (
        <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.8)"}}
          onClick={()=>setIsPlaylistModalOpen(false)}>
          <div style={{background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)",borderRadius:"14px",padding:"20px",width:"320px",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}}
            onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:"15px",fontWeight:700,color:"#e2ddd9",margin:"0 0 16px"}}>Create Playlist</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"16px"}}>
              <div>
                <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"5px"}}>Name</label>
                <input autoFocus type="text" value={newPlaylistName} onChange={e=>setNewPlaylistName(e.target.value)}
                  style={{width:"100%",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",color:"#e2ddd9",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}}
                  onKeyDown={e=>{if(e.key==='Enter')confirmCreatePlaylist();if(e.key==='Escape')setIsPlaylistModalOpen(false);}}/>
              </div>
              <div>
                <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"5px"}}>Description <span style={{textTransform:"none",fontWeight:400,color:"#363230"}}>(optional)</span></label>
                <textarea value={newPlaylistDesc} onChange={e=>setNewPlaylistDesc(e.target.value)} rows={2}
                  placeholder="e.g. Chill vibes, road trip..."
                  style={{width:"100%",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",color:"#e2ddd9",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",resize:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
              <button onClick={()=>setIsPlaylistModalOpen(false)}
                style={{padding:"7px 14px",borderRadius:"8px",border:"1px solid var(--v-bdr2)",color:"#5c5755",background:"transparent",fontWeight:600,cursor:"pointer",fontSize:"12px",transition:"border-color .12s,color .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="var(--v-bdr3)";}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="var(--v-bdr2)";}}>Cancel</button>
              <button onClick={confirmCreatePlaylist}
                style={{padding:"7px 14px",borderRadius:"8px",border:"none",background:"#e2ddd9",color:"var(--v-bg0)",fontWeight:700,cursor:"pointer",fontSize:"12px"}}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Rename Modal */}
      {renamingPlaylist && (
        <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.8)"}}
          onClick={()=>setRenamingPlaylist(null)}>
          <div style={{background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)",borderRadius:"14px",padding:"20px",width:"320px",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}}
            onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:"15px",fontWeight:700,color:"#e2ddd9",margin:"0 0 16px"}}>Edit Playlist</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"16px"}}>
              <div>
                <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"5px"}}>Name</label>
                <input autoFocus type="text" value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                  style={{width:"100%",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",color:"#e2ddd9",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}}
                  onKeyDown={e=>{if(e.key==='Enter')confirmRenamePlaylist();if(e.key==='Escape')setRenamingPlaylist(null);}}/>
              </div>
              <div>
                <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"5px"}}>Description <span style={{textTransform:"none",fontWeight:400,color:"#363230"}}>(optional)</span></label>
                <textarea value={renameDescVal} onChange={e=>setRenameDescVal(e.target.value)} rows={2}
                  placeholder="e.g. Chill vibes, road trip..."
                  style={{width:"100%",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",color:"#e2ddd9",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",resize:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
              <button onClick={()=>setRenamingPlaylist(null)}
                style={{padding:"7px 14px",borderRadius:"8px",border:"1px solid var(--v-bdr2)",color:"#5c5755",background:"transparent",fontWeight:600,cursor:"pointer",fontSize:"12px",transition:"border-color .12s,color .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="var(--v-bdr3)";}} onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="var(--v-bdr2)";}}>Cancel</button>
              <button onClick={confirmRenamePlaylist}
                style={{padding:"7px 14px",borderRadius:"8px",border:"none",background:"#e2ddd9",color:"var(--v-bg0)",fontWeight:700,cursor:"pointer",fontSize:"12px"}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && (
        <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.88)"}}
          onClick={()=>setShowShortcuts(false)}>
          <div style={{background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)",borderRadius:"14px",width:"500px",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}} className="custom-scrollbar"
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:"1px solid var(--v-bdr2)"}}>
              <h2 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Keyboard Shortcuts</h2>
              <button onClick={()=>setShowShortcuts(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#5c5755",display:"flex",padding:"3px",borderRadius:"5px",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}><X size={15}/></button>
            </div>
            <div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",columnGap:"24px",rowGap:"4px"}}>
              {([
                ['Playback', null],
                ['Space', 'Play / Pause'],
                ['←', 'Seek back 10s'],
                ['→', 'Seek forward 10s'],
                ['M', 'Mute / Unmute'],
                ['Navigation', null],
                ['Ctrl+F', 'Focus search'],
                ['?', 'Show this overlay'],
                ['Esc', 'Close any overlay'],
              ] as [string, string | null][]).map(([key, action], i) =>
                action === null ? (
                  <div key={i} style={{gridColumn:"1/-1",marginTop:"10px",marginBottom:"4px",fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#363230"}}>{key}</div>
                ) : (
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--v-bdr2)"}}>
                    <span style={{fontSize:"12px",color:"#9e9894"}}>{action}</span>
                    <kbd style={{padding:"2px 7px",borderRadius:"5px",fontSize:"10px",fontWeight:700,background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",color:"#5c5755",marginLeft:"12px",flexShrink:0,fontFamily:"monospace"}}>{key}</kbd>
                  </div>
                )
              )}
            </div>
            <div style={{padding:"10px 18px",borderTop:"1px solid var(--v-bdr2)",textAlign:"center"}}>
              <p style={{fontSize:"11px",color:"#363230"}}>Press <kbd style={{padding:"2px 6px",borderRadius:"4px",fontSize:"9.5px",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",color:"#5c5755",fontFamily:"monospace"}}>?</kbd> or <kbd style={{padding:"2px 6px",borderRadius:"4px",fontSize:"9.5px",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",color:"#5c5755",fontFamily:"monospace"}}>Esc</kbd> to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Edit Modal */}
      {metadataEditingTrack && (
        <MetadataEditModal
          track={metadataEditingTrack}
          onSave={handleSaveMetadata}
          onClose={() => setMetadataEditingTrack(null)}
        />
      )}

      {/* Custom Confirm Modal */}
      {confirmModal && (
        <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.88)"}}
          onClick={()=>setConfirmModal(null)}>
          <div style={{background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)",borderRadius:"12px",width:"320px",boxShadow:"0 24px 60px rgba(0,0,0,0.85)",overflow:"hidden"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid var(--v-bdr2)"}}>
              <h3 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Confirm</h3>
            </div>
            <div style={{padding:"14px 18px"}}>
              <p style={{fontSize:"13px",color:"#9e9894",lineHeight:1.5,margin:0}}>{confirmModal.message}</p>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"8px",padding:"10px 18px",borderTop:"1px solid var(--v-bdr2)"}}>
              <button onClick={()=>setConfirmModal(null)}
                style={{padding:"7px 14px",borderRadius:"8px",border:"1px solid var(--v-bdr2)",color:"#5c5755",background:"transparent",fontWeight:600,cursor:"pointer",fontSize:"12px",transition:"border-color .12s,color .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="var(--v-bdr3)";}}
                onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="var(--v-bdr2)";}}>
                Cancel
              </button>
              <button onClick={()=>{confirmModal.onConfirm();setConfirmModal(null);}}
                style={{padding:"7px 14px",borderRadius:"8px",background:"rgba(180,40,40,0.1)",border:"1px solid rgba(180,40,40,0.25)",color:"#a05050",fontWeight:700,cursor:"pointer",fontSize:"12px",transition:"background .12s"}}
                onMouseEnter={e=>(e.currentTarget.style.background="rgba(180,40,40,0.18)")}
                onMouseLeave={e=>(e.currentTarget.style.background="rgba(180,40,40,0.1)")}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Finder Modal */}
      {showDuplicatesPlaylist && (() => {
        const seen = new Map<string, Track>();
        const dupes: Track[] = [];
        showDuplicatesPlaylist.tracks.forEach(t => {
          const key = `${t.title.toLowerCase().trim()}|||${t.artist.toLowerCase().trim()}`;
          if (seen.has(key)) dupes.push(t);
          else seen.set(key, t);
        });
        return (
          <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"rgba(var(--v-bg0-rgb),0.9)"}} onClick={()=>setShowDuplicatesPlaylist(null)}>
            <div style={{background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)",borderRadius:"14px",width:"100%",maxWidth:"500px",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}}>
              <div style={{padding:"13px 16px",borderBottom:"1px solid var(--v-bdr2)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <h3 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Duplicate Finder</h3>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>{showDuplicatesPlaylist.name}</p>
                </div>
                <button onClick={() => setShowDuplicatesPlaylist(null)} style={{padding:"5px",background:"none",border:"none",cursor:"pointer",color:"#5c5755",display:"flex",borderRadius:"6px",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}><X size={14}/></button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}} className="custom-scrollbar">
                {dupes.length === 0 ? (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0",color:"#5c5755"}}>
                    <Music size={28} style={{color:"#5c5755",marginBottom:"8px"}}/>
                    <p style={{fontSize:"13px",color:"#9e9894"}}>No duplicates found.</p>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                    <p style={{fontSize:"12px",color:"#9e9894",marginBottom:"10px"}}>{dupes.length} duplicate{dupes.length > 1 ? 's' : ''} found</p>
                    {dupes.map((t, i) => (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px",borderRadius:"8px",background:"var(--v-bdr2)",border:"1px solid rgba(255,255,255,0.05)"}}>
                        <div style={{
                          width:"38px",height:"38px",borderRadius:"6px",overflow:"hidden",flexShrink:0,border:"1px solid rgba(255,255,255,0.05)",
                          position: "relative",
                          background: getTrackGradient(t.title, t.artist),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <Music size={13} style={{position: 'absolute', color: 'rgba(255,255,255,0.25)'}} />
                          {t.cover && <img src={t.cover} style={{position: 'absolute', inset: 0, width:"100%",height:"100%",objectFit:"cover"}} onError={e => { e.currentTarget.style.display = 'none'; }} alt=""/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                          {t.artist && <div style={{fontSize:"11px",color:"#5c5755",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.artist}</div>}
                        </div>
                        <button onClick={() => {
                          setPlaylists(prev => prev.map(p => p.id === showDuplicatesPlaylist.id
                            ? { ...p, tracks: (() => { let removed = false; return p.tracks.filter(x => { if (!removed && x.url === t.url) { removed = true; return false; } return true; }); })() }
                            : p));
                          setShowDuplicatesPlaylist(prev => prev ? { ...prev, tracks: (() => { let removed = false; return prev.tracks.filter(x => { if (!removed && x.url === t.url) { removed = true; return false; } return true; }); })() } : null);
                          showToast('Duplicate removed');
                        }} style={{fontSize:"11px",padding:"4px 10px",background:"rgba(160,40,40,0.08)",color:"#a05050",border:"1px solid rgba(160,40,40,0.2)",borderRadius:"6px",cursor:"pointer",flexShrink:0,transition:"background .12s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(160,40,40,0.15)")} onMouseLeave={e=>(e.currentTarget.style.background="rgba(160,40,40,0.08)")}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk Tag Editor Modal */}
      {bulkEditPlaylist && (() => {
        return (
          <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"rgba(var(--v-bg0-rgb),0.9)"}}>
            <div style={{background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)",borderRadius:"14px",width:"100%",maxWidth:"680px",maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 60px rgba(0,0,0,0.85)"}}>
              <div style={{padding:"13px 16px",borderBottom:"1px solid var(--v-bdr2)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <div>
                  <h3 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Bulk Tag Editor</h3>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>{bulkEditPlaylist.tracks.length} tracks in {bulkEditPlaylist.name}</p>
                </div>
                <button onClick={() => setBulkEditPlaylist(null)} style={{padding:"5px",background:"none",border:"none",cursor:"pointer",color:"#5c5755",display:"flex",borderRadius:"6px",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}><X size={14}/></button>
              </div>
              <div style={{flex:1,overflowY:"auto"}} className="custom-scrollbar">
                <table style={{width:"100%",fontSize:"13px",borderCollapse:"collapse"}}>
                  <thead style={{position:"sticky",top:0,background:"var(--v-bg2)",borderBottom:"1px solid var(--v-bdr2)",zIndex:10}}>
                    <tr>
                      <th style={{textAlign:"left",padding:"8px 14px",fontSize:"10px",fontWeight:700,color:"#5c5755",width:"32px",letterSpacing:".06em",textTransform:"uppercase"}}>#</th>
                      <th style={{textAlign:"left",padding:"8px 14px",fontSize:"10px",fontWeight:700,color:"#5c5755",letterSpacing:".06em",textTransform:"uppercase"}}>Title</th>
                      <th style={{textAlign:"left",padding:"8px 14px",fontSize:"10px",fontWeight:700,color:"#5c5755",letterSpacing:".06em",textTransform:"uppercase"}}>Artist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkEditPlaylist.tracks.map((t, i) => (
                      <tr key={t.url} style={{borderBottom:"1px solid var(--v-bdr2)"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.02)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        <td style={{padding:"6px 14px",fontSize:"11px",color:"#363230",fontVariantNumeric:"tabular-nums"}}>{i+1}</td>
                        <td style={{padding:"4px 8px"}}>
                          <input defaultValue={t.title}
                            onBlur={e => {
                              const newTitle = e.target.value.trim();
                              if (newTitle && newTitle !== t.title) {
                                setPlaylists(prev => prev.map(p => p.id === bulkEditPlaylist.id
                                  ? { ...p, tracks: p.tracks.map(x => x.url === t.url ? { ...x, title: newTitle } : x) }
                                  : p));
                                setBulkEditPlaylist(prev => prev ? { ...prev, tracks: prev.tracks.map(x => x.url === t.url ? { ...x, title: newTitle } : x) } : null);
                              }
                            }}
                            style={{width:"100%",background:"transparent",border:"none",color:"#e2ddd9",padding:"6px",fontSize:"12.5px",outline:"none",borderRadius:"4px"}}
                            onFocus={e => { e.currentTarget.style.background = "var(--v-bg3)"; }}
                            onBlurCapture={e => { e.currentTarget.style.background = "transparent"; }}
                          />
                        </td>
                        <td style={{padding:"4px 8px"}}>
                          <input defaultValue={t.artist}
                            onBlur={e => {
                              const newArtist = e.target.value.trim();
                              if (newArtist !== t.artist) {
                                setPlaylists(prev => prev.map(p => p.id === bulkEditPlaylist.id
                                  ? { ...p, tracks: p.tracks.map(x => x.url === t.url ? { ...x, artist: newArtist } : x) }
                                  : p));
                                setBulkEditPlaylist(prev => prev ? { ...prev, tracks: prev.tracks.map(x => x.url === t.url ? { ...x, artist: newArtist } : x) } : null);
                              }
                            }}
                            style={{width:"100%",background:"transparent",border:"none",color:"#9e9894",padding:"6px",fontSize:"12.5px",outline:"none",borderRadius:"4px"}}
                            onFocus={e => { e.currentTarget.style.background = "var(--v-bg3)"; }}
                            onBlurCapture={e => { e.currentTarget.style.background = "transparent"; }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Global Toast Alerts */}
      {toast && (
        <div style={{position:"fixed",bottom:"80px",left:"50%",transform:"translateX(-50%)",zIndex:300,background:"var(--v-bdr2)",border:"1px solid var(--v-bdr3)",color:"#e2ddd9",fontSize:"12.5px",fontWeight:600,padding:"8px 14px",borderRadius:"10px",boxShadow:"0 8px 24px rgba(0,0,0,0.8)",pointerEvents:"none",animation:"toastIn 0.2s cubic-bezier(0.25,0,0,1) both",whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      {/* YouTube Import Modal */}
      {showYtImportModal && (
        <YtImportModal
          onClose={() => setShowYtImportModal(false)}
          onSavePlaylist={(name, desc, tracks) => {
            const id = `yt_${Date.now()}`;
            setPlaylists(prev => [...prev, { id, name, description: desc || 'Imported from YouTube', tracks }]);
            showToast(`"${name}" saved — ${tracks.length} tracks`);
          }}
          showToast={showToast}
        />
      )}

      {/* Spotify CSV Import Modals */}
      {(showCsvImportModal || bgImport) && (
        <CsvImportModal
          visible={showCsvImportModal}
          onClose={() => setShowCsvImportModal(false)}
          onSavePlaylist={(name, desc, tracks) => {
            const id = `csv_${Date.now()}`;
            setPlaylists(prev => [...prev, { id, name, description: desc || 'Imported from Spotify', tracks }]);
            showToast(`"${name}" saved — ${tracks.length} tracks`);
            setBgImport(null);
            setPendingSpotifyImport(null);
          }}
          onMatchingDone={(tracks, matched, failed) => {
            setPendingSpotifyImport({ tracks, matchedCount: matched, failedCount: failed });
            setShowCsvImportModal(false);
          }}
          showToast={showToast}
          onProgress={(matched, total, label) => setBgImport(total > 0 ? { matched, total, label } : null)}
        />
      )}
      {pendingSpotifyImport && !showCsvImportModal && (
        <ImportResultModal
          matchedCount={pendingSpotifyImport.matchedCount}
          failedCount={pendingSpotifyImport.failedCount}
          onSave={(name, desc) => {
            const id = `csv_${Date.now()}`;
            setPlaylists(prev => [...prev, { id, name, description: desc || 'Imported from Spotify', tracks: pendingSpotifyImport.tracks }]);
            showToast(`"${name}" saved — ${pendingSpotifyImport.tracks.length} tracks`);
            setBgImport(null);
            setPendingSpotifyImport(null);
          }}
          onClose={() => {
            setPendingSpotifyImport(null);
            setBgImport(null);
          }}
        />
      )}

      {/* Backgroundspotify import status toast */}
      {bgImport && !showCsvImportModal && !pendingSpotifyImport && (
        <div
          onClick={() => setShowCsvImportModal(true)}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#3a3532";
            e.currentTarget.style.background = "#221f1f";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--v-bdr2)";
            e.currentTarget.style.background = "var(--v-bdr2)";
          }}
          style={{
            position: "fixed",
            bottom: "84px",
            right: "16px",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid var(--v-bdr2)",
            background: "var(--v-bdr2)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
            animation: "fadeUp 0.2s ease both",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#9e9894",animation:"velunaPulse 1.5s ease-in-out infinite",flexShrink:0}}/>
          <div style={{display:"flex",flexDirection:"column",gap:"4px",minWidth:"140px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}}>
              <span style={{fontSize:"12px",fontWeight:600,color:"#e2ddd9"}}>Importing Spotify…</span>
              <span style={{fontSize:"10px",color:"#5c5755",fontVariantNumeric:"tabular-nums"}}>{bgImport.matched}/{bgImport.total}</span>
            </div>
            <div style={{height:"2px",borderRadius:"1px",background:"#232020",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:"1px",background:"#9e9894",width:`${(bgImport.matched/bgImport.total)*100}%`,transition:"width .3s"}}/>
            </div>
          </div>
          <button
            onClick={e => {
              e.stopPropagation();
              setBgImport(null);
            }}
            style={{color:"#363230",background:"none",border:"none",cursor:"pointer",display:"flex",marginLeft:"4px",transition:"color .12s"}}
            onMouseEnter={e => { e.currentTarget.style.color = "#9e9894"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#363230"; }}
          >
            <X size={12}/>
          </button>
        </div>
      )}

      {/* Immersive Lyrics Screen overlay */}
      <LyricsPanel
        showLyrics={showLyrics}
        setShowLyrics={setShowLyrics}
        currentTrack={currentTrack}
        lyricsData={lyricsData}
        lyricsLoading={lyricsLoading}
        progressSeconds={progressSeconds}
        trackDurationSeconds={trackDurationSeconds}
        isPlaying={isPlaying}
        togglePlayPause={togglePlayPause}
        handleSkipBack={handleSkipBack}
        handleSkipForward={handleSkipForward}
        audioDevices={audioDevices}
        setAudioDevices={setAudioDevices}
        switchingDevice={switchingDevice}
        setSwitchingDevice={setSwitchingDevice}
        showToast={showToast}
      />
    </div>
  );
}
