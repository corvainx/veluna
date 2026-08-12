import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown } from 'lucide-react';

type ThemedSelectProps = {
  value: string;
  options: { label: string; value: string; desc?: string }[];
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
        background: 'rgba(14,13,12,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '5px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
      }}>
      {options.map((opt) => (
        <button key={opt.value}
          onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            padding: '8px 14px',
            textAlign: 'left',
            cursor: 'pointer',
            borderRadius: '9999px',
            background: value === opt.value ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: value === opt.value ? 'var(--v-accent)' : 'rgba(255,255,255,0.55)',
            transition: 'background 0.1s',
            border: 'none',
            outline: 'none',
          }}
          onMouseEnter={e => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{opt.label}</span>
          {opt.desc && <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{opt.desc}</span>}
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
          padding: '7px 14px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: 500,
          border: '1px solid rgba(255,255,255,0.09)',
          outline: 'none',
          background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
          color: open ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          minWidth: '130px',
          transition: 'all .12s',
        }}
        onMouseEnter={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; } }}
        onMouseLeave={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; } }}
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
