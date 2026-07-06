import React, { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Zap,
  FolderDown,
  Globe,
  Moon,
  Database,
  ArrowUpCircle,
  Search,
  X,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Image,
  Volume2,
  BarChart2,
  ArchiveRestore,
  Trash2,
  Upload
} from 'lucide-react';

import { SettingsTab, DiskInfo } from '../types';
import { loadLS, saveLS, lightenColor, formatBytes } from '../utils';
import { ThemedSelect } from './ThemedSelect';

function validateSettingsChange(
  key: string,
  newVal: unknown,
  current: {
    loudnormEnabled: boolean; skipSilence: boolean;
    eq: { bass: number; mid: number; treble: number };
  }
): string | null {
  const { loudnormEnabled, skipSilence, eq } = current;
  const hasEq = eq.bass !== 0 || eq.mid !== 0 || eq.treble !== 0;

  if (key === 'loudnormEnabled' && newVal === true && skipSilence) {
    return 'Loudnorm + Skip Silence together can cause audio distortion on short tracks. Consider disabling one.';
  }
  if (key === 'skipSilence' && newVal === true && loudnormEnabled) {
    return 'Loudnorm + Skip Silence together can cause audio distortion on short tracks. Consider disabling one.';
  }
  if (key === 'loudnormEnabled' && newVal === true && hasEq) {
    const extreme = Math.max(Math.abs(eq.bass), Math.abs(eq.mid), Math.abs(eq.treble));
    if (extreme >= 10) {
      return `Loudnorm with high EQ values (${extreme}dB) may clip audio. Reduce EQ or disable Loudnorm.`;
    }
  }
  return null; 
}

const SettingsSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onChange}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: "42px",
        height: "24px",
        borderRadius: "12px",
        flexShrink: 0,
        background: checked ? "var(--v-accent)" : "#232020",
        border: "1px solid",
        borderColor: checked ? "var(--v-accent)" : hovered ? "#3a3735" : "var(--v-bdr3)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
        outline: "none",
        boxShadow: checked ? "0 0 8px var(--v-accent)" : "none"
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          background: checked ? "var(--v-bg0)" : "#5c5755",
          left: checked ? "20px" : "2px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          transform: hovered ? "scale(1.05)" : "scale(1)"
        }}
      />
    </button>
  );
};

type SettingsPanelProps = {
  downloadQuality: string; setDownloadQuality: (q: string) => void;
  downloadPath: string; handleSelectDirectory: () => void;
  downloadFormat: string; setDownloadFormat: (f: string) => void;
  embedThumbnail: boolean; setEmbedThumbnail: (v: boolean) => void;
  duplicateDetect: boolean; setDuplicateDetect: (v: boolean) => void;
  onBackup: () => void; onRestore: () => void; onReset: () => void;
  backupPath: string; setBackupPath: (p: string) => void;
  loudnormEnabled: boolean; setLoudnormEnabled: (e: boolean) => void;
  skipSilence: boolean; setSkipSilence: (v: boolean) => void;
  autoplayEnabled: boolean; setAutoplayEnabled: (v: boolean) => void;
  eq: { bass: number; mid: number; treble: number }; setEq: (v: { bass: number; mid: number; treble: number }) => void;
  showToast: (m: string) => void;
  updateAvailable: string | null;
  appVersion: string;
  onNavigateToUpdates?: () => void;
  lyricsSource: string; setLyricsSource: (v: string) => void;
  trayEnabled: boolean; setTrayEnabled: (v: boolean) => void;
  audioDevices: { id: string; name: string; form: string; is_default: boolean }[];
  setAudioDevices: React.Dispatch<React.SetStateAction<{ id: string; name: string; form: string; is_default: boolean }[]>>;
  discordRpcEnabled: boolean; setDiscordRpcEnabled: (v: boolean) => void;
  theme: string; setThemeState: (t: string) => void;
  accentColor: string; setAccentColorState: (a: string) => void;
  customBgColor: string; setCustomBgColorState: (c: string) => void;
  autoCheckUpdates: boolean; setAutoCheckUpdates: (v: boolean) => void;
  isCheckingUpdate: boolean; handleCheckUpdate: () => void;
};

export function SettingsPanel({
  downloadQuality, setDownloadQuality, downloadPath, handleSelectDirectory,
  downloadFormat, setDownloadFormat,
  embedThumbnail, setEmbedThumbnail,
  duplicateDetect, setDuplicateDetect,
  onBackup, onRestore, onReset,
  backupPath, setBackupPath,
  loudnormEnabled, setLoudnormEnabled,
  skipSilence, setSkipSilence,
  autoplayEnabled, setAutoplayEnabled,
  eq, setEq,
  showToast,
  updateAvailable,
  appVersion,
  lyricsSource, setLyricsSource,
  trayEnabled, setTrayEnabled,
  audioDevices, setAudioDevices,
  discordRpcEnabled, setDiscordRpcEnabled,
  theme, setThemeState,
  accentColor, setAccentColorState,
  customBgColor, setCustomBgColorState,
  autoCheckUpdates, setAutoCheckUpdates,
  isCheckingUpdate, handleCheckUpdate,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('playback');
  const [searchQuery, setSearchQuery] = useState('');

  const matchesSearch = (textList: string[]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return textList.some(txt => (txt || '').toLowerCase().includes(q));
  };

  const show = (tab: SettingsTab) => {
    if (searchQuery) return true;
    return activeTab === tab;
  };

  const hasMatches = () => {
    if (!searchQuery) return true;
    if (matchesSearch(["Updates", "Check for new releases of Veluna", "Update available", "You're up to date"])) return true;
    if (matchesSearch(["Downloads", "Configure download quality", "Audio Quality", "Download Folder", "Audio Format", "Embed Thumbnail", "Duplicate Detection", "File Options"])) return true;
    if (matchesSearch(["Playback", "Audio Normalization", "Loudnorm", "Smart Playback", "Skip Silence", "Autoplay Recommendations", "Audio Output", "Equalizer", "Bass", "Mid", "Treble"])) return true;
    if (matchesSearch(["Integrations", "Discord Rich Presence", "Discord RPC", "Lyrics Source", "Primary source"])) return true;
    if (matchesSearch(["Storage", "Backup Location", "Create Backup", "Restore Backup", "Reset Veluna App"])) return true;
    if (matchesSearch(["Appearance", "System Tray", "Enable Tray Icon", "Default Startup Page", "Startup View", "Theme", "Accent Color", "Custom Theme"])) return true;
    return false;
  };
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);
  const [switchingDevice, setSwitchingDevice] = useState(false);
  const [startupNav, setStartupNav] = useState(() => loadLS('vg_startupNav', 'home'));
  const [hoveredSlider, setHoveredSlider] = useState<string | null>(null);
  const handleStartupNavChange = (v: string) => {
    setStartupNav(v);
    saveLS('vg_startupNav', v);
  };

  useEffect(() => {
    invoke<DiskInfo>('get_disk_usage', { path: downloadPath }).then(setDiskInfo).catch(() => {});
  }, [downloadPath]);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'playback',     label: 'Playback',     icon: <Zap size={15} /> },
    { id: 'downloads',    label: 'Downloads',    icon: <FolderDown size={15} /> },
    { id: 'integrations', label: 'Integrations', icon: <Globe size={15} /> },
    { id: 'appearance',   label: 'Appearance',   icon: <Moon size={15} /> },
    { id: 'storage',      label: 'Storage',      icon: <Database size={15} /> },
    { id: 'updates',      label: 'Updates',      icon: <ArrowUpCircle size={15} /> },
  ];

  return (
    <div style={{flex:1,display:"flex",overflow:"hidden",background:"var(--v-bg0)"}}>
      <div style={{width:"210px",flexShrink:0,background:"var(--v-bg1)",borderRight:"1px solid var(--v-bdr)",display:"flex",flexDirection:"column",padding:"16px 12px",gap:"4px"}}>
        <div style={{fontSize:"10px",fontWeight:800,letterSpacing:".18em",textTransform:"uppercase",color:"#76706c",padding:"4px 10px 14px"}}>Settings</div>
        
        <div style={{ padding: "0 6px 12px" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={12} style={{ position: "absolute", left: "10px", color: "#5c5755", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Find a setting..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 28px 7px 28px",
                background: "rgba(226, 221, 217, 0.015)",
                border: "1px solid #1b1918",
                borderRadius: "8px",
                color: "#e2ddd9",
                fontSize: "12px",
                outline: "none",
                transition: "all 0.2s cubic-bezier(0.2, 0, 0, 1)",
                boxSizing: "border-box"
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "#44403c";
                e.currentTarget.style.background = "rgba(226, 221, 217, 0.03)";
                e.currentTarget.style.boxShadow = "0 0 0 1px #44403c";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "#1b1918";
                e.currentTarget.style.background = "rgba(226, 221, 217, 0.015)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: "absolute",
                  right: "8px",
                  background: "none",
                  border: "none",
                  color: "#5c5755",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#e2ddd9")}
                onMouseLeave={e => (e.currentTarget.style.color = "#5c5755")}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {tabs.map(tab => {
          const isActive = activeTab === tab.id && !searchQuery;
          return (
            <button key={tab.id} onClick={() => { setSearchQuery(''); setActiveTab(tab.id); }}
              style={{
                display:"flex",alignItems:"center",gap:"10px",
                padding:"8px 12px",borderRadius:"8px",
                border:"none",cursor:"pointer",
                textAlign:"left",width:"100%",
                fontSize:"12.5px",fontWeight:isActive?600:500,
                background:isActive?"rgba(226,221,217,0.04)":"transparent",
                color:isActive?"#e2ddd9":"#8c8682",
                position:"relative",
                transition:"all 0.15s ease-out",
              }}
              onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background="rgba(226, 221, 217, 0.02)";e.currentTarget.style.color="#e2ddd9";}}}
              onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#8c8682";}}}>
              {isActive && (
                <span style={{position:"absolute",left:"0",top:"10px",bottom:"10px",width:"3px",borderRadius:"1.5px",background:"var(--v-accent)"}} />
              )}
              <span style={{color:isActive?"#e2ddd9":"#5c5755",display:"flex",flexShrink:0,transition:"color 0.15s ease"}}>{tab.icon}</span>
              <span style={{flex:1}}>{tab.label}</span>
              {tab.id === 'updates' && updateAvailable && (
                <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#a1a1aa",flexShrink:0}} />
              )}
            </button>
          );
        })}

        {searchQuery && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12.5px",
            fontWeight: 500,
            background: "rgba(226, 221, 217, 0.04)",
            color: "#e2ddd9",
            position: "relative"
          }}>
            <span style={{
              position: "absolute",
              left: "0",
              top: "10px",
              bottom: "10px",
              width: "3px",
              borderRadius: "1.5px",
              background: "#9e9894"
            }} />
            <span style={{ color: "#9e9894", display: "flex", flexShrink: 0 }}><Search size={12} /></span>
            <span>Search Results</span>
          </div>
        )}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 24px 140px"}} className="custom-scrollbar">
        {searchQuery && (
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#e2ddd9", margin: "0 0 3px" }}>Search Results</h2>
            <p style={{ fontSize: "12px", color: "#5c5755", marginTop: "3px" }}>Showing settings matching "{searchQuery}"</p>
          </div>
        )}

        {!hasMatches() ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#5c5755", gap: "10px" }}>
            <Search size={28} strokeWidth={1.5} />
            <p style={{ fontSize: "13px" }}>No settings match your search</p>
          </div>
        ) : (
          <>
        {show('updates') && matchesSearch(["Updates", "Check for new releases of Veluna", "Update available", "You're up to date"]) && (
          <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
            <div>
              <h2 style={{fontSize:"22px",fontWeight:800,letterSpacing:"-0.01em",color:"#e2ddd9",margin:"0 0 4px"}}>Updates</h2>
              <p style={{fontSize:"12.5px",color:"#6f6966",margin:0}}>Check for new releases and view version status.</p>
            </div>

            <div style={{
              borderRadius:"12px",
              border:updateAvailable?"1px solid rgba(226, 221, 217, 0.25)":"1px solid var(--v-bdr)",
              padding:"20px",
              display:"flex",
              alignItems:"center",
              gap:"20px",
              background:updateAvailable?"rgba(226, 221, 217, 0.02)":"var(--v-bg0)",
              transition:"all 0.2s",
              position:"relative",
              overflow:"hidden"
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = updateAvailable ? 'rgba(226, 221, 217, 0.4)' : 'var(--v-bdr3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = updateAvailable ? 'rgba(226, 221, 217, 0.25)' : 'var(--v-bdr)'; }}
            >
              <div style={{
                position: "absolute",
                top: "-20px",
                left: "-20px",
                width: "120px",
                height: "120px",
                background: "var(--v-accent)",
                opacity: 0.05,
                filter: "blur(30px)",
                borderRadius: "50%",
                pointerEvents: "none"
              }} />

              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
                flexShrink: 0,
                position: "relative"
              }}>
                <div style={{
                  position: "absolute",
                  bottom: "-3px",
                  right: "-3px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "var(--v-bg0)",
                  border: `1px solid ${updateAvailable ? "rgba(226, 221, 217, 0.25)" : "var(--v-bdr)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: updateAvailable ? "#e2ddd9" : "var(--v-accent)"
                }}>
                  {updateAvailable ? <ArrowUpCircle size={11}/> : <CheckCircle size={11}/>}
                </div>
                <svg width="34" height="34" viewBox="0 0 28 28" fill="none" style={{
                  flexShrink: 0,
                  filter: "drop-shadow(0 2px 6px var(--v-accent))"
                }}>
                  <rect width="28" height="28" rx="6" fill="var(--v-accent)"/>
                  <polygon points="4,6 8.5,6 14,21 19.5,6 24,6 14,23" fill="#0e0d0d"/>
                  <polygon points="8.5,6 11.5,6 14,16 16.5,6 19.5,6 14,21" fill="var(--v-accent)"/>
                </svg>
              </div>

              <div style={{flex:1,minWidth:0,position:"relative",zIndex:1}}>
                {updateAvailable ? (
                  <>
                    <div style={{fontSize:"13.5px",fontWeight:700,color:"#ffffff",marginBottom:"4px"}}>Update available — v{updateAvailable}</div>
                    <div style={{fontSize:"11.5px",color:"#6f6966",lineHeight:1.4,marginBottom:"10px"}}>A new version of Veluna is ready to download. Features and stability updates await.</div>
                    <a href="#" onClick={e=>{e.preventDefault();openUrl('https://github.com/ishmweet/veluna/releases/latest');}}
                      style={{display:"inline-flex",alignItems:"center",gap:"6px",fontSize:"11px",fontWeight:600,color:"var(--v-accent)",textDecoration:"none"}}
                      onMouseEnter={e=>(e.currentTarget.style.textDecoration="underline")} onMouseLeave={e=>(e.currentTarget.style.textDecoration="none")}>
                      <ExternalLink size={12}/> View Release Notes on GitHub
                    </a>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:"13.5px",fontWeight:700,color:"#ffffff",marginBottom:"4px"}}>You're up to date</div>
                    <div style={{fontSize:"11.5px",color:"#6f6966",lineHeight:1.4,marginBottom:"10px"}}>Veluna v{appVersion} is currently the latest version.</div>
                    <a href="#" onClick={e=>{e.preventDefault();openUrl('https://github.com/ishmweet/veluna');}}
                      style={{display:"inline-flex",alignItems:"center",gap:"6px",fontSize:"11px",fontWeight:600,color:"var(--v-accent)",textDecoration:"none"}}
                      onMouseEnter={e=>(e.currentTarget.style.textDecoration="underline")} onMouseLeave={e=>(e.currentTarget.style.textDecoration="none")}>
                      <ExternalLink size={12}/> Visit GitHub Repository
                    </a>
                  </>
                )}
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:"1px solid #141312"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Check Automatically on Startup</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>Automatically check for new releases when launching Veluna</p>
                </div>
                <SettingsSwitch checked={autoCheckUpdates} onChange={() => setAutoCheckUpdates(!autoCheckUpdates)} />
              </div>
              
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Manual Update Check</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>Force a search for the latest version of Veluna on GitHub</p>
                </div>
                <button
                  onClick={handleCheckUpdate}
                  disabled={isCheckingUpdate}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "18px",
                    background: isCheckingUpdate ? "rgba(255,255,255,0.02)" : "var(--v-accent)",
                    color: isCheckingUpdate ? "#5c5755" : "var(--v-bg0)",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: isCheckingUpdate ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                    boxShadow: isCheckingUpdate ? "none" : "0 2px 8px rgba(0,0,0,0.15)"
                  }}
                  onMouseEnter={e => {
                    if (!isCheckingUpdate) {
                      e.currentTarget.style.filter = "brightness(1.1)";
                      e.currentTarget.style.transform = "scale(1.02)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isCheckingUpdate) {
                      e.currentTarget.style.filter = "none";
                      e.currentTarget.style.transform = "none";
                    }
                  }}
                >
                  {isCheckingUpdate ? (
                    <>
                      <div style={{width:"12px",height:"12px",border:"2px solid #5c5755",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} />
                      Check Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {show('downloads') && matchesSearch(["Downloads", "Configure download quality", "Audio Quality", "Download Folder", "Audio Format", "Embed Thumbnail", "Duplicate Detection", "File Options"]) && (
          <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
            <div>
              <h2 style={{fontSize:"22px",fontWeight:800,letterSpacing:"-0.01em",color:"#e2ddd9",margin:"0 0 4px"}}>Downloads</h2>
              <p style={{fontSize:"12.5px",color:"#6f6966",margin:0}}>Configure download quality, formats, and folders.</p>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Audio Specifications</h3>
              </div>
              
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--v-bdr)"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Download Quality</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>
                    {downloadQuality === 'High' ? 'Best available audio bitrate (320kbps+)' : downloadQuality === 'Medium' ? 'Balanced quality (~128kbps)' : 'Smallest file size'}
                  </p>
                </div>
                <ThemedSelect
                  value={downloadQuality}
                  onChange={setDownloadQuality}
                  options={[
                    { value: 'High', label: 'High', desc: 'Best quality · largest files' },
                    { value: 'Medium', label: 'Medium', desc: 'Balanced · ~128kbps' },
                    { value: 'Low', label: 'Low', desc: 'Smallest files' },
                  ]}
                />
              </div>

              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Audio Format</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>
                    {downloadFormat === 'opus' ? 'Best compression, native YouTube codec' : downloadFormat === 'm4a' ? 'AAC in M4A, great Apple/car stereo compat' : downloadFormat === 'flac' ? 'Lossless — largest files' : 'MP3 — widest compatibility'}
                  </p>
                </div>
                <ThemedSelect
                  value={downloadFormat}
                  onChange={setDownloadFormat}
                  options={[
                    { value: 'mp3',  label: 'MP3',  desc: 'Most compatible' },
                    { value: 'opus', label: 'Opus', desc: 'Best compression' },
                    { value: 'm4a',  label: 'M4A',  desc: 'AAC / Apple' },
                    { value: 'flac', label: 'FLAC', desc: 'Lossless' },
                  ]}
                />
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Download Directory</h3>
              </div>
              <div className="v-settings-row" style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background 0.15s ease-out"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(226,221,217,0.005)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} onClick={handleSelectDirectory}>
                <div style={{flex:1,minWidth:0}}>
                  <div className="v-settings-path-capsule" style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11.5px",
                    color: "#9e9894",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--v-bdr)",
                    borderRadius: "20px",
                    padding: "4px 10px",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    fontFamily: "monospace",
                    maxWidth: "90%"
                  }}>
                    <FolderOpen size={12} style={{ color: "var(--v-accent)", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{downloadPath}</span>
                  </div>
                  {diskInfo && <p style={{fontSize:"11px",color:"#5c5755",marginTop:"6px"}}>{formatBytes(diskInfo.used_bytes)} used · {diskInfo.track_count} offline tracks</p>}
                </div>
                <button style={{padding:"6px",marginLeft:"12px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",flexShrink:0,borderRadius:"7px",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <FolderOpen size={16} />
                </button>
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",display:"flex",alignItems:"center",gap:"8px",margin:0}}><Image size={14} style={{color:"#8c8682"}} /> File Options</h3>
              </div>
              
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:"1px solid #141312"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Embed Artwork Thumbnail</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>{embedThumbnail ? 'Active — album/track cover art is embedded into audio file tags' : 'Disabled — downloaded audio files will have no embedded cover'}</p>
                </div>
                <SettingsSwitch checked={embedThumbnail} onChange={() => setEmbedThumbnail(!embedThumbnail)} />
              </div>
              
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Smart Duplicate Detection</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>{duplicateDetect ? 'Active — tracks already in your download folder are skipped' : 'Disabled — duplicates will download and overwrite if triggered'}</p>
                </div>
                <SettingsSwitch checked={duplicateDetect} onChange={() => setDuplicateDetect(!duplicateDetect)} />
              </div>
            </div>
          </div>
        )}

        {show('playback') && matchesSearch(["Playback", "Audio Normalization", "Loudnorm", "Smart Playback", "Skip Silence", "Autoplay Recommendations", "Audio Output", "Equalizer", "Bass", "Mid", "Treble"]) && (
          <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
            <div>
              <h2 style={{fontSize:"22px",fontWeight:800,letterSpacing:"-0.01em",color:"#e2ddd9",margin:"0 0 4px"}}>Playback</h2>
              <p style={{fontSize:"12.5px",color:"#6f6966",margin:0}}>Configure the audio engine and playback behaviors.</p>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0,display:"flex",alignItems:"center",gap:"8px"}}><Zap size={14} style={{color:"#8c8682"}} /> Audio Processing</h3>
              </div>
              
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #141312"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Loudness Normalization</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>{loudnormEnabled ? 'Active — consistent volume across tracks (EBU R128)' : 'Disabled — raw volume, faster track start'}</p>
                </div>
                <SettingsSwitch checked={loudnormEnabled} onChange={() => {
                  const next = !loudnormEnabled;
                  const warn = validateSettingsChange('loudnormEnabled', next, { loudnormEnabled, skipSilence, eq });
                  if (warn) { showToast(`⚠ ${warn}`); }
                  setLoudnormEnabled(next);
                }} />
              </div>

              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #141312"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Skip Silence</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>{skipSilence ? 'Active — auto-skips silent gaps' : 'Disabled — plays entire track including silence'}</p>
                </div>
                <SettingsSwitch checked={skipSilence} onChange={() => {
                  const next = !skipSilence;
                  const warn = validateSettingsChange('skipSilence', next, { loudnormEnabled, skipSilence, eq });
                  if (warn) { showToast(`⚠ ${warn}`); }
                  setSkipSilence(next);
                }} />
              </div>

              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Autoplay Recommendations</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>{autoplayEnabled ? 'Active — queues similar recommendations when music ends' : 'Disabled — playback stops when queue finishes'}</p>
                </div>
                <SettingsSwitch checked={autoplayEnabled} onChange={() => setAutoplayEnabled(!autoplayEnabled)} />
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0,display:"flex",alignItems:"center",gap:"8px"}}><Volume2 size={14} style={{color:"#8c8682"}} /> Audio Output Device</h3>
                <button onClick={() => invoke<{ id: string; name: string; form: string; is_default: boolean }[]>('list_audio_devices').then(setAudioDevices).catch(() => {})}
                  style={{padding:"4px",background:"none",border:"none",cursor:"pointer",color:"#5c5755",borderRadius:"6px",display:"flex",transition:"color .12s"}} title="Refresh devices" onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <RefreshCw size={13} />
                </button>
              </div>
              <div style={{display:"flex",flexDirection:"column"}}>
                {audioDevices.length === 0 ? (
                  <div style={{padding:"14px 16px",fontSize:"12px",color:"#6f6966"}}>No output devices found</div>
                ) : audioDevices.map((dev, idx) => {
                  const isDefault = dev.is_default;
                  return (
                    <button key={dev.id} disabled={switchingDevice}
                      onClick={async () => {
                        if (isDefault) return;
                        setSwitchingDevice(true);
                        try {
                          await invoke('set_audio_device', { id: dev.id });
                          setAudioDevices(prev => prev.map(d => ({ ...d, is_default: d.id === dev.id })));
                          showToast(`Output switched: ${dev.name}`);
                        } catch (e) { showToast(`Switch failed: ${e}`); }
                        finally { setSwitchingDevice(false); }
                      }}
                      style={{
                        display:"flex",alignItems:"center",gap:"12px",padding:"11px 16px",
                        textAlign:"left",cursor:isDefault?"default":"pointer",width:"100%",
                        background:isDefault?"rgba(226,221,217,0.02)":"transparent",
                        border:"none",
                        borderBottom:idx!==audioDevices.length-1?"1px solid #141312":"none",
                        transition:"all 0.15s ease-out",opacity:switchingDevice&&!isDefault?0.4:1
                      }}
                      onMouseEnter={e=>{if(!isDefault)(e.currentTarget as HTMLElement).style.background="rgba(226,221,217,0.01)";}}
                      onMouseLeave={e=>{if(!isDefault)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                      <div style={{width:"28px",height:"28px",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1px solid ${isDefault?"var(--v-accent)":"rgba(255,255,255,0.02)"}`,background:isDefault?"rgba(226,221,217,0.03)":"#121111"}}>
                        {dev.form === 'headphones'
                          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isDefault ? 'var(--v-accent)' : '#5c5755'} strokeWidth="2" strokeLinecap="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                          : <Volume2 size={13} style={{color:isDefault?"var(--v-accent)":"#5c5755"}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:"13px",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:isDefault?"#e2ddd9":"#8c8682"}}>{dev.name}</p>
                        {dev.form&&<p style={{fontSize:"10px",color:"#5c5755",textTransform:"capitalize",marginTop:"2px"}}>{dev.form}</p>}
                      </div>
                      {isDefault&&<span style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"9px",fontWeight:700,color:"var(--v-accent)",flexShrink:0,letterSpacing:".06em"}}><span style={{width:"4px",height:"4px",borderRadius:"50%",background:"var(--v-accent)",boxShadow:"0 0 4px var(--v-accent)"}}/>ACTIVE</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0,display:"flex",alignItems:"center",gap:"8px"}}><BarChart2 size={14} style={{color:"#8c8682"}} /> Equalizer</h3>
                <button onClick={() => { setEq({ bass: 0, mid: 0, treble: 0 }); invoke('set_equalizer', { bass: 0, mid: 0, treble: 0 }).catch(() => {}); }}
                  style={{fontSize:"11px",fontWeight:600,color:"#5c5755",cursor:"pointer",padding:"4px 10px",borderRadius:"6px",border:"1px solid #1f1d1c",background:"transparent",transition:"color .12s, border-color .12s"}}
                  onMouseEnter={e=>{e.currentTarget.style.color="#e2ddd9";e.currentTarget.style.borderColor="#3a3735";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="#1f1d1c";}}>
                  Reset
                </button>
              </div>
              <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"14px"}}>
                {([
                  { label: 'Bass', key: 'bass' as const, desc: 'Low range (60–250Hz)' },
                  { label: 'Mid', key: 'mid' as const, desc: 'Vocals & instruments (500Hz–2kHz)' },
                  { label: 'Treble', key: 'treble' as const, desc: 'High range & air (4–16kHz)' },
                ] as { label: string; key: 'bass' | 'mid' | 'treble'; desc: string }[]).map(({ label, key, desc }) => (
                  <div key={key}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                        <span style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9"}}>{label}</span>
                        <span style={{fontSize:"10.5px",color:"#5c5755"}}>{desc}</span>
                      </div>
                      <span style={{fontSize:"11px",fontWeight:700,fontVariantNumeric:"tabular-nums",width:"42px",textAlign:"right",color:eq[key]>0?"#e2ddd9":eq[key]<0?"#5c5755":"#363230"}}>
                        {eq[key] > 0 ? `+${eq[key]}` : eq[key]} dB
                      </span>
                    </div>
                    <div style={{position:"relative",height:"4px",background:"#1b1918",borderRadius:"2px"}}
                      onMouseEnter={() => setHoveredSlider(key)}
                      onMouseLeave={() => setHoveredSlider(null)}>
                      <div style={{position:"absolute",top:0,left:"50%",width:"1px",height:"100%",background:"var(--v-bdr3)",borderRadius:"1px",pointerEvents:"none"}}/>
                      <input type="range" min="-12" max="12" step="1" value={eq[key]}
                        onChange={e => {
                          const v = parseInt(e.target.value);
                          const next = { ...eq, [key]: v };
                          setEq(next);
                          invoke('set_equalizer', { bass: next.bass, mid: next.mid, treble: next.treble }).catch(() => {});
                        }}
                        style={{position:"absolute",inset:0,width:"100%",opacity:0,cursor:"pointer",height:"100%"}}
                      />
                      <div style={{
                          position:"absolute",top:0,height:"100%",borderRadius:"2px",pointerEvents:"none",transition:"all .15s",
                          left: eq[key] >= 0 ? '50%' : `${((eq[key] + 12) / 24) * 100}%`,
                          width: `${(Math.abs(eq[key]) / 24) * 100}%`,
                          background: 'var(--v-accent)',
                        }} />
                      <div style={{
                          position: "absolute",
                          top: "50%",
                          transform: hoveredSlider === key ? "translateY(-50%) scale(1.15)" : "translateY(-50%) scale(1)",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          borderStyle: "solid",
                          borderWidth: "2px",
                          borderColor: "var(--v-accent)",
                          background: "var(--v-bg0)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                          pointerEvents: "none",
                          transition: "left 0.12s ease-out, transform 0.12s ease",
                          left: `calc(${((eq[key] + 12) / 24) * 100}% - 6px)`
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {show('integrations') && matchesSearch(["Integrations", "Discord Rich Presence", "Discord RPC", "Lyrics Source", "Primary source"]) && (
          <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
            <div>
              <h2 style={{fontSize:"22px",fontWeight:800,letterSpacing:"-0.01em",color:"#e2ddd9",margin:"0 0 4px"}}>Integrations</h2>
              <p style={{fontSize:"12.5px",color:"#6f6966",margin:0}}>Configure external integrations and social status activity.</p>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Discord Integration</h3>
              </div>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Discord Rich Presence</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>{discordRpcEnabled ? 'Active — shows listening activity on your Discord profile' : 'Disabled — listening activity is hidden'}</p>
                </div>
                <SettingsSwitch checked={discordRpcEnabled} onChange={() => setDiscordRpcEnabled(!discordRpcEnabled)} />
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Lyrics Provider</h3>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Primary Source</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>
                    {lyricsSource === 'musixmatch' ? 'Musixmatch — word-level richsync when available'
                      : lyricsSource === 'netease' ? 'NetEase — great for Asian artists & translations'
                      : 'lrclib — open, fast, fully synced and community-driven'}
                  </p>
                </div>
                <ThemedSelect value={lyricsSource} onChange={setLyricsSource} options={[
                  { value: 'lrclib', label: 'lrclib', desc: 'Open source, fast' },
                  { value: 'musixmatch', label: 'Musixmatch', desc: 'Word-level sync' },
                  { value: 'netease', label: 'NetEase', desc: 'Best for C/K-pop' },
                ]} />
              </div>
            </div>
          </div>
        )}

        {show('appearance') && matchesSearch(["Appearance", "System Tray", "Enable Tray Icon", "Default Startup Page", "Startup View", "Theme", "Accent Color", "Custom Theme"]) && (
          <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
            <div>
              <h2 style={{fontSize:"22px",fontWeight:800,letterSpacing:"-0.01em",color:"#e2ddd9",margin:"0 0 4px"}}>Appearance</h2>
              <p style={{fontSize:"12.5px",color:"#6f6966",margin:0}}>Customize application themes, accent colors, and startup behaviors.</p>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Application Theme</h3>
              </div>
              <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
                <p style={{fontSize:"12px",color:"#6f6966",margin:0}}>Choose from one of our curated high-contrast dark modes.</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"12px",marginTop:"4px"}}>
                  {[
                    { id: 'obsidian', name: 'Obsidian', desc: 'True deep black', bg: '#0c0b0b', cardBg: '#171515', accent: '#e2ddd9' },
                    { id: 'midnight', name: 'Midnight Navy', desc: 'Deep navy tones', bg: '#05070e', cardBg: '#0d1222', accent: '#4f46e5' },
                    { id: 'forest', name: 'Forest Emerald', desc: 'Moss & dark greens', bg: '#040806', cardBg: '#0b1510', accent: '#10b981' },
                    { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Vibrant neon purple', bg: '#0a0112', cardBg: '#1b032d', accent: '#d946ef' },
                    { id: 'sunset', name: 'Sunset Crimson', desc: 'Burnt red tones', bg: '#0a0505', cardBg: '#1b0c0c', accent: '#ef4444' },
                    { id: 'pureblack', name: 'Pure Black', desc: 'Solid high contrast', bg: '#000000', cardBg: '#080808', accent: '#ffffff' },
                  ].map(t => {
                    const isSelected = theme === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setThemeState(t.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: isSelected ? "rgba(226,221,217,0.03)" : "rgba(226,221,217,0.005)",
                          border: isSelected ? "1px solid var(--v-accent)" : "1px solid rgba(255,255,255,0.04)",
                          borderRadius: "10px",
                          padding: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                          textAlign: "left",
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                            e.currentTarget.style.background = "rgba(226, 221, 217, 0.015)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                            e.currentTarget.style.background = "rgba(226,221,217,0.005)";
                          }
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
                            <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: t.bg, border: "1px solid rgba(255,255,255,0.08)" }} />
                            <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: t.cardBg, border: "1px solid rgba(255,255,255,0.08)" }} />
                            <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: t.accent, border: "1px solid rgba(255,255,255,0.08)" }} />
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2ddd9" }}>{t.name}</span>
                          <span style={{ fontSize: "10.5px", color: "#5c5755", marginTop: "2px" }}>{t.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  onClick={() => setThemeState('custom')}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: theme === 'custom' ? "rgba(226,221,217,0.03)" : "rgba(226,221,217,0.005)",
                    border: theme === 'custom' ? "1px solid var(--v-accent)" : "1px solid rgba(255,255,255,0.04)",
                    borderRadius: "10px",
                    padding: "16px 20px",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    textAlign: "left",
                    marginTop: "12px"
                  }}
                  onMouseEnter={e => {
                    if (theme !== 'custom') {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.background = "rgba(226, 221, 217, 0.015)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (theme !== 'custom') {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.background = "rgba(226,221,217,0.005)";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: customBgColor, border: "1px solid rgba(255,255,255,0.08)" }} />
                      <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: lightenColor(customBgColor, 4), border: "1px solid rgba(255,255,255,0.08)" }} />
                      <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: accentColor, border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#e2ddd9" }}>Custom Theme</span>
                      <span style={{ fontSize: "11px", color: "#5c5755", marginTop: "2px" }}>Personal background color</span>
                    </div>
                  </div>
                  
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 12px",
                      background: "rgba(255, 255, 255, 0.015)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                      borderRadius: "8px",
                      opacity: theme === 'custom' ? 1 : 0.6,
                      transition: "opacity 0.2s"
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#6f6966", fontWeight: 500 }}>Hex:</span>
                    <input
                      type="text"
                      value={customBgColor}
                      disabled={theme !== 'custom'}
                      onChange={e => {
                          const val = e.target.value;
                          if (val.startsWith('#') && val.length <= 7) {
                            setCustomBgColorState(val);
                          }
                      }}
                      placeholder="#0c0b0b"
                      style={{
                        width: "75px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        background: "rgba(0, 0, 0, 0.2)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "6px",
                        color: "#e2ddd9",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                    <div
                      style={{
                        position: "relative",
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.15)",
                        cursor: theme === 'custom' ? "pointer" : "default",
                        background: "linear-gradient(45deg, #ff0055, #00ffcc, #9900ff)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
                      }}
                      title={theme === 'custom' ? "Choose Color" : "Select Custom Theme First"}
                      onMouseEnter={e => { if (theme === 'custom') e.currentTarget.style.transform = "scale(1.12)"; }}
                      onMouseLeave={e => { if (theme === 'custom') e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      <input
                        type="color"
                        value={customBgColor}
                        disabled={theme !== 'custom'}
                        onChange={e => setCustomBgColorState(e.target.value)}
                        style={{
                          position: "absolute",
                          top: "-4px",
                          left: "-4px",
                          width: "30px",
                          height: "30px",
                          opacity: 0,
                          cursor: theme === 'custom' ? "pointer" : "default",
                        }}
                      />
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)", pointerEvents: "none" }}>+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Accent Color</h3>
              </div>
              <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
                <p style={{fontSize:"12px",color:"#6f6966",margin:0}}>Choose a preset highlight color or select a custom color profile.</p>
                <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap",marginTop:"4px"}}>
                  {[
                    { value: '#e2ddd9', label: 'Silver' },
                    { value: '#5f5bf6', label: 'Indigo' },
                    { value: '#10b981', label: 'Emerald' },
                    { value: '#d946ef', label: 'Magenta' },
                    { value: '#f97316', label: 'Orange' },
                    { value: '#ef4444', label: 'Crimson' },
                  ].map(acc => {
                    const isSelected = accentColor.toLowerCase() === acc.value.toLowerCase();
                    return (
                      <button
                        key={acc.value}
                        onClick={() => setAccentColorState(acc.value)}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: acc.value,
                          border: isSelected ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.15)",
                          cursor: "pointer",
                          position: "relative",
                          outline: isSelected ? "2px solid var(--v-accent)" : "none",
                          outlineOffset: "2px",
                          transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                          boxSizing: "border-box"
                        }}
                        title={acc.label}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                      />
                    );
                  })}

                  <div
                    style={{
                      position: "relative",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.15)",
                      cursor: "pointer",
                      background: "linear-gradient(45deg, #ff0055, #00ffcc, #9900ff)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                    title="Custom Hex Picker"
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    <input
                      type="color"
                      value={accentColor.startsWith('#') && accentColor.length === 7 ? accentColor : '#e2ddd9'}
                      onChange={e => setAccentColorState(e.target.value)}
                      style={{
                        position: "absolute",
                        top: "-4px",
                        left: "-4px",
                        width: "36px",
                        height: "36px",
                        opacity: 0,
                        cursor: "pointer",
                      }}
                    />
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)", pointerEvents: "none" }}>+</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#5c5755", fontWeight: 500 }}>Hex:</span>
                    <input
                      type="text"
                      value={accentColor}
                      onChange={e => setAccentColorState(e.target.value)}
                      placeholder="#ffffff"
                      style={{
                        width: "80px",
                        padding: "6px 8px",
                        fontSize: "11px",
                        background: "rgba(226,221,217,0.015)",
                        border: "1px solid var(--v-bdr)",
                        borderRadius: "8px",
                        color: "#e2ddd9",
                        outline: "none",
                        fontFamily: "monospace",
                        textAlign: "center"
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = "#44403c";
                        e.currentTarget.style.background = "rgba(226, 221, 217, 0.03)";
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = "#1a1817";
                        e.currentTarget.style.background = "rgba(226, 221, 217, 0.015)";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>System Integration</h3>
              </div>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Enable System Tray Icon</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>{trayEnabled ? 'Active — window minimizes to system tray on close' : 'Disabled — close exits the app entirely'}</p>
                </div>
                <SettingsSwitch checked={trayEnabled} onChange={async () => {
                  const next = !trayEnabled;
                  try { await invoke('tray_set', { enabled: next }); setTrayEnabled(next); }
                  catch (e) { showToast(`Tray unavailable: ${e}`); }
                }} />
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Startup Behavior</h3>
              </div>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Default Startup View</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>Currently opens on {startupNav === 'home' ? 'Home' : startupNav === 'downloads' ? 'Offline' : startupNav === 'stats' ? 'Stats' : startupNav === 'library' ? 'Playlists' : 'Settings'}</p>
                </div>
                <ThemedSelect
                  value={startupNav}
                  onChange={handleStartupNavChange}
                  options={[
                    { value: 'home', label: 'Home', desc: 'Main discovery dashboard' },
                    { value: 'downloads', label: 'Offline', desc: 'Your downloaded local tracks' },
                    { value: 'library', label: 'Playlists', desc: 'Your playlists and Liked Songs' },
                    { value: 'stats', label: 'Stats', desc: 'Your personal listening insights' },
                    { value: 'settings', label: 'Settings', desc: 'Preferences and configurations' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {show('storage') && matchesSearch(["Storage", "Backup Location", "Create Backup", "Restore Backup", "Reset Veluna App"]) && (
          <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
            <div>
              <h2 style={{fontSize:"22px",fontWeight:800,letterSpacing:"-0.01em",color:"#e2ddd9",margin:"0 0 4px"}}>Storage</h2>
              <p style={{fontSize:"12.5px",color:"#6f6966",margin:0}}>Backup, restore data, and manage application maintenance.</p>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Backup Location</h3>
              </div>
              <div className="v-settings-row" style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background 0.15s ease-out"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(226,221,217,0.005)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} onClick={async () => {
                try {
                  const sel = await (await import('@tauri-apps/plugin-dialog')).open({ directory: true, multiple: false, defaultPath: backupPath });
                  if (sel) setBackupPath(sel as string);
                } catch {}
              }}>
                <div style={{flex:1,minWidth:0}}>
                  <div className="v-settings-path-capsule" style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11.5px",
                    color: "#9e9894",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--v-bdr)",
                    borderRadius: "20px",
                    padding: "4px 10px",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    fontFamily: "monospace",
                    maxWidth: "90%"
                  }}>
                    <FolderOpen size={12} style={{ color: "var(--v-accent)", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{backupPath || downloadPath}</span>
                  </div>
                  <p style={{fontSize:"11px",color:"#5c5755",marginTop:"6px"}}>Backup file: veluna_backup.json</p>
                </div>
                <button style={{padding:"6px",marginLeft:"12px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",flexShrink:0,borderRadius:"7px",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <FolderOpen size={16} />
                </button>
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--v-bdr)",background:"rgba(226,221,217,0.015)"}}>
                <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0}}>Backup & Restore Actions</h3>
              </div>
              
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background 0.15s ease-out",borderBottom:"1px solid #141312"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(226,221,217,0.005)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} onClick={onBackup}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Create Backup</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>Save all playlists, queue, history, and settings to a JSON file</p>
                </div>
                <button style={{padding:"6px",marginLeft:"12px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",flexShrink:0,borderRadius:"7px",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <Upload size={16} />
                </button>
              </div>

              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"background 0.15s ease-out"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(226,221,217,0.005)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} onClick={onRestore}>
                <div>
                  <p style={{fontSize:"13px",fontWeight:500,color:"#e2ddd9"}}>Restore Backup</p>
                  <p style={{fontSize:"11px",color:"#6f6966",marginTop:"4px"}}>Restore playlists, history, and preferences from a backup file</p>
                </div>
                <button style={{padding:"6px",marginLeft:"12px",color:"#5c5755",background:"none",border:"none",cursor:"pointer",flexShrink:0,borderRadius:"7px",display:"flex",transition:"color .12s"}} onMouseEnter={e=>(e.currentTarget.style.color="#e2ddd9")} onMouseLeave={e=>(e.currentTarget.style.color="#5c5755")}>
                  <ArchiveRestore size={16} />
                </button>
              </div>
            </div>

            <div style={{borderRadius:"12px",border:"1px solid rgba(239, 68, 68, 0.15)",background:"rgba(239, 68, 68, 0.005)",overflow:"hidden",transition:"all 0.2s"}}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.015)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.005)'; }}
              onClick={onReset}>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
                <div>
                  <h3 style={{fontSize:"13px",fontWeight:600,color:"#ef4444",margin:0}}>Reset Veluna App</h3>
                  <p style={{fontSize:"11px",color:"rgba(239, 68, 68, 0.6)",marginTop:"4px"}}>Permanently delete all local database contents, playlists, history, and configuration files. This action is irreversible.</p>
                </div>
                <button style={{padding:"6px",color:"#ef4444",background:"none",border:"none",cursor:"pointer",display:"flex",flexShrink:0,marginLeft:"10px"}}>
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )
      }
      </div>
    </div>
  );
}
