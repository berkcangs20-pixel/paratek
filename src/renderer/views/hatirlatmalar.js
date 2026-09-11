import { iconEl } from '../icons.js';
import { openModal, closeModal, toast, toastSuccess, withErrorToast, confirmDialog, confirmDeleteRich, field, row, btn, openDropdown, openContextMenu, menuItem, menuDivider, menuSubmenu, menuColorItem, quickAddButton, setShortcuts } from '../ui.js';
import { fmtMoney, fmtDate, todayISO, parseTRNumber } from '../format.js';
import { openOdemeTuru } from './cari.js';

const TURLER = ['Tahsilat', 'Alınan Çek', 'Alınan Senet', 'Ödeme', 'Verilen Çek', 'Verilen Senet'];
const PARA_BIRIMLERI = ['TL', 'USD', 'EUR'];
const MARK_COLORS = { red: '#e05a5a', orange: '#d99a3d', green: '#4caf6f', purple: '#9d6fd1' };
const MARK_LABELS = { red: 'Kırmızı', orange: 'Turuncu', green: 'Yeşil', purple: 'Mor' };

export function yonOf(tur) {
  return (tur === 'Ödeme' || tur.startsWith('Verilen')) ? 'Odeme' : 'Tahsilat';
}

function ekleMenuItems(close, refresh, cariId) {
  return [
    menuItem({ icon: 'plus', label: 'Tahsilat', sub: 'Müşteri', onClick: () => { close(); openHatirlatmaForm(null, refresh, cariId, 'Tahsilat'); } }),
    menuItem({ icon: 'plus', label: 'Alınan Çek', sub: 'Müşteri', onClick: () => { close(); openHatirlatmaForm(null, refresh, cariId, 'Alınan Çek'); } }),
    menuItem({ icon: 'plus', label: 'Alınan Senet', sub: 'Müşteri', onClick: () => { close(); openHatirlatmaForm(null, refresh, cariId, 'Alınan Senet'); } }),
    menuDivider(),
    menuItem({ icon: 'minus', label: 'Ödeme', sub: 'Tedarikçi', onClick: () => { close(); openHatirlatmaForm(null, refresh, cariId, 'Ödeme'); } }),
    menuItem({ icon: 'minus', label: 'Verilen Çek', sub: 'Tedarikçi', onClick: () => { close(); openHatirlatmaForm(null, refresh, cariId, 'Verilen Çek'); } }),
    menuItem({ icon: 'minus', label: 'Verilen Senet', sub: 'Tedarikçi', onClick: () => { close(); openHatirlatmaForm(null, refresh, cariId, 'Verilen Senet'); } }),
  ];
}

export function isaretHtml(r) {
  if (r.isaret && MARK_COLORS[r.isaret]) return `<span class="tag-bar" style="background:${MARK_COLORS[r.isaret]}"></span>`;
  return `<span class="tag-bar ${yonOf(r.tur) === 'Tahsilat' ? 'tag-musteri' : 'tag-tedarikci'}"></span>`;
}

export function buildHatirlatmaIsaretleSubmenu(r, refresh, close) {
  const pick = (key) => withErrorToast(async () => {
    close();
    await window.api.updateHatirlatma(r.id, { isaret: key });
    toastSuccess(key ? 'İşaretlendi.' : 'İşaret kaldırıldı.');
    await refresh();
  });
  return menuSubmenu({
    icon: 'tag', label: 'İşaretle',
    buildItems: (subPanel) => {
      subPanel.append(
        menuColorItem({ label: 'Yok', color: null, selected: !r.isaret, onClick: () => pick(null) }),
        ...Object.keys(MARK_COLORS).map((key) => menuColorItem({
          label: MARK_LABELS[key], color: MARK_COLORS[key], selected: r.isaret === key, onClick: () => pick(key),
        })),
      );
    },
  });
}

export async function renderHatirlatmalar(container) {
  let list = await window.api.listHatirlatmalar();
  let selectedId = null;

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  async function refresh() { list = await window.api.listHatirlatmalar(); draw(); }

  function draw() {
    view.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'page-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    titleGroup.appendChild(iconEl('hatirlatma'));
    const h1 = document.createElement('h1');
    h1.textContent = 'Hatırlatmalar';
    titleGroup.appendChild(h1);
    header.appendChild(titleGroup);

    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const menuBtn = document.createElement('div');
    menuBtn.className = 'icon-btn primary';
    menuBtn.title = 'Toplamlar';
    menuBtn.appendChild(iconEl('menu'));
    menuBtn.onclick = showToplamlar;
    actions.appendChild(menuBtn);
    header.appendChild(actions);
    view.appendChild(header);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Vade</th><th>Tür</th><th>Cari</th><th>Açıklama</th><th>Taksit</th><th>Durum</th><th style="text-align:right">Tutar</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    if (!list.length) tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Kayıt bulunamadı</td></tr>`;
    async function tahsilatOdemeYap(r) {
      const cari = await window.api.getCari(r.cariId);
      if (!cari) { toast('Cari hesap bulunamadı.'); return; }
      const yon = yonOf(r.tur);
      openOdemeTuru({ ...cari, pBirim: r.pBirim }, yon, () => withErrorToast(async () => {
        await window.api.tamamlaHatirlatma(r.id);
        await refresh();
      }));
    }

    async function silHatirlatma(r) {
      const detail = `${fmtDate(r.vade)} - ${r.tur} - ${fmtMoney(r.tutar, r.pBirim)} - ${r.aciklama}`;
      const hasGroup = r.taksitSayisi > 1;
      const { confirmed, deleteGroup } = await confirmDeleteRich({
        title: 'Hatırlatma Sil',
        detailLine: detail,
        taksitCheckboxLabel: hasGroup ? 'Bu hatırlatma ile ilişkili tüm taksitleri sil' : null,
      });
      if (!confirmed) return;
      if (deleteGroup) {
        const grupKayitlari = list.filter((x) => x.grupId === r.grupId);
        for (const x of grupKayitlari) await window.api.deleteHatirlatma(x.id);
      } else {
        await window.api.deleteHatirlatma(r.id);
      }
      selectedId = null;
      toastSuccess('Hatırlatma silindi.');
      await refresh();
    }

    for (const r of list) {
      const tr = document.createElement('tr');
      if (r.id === selectedId) tr.classList.add('selected');
      tr.innerHTML = `
        <td>${fmtDate(r.vade)}</td><td>${isaretHtml(r)}${r.tur}</td><td>${r.cariUnvan}</td><td>${r.aciklama}</td>
        <td>${r.taksitSayisi > 1 ? `${r.taksitNo} / ${r.taksitSayisi}` : '-'}</td>
        <td><span class="durum-text ${r.durumTip}">${r.durumMetni}</span></td>
        <td style="text-align:right" class="amount ${r.durumTip === 'tamam' ? 'pos' : ''}">${fmtMoney(r.tutar, r.pBirim)}</td>`;
      tr.onclick = () => { selectedId = r.id; draw(); };
      tr.oncontextmenu = (e) => {
        e.preventDefault();
        selectedId = r.id; draw();
        openContextMenu(e.clientX, e.clientY, (panel, close) => {
          panel.append(
            menuItem({ icon: 'transfer', label: 'Tahsilat / Ödeme', shortcut: 'Ctrl+O', onClick: () => { close(); withErrorToast(() => tahsilatOdemeYap(r)); } }),
            menuDivider(),
            menuItem({ icon: 'plus', label: 'Ekle', shortcut: 'Ctrl+E', onClick: () => {
              close();
              openContextMenu(e.clientX, e.clientY, (subPanel, subClose) => {
                subPanel.append(...ekleMenuItems(subClose, refresh, null));
              });
            } }),
            menuItem({ icon: 'swap', label: 'Değiştir', shortcut: 'Ctrl+D', onClick: () => { close(); openHatirlatmaForm(r, refresh, null); } }),
            menuItem({ icon: 'close', label: 'Sil', shortcut: 'Ctrl+S', onClick: () => withErrorToast(() => silHatirlatma(r)) }),
            menuDivider(),
            buildHatirlatmaIsaretleSubmenu(r, refresh, close),
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
    ekleBtn.onclick = () => openDropdown(ekleBtn, (panel, close) => {
      panel.append(...ekleMenuItems(close, refresh, null));
    });
    const degistirBtn = btn('Değiştir', '', 'swap');
    degistirBtn.disabled = !selectedId;
    degistirBtn.onclick = () => {
      const r = list.find((x) => x.id === selectedId);
      if (r) openHatirlatmaForm(r, refresh);
    };
    const silBtn = btn('Sil', 'danger', 'close');
    silBtn.disabled = !selectedId;
    silBtn.onclick = () => withErrorToast(async () => {
      const r = list.find((x) => x.id === selectedId);
      if (r) await silHatirlatma(r);
    });
    const spacer = document.createElement('div'); spacer.className = 'spacer';
    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = `${list.length} kayıt`;

    const odemeBtn = btn('Tahsilat / Ödeme', 'primary', 'transfer');
    const secili = list.find((x) => x.id === selectedId);
    odemeBtn.disabled = !secili || secili.durumTip === 'tamam';
    odemeBtn.onclick = () => withErrorToast(() => tahsilatOdemeYap(secili));

    bottomBar.append(ekleBtn, degistirBtn, silBtn, spacer, count, odemeBtn);
    view.appendChild(bottomBar);

    setShortcuts({
      'Ctrl+O': () => { const r = list.find((x) => x.id === selectedId); if (r) withErrorToast(() => tahsilatOdemeYap(r)); else toast('Önce bir hatırlatma seçin.'); },
      'Ctrl+E': () => openDropdown(ekleBtn, (panel, close) => { panel.append(...ekleMenuItems(close, refresh, null)); }),
      'Ctrl+D': () => { const r = list.find((x) => x.id === selectedId); if (r) openHatirlatmaForm(r, refresh); else toast('Önce bir hatırlatma seçin.'); },
      'Ctrl+S': () => withErrorToast(async () => {
        const r = list.find((x) => x.id === selectedId);
        if (r) await silHatirlatma(r); else toast('Önce bir hatırlatma seçin.');
      }),
    });
  }

  async function showToplamlar() {
    const cariler = await window.api.listCariler();
    const byCurrency = {};
    for (const r of list) {
      if (!byCurrency[r.pBirim]) byCurrency[r.pBirim] = { tahsilatTamam: 0, tahsilatBekleyen: 0, odemeTamam: 0, odemeBekleyen: 0 };
      const grp = byCurrency[r.pBirim];
      const yon = yonOf(r.tur);
      const tamam = r.durumTip === 'tamam';
      if (yon === 'Tahsilat') { if (tamam) grp.tahsilatTamam += r.tutar; else grp.tahsilatBekleyen += r.tutar; }
      else { if (tamam) grp.odemeTamam += r.tutar; else grp.odemeBekleyen += r.tutar; }
    }
    const body = document.createElement('div');
    body.className = 'totals-list';
    const currencies = Object.keys(byCurrency);
    if (!currencies.length) body.innerHTML = `<div style="color:var(--text-dim); text-align:center; padding:20px;">Kayıt yok</div>`;
    currencies.forEach((cur) => {
      const t = byCurrency[cur];
      body.innerHTML += `
        <div class="totals-row section">${cur} Hesapları</div>
        <div class="totals-row"><span>Tamamlanan Tahsilat</span><b>${fmtMoney(t.tahsilatTamam, cur)}</b></div>
        <div class="totals-row bold"><span>Bekleyen Tahsilat</span><b>${fmtMoney(t.tahsilatBekleyen, cur)}</b></div>
        <div class="totals-row"><span>Tamamlanan Ödeme</span><b>${fmtMoney(t.odemeTamam, cur)}</b></div>
        <div class="totals-row grand"><span>Bekleyen Ödeme</span><b>${fmtMoney(t.odemeBekleyen, cur)}</b></div>
      `;
    });
    openModal({ title: 'Toplamlar', bodyEl: body });
  }

  draw();
}

export async function openHatirlatmaForm(existing, onSaved, presetCariId, defaultTur) {
  const isEdit = !!existing;
  const cariler = await window.api.listCariler();
  const body = document.createElement('div');

  const turOptions = existing ? TURLER : TURLER.filter((t) => yonOf(t) === yonOf(defaultTur || TURLER[0]));
  const cariField = field({ label: 'Cari', options: cariler.map((c) => ({ value: c.id, label: c.unvan })), value: existing?.cariId || presetCariId || (cariler[0] && cariler[0].id) });
  const turField = field({ label: 'Tür', options: turOptions, value: existing?.tur || defaultTur || turOptions[0] });
  body.appendChild(row(cariField, turField));

  const vadeField = field({ label: 'İlk Vade', type: 'date', value: existing?.vade || todayISO() });
  const aciklamaField = field({ label: 'Açıklama', value: existing?.aciklama || '' });
  body.appendChild(row(vadeField, aciklamaField));

  const tutarField = field({ label: isEdit ? 'Tutar' : 'Toplam Tutar', type: 'money', value: existing?.tutar || 0 });
  const pBirimField = field({ label: 'P.Birim', options: PARA_BIRIMLERI, value: existing?.pBirim || 'TL' });
  body.appendChild(row(tutarField, pBirimField));

  let taksitField = null;
  if (!isEdit) {
    taksitField = field({ label: 'Taksit Sayısı', type: 'number', value: 1 });
    body.appendChild(row(taksitField));
    const hint = document.createElement('div');
    hint.style.cssText = 'color:var(--text-dim); font-size:12px; margin-top:-8px;';
    hint.textContent = '1\'den büyük girilirse tutar taksitlere bölünür ve her biri bir ay arayla vadelendirilir.';
    body.appendChild(hint);
  }

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = () => withErrorToast(async () => {
    if (!cariField.input.value) { toast('Önce bir cari hesap oluşturun.'); return; }
    const data = {
      cariId: cariField.input.value, tur: turField.input.value, vade: vadeField.input.value,
      aciklama: aciklamaField.input.value, tutar: parseTRNumber(tutarField.input.value), pBirim: pBirimField.input.value,
      taksitSayisi: taksitField ? taksitField.input.value : 1,
    };
    if (isEdit) { await window.api.updateHatirlatma(existing.id, data); toastSuccess('Hatırlatma güncellendi.'); }
    else { await window.api.addHatirlatma(data); toastSuccess('Hatırlatma eklendi.'); }
    closeModal();
    onSaved();
  });
  footer.append(kapatBtn, spacer, onaylaBtn);
  openModal({ title: isEdit ? 'Hatırlatma Düzenle' : 'Hatırlatma Ekle', bodyEl: body, footerEl: footer });
}
