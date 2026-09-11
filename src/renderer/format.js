export function fmtMoney(value, pBirim = 'TL') {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const str = abs.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = n < 0 ? '-' : '';
  return `${sign}${str} ${pBirim}`;
}

export function moneyClass(value) {
  const n = Number(value) || 0;
  if (n > 0) return 'pos';
  if (n < 0) return 'neg';
  return 'zero';
}

export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimeHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function parseTRNumber(str) {
  if (typeof str === 'number') return str;
  if (str === null || str === undefined || str === '') return 0;
  let s = String(str).trim();
  s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatTRNumberInput(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function isoToDisplay(iso) {
  return fmtDate(iso);
}

export function displayToISO(disp) {
  if (!disp) return '';
  const [d, m, y] = disp.split('.');
  if (!d || !m || !y) return disp;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
