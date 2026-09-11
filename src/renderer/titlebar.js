import { logoEl, iconEl } from './icons.js';
import { openModal, openDropdown, menuItem, menuDivider, toast } from './ui.js';
import { applyTheme } from './theme.js';
import { openTemaAyarlari, openGenelAyarlar, openKategoriTanimlari, openSifremiDegistir, openEpostaAyarlari, openYedekleme, openGuncelleme } from './settingsViews.js';

const minSvg = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="2" y1="6" x2="10" y2="6"/></svg>';
const maxSvg = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2.5" y="2.5" width="7" height="7"/></svg>';
const restoreSvg = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="4" width="6" height="6"/><path d="M4,4 V2.5 H10 V8.5 H8.5"/></svg>';
const closeSvg = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>';

let onLogoutCb = null;
let bellBtnRef = null;

export async function renderTitlebar({ navigate, onLogout } = {}) {
  onLogoutCb = onLogout;
  const root = document.getElementById('titlebar');
  root.innerHTML = '';

  const drag = document.createElement('div');
  drag.className = 'titlebar-drag';
  const logo = logoEl('titlebar-logo');
  const title = document.createElement('span');
  title.className = 'titlebar-title';
  title.textContent = 'Paratek';
  drag.append(logo, title);

  const leftUtility = document.createElement('div');
  leftUtility.className = 'titlebar-utility';

  const homeBtn = utilityIcon('home', 'Ana Sayfa');
  homeBtn.onclick = () => openDropdown(homeBtn, (panel, close) => {
    panel.append(
      menuItem({ icon: 'home', label: 'Ana Sayfa', onClick: () => { close(); navigate && navigate('cari'); } }),
      menuDivider(),
      menuItem({ icon: 'logout', label: 'Oturumu Kapat', onClick: () => { close(); onLogoutCb && onLogoutCb(); } }),
    );
  });

  const settingsBtn = utilityIcon('settingsGear', 'Ayarlar');
  settingsBtn.onclick = () => openDropdown(settingsBtn, (panel, close) => {
    panel.append(
      menuItem({ icon: 'tag', label: 'Kategori Tanımları', onClick: () => { close(); openKategoriTanimlari(); } }),
      menuItem({ icon: 'lock', label: 'Şifremi Değiştir', onClick: () => { close(); openSifremiDegistir(); } }),
      menuItem({ icon: 'mail', label: 'E-Posta Ayarları', onClick: () => { close(); openEpostaAyarlari(); } }),
      menuDivider(),
      menuItem({ icon: 'themeToggle', label: 'Tema Ayarları', onClick: () => { close(); openTemaAyarlari(); } }),
      menuItem({ icon: 'settingsGear', label: 'Genel Ayarlar', onClick: () => { close(); openGenelAyarlar(); } }),
      menuDivider(),
      menuItem({ icon: 'assets', label: 'Yedekleme', onClick: () => { close(); openYedekleme(); } }),
      menuItem({ icon: 'refresh', label: 'Güncelleme', onClick: () => { close(); openGuncelleme(); } }),
    );
  });

  const helpBtn = utilityIcon('yardim', 'Yardım');
  helpBtn.onclick = () => showAbout();

  leftUtility.append(homeBtn, settingsBtn, helpBtn);

  const controls = document.createElement('div');
  controls.className = 'titlebar-controls';

  const rightUtility = document.createElement('div');
  rightUtility.className = 'titlebar-utility';

  const bellBtn = utilityIcon('bell', 'Bekleyen Hatırlatmalar');
  bellBtn.onclick = () => openBellPanel(bellBtn, navigate);
  await refreshBellDot(bellBtn);
  bellBtnRef = bellBtn;

  const themeBtn = utilityIcon('themeToggle', 'Temayı Değiştir');
  themeBtn.onclick = async () => {
    const s = await window.api.getSettings();
    const cur = document.documentElement.getAttribute('data-theme');
    const nextMod = cur === 'light' ? 'Koyu' : 'Açık';
    const tema = { ...s.tema, mod: nextMod };
    await window.api.updateTemaAyarlari(tema);
    applyTheme(tema);
  };

  rightUtility.append(bellBtn, themeBtn);

  const minBtn = document.createElement('div');
  minBtn.className = 'titlebar-btn';
  minBtn.innerHTML = minSvg;
  minBtn.onclick = () => window.winControls.minimize();

  const maxBtn = document.createElement('div');
  maxBtn.className = 'titlebar-btn';
  maxBtn.innerHTML = maxSvg;
  maxBtn.onclick = () => window.winControls.maximizeToggle();

  const closeBtn = document.createElement('div');
  closeBtn.className = 'titlebar-btn close';
  closeBtn.innerHTML = closeSvg;
  closeBtn.onclick = () => window.winControls.close();

  controls.append(minBtn, maxBtn, closeBtn);
  root.append(drag, leftUtility, rightUtility, controls);

  const applyState = (state) => {
    maxBtn.innerHTML = state.maximized ? restoreSvg : maxSvg;
  };
  const isMax = await window.winControls.isMaximized();
  applyState({ maximized: isMax });
  window.winControls.onStateChange(applyState);
}

function utilityIcon(iconName, title) {
  const el = document.createElement('div');
  el.className = 'titlebar-icon';
  el.title = title;
  el.appendChild(iconEl(iconName));
  return el;
}

async function refreshBellDot(bellBtn) {
  const list = await window.api.listHatirlatmalar();
  const pending = list.filter((r) => r.durumTip !== 'tamam');
  const existing = bellBtn.querySelector('.dot');
  if (pending.length && !existing) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    bellBtn.appendChild(dot);
  } else if (!pending.length && existing) {
    existing.remove();
  }
  return pending;
}

async function openBellPanel(bellBtn, navigate) {
  const pending = await refreshBellDot(bellBtn);
  openDropdown(bellBtn, (panel, close) => {
    if (!pending.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:18px; text-align:center; color:var(--text-dim); font-size:13px;';
      empty.textContent = 'Bekleyen hatırlatma yok.';
      panel.appendChild(empty);
      return;
    }
    const title = document.createElement('div');
    title.style.cssText = 'padding:8px 10px; font-size:12px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em;';
    title.textContent = `${pending.length} Bekleyen Hatırlatma`;
    panel.appendChild(title);
    pending.slice(0, 8).forEach((r) => {
      panel.appendChild(menuItem({
        icon: 'hatirlatma',
        label: `${r.cariUnvan} — ${r.tur}`,
        sub: r.durumMetni,
        onClick: () => { close(); navigate && navigate('hatirlatmalar'); },
      }));
    });
  });
}

export async function checkStartupReminderPopup(navigate) {
  if (!bellBtnRef) return;
  const pending = await refreshBellDot(bellBtnRef);
  if (!pending.length) return;
  openDropdown(bellBtnRef, (panel, close) => {
    panel.classList.add('startup-reminder-panel');
    panel.appendChild(iconEl('hatirlatma', 'startup-reminder-icon'));
    const msg = document.createElement('div');
    msg.className = 'startup-reminder-text';
    msg.innerHTML = `Bekleyen ( <b>${pending.length}</b> ) adet Hatırlatmanız var !`;
    panel.appendChild(msg);
    const showBtn = document.createElement('button');
    showBtn.className = 'btn primary startup-reminder-btn';
    showBtn.textContent = 'Şimdi Göster';
    showBtn.onclick = () => { close(); navigate('hatirlatmalar'); };
    panel.appendChild(showBtn);

    const autoCloseTimer = setTimeout(close, 7000);
    panel.addEventListener('mouseenter', () => clearTimeout(autoCloseTimer));
  });
}

function showAbout() {
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
