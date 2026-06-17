import { el } from '../ui.js';

export function topbar({ title, titleNode, left = [], right = [] }) {
  const titleEl = titleNode
    ? titleNode
    : el('div', { class: 'topbar-title' }, title || '');

  return el('header', { class: 'topbar' },
    el('div', { class: 'topbar-row' },
      el('div', { class: 'topbar-left' }, left.map(buttonNode)),
      titleEl,
      el('div', { class: 'topbar-actions' }, right.map(buttonNode))
    )
  );
}

function buttonNode(b) {
  if (b == null) return null;
  if (b instanceof Node) return b;
  return el('button', {
    class: 'topbar-btn' + (b.icon ? ' icon' : ''),
    onclick: b.onClick,
    'aria-label': b.ariaLabel || b.label
  }, b.label);
}
