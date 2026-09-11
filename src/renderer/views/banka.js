import { iconEl } from '../icons.js';
import { openModal, closeModal, toast, toastSuccess, withErrorToast, confirmDialog, field, row, btn, openContextMenu, menuItem, menuDivider } from '../ui.js';
import { fmtMoney, moneyClass, fmtDate, todayISO, parseTRNumber } from '../format.js';

const PARA_BIRIMLERI = ['TL', 'USD', 'EUR'];

export async function renderBanka(container, params, navigate) {
  if (params.bankaId) return renderBankaDetay(container, params.bankaId, navigate);
  return renderBankaListe(container, navigate);
}

async function renderBankaListe(container, navigate) {
  let bankalar = await window.api.listBankalar();
  let selectedId = null;

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  async function refresh() { bankalar = await window.api.listBankalar(); draw(); }

  function draw() {
    view.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'page-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    titleGroup.appendChild(iconEl('banka'));
    const h1 = document.createElement('h1');
    h1.textContent = 'Banka Hesapları';
    titleGroup.appendChild(h1);
    header.appendChild(titleGroup);
    view.appendChild(header);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Kod</th><th>Banka Adı</th><th>Hesap Adı</th><th>Iban No</th><th>P.Birim</th><th style="text-align:right">Bakiye</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    if (!bankalar.length) tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Kayıt bulunamadı</td></tr>`;
    for (const b of bankalar) {
      const tr = document.createElement('tr');
      if (b.id === selectedId) tr.classList.add('selected');
      tr.innerHTML = `
        <td>${b.kod}</td><td><span class="tag-bar tag-musteri"></span>${b.bankaAdi}</td><td>${b.hesapAdi || '-'}</td>
        <td>${b.ibanNo || '-'}</td><td>${b.pBirim}</td>
        <td style="text-align:right" class="amount ${moneyClass(b.bakiye)}">${fmtMoney(b.bakiye, b.pBirim)}</td>`;
      tr.onclick = () => { selectedId = b.id; draw(); };
      tr.ondblclick = () => navigate('banka', { bankaId: b.id });
      tr.oncontextmenu = (e) => {
        e.preventDefault();
        selectedId = b.id; draw();
        openContextMenu(e.clientX, e.clientY, (panel, close) => {
          panel.append(
            menuItem({ icon: 'arrowRight', label: 'Hesap Hareketleri', onClick: () => { close(); navigate('banka', { bankaId: b.id }); } }),
            menuItem({ icon: 'swap', label: 'Değiştir', onClick: () => { close(); openBankaForm(b, refresh); } }),
            menuDivider(),
            menuItem({ icon: 'close', label: 'Sil', onClick: () => withErrorToast(async () => {
              close();
              const ok = await confirmDialog(`"${b.bankaAdi}" banka hesabını silmek istediğinize emin misiniz?`);
              if (ok) { await window.api.deleteBanka(b.id); selectedId = null; toast('Banka hesabı silindi.'); await refresh(); }
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
    ekleBtn.onclick = () => openBankaForm(null, refresh);
    const degistirBtn = btn('Değiştir', '', 'swap');
    degistirBtn.disabled = !selectedId;
    degistirBtn.onclick = () => {
      const b = bankalar.find((x) => x.id === selectedId);
      if (b) openBankaForm(b, refresh);
    };
    const silBtn = btn('Sil', 'danger', 'close');
    silBtn.disabled = !selectedId;
    silBtn.onclick = () => withErrorToast(async () => {
      const b = bankalar.find((x) => x.id === selectedId);
      if (!b) return;
      const ok = await confirmDialog(`"${b.bankaAdi}" banka hesabını silmek istediğinize emin misiniz?`);
      if (ok) { await window.api.deleteBanka(b.id); selectedId = null; toast('Banka hesabı silindi.'); await refresh(); }
    });
    const spacer = document.createElement('div'); spacer.className = 'spacer';
    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = `${bankalar.length} kayıt`;
    const hareketBtn = btn('Hesap Hareketleri', 'primary', 'arrowRight');
    hareketBtn.disabled = !selectedId;
    hareketBtn.onclick = () => navigate('banka', { bankaId: selectedId });
    bottomBar.append(ekleBtn, degistirBtn, silBtn, spacer, count, hareketBtn);
    view.appendChild(bottomBar);
  }

  draw();
}

function openBankaForm(existing, onSaved) {
  const isEdit = !!existing;
  const body = document.createElement('div');
  const kodField = field({ label: 'Kod', value: isEdit ? existing.kod : '(otomatik)' });
  kodField.input.disabled = true;
  const bankaAdiField = field({ label: 'Banka Adı', value: existing?.bankaAdi || '' });
  body.appendChild(row(kodField, bankaAdiField));
  const hesapAdiField = field({ label: 'Hesap Adı', value: existing?.hesapAdi || '' });
  body.appendChild(row(hesapAdiField));
  const ibanField = field({ label: 'Iban No', value: existing?.ibanNo || '' });
  body.appendChild(row(ibanField));
  const aktifField = field({ label: 'Hesap', options: ['Aktif Hesap', 'Pasif Hesap'], value: existing?.aktif === false ? 'Pasif Hesap' : 'Aktif Hesap' });
  const pBirimField = field({ label: 'P.Birim', options: PARA_BIRIMLERI, value: existing?.pBirim || 'TL' });
  body.appendChild(row(aktifField, pBirimField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = () => withErrorToast(async () => {
    if (!bankaAdiField.input.value.trim()) { toast('Banka adı zorunludur.'); return; }
    const data = {
      bankaAdi: bankaAdiField.input.value.trim(), hesapAdi: hesapAdiField.input.value,
      ibanNo: ibanField.input.value, pBirim: pBirimField.input.value, aktif: aktifField.input.value === 'Aktif Hesap',
    };
    if (isEdit) { await window.api.updateBanka(existing.id, data); toastSuccess('Banka hesabı güncellendi.'); }
    else { await window.api.addBanka(data); toastSuccess('Banka hesabı eklendi.'); }
    closeModal();
    onSaved();
  });
  footer.append(kapatBtn, spacer, onaylaBtn);
  openModal({ title: isEdit ? 'Banka Kart' : 'Banka Kart Ekle', bodyEl: body, footerEl: footer });
}

async function renderBankaDetay(container, bankaId, navigate) {
  let bankalar = await window.api.listBankalar();
  let banka = bankalar.find((b) => b.id === bankaId);
  if (!banka) { navigate('banka'); return; }
  let hareketler = await window.api.listBankaHareketleri(bankaId);
  let selectedId = null;

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  async function refresh() {
    bankalar = await window.api.listBankalar();
    banka = bankalar.find((b) => b.id === bankaId);
    hareketler = await window.api.listBankaHareketleri(bankaId);
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
    backBtn.onclick = () => navigate('banka');
    titleGroup.appendChild(backBtn);
    const h1 = document.createElement('h1');
    h1.textContent = `${banka.bankaAdi} - ${banka.hesapAdi || ''}`;
    titleGroup.appendChild(h1);
    const sub = document.createElement('span');
    sub.className = 'sub amount ' + moneyClass(banka.bakiye);
    sub.textContent = fmtMoney(banka.bakiye, banka.pBirim);
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
        <td style="text-align:right" class="amount ${moneyClass(signedTutar)}">${fmtMoney(signedTutar, banka.pBirim)}</td>
        <td style="text-align:right" class="amount ${moneyClass(h.bakiye)}">${fmtMoney(h.bakiye, banka.pBirim)}</td>`;
      tr.onclick = () => { selectedId = h.id; draw(); };
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    view.appendChild(tableWrap);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'bottom-bar';
    const ekleBtn = btn('Ekle', 'primary', 'plus');
    ekleBtn.onclick = () => openBankaHareketForm(banka, refresh);
    const silBtn = btn('Sil', 'danger', 'close');
    silBtn.disabled = !selectedId;
    silBtn.onclick = () => withErrorToast(async () => {
      const ok = await confirmDialog('Bu hareketi silmek istediğinize emin misiniz?');
      if (ok) { await window.api.deleteBankaHareket(selectedId); selectedId = null; toast('Hareket silindi.'); await refresh(); }
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

function openBankaHareketForm(banka, onSaved) {
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
    await window.api.addBankaHareket(banka.id, { tur: turField.input.value, tarih: tarihField.input.value, aciklama: aciklamaField.input.value, tutar: parseTRNumber(tutarField.input.value) });
    toastSuccess('Hareket eklendi.');
    closeModal();
    onSaved();
  });
  footer.append(kapatBtn, spacer, onaylaBtn);
  openModal({ title: 'Banka Hareketi Ekle', bodyEl: body, footerEl: footer });
}
