import { el } from '../ui.js';

export function openMenu(anchorEl, items) {
  return new Promise(resolve => {
    let resolved = false;
    const close = (result) => {
      if (resolved) return;
      resolved = true;
      document.removeEventListener('keydown', onKey);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      resolve(result);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };

    const menu = el('div', { class: 'menu', role: 'menu' });
    items.forEach(item => {
      menu.appendChild(el('button', {
        class: 'menu-item' + (item.danger ? ' danger' : ''),
        role: 'menuitem',
        onclick: () => {
          close(item.label);
          if (item.onClick) Promise.resolve().then(item.onClick);
        }
      }, item.label));
    });

    const backdrop = el('div', {
      class: 'menu-backdrop',
      onclick: (e) => { if (e.target === backdrop) close(null); }
    }, menu);

    document.body.appendChild(backdrop);
    document.addEventListener('keydown', onKey);

    const rect = anchorEl.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - rect.right);
    const top = rect.bottom + 4;
    menu.style.top = `${top}px`;
    menu.style.right = `${right}px`;
  });
}
