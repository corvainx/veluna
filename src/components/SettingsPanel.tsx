import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Search, X, ArrowUpCircle, CheckCircle, ExternalLink, RefreshCw,
  FolderDown, FolderOpen, Image, Zap, Volume2, BarChart2, Globe,
  Moon, Database, Upload, ArchiveRestore, Trash2, ChevronDown
} from 'lucide-react';
import { SettingsTab, DiskInfo } from '../types';
import { loadLS, saveLS, lightenColor, validateSettingsChange, formatBytes } from '../utils';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

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
          top: "3px",
          left: checked ? "21px" : "3px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: checked ? "#000000" : "#5c5755",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)"
        }}
      />
    </button>
  );
};

const ThemedSelect = ({ value, options, onChange }: {
  value: string;
  options: { label: string; value: string; desc?: string }[];
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const dropW = Math.max(r.width, 220);
      const left = Math.min(r.left, window.innerWidth - dropW - 8);
      const dropH = dropRef.current ? dropRef.current.offsetHeight : (options.length * 56 + 10);
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      let top = r.bottom + 4;
      if (spaceBelow < dropH && spaceAbove > spaceBelow) {
        top = r.top - dropH - 4;
      }
      setDropPos({ top, left: Math.max(8, left), width: dropW });
    };
    update();
    const timer = setTimeout(update, 0);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, options.length]);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const dropW = Math.max(r.width, 220);
      const left = Math.min(r.left, window.innerWidth - dropW - 8);
      const dropH = options.length * 56 + 10;
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      let top = r.bottom + 4;
      if (spaceBelow < dropH && spaceAbove > spaceBelow) {
        top = r.top - dropH - 4;
      }
      setDropPos({ top, left: Math.max(8, left), width: dropW });
    }
    setOpen(o => !o);
  };

  const dropdown = open ? (
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: dropPos.top,
        left: dropPos.left,
        minWidth: dropPos.width,
        zIndex: 999999,
        animation: 'dropIn 0.15s ease-out',
        background: 'var(--v-bg2)',
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: 'var(--v-bdr2)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.85)',
      }}>
      {options.map((opt, i) => (
        <button key={opt.value}
          onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            padding: '9px 14px',
            textAlign: 'left',
            cursor: 'pointer',
            background: value === opt.value ? 'rgba(226,221,217,0.06)' : 'transparent',
            color: value === opt.value ? 'var(--v-accent)' : '#9e9894',
            transition: 'background 0.1s',
            appearance: 'none',
            WebkitAppearance: 'none',
            outlineStyle: 'none',
            outlineWidth: 0,
            outlineColor: 'transparent',
            borderLeftStyle: 'none',
            borderLeftWidth: 0,
            borderLeftColor: 'transparent',
            borderRightStyle: 'none',
            borderRightWidth: 0,
            borderRightColor: 'transparent',
            borderBottomStyle: 'none',
            borderBottomWidth: 0,
            borderBottomColor: 'transparent',
            borderTopStyle: i !== 0 ? 'solid' : 'none',
            borderTopWidth: i !== 0 ? 1 : 0,
            borderTopColor: i !== 0 ? 'var(--v-bdr2)' : 'transparent',
          }}
          onMouseEnter={e => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = 'rgba(226,221,217,0.04)'; }}
          onMouseLeave={e => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{opt.label}</span>
          {opt.desc && <span style={{ fontSize: '12px', color: '#5c5755', marginTop: '3px' }}>{opt.desc}</span>}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef}
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 12px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 500,
          borderStyle: 'solid',
          borderWidth: '1px',
          borderColor: open ? 'var(--v-bdr3)' : 'var(--v-bdr2)',
          outlineStyle: 'none',
          outlineWidth: 0,
          outlineColor: 'transparent',
          background: open ? 'rgba(226,221,217,0.05)' : 'var(--v-bg2)',
          color: open ? '#e2ddd9' : '#9e9894',
          cursor: 'pointer',
          minWidth: '130px',
          transition: 'border-color .12s,color .12s,background .12s',
        }}
        onMouseEnter={e => { if (!open) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--v-bdr3)'; (e.currentTarget as HTMLElement).style.color = '#e2ddd9'; } }}
        onMouseLeave={e => { if (!open) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--v-bdr2)'; (e.currentTarget as HTMLElement).style.color = '#9e9894'; } }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{current?.label}</span>
        <ChevronDown size={14} style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {typeof document !== 'undefined' && dropdown
        ? ReactDOM.createPortal(dropdown, document.body)
        : null}
    </div>
  );
};

export type SettingsPanelProps = {
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
  const [, setSwitchingDevice] = useState(false);
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

      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"} } className="custom-scrollbar">
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

            <div style={{borderRadius:"12px",border:"1px solid var(--v-bdr)",background:"var(--v-bg0)",padding:"12px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
              <h3 style={{fontSize:"13px",fontWeight:600,color:"#e2ddd9",margin:0,display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap",flexShrink:0}}><Volume2 size={14} style={{color:"#8c8682"}} /> Audio Output Device</h3>
              <div style={{flex:1,minWidth:0}}>
                {audioDevices.length === 0 ? (
                  <div style={{fontSize:"12px",color:"#6f6966"}}>No output devices found</div>
                ) : (() => {
                  const activeDevice = audioDevices.find(d => d.is_default) ?? audioDevices[0];
                  return (
                    <ThemedSelect
                      value={activeDevice?.id ?? ''}
                      onChange={async (id) => {
                        if (id === activeDevice?.id) return;
                        setSwitchingDevice(true);
                        try {
                          await invoke('set_audio_device', { id });
                          setAudioDevices(prev => prev.map(d => ({ ...d, is_default: d.id === id })));
                          showToast(`Output switched: ${audioDevices.find(d=>d.id===id)?.name ?? id}`);
                        } catch (e) { showToast(`Switch failed: ${e}`); }
                        finally { setSwitchingDevice(false); }
                      }}
                      options={audioDevices.map(dev => ({
                        value: dev.id,
                        label: dev.name,
                        desc: dev.form ? dev.form.charAt(0).toUpperCase() + dev.form.slice(1) : undefined,
                      }))}
                    />
                  );
                })()}
              </div>
              <button onClick={(e) => { const icon = e.currentTarget.querySelector('svg')!; icon.style.transition='transform .5s ease'; icon.style.transform='rotate(360deg)'; setTimeout(()=>{icon.style.transition='none';icon.style.transform='rotate(0deg)';},520); invoke<{ id: string; name: string; form: string; is_default: boolean }[]>('list_audio_devices').then(setAudioDevices).catch(() => {}); }}
                style={{padding:"4px",background:"none",border:"none",cursor:"pointer",color:"#5c5755",borderRadius:"6px",display:"flex",flexShrink:0,transition:"color .12s"}} title="Refresh devices" onMouseEnter={e=>e.currentTarget.style.color="#e2ddd9"} onMouseLeave={e=>e.currentTarget.style.color="#5c5755"}>
                <RefreshCw size={13} />
              </button>
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
              <div style={{padding:"18px 16px",display:"flex",flexDirection:"column",gap:"16px"}}>
                {([
                  { label: 'Bass', key: 'bass' as const, freq: '60–250 Hz' },
                  { label: 'Mid', key: 'mid' as const, freq: '500 Hz–2 kHz' },
                  { label: 'Treble', key: 'treble' as const, freq: '4–16 kHz' },
                ] as { label: string; key: 'bass' | 'mid' | 'treble'; freq: string }[]).map(({ label, key, freq }) => {
                  const val = eq[key];
                  const isActive = val !== 0;
                  return (
                    <div key={key} style={{
                      borderRadius:"10px",
                      background:"var(--v-bg2)",
                      border:`1px solid ${isActive?'rgba(226,221,217,0.08)':'var(--v-bdr)'}`,
                      padding:"12px 14px",
                      transition:"border-color .2s ease",
                    }}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px"}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                          <span style={{fontSize:"13px",fontWeight:700,color:isActive?"#e2ddd9":"#9e9894",transition:"color .2s"}}>{label}</span>
                          <span style={{fontSize:"10px",color:"#4a4644",letterSpacing:"0.02em"}}>{freq}</span>
                        </div>
                        <div style={{
                          fontSize:"12px",fontWeight:700,
                          fontVariantNumeric:"tabular-nums",
                          color: val > 0 ? "#e2ddd9" : val < 0 ? "#6f6966" : "#363230",
                          background: isActive ? "rgba(226,221,217,0.04)" : "transparent",
                          padding:"2px 8px",borderRadius:"5px",
                          border: isActive ? "1px solid rgba(226,221,217,0.06)" : "1px solid transparent",
                          transition:"all .2s ease",
                          minWidth:"44px",textAlign:"center",
                        }}>
                          {val > 0 ? `+${val}` : val} dB
                        </div>
                      </div>

                      <div style={{position:"relative",height:"6px",background:"#1b1918",borderRadius:"3px"}}
                        onMouseEnter={() => setHoveredSlider(key)}
                        onMouseLeave={() => setHoveredSlider(null)}>
                        <div style={{position:"absolute",left:"50%",top:"-3px",width:"1px",height:"12px",background:"rgba(226,221,217,0.15)",borderRadius:"1px",pointerEvents:"none"}}/>

                        <div style={{
                          position:"absolute",top:0,height:"100%",borderRadius:"3px",pointerEvents:"none",
                          transition:"all .15s ease",
                          background:'var(--v-accent)',
                          boxShadow: isActive ? '0 0 8px rgba(226,221,217,0.15)' : 'none',
                          left: val >= 0 ? '50%' : `${((val + 12) / 24) * 100}%`,
                          width: `${(Math.abs(val) / 24) * 100}%`,
                        }}/>

                        <div style={{
                          position:"absolute",
                          top:"50%",
                          transform: hoveredSlider === key ? "translateY(-50%) scale(1.25)" : "translateY(-50%) scale(1)",
                          width:"14px",height:"14px",
                          borderRadius:"50%",
                          border:`2.5px solid ${isActive?'var(--v-accent)':'#5c5755'}`,
                          background:"var(--v-bg0)",
                          boxShadow: isActive ? "0 0 10px rgba(226,221,217,0.2), 0 2px 4px rgba(0,0,0,0.5)" : "0 2px 4px rgba(0,0,0,0.5)",
                          pointerEvents:"none",
                          transition:"left 0.12s ease-out, transform 0.15s ease, border-color .2s ease",
                          left: `calc(${((val + 12) / 24) * 100}% - 7px)`
                        }}/>

                        <input type="range" min="-12" max="12" step="1" value={val}
                          onChange={e => {
                            const v = parseInt(e.target.value);
                            const next = { ...eq, [key]: v };
                            setEq(next);
                            invoke('set_equalizer', { bass: next.bass, mid: next.mid, treble: next.treble }).catch(() => {});
                          }}
                          style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",margin:0}}
                        />
                      </div>
                    </div>
                  );
                })}
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
