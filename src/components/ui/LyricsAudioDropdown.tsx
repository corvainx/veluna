import { useState } from 'react';
import { Volume2, ChevronDown } from 'lucide-react';

type LyricsAudioDropdownProps = {
  devices: { id: string; name: string; form: string; is_default: boolean }[];
  switching: boolean;
  onSwitch: (id: string) => void;
};

export function LyricsAudioDropdown({ devices, switching, onSwitch }: LyricsAudioDropdownProps) {
  const [open, setOpen] = useState(false);
  const active = devices.find(d => d.is_default) ?? devices[0];
  return (
    <div style={{width:"100%",position:"relative"}}>
      <button onClick={() => setOpen(o => !o)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"8px",textAlign:"left",border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.06)",cursor:"pointer",transition:"background .12s"}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.06)";}}>
        <Volume2 size={12} style={{color:"#9e9894",flexShrink:0}}/>
        <span style={{fontSize:"12px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,textAlign:"left",color:"rgba(255,255,255,0.7)"}}>{active?.name ?? 'No device'}</span>
        <ChevronDown size={11} style={{color:"rgba(255,255,255,0.3)",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s",flexShrink:0}}/>
      </button>
      {open && (
        <div style={{position:"absolute",bottom:"calc(100% + 6px)",left:0,right:0,borderRadius:"10px",overflow:"hidden",zIndex:20,background:"var(--v-bg2)",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 16px 40px rgba(0,0,0,0.9)"}}>
          <div style={{padding:"7px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <span style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,0.3)"}}>Output Device</span>
          </div>
          {devices.map(dev => (
            <button key={dev.id} disabled={switching}
              onClick={() => { if (!dev.is_default) onSwitch(dev.id); setOpen(false); }}
              style={{width:"100%",display:"flex",alignItems:"center",gap:"9px",padding:"9px 12px",textAlign:"left",border:"none",background:dev.is_default?"rgba(255,255,255,0.05)":"transparent",cursor:dev.is_default?"default":"pointer",transition:"background .1s"}}
              onMouseEnter={e=>{if(!dev.is_default)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.05)";}}
              onMouseLeave={e=>{if(!dev.is_default)(e.currentTarget as HTMLElement).style.background="transparent";}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",flexShrink:0,background:dev.is_default?"#9e9894":"rgba(255,255,255,0.15)"}}/>
              <span style={{fontSize:"12px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:dev.is_default?"#fff":"rgba(255,255,255,0.5)",flex:1,textAlign:"left"}}>{dev.name}</span>
              {dev.is_default && <span style={{fontSize:"9px",fontWeight:700,color:"#9e9894",flexShrink:0,letterSpacing:".05em"}}>ACTIVE</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
