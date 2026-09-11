const ACCENTS = {
  green: { base: '#3fae6e', dark: '#349159', soft: 'rgba(63, 174, 110, 0.15)' },
  blue: { base: '#3d8bd9', dark: '#2f6fb0', soft: 'rgba(61, 139, 217, 0.15)' },
  pink: { base: '#d94f8f', dark: '#b53d74', soft: 'rgba(217, 79, 143, 0.15)' },
  orange: { base: '#e08a3c', dark: '#b96e2d', soft: 'rgba(224, 138, 60, 0.15)' },
};

export const ACCENT_LIST = Object.keys(ACCENTS);

function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

function resolveMode(tema) {
  if (tema.mod === 'Açık') return 'light';
  if (tema.mod === 'Koyu') return 'dark';
  // Otomatik
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(tema.otomatikBaslangic);
  const end = timeToMinutes(tema.otomatikBitis);
  if (start === end) return 'dark';
  if (start < end) return nowMin >= start && nowMin < end ? 'light' : 'dark';
  return nowMin >= start || nowMin < end ? 'light' : 'dark';
}

let autoTimer = null;

export function applyTheme(tema) {
  const mode = resolveMode(tema);
  document.documentElement.setAttribute('data-theme', mode);

  const accent = ACCENTS[tema.vurgu] || ACCENTS.green;
  const root = document.documentElement.style;
  root.setProperty('--green', accent.base);
  root.setProperty('--green-dark', accent.dark);
  root.setProperty('--green-soft', accent.soft);

  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  if (tema.mod === 'Otomatik') {
    autoTimer = setInterval(() => applyTheme(tema), 60000);
  }
}
