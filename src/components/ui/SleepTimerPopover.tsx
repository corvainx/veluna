import React, { useState } from 'react';
import { Moon, X } from 'lucide-react';

type SleepTimerPopoverProps = {
  sleepTimer: number;
  onSet: (m: number) => void;
  onCancel: () => void;
  onClose: () => void;
};

export const SleepTimerPopover = React.memo(({
  sleepTimer,
  onSet,
  onCancel,
  onClose,
}: SleepTimerPopoverProps) => {
  const [input, setInput] = useState('');
  const presets = [5, 10, 15, 20, 30, 45, 60, 90];
  return (
    <div style={{width:'220px',background:'var(--v-bg2)',borderStyle:'solid',borderWidth:'1px',borderColor:'var(--v-bdr2)',borderRadius:'12px',overflow:'hidden',boxShadow:'0 12px 40px rgba(0,0,0,0.8)'}} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottomStyle:'solid',borderBottomWidth:'1px',borderBottomColor:'var(--v-bdr2)'}}>
        <span style={{fontSize:'12px',fontWeight:700,color:'#9e9894',display:'flex',alignItems:'center',gap:'7px'}}><Moon size={13}/> Sleep Timer</span>
        <button onClick={onClose} style={{background:'none',borderStyle:'none',borderWidth:0,borderColor:'transparent',outlineStyle:'none',outlineWidth:0,outlineColor:'transparent',cursor:'pointer',color:'#363230',display:'flex'}} onMouseEnter={e=>(e.currentTarget.style.color='#9e9894')} onMouseLeave={e=>(e.currentTarget.style.color='#363230')}><X size={13}/></button>
      </div>
      {sleepTimer > 0 && (
        <div style={{padding:'10px 14px',borderBottomStyle:'solid',borderBottomWidth:'1px',borderBottomColor:'var(--v-bdr2)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'12px',color:'#9e9894'}}>Pausing in <strong>{Math.ceil(sleepTimer/60)}m</strong></span>
          <button onClick={()=>{onCancel();onClose();}} style={{background:'none',borderStyle:'none',borderWidth:0,borderColor:'transparent',outlineStyle:'none',outlineWidth:0,outlineColor:'transparent',cursor:'pointer',fontSize:'11px',color:'#5c5755',display:'flex',alignItems:'center',gap:'4px'}} onMouseEnter={e=>(e.currentTarget.style.color='#b05555')} onMouseLeave={e=>(e.currentTarget.style.color='#5c5755')}><X size={10}/>Cancel</button>
        </div>
      )}
      <div style={{padding:'10px 14px 6px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px'}}>
        {presets.map(m=>(
          <button key={m} onClick={()=>{onSet(m);onClose();}}
            style={{
              padding:'5px 0',
              borderRadius:'7px',
              borderStyle: 'solid',
              borderWidth: '1px',
              borderColor: 'var(--v-bdr2)',
              outlineStyle: 'none',
              outlineWidth: 0,
              outlineColor: 'transparent',
              background:'transparent',
              color:'#5c5755',
              cursor:'pointer',
              fontSize:'11px',
              fontWeight:600,
              transition:'border-color .1s,color .1s,background .1s'
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(226,221,217,0.06)';(e.currentTarget as HTMLElement).style.color='#9e9894';(e.currentTarget as HTMLElement).style.borderColor='var(--v-bdr3)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='#5c5755';(e.currentTarget as HTMLElement).style.borderColor='var(--v-bdr2)';}}>
            {m}m
          </button>
        ))}
      </div>
      <div style={{padding:'6px 14px 12px',display:'flex',gap:'6px'}}>
        <input type="number" min="1" max="999" placeholder="Custom min"
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'){const m=parseInt(input);if(m>0){onSet(m);onClose();}}}}
          style={{flex:1,background:'var(--v-bdr2)',borderStyle:'solid',borderWidth:'1px',borderColor:'var(--v-bdr2)',color:'#e2ddd9',borderRadius:'7px',padding:'5px 8px',fontSize:'11px',outlineStyle:'none',outlineWidth:0,outlineColor:'transparent'}}
        />
        <button onClick={()=>{const m=parseInt(input);if(m>0){onSet(m);onClose();}}}
          style={{
            padding:'5px 10px',
            background:'rgba(226,221,217,0.07)',
            borderStyle:'solid',
            borderWidth:'1px',
            borderColor:'var(--v-bdr3)',
            outlineStyle:'none',
            outlineWidth:0,
            outlineColor:'transparent',
            color:'#9e9894',
            borderRadius:'7px',
            cursor:'pointer',
            fontSize:'11px',
            fontWeight:600
          }}>
          Set
        </button>
      </div>
    </div>
  );
});

SleepTimerPopover.displayName = 'SleepTimerPopover';
