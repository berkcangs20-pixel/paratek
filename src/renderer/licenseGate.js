import { logoEl } from './icons.js';
import { field, btn } from './ui.js';

export async function renderLicenseGate({ onLicensed }) {
  const hasValid = await window.api.hasValidLicense();
  if (hasValid) { onLicensed(); return; }

  const root = document.getElementById('login-root');
  root.innerHTML = '';
  root.classList.add('active');

  const machineId = await window.api.getMachineId();

  const glow1 = document.createElement('div');
  glow1.className = 'login-glow login-glow-1';
  const glow2 = document.createElement('div');
  glow2.className = 'login-glow login-glow-2';
  root.append(glow1, glow2);

  const card = document.createElement('div');
  card.className = 'login-card';

  const logoRing = document.createElement('div');
  logoRing.className = 'login-logo-ring';
  logoRing.appendChild(logoEl('login-logo'));
  const title = document.createElement('div');
  title.className = 'login-title';
  title.textContent = 'Paratek';
  const sub = document.createElement('div');
  sub.className = 'login-sub';
  sub.textContent = 'Bu bilgisayarda kullanmak için lisans anahtarı gerekiyor';
  card.append(logoRing, title, sub);

  const form = document.createElement('div');
  form.className = 'login-form';

  const machineBox = document.createElement('div');
  machineBox.style.cssText = 'display:flex; flex-direction:column; gap:6px;';
  const machineLabel = document.createElement('label');
  machineLabel.style.cssText = 'font-size:13px; color:var(--text-dim);';
  machineLabel.textContent = 'Makine Kimliği (bu kodu yetkiliye iletin)';
  const machineRow = document.createElement('div');
  machineRow.style.cssText = 'display:flex; gap:8px;';
  const machineInput = document.createElement('input');
  machineInput.value = machineId;
  machineInput.readOnly = true;
  machineInput.style.cssText = 'flex:1; font-family:monospace; letter-spacing:0.03em;';
  const copyBtn = btn('Kopyala', '', 'note');
  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(machineId);
    copyBtn.querySelector('span')?.remove();
    const span = document.createElement('span');
    span.textContent = 'Kopyalandı';
    copyBtn.appendChild(span);
    setTimeout(() => { copyBtn.querySelector('span').textContent = 'Kopyala'; }, 1500);
  };
  machineRow.append(machineInput, copyBtn);
  machineBox.append(machineLabel, machineRow);
  form.appendChild(machineBox);

  const errorBox = document.createElement('div');
  errorBox.className = 'login-error';
  errorBox.style.display = 'none';

  const keyField = field({ label: 'Lisans Anahtarı', value: '', placeholder: 'Size iletilen lisans anahtarını yapıştırın' });
  form.appendChild(keyField);
  form.appendChild(errorBox);

  const submitBtn = btn('Etkinleştir', 'primary', 'check');
  submitBtn.classList.add('login-submit');
  submitBtn.style.justifyContent = 'center';
  form.appendChild(submitBtn);
  card.appendChild(form);
  root.appendChild(card);

  keyField.input.focus();

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  async function submit() {
    errorBox.style.display = 'none';
    const key = keyField.input.value.trim();
    if (!key) { showError('Lütfen bir lisans anahtarı girin.'); return; }
    try {
      await window.api.activateLicense(key);
    } catch (e) {
      const raw = e && e.message ? e.message : 'Lisans anahtarı doğrulanamadı.';
      showError(raw.replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, ''));
      return;
    }
    root.classList.remove('active');
    root.innerHTML = '';
    onLicensed();
  }

  submitBtn.onclick = submit;
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target !== machineInput) submit(); });
}
