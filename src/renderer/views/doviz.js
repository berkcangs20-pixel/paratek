import { iconEl } from '../icons.js';
import { openModal, closeModal, toast, toastSuccess, field, row, btn } from '../ui.js';
import { fmtMoney, parseTRNumber } from '../format.js';

const CURRENCIES = ['USD', 'EUR', 'GBP'];
const CURRENCY_LABELS = { TL: 'TL - Türk Lirası', USD: 'USD - Amerikan Doları', EUR: 'EUR - Euro', GBP: 'GBP - İngiliz Sterlini' };

export async function renderDoviz(container) {
  let kurlar = await window.api.getDovizKurlari();
  let selected = 'USD';

  const view = document.createElement('div');
  view.className = 'view';
  container.appendChild(view);

  async function refresh() { kurlar = await window.api.getDovizKurlari(); draw(); }

  function draw() {
    view.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';
    titleGroup.appendChild(iconEl('exchange'));
    const h1 = document.createElement('h1');
    h1.textContent = 'Döviz Kuru';
    titleGroup.appendChild(h1);
    if (kurlar.guncellenme) {
      const sub = document.createElement('span');
      sub.className = 'sub';
      sub.textContent = `Son güncelleme: ${new Date(kurlar.guncellenme).toLocaleString('tr-TR')}`;
      titleGroup.appendChild(sub);
    }
    header.appendChild(titleGroup);

    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const fetchBtn = btn('Canlı Kur Çek', 'primary', 'refresh');
    fetchBtn.onclick = async () => {
      fetchBtn.disabled = true;
      try {
        await window.api.fetchLiveDovizKurlari();
        toastSuccess('Kurlar güncellendi.');
        await refresh();
      } catch (e) {
        toast('Kur alınamadı. İnternet bağlantınızı kontrol edin.');
      } finally {
        fetchBtn.disabled = false;
      }
    };
    actions.appendChild(fetchBtn);
    header.appendChild(actions);
    view.appendChild(header);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    tableWrap.style.flex = 'none';
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Para Birimi</th><th style="text-align:right">Alış</th><th style="text-align:right">Satış</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    for (const cur of CURRENCIES) {
      const tr = document.createElement('tr');
      if (cur === selected) tr.classList.add('selected');
      tr.innerHTML = `
        <td>${CURRENCY_LABELS[cur]}</td>
        <td style="text-align:right" class="amount">${fmtMoney(kurlar[cur].alis, 'TL')}</td>
        <td style="text-align:right" class="amount">${fmtMoney(kurlar[cur].satis, 'TL')}</td>
      `;
      tr.onclick = () => { selected = cur; draw(); };
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    view.appendChild(tableWrap);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'bottom-bar';
    const degistirBtn = btn('Değiştir', 'primary', 'swap');
    degistirBtn.onclick = () => openKurForm(selected, kurlar[selected], refresh);
    bottomBar.appendChild(degistirBtn);
    view.appendChild(bottomBar);

    view.appendChild(buildCalculator(kurlar));
  }

  draw();
}

function buildCalculator(kurlar) {
  const wrap = document.createElement('div');
  wrap.className = 'page-header';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'stretch';
  wrap.style.gap = '16px';

  const titleRow = document.createElement('div');
  titleRow.className = 'title-group';
  titleRow.appendChild(iconEl('calc'));
  const h2 = document.createElement('h1');
  h2.style.fontSize = '18px';
  h2.textContent = 'Döviz Hesaplayıcı';
  titleRow.appendChild(h2);
  wrap.appendChild(titleRow);

  const options = ['TL', ...CURRENCIES].map((c) => ({ value: c, label: CURRENCY_LABELS[c] }));
  const amountField = field({ label: 'Miktar', type: 'money', value: 1000 });
  const fromField = field({ label: 'Kaynak', options, value: 'TL' });
  const toField = field({ label: 'Hedef', options, value: 'USD' });

  const formRow = document.createElement('div');
  formRow.className = 'form-row';
  formRow.append(amountField, fromField, toField);
  wrap.appendChild(formRow);

  const resultBox = document.createElement('div');
  resultBox.className = 'totals-row grand';
  resultBox.style.fontSize = '18px';
  wrap.appendChild(resultBox);

  function toTL(amount, currency) {
    if (currency === 'TL') return amount;
    return amount * kurlar[currency].alis;
  }
  function fromTL(tlAmount, currency) {
    if (currency === 'TL') return tlAmount;
    return tlAmount / kurlar[currency].satis;
  }

  function compute() {
    const amount = parseTRNumber(amountField.input.value);
    const from = fromField.input.value;
    const to = toField.input.value;
    const tl = toTL(amount, from);
    const result = fromTL(tl, to);
    resultBox.innerHTML = `<span>${fmtMoney(amount, from)} =</span><b style="margin-left:8px;">${fmtMoney(result, to)}</b>`;
  }

  amountField.input.addEventListener('input', compute);
  fromField.input.addEventListener('change', compute);
  toField.input.addEventListener('change', compute);
  compute();

  return wrap;
}

function openKurForm(currency, current, onSaved) {
  const body = document.createElement('div');
  const alisField = field({ label: 'Alış', type: 'money', value: current.alis });
  const satisField = field({ label: 'Satış', type: 'money', value: current.satis });
  body.appendChild(row(alisField, satisField));

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;width:100%;gap:10px';
  const kapatBtn = btn('Kapat', '', 'close');
  kapatBtn.onclick = () => closeModal();
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const onaylaBtn = btn('Onayla', 'primary', 'check');
  onaylaBtn.onclick = async () => {
    await window.api.updateDovizKurlari({ [currency]: { alis: parseTRNumber(alisField.input.value), satis: parseTRNumber(satisField.input.value) } });
    toastSuccess('Kur güncellendi.');
    closeModal();
    onSaved();
  };
  footer.append(kapatBtn, spacer, onaylaBtn);
  openModal({ title: `${CURRENCY_LABELS[currency]} Kuru`, size: 'narrow', bodyEl: body, footerEl: footer });
}
