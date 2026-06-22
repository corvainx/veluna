import { useState, useEffect, useRef } from 'react';

type ImportResultModalProps = {
  matchedCount: number;
  failedCount: number;
  onSave: (name: string, desc: string) => void;
  onClose: () => void;
};

export function ImportResultModal({
  matchedCount, failedCount,
  onSave, onClose,
}: ImportResultModalProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(var(--v-bg0-rgb),0.9)"}}>
      <div style={{width:"380px",borderRadius:"14px",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.95)",background:"var(--v-bg2)",border:"1px solid var(--v-bdr2)"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--v-bdr2)"}}>
          <h2 style={{fontSize:"14px",fontWeight:700,color:"#e2ddd9",margin:0}}>Save Playlist</h2>
          <p style={{fontSize:"11px",color:"#5c5755",marginTop:"3px"}}>
            <span style={{color:"#9e9894",fontWeight:700}}>{matchedCount}</span> tracks matched
            {failedCount>0&&<span style={{color:"#363230"}}> · {failedCount} not found</span>}
          </p>
        </div>
        <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:"10px"}}>
          <div>
            <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"6px"}}>Playlist Name</label>
            <input ref={inputRef} value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&name.trim())onSave(name.trim(),desc.trim());}}
              placeholder="My Playlist" maxLength={80}
              style={{width:"100%",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",color:"#e2ddd9",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:"9.5px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#5c5755",display:"block",marginBottom:"6px"}}>Description <span style={{color:"#363230",textTransform:"none",fontWeight:400}}>(optional)</span></label>
            <input value={desc} onChange={e=>setDesc(e.target.value)}
              placeholder="e.g. Chill vibes, road trip..." maxLength={160}
              style={{width:"100%",background:"var(--v-bdr2)",border:"1px solid var(--v-bdr2)",borderRadius:"8px",padding:"8px 10px",fontSize:"13px",color:"#e2ddd9",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:"8px",marginTop:"4px"}}>
            <button onClick={onClose}
              style={{flex:1,padding:"8px",borderRadius:"8px",border:"1px solid var(--v-bdr2)",color:"#5c5755",background:"transparent",fontWeight:600,cursor:"pointer",fontSize:"12px",transition:"border-color .12s,color .12s"}}
              onMouseEnter={e=>{e.currentTarget.style.color="#9e9894";e.currentTarget.style.borderColor="var(--v-bdr3)";}}
              onMouseLeave={e=>{e.currentTarget.style.color="#5c5755";e.currentTarget.style.borderColor="var(--v-bdr2)";}}>
              Cancel
            </button>
            <button onClick={()=>{if(name.trim())onSave(name.trim(),desc.trim());}} disabled={!name.trim()}
              style={{flex:1,padding:"8px",borderRadius:"8px",border:"none",background:"#e2ddd9",color:"var(--v-bg0)",fontWeight:700,cursor:"pointer",fontSize:"12px",opacity:name.trim()?1:0.35}}>
              Save Playlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
