import React, { useState } from 'react';

type CopyButtonProps = {
  text: string;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
};

export function CopyButton({ text, label, icon: Icon, disabled = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    if (!text || disabled) return;
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button onClick={handleCopy} disabled={disabled}
      style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        gap:"7px",
        padding:"8px",
        borderRadius:"9px",
        border:"1px solid var(--v-bdr2)",
        background:"var(--v-bdr2)",
        color:copied?"#9e9894":"#5c5755",
        fontSize:"12px",
        fontWeight:600,
        cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?0.3:1,
        transition:"border-color .12s,color .12s,background .12s",
        width:"100%"
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.background = "#232020";
          e.currentTarget.style.color = "#9e9894";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "var(--v-bdr2)";
        e.currentTarget.style.color = copied ? "#9e9894" : "#5c5755";
      }}
    >
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9e9894" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <Icon size={13}/>
          {label}
        </>
      )}
    </button>
  );
}
