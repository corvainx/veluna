export function parseDurationToSeconds(d: string): number {
  const p = d.split(':').map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] || 0;
}

export const lightenColor = (hex: string, percent: number): string => {
  let num = parseInt(hex.replace("#", ""), 16),
      amt = Math.round(2.55 * percent),
      r = (num >> 16) + amt,
      g = (num >> 8 & 0x00FF) + amt,
      b = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (r < 255 ? r < 0 ? 0 : r : 255) * 0x10000 + (g < 255 ? g < 0 ? 0 : g : 255) * 0x100 + (b < 255 ? b < 0 ? 0 : b : 255)).toString(16).slice(1);
};

export const hexToRgb = (hex: string): string => {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return "0, 0, 0";
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

export const cleanArtist = (a?: string | null): string => {
  if (!a) return '';
  const t = a.trim();
  const bad = ['unknown', 'na', 'n/a', 'none', '-', '--', 'unknown artist', 'various artists', 'various', '?'];
  return bad.includes(t.toLowerCase()) ? '' : t;
};

export const getTrackGradient = (title?: string | null, artist?: string | null): string => {
  const str = `${title || ''}${artist || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 45%, 28%) 0%, hsl(${h2}, 30%, 12%) 100%)`;
};

export function formatTime(s: number): string {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function formatBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function loadLS<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}

export function saveLS(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

export function clampMenu(x: number, y: number, w = 260, h = 320) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  const cx = x + w > vw - 8 ? Math.max(8, x - w) : x;
  
  const cy = y + h > vh - 8 ? Math.max(8, y - h) : y;
  return { x: cx, y: cy };
}
