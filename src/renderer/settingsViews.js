import { iconEl } from './icons.js';
import { openModal, closeModal, toast, toastSuccess, confirmDialog, field, row, btn } from './ui.js';
import { applyTheme, ACCENT_LIST } from './theme.js';

const ACCENT_COLORS = { green: '#3fae6e', blue: '#3d8bd9', pink: '#d94f8f', orange: '#e08a3c' };

function themePreviewSvg(mode) {
  const bg = mode === 'light' ? '#f2f3f5' : '#161616';
  const bar = mode === 'light' ? '#ffffff' : '#232323';
  const line = mode === 'light' ? '#d7d9dd' : '#3a3a3a';
  return `<svg viewBox="0 0 120 74" width="100%" height="74"><rect width="120" height="74" fill="${bg}"/><rect width="120" height="16" fill="${bar}"/><circle cx="10" cy="8" r="3" fill="#e05a5a"/><rect x="8" y="24" width="45" height="42" rx="3" fill="${bar}"/><rect x="60" y="24" width="52" height="10" rx="2" fill="${line}"/><rect x="60" y="40" width="52" height="6" rx="2" fill="${line}"/><rect x="60" y="50" width="36" height="6" rx="2" fill="${line}"/></svg>`;
}

export async function openTemaAyarlari() {
  const settings = await window.api.getSettings();
  const tema = { ...settings.tema };
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '20px';

  const grid = document.createElement('div');
  grid.className = 'theme-grid';
  body.appendChild(grid);

  const timeRow = document.createElement('div');
  timeRow.className = 'time-row';
  body.appendChild(timeRow);

  const accentTitle = document.createElement('div');
  accentTitle.className = 'section-title';
  accentTitle.style.textAlign = 'center';
  accentTitle.textContent = 'Vurgu Rengi';
  body.appendChild(accentTitle);

  const accentRow = document.createElement('div');
  accentRow.className = 'accent-row';
  body.appendChild(accentRow);

  const MODES = [
    { key: 'Otomatik', label: 'Otomatik', sub: () => `${tema.otomatikBaslangic} Açık - ${tema.otomatikBitis} Koyu`, preview: 'dark' },
    { key: 'Açık', label: 'Açık Tema', sub: () => '', preview: 'light' },
    { key: 'Koyu', label: 'Koyu Tema', sub: () => '', preview: 'dark' },
  ];

  function drawGrid() {
    grid.innerHTML = '';
    for (const m of MODES) {
      const card = document.createElement('div');
      card.className = 'theme-card' + (tema.mod === m.key ? ' selected' : '');
      const preview = document.createElement('div');
      preview.className = 'preview';
      preview.innerHTML = themePreviewSvg(m.preview);
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = m.label;
      card.append(preview, label);
      const sub = m.sub();
      if (sub) {
        const subEl = document.createElement('div');
        subEl.className = 'sub';
        subEl.textContent = sub;
        card.appendChild(subEl);
      }
      card.onclick = () => { tema.mod = m.key; drawGrid(); drawTimeRow(); };
      grid.appendChild(card);
    }
  }

  function drawTimeRow() {
    timeRow.innerHTML = '';
    timeRow.style.display = tema.mod === 'Otomatik' ? 'flex' : 'none';
    const startLabel = document.createElement('span');
    startLabel.style.color = 'var(--text-dim)';
    startLabel.style.fontSize = '13px';
    startLabel.textContent = 'Açık Tema Başlangıç';
    const startInput = document.createElement('input');
    startInput.type = 'time';
    startInput.value = tema.otomatikBaslangic;
    startInput.onchange = () => { tema.otomatikBaslangic = startInput.value; drawGrid(); };
    const endLabel = document.createElement('span');
    endLabel.style.color = 'var(--text-dim)';
    endLabel.style.fontSize = '13px';
    endLabel.textContent = 'Koyu Tema Başlangıç';
    const endInput = document.createElement('input');
    endInput.type = 'time';
    endInput.value = tema.otomatikBitis;
    endInput.onchange = () => { tema.otomatikBitis = endInput.value; drawGrid(); };
    timeRow.append(startLabel, startInput, endLabel, endInput);
  }

  function drawAccents() {
    accentRow.innerHTML = '';
    for (const key of ACCENT_LIST) {
      const sw = document.createElement('div');
      sw.className = 'accent-swatch' + (tema.vurgu === key ? ' selected' : '');
      sw.style.background = ACCENT_COLORS[key];
      if (tema.vurgu === key) sw.appendChild(iconEl('check'));
      sw.onclick = () => { tema.vurgu = key; drawAccents(); };
      accentRow.appendChild(sw);
    }
  }

  drawGrid();
  drawTimeRow();
  drawAccents();

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = async () => {
    await window.api.updateTemaAyarlari(tema);
    applyTheme(tema);
    toastSuccess('Tema ayarları güncellendi.');
    closeModal();
  };
  footer.append(kapatBtn, spacer, onaylaBtn);

  openModal({ title: 'Tema Ayarları', size: 'wide', bodyEl: body, footerEl: footer });
}

export async function openGuncelleme() {
  const version = await window.api.getAppVersion();
  const body = document.createElement('div');
  body.style.cssText = 'display:flex; flex-direction:column; gap:18px;';

  const infoSection = document.createElement('div');
  infoSection.className = 'yedek-section';
  infoSection.innerHTML = `
    <div class="yedek-title"><b>Mevcut Sürüm</b></div>
    <div class="yedek-desc" style="font-size:15px; color:var(--text);">Paratek v${version}</div>
  `;
  body.appendChild(infoSection);

  const divider = document.createElement('div');
  divider.style.cssText = 'height:1px; background:var(--border);';
  body.appendChild(divider);

  const checkSection = document.createElement('div');
  checkSection.className = 'yedek-section';
  checkSection.innerHTML = `
    <div class="yedek-title"><b>Güncellemeleri Kontrol Et</b></div>
    <div class="yedek-desc">Bu kurulum için henüz otomatik bir güncelleme kaynağı tanımlanmadı. Yeni bir sürüm çıktığında yeniden paketlenip elden iletilecektir.</div>
  `;
  const checkBtn = btn('Güncellemeleri Kontrol Et', 'primary', 'refresh');
  checkBtn.onclick = () => toast(`Şu anda en güncel sürümü kullanıyorsunuz (v${version}).`);
  checkSection.appendChild(checkBtn);
  body.appendChild(checkSection);

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  footer.appendChild(kapatBtn);

  openModal({ title: 'Güncelleme', size: 'narrow', bodyEl: body, footerEl: footer });
}

export function openYedekleme() {
  const body = document.createElement('div');
  body.style.cssText = 'display:flex; flex-direction:column; gap:18px;';

  const alSection = document.createElement('div');
  alSection.className = 'yedek-section';
  alSection.innerHTML = `
    <div class="yedek-title"><b>Yedek Al</b></div>
    <div class="yedek-desc">Cari, kasa, banka, hatırlatma ve ayar verilerinizin tamamını tek bir dosyaya kaydedin.</div>
  `;
  const alBtn = btn('Yedek Al', 'primary', 'assets');
  alBtn.onclick = async () => {
    const result = await window.api.backupData();
    if (result.canceled) return;
    toastSuccess('Yedek kaydedildi: ' + result.path);
  };
  alSection.appendChild(alBtn);
  body.appendChild(alSection);

  const divider = document.createElement('div');
  divider.style.cssText = 'height:1px; background:var(--border);';
  body.appendChild(divider);

  const yukleSection = document.createElement('div');
  yukleSection.className = 'yedek-section';
  yukleSection.innerHTML = `
    <div class="yedek-title"><b>Yedekten Geri Yükle</b></div>
    <div class="yedek-desc" style="color:var(--red);">Daha önce aldığınız bir yedek dosyasını yükler. Mevcut tüm veriler yedekteki verilerle <b>değiştirilir</b> ve program yeniden başlatılır.</div>
  `;
  const yukleBtn = btn('Yedekten Geri Yükle', 'danger', 'refresh');
  yukleBtn.onclick = async () => {
    const result = await window.api.restoreData();
    if (result.canceled) return;
    if (result.error) { toast(result.error); return; }
    const ok = await confirmDialog('Yedek dosyası okundu. Mevcut tüm veriler bu yedekle değiştirilecek ve program yeniden başlayacak. Devam edilsin mi?');
    if (!ok) return;
    await window.api.restartApp();
  };
  yukleSection.appendChild(yukleBtn);
  body.appendChild(yukleSection);

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  footer.appendChild(kapatBtn);

  openModal({ title: 'Yedekleme', size: 'narrow', bodyEl: body, footerEl: footer });
}

export async function openGenelAyarlar() {
  const settings = await window.api.getSettings();
  const g = { ...settings.genel };
  const firma = { ...(settings.firma || { ad: '' }) };
  const body = document.createElement('div');

  const firmaField = field({ label: 'Firma Adı', value: firma.ad || '', placeholder: 'Firma / İşletme adınız' });
  body.appendChild(row(firmaField));

  const oturumField = field({ label: 'Oturum Süresi', options: ['15 Dakika', '30 Dakika', '60 Dakika', 'Sınırsız'], value: `${g.oturumSuresi === 0 ? 'Sınırsız' : g.oturumSuresi + ' Dakika'}` });
  const hatirlatmaField = field({ label: 'Hatırlatmalar', options: ['Vade günü hatırlat', 'Vadeden 1 gün önce hatırlat', 'Vadeden 3 gün önce hatırlat', 'Hatırlatma yok'], value: g.hatirlatma });
  body.appendChild(row(oturumField, hatirlatmaField));

  const siraAlanField = field({ label: 'Varsayılan Sıralama', options: ['İşlem Sırası', 'Unvana Göre', 'Bakiyeye Göre', 'Son İşleme Göre'], value: g.varsayilanSiralamaAlan });
  const siraYonField = field({ label: ' ', options: ['Azalan', 'Artan'], value: g.varsayilanSiralamaYon });
  body.appendChild(row(siraAlanField, siraYonField));

  const sorguField = field({ label: 'Varsayılan Sorgu', options: ['Unvan ile Hızlı Ara', 'Koda Göre Ara', 'Açıklamaya Göre Ara'], value: g.varsayilanSorgu });
  const kategoriField = field({ label: 'Varsayılan Kategori', options: ['Tümü', 'Müşteri', 'Tedarikçi', 'Personel'], value: g.varsayilanKategori });
  body.appendChild(row(sorguField, kategoriField));

  const icerikField = field({ label: 'İçerikte Arama', options: ['Tüm içerikte ara', 'Sadece unvanda ara'], value: g.icerikArama });
  body.appendChild(row(icerikField));

  const pasifField = field({ label: 'Pasif Hesaplar', options: ['Pasif hesapları göster', 'Pasif hesapları gizle'], value: g.pasifHesaplariGoster ? 'Pasif hesapları göster' : 'Pasif hesapları gizle' });
  body.appendChild(row(pasifField));

  const silmeField = field({ label: 'Silme İşlemleri', options: ['Silme işlemlerinde şifre sor', 'Doğrudan sil'], value: g.silmeSifreSor ? 'Silme işlemlerinde şifre sor' : 'Doğrudan sil' });
  body.appendChild(row(silmeField));

  const aciklamaField = field({ label: 'Açıklamalar', options: ['Yazarken özel kod ve açıklamaları göster', 'Gösterme'], value: g.aciklamalarGoster ? 'Yazarken özel kod ve açıklamaları göster' : 'Gösterme' });
  body.appendChild(row(aciklamaField));

  const altToplamField = field({ label: 'Alt Toplamlar', options: ['Cari, Banka ve Kasa işlemlerinde toplamları göster', 'Gösterme'], value: g.altToplamlarGoster ? 'Cari, Banka ve Kasa işlemlerinde toplamları göster' : 'Gösterme' });
  body.appendChild(row(altToplamField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const resetBtn = document.createElement('div');
  resetBtn.className = 'icon-btn';
  resetBtn.title = 'Varsayılana Sıfırla';
  resetBtn.appendChild(iconEl('refresh'));
  resetBtn.onclick = async () => {
    await window.api.resetGenelAyarlar();
    toast('Ayarlar varsayılana sıfırlandı.');
    closeModal();
    openGenelAyarlar();
  };
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = async () => {
    await window.api.updateFirma({ ad: firmaField.input.value.trim() });
    const oturumRaw = oturumField.input.value;
    await window.api.updateGenelAyarlar({
      oturumSuresi: oturumRaw === 'Sınırsız' ? 0 : parseInt(oturumRaw, 10),
      hatirlatma: hatirlatmaField.input.value,
      varsayilanSiralamaAlan: siraAlanField.input.value,
      varsayilanSiralamaYon: siraYonField.input.value,
      varsayilanSorgu: sorguField.input.value,
      varsayilanKategori: kategoriField.input.value,
      icerikArama: icerikField.input.value,
      pasifHesaplariGoster: pasifField.input.value === 'Pasif hesapları göster',
      silmeSifreSor: silmeField.input.value === 'Silme işlemlerinde şifre sor',
      aciklamalarGoster: aciklamaField.input.value.startsWith('Yazarken'),
      altToplamlarGoster: altToplamField.input.value.startsWith('Cari'),
    });
    toastSuccess('Genel ayarlar kaydedildi.');
    closeModal();
  };
  footer.append(kapatBtn, resetBtn, spacer, onaylaBtn);

  openModal({ title: 'Genel Ayarlar', bodyEl: body, footerEl: footer });
}

export async function openKategoriTanimlari() {
  let kategoriler = await window.api.listKategoriler();
  let selected = null;

  const body = document.createElement('div');
  body.style.minHeight = '260px';
  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  tableWrap.style.maxHeight = '260px';
  body.appendChild(tableWrap);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; gap:10px; margin-top:14px;';
  const ekleBtn = btn('Ekle', 'primary', 'plus');
  const degistirBtn = btn('Değiştir', '', 'swap');
  const silBtn = btn('Sil', 'danger', 'close');
  btnRow.append(ekleBtn, degistirBtn, silBtn);
  body.appendChild(btnRow);

  async function refresh() {
    kategoriler = await window.api.listKategoriler();
    draw();
  }

  function draw() {
    tableWrap.innerHTML = '';
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>No</th><th>Kategori Adı</th><th style="text-align:right">Kayıt</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    kategoriler.forEach((k, i) => {
      const tr = document.createElement('tr');
      if (k.name === selected) tr.classList.add('selected');
      tr.innerHTML = `<td>${i + 1}</td><td>${k.name}</td><td style="text-align:right">${k.count}</td>`;
      tr.onclick = () => { selected = k.name; draw(); };
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    degistirBtn.disabled = !selected;
    silBtn.disabled = !selected;
  }

  ekleBtn.onclick = () => openKategoriForm(null, refresh);
  degistirBtn.onclick = () => openKategoriForm(selected, refresh);
  silBtn.onclick = async () => {
    if (!selected) return;
    const ok = await confirmDialog(`"${selected}" kategorisini silmek istediğinize emin misiniz?`);
    if (!ok) return;
    try {
      await window.api.deleteKategori(selected);
      selected = null;
      toast('Kategori silindi.');
      await refresh();
    } catch (e) {
      toast(e.message || 'Silinemedi.');
    }
  };

  draw();
  openModal({ title: 'Kategori Tanımları', size: 'narrow', bodyEl: body });
}

function openKategoriForm(existingName, onSaved) {
  const isEdit = !!existingName;
  const body = document.createElement('div');
  const nameField = field({ label: 'Kategori Adı', value: existingName || '' });
  body.appendChild(row(nameField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const geriBtn = btn('Geri', '', 'chevronLeft');
  geriBtn.onclick = () => { closeModal(); openKategoriTanimlari(); };
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = async () => {
    try {
      if (isEdit) await window.api.renameKategori(existingName, nameField.input.value);
      else await window.api.addKategori(nameField.input.value);
      toastSuccess(isEdit ? 'Kategori güncellendi.' : 'Kategori eklendi.');
      closeModal();
      onSaved();
      openKategoriTanimlari();
    } catch (e) {
      toast(e.message || 'Kaydedilemedi.');
    }
  };
  footer.append(geriBtn, spacer, onaylaBtn);
  openModal({ title: isEdit ? 'Kategori Değiştir' : 'Kategori Ekle', size: 'narrow', bodyEl: body, footerEl: footer });
}

export function openSifremiDegistir() {
  const body = document.createElement('div');
  const oldField = field({ label: 'Mevcut Şifre', type: 'password', value: '' });
  const newField = field({ label: 'Yeni Şifre', type: 'password', value: '' });
  const confirmField = field({ label: 'Yeni Şifre (Tekrar)', type: 'password', value: '' });
  body.append(row(oldField), row(newField), row(confirmField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = async () => {
    if (newField.input.value !== confirmField.input.value) { toast('Yeni şifreler eşleşmiyor.'); return; }
    try {
      await window.api.authChangePassword(oldField.input.value, newField.input.value);
      toastSuccess('Şifre güncellendi.');
      closeModal();
    } catch (e) {
      toast(e.message || 'Şifre değiştirilemedi.');
    }
  };
  footer.append(kapatBtn, spacer, onaylaBtn);
  openModal({ title: 'Şifremi Değiştir', size: 'narrow', bodyEl: body, footerEl: footer });
}

export async function openEpostaAyarlari() {
  const settings = await window.api.getSettings();
  const body = document.createElement('div');
  const info = document.createElement('p');
  info.style.cssText = 'color:var(--text-dim); font-size:13.5px; line-height:1.6; margin:0 0 6px;';
  info.textContent = 'Paratek üzerinden e-posta göndermek için kullanacağınız e-posta adresini aşağıdaki alana yazın ve "İleri" butonuna tıklayın.';
  body.appendChild(info);
  const mailField = field({ label: 'E-Posta Adresi', type: 'email', value: settings.eposta.kullaniciAdi || '' });
  body.appendChild(row(mailField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const ileriBtn = btn('İleri', 'primary', 'arrowRight');
  ileriBtn.onclick = async () => {
    const val = mailField.input.value.trim();
    if (!val || !val.includes('@')) { toast('Geçerli bir e-posta adresi girin.'); return; }
    await window.api.updateEpostaAyarlari({ kullaniciAdi: val });
    toastSuccess('E-posta adresi kaydedildi.');
    closeModal();
  };
  footer.append(kapatBtn, spacer, ileriBtn);
  openModal({ title: 'E-Posta Kurulum Sihirbazı', size: 'narrow', bodyEl: body, footerEl: footer });
}
