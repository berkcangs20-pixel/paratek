import { iconEl } from './icons.js';
import { openModal, closeModal, resetShortcuts } from './ui.js';
import { renderTitlebar, checkStartupReminderPopup } from './titlebar.js';
import { renderLogin } from './login.js';
import { renderLicenseGate } from './licenseGate.js';
import { applyTheme } from './theme.js';
import { renderCari } from './views/cari.js';
import { renderKasa } from './views/kasa.js';
import { renderBanka } from './views/banka.js';
import { renderHatirlatmalar } from './views/hatirlatmalar.js';
import { renderRaporlar } from './views/raporlar.js';
import { renderVarliklar } from './views/varliklar.js';
import { renderDoviz } from './views/doviz.js';

const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const appRoot = document.getElementById('app');

const NAV_ITEMS = [
  { key: 'cari', label: 'Cari', icon: 'cari', render: renderCari },
  { key: 'kasa', label: 'Kasa', icon: 'kasa', render: renderKasa },
  { key: 'banka', label: 'Banka', icon: 'banka', render: renderBanka },
  { key: 'varliklar', label: 'Varlıklarım', icon: 'assets', render: renderVarliklar },
  { key: 'doviz', label: 'Döviz Kuru', icon: 'exchange', render: renderDoviz },
  { key: 'hatirlatmalar', label: 'Hatırlatmalar', icon: 'hatirlatma', render: renderHatirlatmalar },
  { key: 'raporlar', label: 'Raporlar', icon: 'raporlar', render: renderRaporlar },
];

let state = { view: 'cari', params: {} };

export function navigate(view, params = {}) {
  state = { view, params };
  paint();
}

function buildSidebar() {
  sidebar.innerHTML = '';
  for (const item of NAV_ITEMS) {
    const el = document.createElement('div');
    el.className = 'nav-item' + (state.view === item.key ? ' active' : '');
    el.appendChild(iconEl(item.icon));
    const span = document.createElement('span');
    span.textContent = item.label;
    el.appendChild(span);
    el.addEventListener('click', () => navigate(item.key));
    sidebar.appendChild(el);
  }

  const spacer = document.createElement('div');
  spacer.className = 'nav-spacer';
  sidebar.appendChild(spacer);

  const divider = document.createElement('div');
  divider.className = 'nav-divider';
  sidebar.appendChild(divider);

  const yardim = document.createElement('div');
  yardim.className = 'nav-item';
  yardim.appendChild(iconEl('yardim'));
  const y2 = document.createElement('span');
  y2.textContent = 'Yardım';
  yardim.appendChild(y2);
  yardim.addEventListener('click', showYardim);
  sidebar.appendChild(yardim);

  const kapat = document.createElement('div');
  kapat.className = 'nav-item';
  kapat.appendChild(iconEl('power'));
  const k2 = document.createElement('span');
  k2.textContent = 'Kapat';
  kapat.appendChild(k2);
  kapat.addEventListener('click', () => showLogin());
  sidebar.appendChild(kapat);
}

function showYardim() {
  const body = document.createElement('div');
  body.innerHTML = `
    <p style="color:var(--text-dim); line-height:1.6; margin:0 0 12px;">
      <b style="color:var(--text)">Paratek</b> — Cari hesap, kasa, banka ve hatırlatma takip programı.
    </p>
    <ul style="color:var(--text-dim); line-height:1.9; padding-left:18px; margin:0;">
      <li><b style="color:var(--text)">Cari:</b> Müşteri, tedarikçi ve personel cari hesaplarını yönetin.</li>
      <li><b style="color:var(--text)">Kasa:</b> Nakit kasalarınızı (TL/USD/EUR) takip edin.</li>
      <li><b style="color:var(--text)">Banka:</b> Banka hesaplarınızı kayıt altına alın.</li>
      <li><b style="color:var(--text)">Hatırlatmalar:</b> Çek/senet vadelerini takip edin.</li>
      <li><b style="color:var(--text)">Raporlar:</b> Tarih aralığına göre borç/alacak dökümü alın.</li>
    </ul>`;
  openModal({ title: 'Yardım', size: 'narrow', bodyEl: body });
}

function paint() {
  buildSidebar();
  content.innerHTML = '';
  resetShortcuts();
  const item = NAV_ITEMS.find((n) => n.key === state.view);
  if (item) item.render(content, state.params, navigate);
}

let pendingNotificationNav = false;

function showLogin() {
  appRoot.style.display = 'none';
  renderLogin({
    onSuccess: () => {
      appRoot.style.display = 'flex';
      const gotoHatirlatmalar = pendingNotificationNav;
      state = gotoHatirlatmalar ? { view: 'hatirlatmalar', params: {} } : { view: 'cari', params: {} };
      pendingNotificationNav = false;
      paint();
      if (!gotoHatirlatmalar) checkStartupReminderPopup(navigate);
    },
  });
}

window.api.onNavigateHatirlatmalar(() => {
  if (appRoot.style.display === 'none') {
    pendingNotificationNav = true;
  } else {
    navigate('hatirlatmalar');
  }
});

async function boot() {
  const settings = await window.api.getSettings();
  applyTheme(settings.tema);
  await renderTitlebar({ navigate, onLogout: showLogin });
  renderLicenseGate({ onLicensed: () => showLogin() });
}

boot();
