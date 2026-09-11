import { iconEl } from '../icons.js';
import { openModal, closeModal, toast, toastSuccess, withErrorToast, confirmDialog, field, row, btn, openContextMenu, menuItem, menuDivider } from '../ui.js';
import { fmtMoney, moneyClass, fmtDate, todayISO, parseTRNumber } from '../format.js';

const PARA_BIRIMLERI = ['TL', 'USD', 'EUR'];

export async function renderKasa(container, params, navigate) {
  if (params.kasaId) return renderKasaDetay(container, params.kasaId, navigate);
  return renderKasaListe(container, navigate);
}

async function renderKasaListe(container, navigate) {
  let kasalar = await window.api.listKasalar();
  let selectedId = null;

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  async function refresh() { kasalar = await window.api.listKasalar(); draw(); }

  function draw() {
    view.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'page-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    titleGroup.appendChild(iconEl('kasa'));
    const h1 = document.createElement('h1');
    h1.textContent = 'Kasa Hesapları';
    titleGroup.appendChild(h1);
    header.appendChild(titleGroup);
    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const printBtn = document.createElement('div');
    printBtn.className = 'icon-btn';
    printBtn.appendChild(iconEl('print'));
    printBtn.onclick = () => window.print();
    actions.appendChild(printBtn);
    header.appendChild(actions);
    view.appendChild(header);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Kod</th><th>Kasa Adı</th><th>P.Birim</th><th style="text-align:right">Gelir</th><th style="text-align:right">Gider</th><th style="text-align:right">Bakiye</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    if (!kasalar.length) tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Kayıt bulunamadı</td></tr>`;
    for (const k of kasalar) {
      const tr = document.createElement('tr');
      if (k.id === selectedId) tr.classList.add('selected');
      tr.innerHTML = `
        <td>${k.kod}</td><td><span class="tag-bar tag-musteri"></span>${k.kasaAdi}</td><td>${k.pBirim}</td>
        <td style="text-align:right" class="amount pos">${fmtMoney(k.gelir, k.pBirim)}</td>
        <td style="text-align:right" class="amount neg">${fmtMoney(k.gider, k.pBirim)}</td>
        <td style="text-align:right" class="amount ${moneyClass(k.bakiye)}">${fmtMoney(k.bakiye, k.pBirim)}</td>`;
      tr.onclick = () => { selectedId = k.id; draw(); };
      tr.ondblclick = () => navigate('kasa', { kasaId: k.id });
      tr.oncontextmenu = (e) => {
        e.preventDefault();
        selectedId = k.id; draw();
        openContextMenu(e.clientX, e.clientY, (panel, close) => {
          panel.append(
            menuItem({ icon: 'arrowRight', label: 'Kasa Hareketleri', onClick: () => { close(); navigate('kasa', { kasaId: k.id }); } }),
            menuItem({ icon: 'swap', label: 'Değiştir', onClick: () => { close(); openKasaForm(k, refresh); } }),
            menuDivider(),
            menuItem({ icon: 'close', label: 'Sil', onClick: () => withErrorToast(async () => {
              close();
              const ok = await confirmDialog(`"${k.kasaAdi}" kasasını silmek istediğinize emin misiniz?`);
              if (ok) { await window.api.deleteKasa(k.id); selectedId = null; toast('Kasa silindi.'); await refresh(); }
            }) }),
          );
        });
      };
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    view.appendChild(tableWrap);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'bottom-bar';
    const ekleBtn = btn('Ekle', 'primary', 'plus');
    ekleBtn.onclick = () => openKasaForm(null, refresh);
    const degistirBtn = btn('Değiştir', '', 'swap');
    degistirBtn.disabled = !selectedId;
    degistirBtn.onclick = () => {
      const k = kasalar.find((x) => x.id === selectedId);
      if (k) openKasaForm(k, refresh);
    };
    const silBtn = btn('Sil', 'danger', 'close');
    silBtn.disabled = !selectedId;
    silBtn.onclick = () => withErrorToast(async () => {
      const k = kasalar.find((x) => x.id === selectedId);
      if (!k) return;
      const ok = await confirmDialog(`"${k.kasaAdi}" kasasını silmek istediğinize emin misiniz?`);
      if (ok) { await window.api.deleteKasa(k.id); selectedId = null; toast('Kasa silindi.'); await refresh(); }
    });
    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = `${kasalar.length} kayıt`;
    const hareketBtn = btn('Kasa Hareketleri', 'primary', 'arrowRight');
    hareketBtn.disabled = !selectedId;
    hareketBtn.onclick = () => navigate('kasa', { kasaId: selectedId });
    bottomBar.append(ekleBtn, degistirBtn, silBtn, spacer, count, hareketBtn);
    view.appendChild(bottomBar);
  }

  draw();
}

function openKasaForm(existing, onSaved) {
  const isEdit = !!existing;
  const body = document.createElement('div');
  const kodField = field({ label: 'Kod', value: isEdit ? existing.kod : '(otomatik)' });
  kodField.input.disabled = true;
  const adField = field({ label: 'Kasa Adı', value: existing?.kasaAdi || '' });
  body.appendChild(row(kodField, adField));
  const pBirimField = field({ label: 'P.Birim', options: PARA_BIRIMLERI, value: existing?.pBirim || 'TL' });
  const aktifField = field({ label: 'Hesap', options: ['Aktif Hesap', 'Pasif Hesap'], value: existing?.aktif === false ? 'Pasif Hesap' : 'Aktif Hesap' });
  body.appendChild(row(aktifField, pBirimField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = () => withErrorToast(async () => {
    if (!adField.input.value.trim()) { toast('Kasa adı zorunludur.'); return; }
    const data = { kasaAdi: adField.input.value.trim(), pBirim: pBirimField.input.value, aktif: aktifField.input.value === 'Aktif Hesap' };
    if (isEdit) { await window.api.updateKasa(existing.id, data); toastSuccess('Kasa güncellendi.'); }
    else { await window.api.addKasa(data); toastSuccess('Kasa eklendi.'); }
    closeModal();
    onSaved();
  });
  footer.append(kapatBtn, spacer, onaylaBtn);
  openModal({ title: isEdit ? 'Kasa Kart' : 'Kasa Kart Ekle', size: 'narrow', bodyEl: body, footerEl: footer });
}

async function renderKasaDetay(container, kasaId, navigate) {
  let kasalar = await window.api.listKasalar();
  let kasa = kasalar.find((k) => k.id === kasaId);
  if (!kasa) { navigate('kasa'); return; }
  let hareketler = await window.api.listKasaHareketleri(kasaId);
  let selectedId = null;

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  async function refresh() {
    kasalar = await window.api.listKasalar();
    kasa = kasalar.find((k) => k.id === kasaId);
    hareketler = await window.api.listKasaHareketleri(kasaId);
    draw();
  }

  function draw() {
    view.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'page-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    const backBtn = document.createElement('div');
    backBtn.className = 'icon-btn back';
    backBtn.appendChild(iconEl('chevronLeft'));
    backBtn.onclick = () => navigate('kasa');
    titleGroup.appendChild(backBtn);
    const h1 = document.createElement('h1');
    h1.textContent = kasa.kasaAdi;
    titleGroup.appendChild(h1);
    const sub = document.createElement('span');
    sub.className = 'sub amount ' + moneyClass(kasa.bakiye);
    sub.textContent = fmtMoney(kasa.bakiye, kasa.pBirim);
    titleGroup.appendChild(sub);
    header.appendChild(titleGroup);
    view.appendChild(header);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Tarih</th><th>Tür</th><th>Açıklama</th><th style="text-align:right">Tutar</th><th style="text-align:right">Bakiye</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    if (!hareketler.length) tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Hareket bulunamadı</td></tr>`;
    for (const h of hareketler) {
      const tr = document.createElement('tr');
      if (h.id === selectedId) tr.classList.add('selected');
      const signedTutar = h.tur === 'Gelir' ? h.tutar : -h.tutar;
      tr.innerHTML = `
        <td>${fmtDate(h.tarih)}</td><td>${h.tur}</td><td>${h.aciklama}</td>
        <td style="text-align:right" class="amount ${moneyClass(signedTutar)}">${fmtMoney(signedTutar, kasa.pBirim)}</td>
        <td style="text-align:right" class="amount ${moneyClass(h.bakiye)}">${fmtMoney(h.bakiye, kasa.pBirim)}</td>`;
      tr.onclick = () => { selectedId = h.id; draw(); };
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    view.appendChild(tableWrap);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'bottom-bar';
    const ekleBtn = btn('Ekle', 'primary', 'plus');
    ekleBtn.onclick = () => openKasaHareketForm(kasa, refresh);
    const silBtn = btn('Sil', 'danger', 'close');
    silBtn.disabled = !selectedId;
    silBtn.onclick = () => withErrorToast(async () => {
      const ok = await confirmDialog('Bu hareketi silmek istediğinize emin misiniz?');
      if (ok) { await window.api.deleteKasaHareket(selectedId); selectedId = null; toast('Hareket silindi.'); await refresh(); }
    });
    const spacer = document.createElement('div'); spacer.className = 'spacer';
    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = `${hareketler.length} kayıt`;
    bottomBar.append(ekleBtn, silBtn, spacer, count);
    view.appendChild(bottomBar);
  }

  draw();
}

function openKasaHareketForm(kasa, onSaved) {
  const body = document.createElement('div');
  const turField = field({ label: 'Tür', options: ['Gelir', 'Gider'] });
  const tarihField = field({ label: 'Tarih', type: 'date', value: todayISO() });
  body.appendChild(row(turField, tarihField));
  const aciklamaField = field({ label: 'Açıklama', value: '' });
  body.appendChild(row(aciklamaField));
  const tutarField = field({ label: 'İşlem Tutarı', type: 'money', value: 0 });
  body.appendChild(row(tutarField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = () => withErrorToast(async () => {
    await window.api.addKasaHareket(kasa.id, { tur: turField.input.value, tarih: tarihField.input.value, aciklama: aciklamaField.input.value, tutar: parseTRNumber(tutarField.input.value) });
    toastSuccess('Hareket eklendi.');
    closeModal();
    onSaved();
  });
  footer.append(kapatBtn, spacer, onaylaBtn);
  openModal({ title: 'Kasa Hareketi Ekle', bodyEl: body, footerEl: footer });
}
