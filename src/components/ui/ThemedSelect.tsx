import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown } from 'lucide-react';

type Option = {
  label: string;
  value: string;
  desc?: string;
};

type ThemedSelectProps = {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
};

export const ThemedSelect = ({ value, options, onChange }: ThemedSelectProps) => {
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
