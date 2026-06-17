export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset' && typeof v === 'object') {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) {
      node.setAttribute(k, '');
    } else {
      node.setAttribute(k, v);
    }
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  for (const child of children) {
    if (child == null || child === false || child === true) continue;
    if (Array.isArray(child)) { appendChildren(node, child); continue; }
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function debounce(fn, ms = 100) {
  let t = null;
  let lastArgs = null;
  const run = () => {
    t = null;
    if (lastArgs) { const a = lastArgs; lastArgs = null; fn(...a); }
  };
  const wrapped = (...args) => {
    lastArgs = args;
    if (t) clearTimeout(t);
    t = setTimeout(run, ms);
  };
  wrapped.flush = () => {
    if (t) { clearTimeout(t); run(); }
  };
  return wrapped;
}

export function modal({ title, body, confirmLabel = 'OK', cancelLabel = 'Cancel', danger = false, onConfirm }) {
  return new Promise(resolve => {
    const close = (result) => {
      backdrop.remove();
      resolve(result);
    };
    const confirmBtn = el('button', {
      class: danger ? 'btn-danger' : 'btn-primary',
      onclick: () => { if (onConfirm) onConfirm(); close(true); }
    }, confirmLabel);
    const cancelBtn = el('button', {
      class: 'btn-secondary',
      onclick: () => close(false)
    }, cancelLabel);
    const dialog = el('div', { class: 'modal', role: 'dialog' },
      el('h3', {}, title),
      body ? el('p', {}, body) : null,
      el('div', { class: 'modal-actions' }, cancelBtn, confirmBtn)
    );
    const backdrop = el('div', {
      class: 'modal-backdrop',
      onclick: (e) => { if (e.target === backdrop) close(false); }
    }, dialog);
    document.body.appendChild(backdrop);
  });
}

export function prompt({ title, body, placeholder = '', initial = '', confirmLabel = 'Save', maxLength = 80 }) {
  return new Promise(resolve => {
    const close = (result) => { backdrop.remove(); resolve(result); };
    const input = el('input', {
      class: 'modal-input',
      type: 'text',
      placeholder,
      value: initial,
      maxlength: maxLength,
      onkeydown: (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirm(); }
        if (e.key === 'Escape') close(null);
      }
    });
    const confirm = () => {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      close(v);
    };
    const dialog = el('div', { class: 'modal', role: 'dialog' },
      el('h3', {}, title),
      body ? el('p', {}, body) : null,
      input,
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn-secondary', onclick: () => close(null) }, 'Cancel'),
        el('button', { class: 'btn-primary', onclick: confirm }, confirmLabel)
      )
    );
    const backdrop = el('div', {
      class: 'modal-backdrop',
      onclick: (e) => { if (e.target === backdrop) close(null); }
    }, dialog);
    document.body.appendChild(backdrop);
    setTimeout(() => input.focus(), 50);
  });
}
