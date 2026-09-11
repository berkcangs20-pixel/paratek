const svg = (inner, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const Icon = {
  cari: svg('<path d="M4 20V6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 4v5h5"/><path d="M8 13h8M8 17h5"/>'),
  kasa: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="13.5" r="2.4"/>'),
  banka: svg('<path d="M3 10 12 4l9 6"/><path d="M5 10v9M9 10v9M15 10v9M19 10v9"/><path d="M3 21h18"/>'),
  hatirlatma: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 14v3.2l2 1.2"/><circle cx="12" cy="15" r="4.2"/>'),
  raporlar: svg('<path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M8 12h8M8 16h8M8 20h4"/>'),
  yardim: svg('<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 1 1 3.9 2.6c-.9.4-1.5 1-1.5 2.1"/><path d="M12 17.2h.01"/>'),
  kapat: svg('<path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  print: svg('<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M6 14h12v7H6z"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  chevronDown: svg('<path d="M6 9l6 6 6-6"/>'),
  chevronRight: svg('<path d="M9 6l6 6-6 6"/>'),
  chevronLeft: svg('<path d="M15 6l-6 6 6 6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  swap: svg('<path d="M7 10l-3-3 3-3"/><path d="M4 7h13a3 3 0 0 1 3 3"/><path d="M17 14l3 3-3 3"/><path d="M20 17H7a3 3 0 0 1-3-3"/>'),
  trash: svg('<path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>'),
  calc: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v4M8 19h4"/>'),
  arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: svg('<path d="M5 13l4 4L19 7"/>'),
  cash: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/>'),
  card: svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>'),
  transfer: svg('<path d="M3 10 12 4l9 6"/><path d="M5 10v9M19 10v9"/><path d="M3 21h18"/><path d="M9 14h6"/>'),
  note: svg('<path d="M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M15 3v4h4"/><path d="M8 12h8M8 16h6"/>'),
  filter: svg('<path d="M4 5h16M7 12h10M10 19h4"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  power: svg('<path d="M12 3v8"/><path d="M6.5 6.5a8 8 0 1 0 11 0"/>'),
  building: svg('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h.01M9 12h.01M9 16h.01M15 8h.01M15 12h.01M15 16h.01"/>'),
  wallet: svg('<path d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h3"/>'),
  home: svg('<path d="M4 11 12 4l8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/><path d="M10 20v-6h4v6"/>'),
  settingsGear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.7 6.3l-1.7 1.7M8 16l-1.7 1.7M17.7 17.7 16 16M8 8 6.3 6.3"/>'),
  bell: svg('<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  themeToggle: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" stroke="none"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  refresh: svg('<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>'),
  chart: svg('<path d="M4 19h16"/><path d="M6 15l4-5 3 3 5-7"/><circle cx="6" cy="15" r="1.2" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none"/>'),
  logout: svg('<path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'),
  tag: svg('<path d="M12.6 3H4a1 1 0 0 0-1 1v8.6a1 1 0 0 0 .3.7l9 9a1 1 0 0 0 1.4 0l8.6-8.6a1 1 0 0 0 0-1.4l-9-9a1 1 0 0 0-.7-.3Z"/><circle cx="8" cy="8" r="1.4"/>'),
  assets: svg('<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><path d="M3 13h18"/><path d="M10 13v3h4v-3"/>'),
  exchange: svg('<path d="M7 7h11l-3-3"/><path d="M18 7 15 4"/><path d="M17 17H6l3 3"/><path d="M6 17l3 3"/><path d="M12 9v6"/>'),
};

export function iconEl(name, cls) {
  const div = document.createElement('span');
  div.innerHTML = Icon[name] || '';
  const el = div.firstElementChild;
  if (cls) el.setAttribute('class', cls);
  return el;
}

let logoInstanceCounter = 0;
export function logoMarkup() {
  const id = 'logo' + (logoInstanceCounter++);
  return `
<svg viewBox="0 0 256 256">
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#232323"/>
      <stop offset="1" stop-color="#0a0a0a"/>
    </linearGradient>
    <linearGradient id="${id}-green" x1="52" y1="88" x2="184" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5cd394"/>
      <stop offset="1" stop-color="#2c8a56"/>
    </linearGradient>
    <linearGradient id="${id}-gold" x1="138" y1="44" x2="218" y2="124" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f2cd7a"/>
      <stop offset="1" stop-color="#c9932f"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="256" height="256" rx="58" fill="url(#${id}-bg)"/>
  <rect x="2" y="2" width="252" height="252" rx="56" fill="none" stroke="#3fae6e" stroke-opacity="0.28" stroke-width="2.5"/>
  <rect x="52" y="96" width="136" height="102" rx="22" fill="url(#${id}-green)"/>
  <rect x="52" y="96" width="136" height="30" rx="22" fill="#000000" fill-opacity="0.12"/>
  <rect x="150" y="130" width="30" height="38" rx="9" fill="#0d2e1c" fill-opacity="0.55"/>
  <rect x="68" y="160" width="14" height="22" rx="4" fill="#ffffff" fill-opacity="0.55"/>
  <rect x="87" y="146" width="14" height="36" rx="4" fill="#ffffff" fill-opacity="0.68"/>
  <rect x="106" y="130" width="14" height="52" rx="4" fill="#ffffff" fill-opacity="0.82"/>
  <circle cx="180" cy="82" r="42" fill="url(#${id}-gold)"/>
  <circle cx="180" cy="82" r="42" fill="none" stroke="#8a611f" stroke-opacity="0.35" stroke-width="3"/>
  <circle cx="180" cy="82" r="29" fill="none" stroke="#8a611f" stroke-opacity="0.3" stroke-width="3"/>
  <path d="M162,64 A34,34 0 0 1 200,72" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="6" stroke-linecap="round"/>
</svg>`;
}

export function logoEl(cls) {
  const div = document.createElement('span');
  div.innerHTML = logoMarkup();
  const el = div.firstElementChild;
  if (cls) el.setAttribute('class', cls);
  return el;
}
