import { iconEl } from './icons.js';
import { parseTRNumber, formatTRNumberInput } from './format.js';

const modalRoot = document.getElementById('modal-root');

let activeShortcuts = null;
let activeShortcutsAllowInModal = false;

export function setShortcuts(map, opts = {}) {
  activeShortcuts = map;
  activeShortcutsAllowInModal = !!opts.allowInModal;
}

export function getShortcutsSnapshot() {
  return { map: activeShortcuts, allowInModal: activeShortcutsAllowInModal };
}

export function resetShortcuts() {
  activeShortcuts = null;
  activeShortcutsAllowInModal = false;
  shortcutsStack = [];
}

function comboFromEvent(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  let key = e.key;
  if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}

document.addEventListener('keydown', (e) => {
  if (!activeShortcuts) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (document.querySelector('.modal-box') && !activeShortcutsAllowInModal) return;
  const handler = activeShortcuts[comboFromEvent(e)];
  if (!handler) return;
  e.preventDefault();
  handler();
});

let shortcutsStack = [];

export function closeModal() {
  modalRoot.innerHTML = '';
  if (shortcutsStack.length) {
    const prev = shortcutsStack.pop();
    setShortcuts(prev.map, { allowInModal: prev.allowInModal });
  }
}

export function openModal({ title, size = '', bodyEl, footerEl, onClose, onMenuClick }) {
  shortcutsStack.push({ map: activeShortcuts, allowInModal: activeShortcutsAllowInModal });
  if (activeDropdownClose) activeDropdownClose();
  modalRoot.innerHTML = '';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      closeModal();
      onClose && onClose();
    }
  });

  const box = document.createElement('div');
  box.className = 'modal-box' + (size ? ' ' + size : '');

  const header = document.createElement('div');
  header.className = 'modal-header';
  let spacer1;
  if (onMenuClick) {
    spacer1 = document.createElement('span');
    spacer1.className = 'icon-btn back';
    spacer1.style.width = '28px';
    spacer1.style.height = '28px';
    spacer1.appendChild(iconEl('menu'));
    spacer1.addEventListener('click', (e) => onMenuClick(e, spacer1));
  } else {
    spacer1 = document.createElement('span');
    spacer1.style.width = '20px';
  }
  const h2 = document.createElement('h2');
  h2.textContent = title;
  const closeBtn = document.createElement('span');
  closeBtn.className = 'icon-btn back';
  closeBtn.style.width = '28px';
  closeBtn.style.height = '28px';
  closeBtn.appendChild(iconEl('close'));
  closeBtn.addEventListener('click', () => { closeModal(); onClose && onClose(); });
  header.append(spacer1, h2, closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';
  if (bodyEl) body.appendChild(bodyEl);

  box.appendChild(header);
  box.appendChild(body);
  if (footerEl) {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.appendChild(footerEl);
    box.appendChild(footer);
  }

  overlay.appendChild(box);
  modalRoot.appendChild(overlay);

  const firstField = body.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
  if (firstField) {
    firstField.focus();
    if (firstField.tagName === 'INPUT' && firstField.type !== 'checkbox' && firstField.select) firstField.select();
  }

  box.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA') return;
    if (e.target.closest('.dropdown-panel')) return;
    e.preventDefault();

    const fields = [...body.querySelectorAll('input, select')].filter((el) => {
      if (el.disabled) return false;
      const fieldWrap = el.closest('.form-field');
      if (fieldWrap && fieldWrap.offsetParent === null) return false;
      if (!fieldWrap && el.offsetParent === null) return false;
      return true;
    });
    const idx = fields.indexOf(e.target);
    const next = idx >= 0 ? fields[idx + 1] : null;
    if (next) {
      next.focus();
      if (next.tagName === 'INPUT' && next.select) next.select();
      return;
    }

    const footerEl = box.querySelector('.modal-footer');
    if (!footerEl) return;
    const primaryBtn = footerEl.querySelector('.btn.primary') || [...footerEl.querySelectorAll('button, .btn')].pop();
    if (primaryBtn && !primaryBtn.disabled) primaryBtn.click();
  });

  return { overlay, box, body };
}

export function toast(msg, opts = {}) {
  const t = document.createElement('div');
  t.className = 'toast' + (opts.variant ? ` toast-${opts.variant}` : '');
  if (opts.icon) {
    const ic = iconEl(opts.icon, 'toast-icon');
    t.appendChild(ic);
  }
  const span = document.createElement('span');
  span.textContent = msg;
  t.appendChild(span);
  if (opts.onClick) {
    t.style.cursor = 'pointer';
    t.addEventListener('click', () => { opts.onClick(); t.remove(); });
  }
  document.body.appendChild(t);
  setTimeout(() => t.remove(), opts.duration || 2200);
}

export function toastSuccess(msg) {
  toast(msg, { variant: 'success', icon: 'check', duration: 2800 });
}

export function toastError(msg, fallback = 'İşlem gerçekleştirilemedi.') {
  toast(msg || fallback, { variant: 'error', icon: 'close', duration: 3200 });
}

export async function withErrorToast(fn) {
  try {
    await fn();
  } catch (e) {
    toastError(e && e.message);
  }
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const body = document.createElement('div');
    body.style.fontSize = '15px';
    body.style.color = 'var(--text)';
    body.textContent = message;

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '10px';
    footer.style.width = '100%';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Vazgeç';
    cancelBtn.onclick = () => { closeModal(); resolve(false); };

    const spacer = document.createElement('div');
    spacer.className = 'spacer';

    const okBtn = document.createElement('button');
    okBtn.className = 'btn danger';
    okBtn.style.background = 'var(--red-soft)';
    okBtn.style.borderColor = 'var(--red)';
    okBtn.style.color = 'var(--red)';
    okBtn.textContent = 'Evet, Sil';
    okBtn.onclick = () => { closeModal(); resolve(true); };

    footer.append(cancelBtn, spacer, okBtn);
    openModal({ title: 'Onay', size: 'narrow', bodyEl: body, footerEl: footer, onClose: () => resolve(false) });
  });
}

export async function confirmDeleteRich({ title, detailLine, taksitCheckboxLabel }) {
  const settings = await window.api.getSettings();
  const sifreSor = !!(settings.genel && settings.genel.silmeSifreSor);

  return new Promise((resolve) => {
    const body = document.createElement('div');

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size:17px; font-weight:600; margin-bottom:14px;';
    heading.textContent = 'Emin misiniz ?';
    body.appendChild(heading);

    if (detailLine) {
      const detail = document.createElement('div');
      detail.style.cssText = 'color:var(--amber); font-weight:600; margin-bottom:14px; line-height:1.5;';
      detail.textContent = detailLine;
      body.appendChild(detail);
    }

    const warn = document.createElement('div');
    warn.style.cssText = 'color:var(--text-dim); font-size:13.5px; line-height:1.6; margin-bottom:6px;';
    warn.textContent = 'Seçili işlem ve bu işleme bağlı tüm kayıtlar geri dönüşümsüz olarak silinecektir. EMİN MİSİNİZ ?';
    body.appendChild(warn);

    let pwField = null;
    if (sifreSor) {
      pwField = field({ label: 'Şifre', type: 'password', value: '' });
      body.appendChild(row(pwField));
    }

    let taksitCheck = null;
    if (taksitCheckboxLabel) {
      const wrap = document.createElement('div');
      wrap.className = 'checkbox-row';
      taksitCheck = document.createElement('input');
      taksitCheck.type = 'checkbox';
      const lbl = document.createElement('span');
      lbl.textContent = taksitCheckboxLabel;
      wrap.append(taksitCheck, lbl);
      body.appendChild(wrap);
    }

    const errBox = document.createElement('div');
    errBox.className = 'login-error';
    errBox.style.display = 'none';
    body.appendChild(errBox);

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '10px';
    footer.style.width = '100%';

    const noBtn = btn('Hayır', '', 'close');
    noBtn.onclick = () => { closeModal(); resolve({ confirmed: false }); };

    const spacer = document.createElement('div');
    spacer.className = 'spacer';

    const yesBtn = document.createElement('button');
    yesBtn.className = 'btn primary';
    yesBtn.style.background = 'var(--amber)';
    yesBtn.style.borderColor = 'var(--amber)';
    const yesLabel = document.createElement('span');
    yesLabel.textContent = 'Evet';
    yesBtn.append(iconEl('check'), yesLabel);
    yesBtn.onclick = async () => {
      if (sifreSor) {
        const ok = await window.api.authVerifyPassword(pwField.input.value);
        if (!ok) { errBox.textContent = 'Şifre hatalı.'; errBox.style.display = 'block'; return; }
      }
      closeModal();
      resolve({ confirmed: true, deleteGroup: taksitCheck ? taksitCheck.checked : false });
    };

    footer.append(noBtn, spacer, yesBtn);
    openModal({ title: title || 'Sil', size: 'narrow', bodyEl: body, footerEl: footer, onClose: () => resolve({ confirmed: false }) });
    if (pwField) pwField.input.focus();
  });
}

let activeDropdownClose = null;

function createPanel(renderFn, place, isOutside) {
  if (activeDropdownClose) activeDropdownClose();
  const panel = document.createElement('div');
  panel.className = 'dropdown-panel';
  document.body.appendChild(panel);

  function close() {
    panel.remove();
    document.removeEventListener('mousedown', onOutside);
    if (activeDropdownClose === close) activeDropdownClose = null;
  }
  function onOutside(e) {
    if (isOutside(e, panel)) close();
  }
  activeDropdownClose = close;

  renderFn(panel, close);
  place(panel);
  setTimeout(() => document.addEventListener('mousedown', onOutside), 0);
  return close;
}

function clampPosition(panel, left, top) {
  const margin = 8;
  const panelHeight = panel.offsetHeight;
  const panelWidth = panel.offsetWidth;
  left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - panelHeight - margin));
  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
}

export function openDropdown(anchorEl, renderFn) {
  return createPanel(
    renderFn,
    (panel) => {
      const rect = anchorEl.getBoundingClientRect();
      const panelHeight = panel.offsetHeight;
      const panelWidth = panel.offsetWidth;
      const margin = 8;
      let left = rect.left;
      if (left + panelWidth + margin > window.innerWidth) left = rect.right - panelWidth;
      const top = rect.top - panelHeight - margin > 0
        ? rect.top - panelHeight - margin
        : rect.bottom + margin;
      clampPosition(panel, left, top);
    },
    (e, panel) => !panel.contains(e.target) && e.target !== anchorEl && !anchorEl.contains(e.target),
  );
}

export function openContextMenu(clientX, clientY, renderFn) {
  return createPanel(
    renderFn,
    (panel) => clampPosition(panel, clientX, clientY),
    (e, panel) => !panel.contains(e.target),
  );
}

export function menuItem({ icon, label, shortcut = '', onClick, sub = '' }) {
  const item = document.createElement('div');
  item.className = 'menu-item';
  if (icon) item.appendChild(iconEl(icon));
  const labelWrap = document.createElement('span');
  labelWrap.className = 'menu-item-label';
  labelWrap.textContent = label;
  item.appendChild(labelWrap);
  if (sub) {
    const subEl = document.createElement('span');
    subEl.className = 'menu-item-sub';
    subEl.textContent = sub;
    item.appendChild(subEl);
  }
  if (shortcut) {
    const sc = document.createElement('span');
    sc.className = 'menu-item-shortcut';
    sc.textContent = shortcut;
    item.appendChild(sc);
  }
  item.addEventListener('click', onClick);
  return item;
}

export function menuDivider() {
  const d = document.createElement('div');
  d.className = 'menu-divider';
  return d;
}

export function menuCheckbox({ label, checked = false, onChange }) {
  const wrap = document.createElement('div');
  wrap.className = 'menu-checkbox';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  const span = document.createElement('span');
  span.textContent = label;
  wrap.append(input, span);
  wrap.addEventListener('click', (e) => {
    if (e.target !== input) input.checked = !input.checked;
    onChange && onChange(input.checked);
  });
  wrap.getValue = () => input.checked;
  return wrap;
}

let aciklamaListCounter = 0;
export function quickAddButton(fieldObj, key) {
  fieldObj.classList.add('has-quick-add');
  const listId = 'aciklama-list-' + (aciklamaListCounter++);
  const datalist = document.createElement('datalist');
  datalist.id = listId;
  fieldObj.appendChild(datalist);
  fieldObj.input.setAttribute('list', listId);
  window.api.listAciklamalar(key).then((items) => {
    datalist.innerHTML = items.map((t) => `<option value="${t.replace(/"/g, '&quot;')}"></option>`).join('');
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'quick-add-btn';
  addBtn.title = 'Listeye ekle';
  addBtn.appendChild(iconEl('plus'));
  addBtn.onclick = () => withErrorToast(async () => {
    const text = fieldObj.input.value.trim();
    if (!text) return;
    const items = await window.api.addAciklama(key, text);
    datalist.innerHTML = items.map((t) => `<option value="${t.replace(/"/g, '&quot;')}"></option>`).join('');
    toastSuccess('Listeye eklendi.');
  });
  fieldObj.appendChild(addBtn);
}

export function menuSubmenu({ icon, label, buildItems }) {
  const item = document.createElement('div');
  item.className = 'menu-item has-submenu';
  if (icon) item.appendChild(iconEl(icon));
  const labelWrap = document.createElement('span');
  labelWrap.className = 'menu-item-label';
  labelWrap.textContent = label;
  item.appendChild(labelWrap);
  item.appendChild(iconEl('chevronRight'));

  let subPanel = null;
  let closeTimer = null;

  function cancelClose() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  }
  function closeSub() {
    cancelClose();
    if (subPanel) { subPanel.remove(); subPanel = null; }
  }
  function scheduleClose() {
    cancelClose();
    closeTimer = setTimeout(closeSub, 250);
  }
  function openSub() {
    if (subPanel) return;
    const parentPanel = item.closest('.dropdown-panel') || document.body;
    subPanel = document.createElement('div');
    subPanel.className = 'dropdown-panel submenu-panel';
    subPanel.style.visibility = 'hidden';
    parentPanel.appendChild(subPanel);
    buildItems(subPanel);
    requestAnimationFrame(() => {
      if (!subPanel) return;
      const rect = item.getBoundingClientRect();
      const pw = subPanel.offsetWidth;
      const ph = subPanel.offsetHeight;
      let left = rect.right - 4;
      if (left + pw > window.innerWidth - 8) left = rect.left - pw + 4;
      let top = rect.top - 6;
      if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
      if (top < 8) top = 8;
      subPanel.style.left = left + 'px';
      subPanel.style.top = top + 'px';
      subPanel.style.visibility = 'visible';
    });
    subPanel.addEventListener('mouseenter', cancelClose);
    subPanel.addEventListener('mouseleave', scheduleClose);
  }

  item.addEventListener('mouseenter', () => { cancelClose(); openSub(); });
  item.addEventListener('mouseleave', scheduleClose);
  item.addEventListener('click', (e) => { e.stopPropagation(); if (subPanel) closeSub(); else openSub(); });

  return item;
}

export function menuColorItem({ label, color, selected, onClick }) {
  const item = document.createElement('div');
  item.className = 'menu-item';
  const sw = document.createElement('span');
  sw.className = 'menu-color-swatch' + (color ? '' : ' none');
  if (color) sw.style.background = color;
  else sw.appendChild(iconEl('close'));
  item.appendChild(sw);
  const labelWrap = document.createElement('span');
  labelWrap.className = 'menu-item-label';
  labelWrap.textContent = label;
  item.appendChild(labelWrap);
  if (selected) item.appendChild(iconEl('check'));
  item.addEventListener('click', onClick);
  return item;
}

export function field({ label, type = 'text', value = '', options = null, id, placeholder = '', textarea = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';
  const lab = document.createElement('label');
  lab.textContent = label;
  wrap.appendChild(lab);
  const fieldName = label ? 'f-' + label.toLowerCase().replace(/[^a-z0-9ığüşöç]+/gi, '-').replace(/^-+|-+$/g, '') : '';

  let input;
  if (options) {
    input = document.createElement('select');
    for (const opt of options) {
      const o = document.createElement('option');
      if (typeof opt === 'object') {
        o.value = opt.value;
        o.textContent = opt.label;
      } else {
        o.value = opt;
        o.textContent = opt;
      }
      input.appendChild(o);
    }
    input.value = value;
  } else if (textarea) {
    input = document.createElement('textarea');
    input.value = value;
    if (placeholder) input.placeholder = placeholder;
  } else if (type === 'money') {
    input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    if (fieldName) { input.name = fieldName; input.autocomplete = 'on'; }
    input.value = formatTRNumberInput(value);
    input.addEventListener('focus', () => input.select());
    input.addEventListener('blur', () => { input.value = formatTRNumberInput(parseTRNumber(input.value)); });
    input.addEventListener('input', () => {
      const cursorPos = input.selectionStart;
      const keptBeforeCursor = (input.value.slice(0, cursorPos).match(/[0-9,]/g) || []).length;

      let v = input.value.replace(/[^0-9,]/g, '');
      if (v === '') { input.value = ''; return; }
      const commaIdx = v.indexOf(',');
      let intPart = (commaIdx === -1 ? v : v.slice(0, commaIdx)).replace(/,/g, '');
      const decPart = commaIdx === -1 ? null : v.slice(commaIdx + 1).replace(/,/g, '').slice(0, 2);
      const intNum = intPart === '' ? 0 : parseInt(intPart, 10);
      let formatted = intNum.toLocaleString('tr-TR');
      if (commaIdx !== -1) formatted += ',' + (decPart || '');
      input.value = formatted;

      let count = 0;
      let newPos = formatted.length;
      if (keptBeforeCursor === 0) {
        newPos = 0;
      } else {
        for (let i = 0; i < formatted.length; i++) {
          if (/[0-9,]/.test(formatted[i])) {
            count++;
            if (count === keptBeforeCursor) { newPos = i + 1; break; }
          }
        }
      }
      input.setSelectionRange(newPos, newPos);
    });
  } else {
    input = document.createElement('input');
    input.type = type;
    input.value = value;
    if (placeholder) input.placeholder = placeholder;
    if (fieldName && type !== 'password') { input.name = fieldName; input.autocomplete = 'on'; }
  }
  if (id) input.id = id;
  wrap.appendChild(input);
  wrap.input = input;
  return wrap;
}

export function row(...fields) {
  const r = document.createElement('div');
  r.className = 'form-row';
  fields.forEach((f) => r.appendChild(f));
  return r;
}

export function btn(label, cls, iconName) {
  const b = document.createElement('button');
  b.className = 'btn' + (cls ? ' ' + cls : '');
  if (iconName) b.appendChild(iconEl(iconName));
  const span = document.createElement('span');
  span.textContent = label;
  b.appendChild(span);
  return b;
}
