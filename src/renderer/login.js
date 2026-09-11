import { logoEl, iconEl } from './icons.js';
import { field, btn } from './ui.js';

export async function renderLogin({ onSuccess }) {
  const root = document.getElementById('login-root');
  root.innerHTML = '';
  root.classList.add('active');

  const [hasPassword, settings] = await Promise.all([window.api.authHasPassword(), window.api.getSettings()]);
  const firmaAd = settings.firma && settings.firma.ad ? settings.firma.ad : '';

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
  if (hasPassword) {
    sub.textContent = firmaAd ? firmaAd : 'Devam etmek için şifrenizi girin';
  } else {
    sub.textContent = 'Kurulumu tamamlamak için bilgilerinizi girin';
  }
  card.append(logoRing, title, sub);

  const form = document.createElement('div');
  form.className = 'login-form';

  const errorBox = document.createElement('div');
  errorBox.className = 'login-error';
  errorBox.style.display = 'none';

  let firmaField = null;
  if (!hasPassword) {
    firmaField = field({ label: 'Firma Adı', value: firmaAd, placeholder: 'Firma / İşletme adınız' });
    form.appendChild(firmaField);
  }

  const pwField = field({ label: 'Şifre', type: 'password', value: '' });
  form.appendChild(pwField);

  let confirmField = null;
  if (!hasPassword) {
    confirmField = field({ label: 'Şifre (Tekrar)', type: 'password', value: '' });
    form.appendChild(confirmField);
  }

  form.appendChild(errorBox);

  const submitBtn = btn(hasPassword ? 'Giriş Yap' : 'Kurulumu Tamamla', 'primary', hasPassword ? 'check' : 'arrowRight');
  submitBtn.classList.add('login-submit');
  submitBtn.style.justifyContent = 'center';
  form.appendChild(submitBtn);
  card.appendChild(form);
  root.appendChild(card);

  (hasPassword ? pwField : firmaField).input.focus();

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  async function submit() {
    errorBox.style.display = 'none';
    const pw = pwField.input.value;
    if (hasPassword) {
      const ok = await window.api.authVerifyPassword(pw);
      if (!ok) { showError('Şifre hatalı. Tekrar deneyin.'); pwField.input.value = ''; pwField.input.focus(); return; }
    } else {
      if (!firmaField.input.value.trim()) { showError('Firma adı boş olamaz.'); firmaField.input.focus(); return; }
      if (pw.length < 4) { showError('Şifre en az 4 karakter olmalıdır.'); return; }
      if (pw !== confirmField.input.value) { showError('Şifreler eşleşmiyor.'); return; }
      await window.api.updateFirma({ ad: firmaField.input.value.trim() });
      await window.api.authSetPassword(pw);
    }
    root.classList.remove('active');
    root.innerHTML = '';
    onSuccess();
  }

  submitBtn.onclick = submit;
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}
