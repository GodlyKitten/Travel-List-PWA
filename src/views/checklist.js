import { topbar } from '../components/topbar.js';
import { openMenu } from '../components/menu.js';
import { el, clear, debounce, modal, prompt as askPrompt } from '../ui.js';
import { getList, saveList, deleteList, duplicateList, newId } from '../state.js';
import { resetGeneratedItems } from '../templates.js';
import { openShareModal } from '../share.js';
import { go } from '../router.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let pendingSave = null;
let editing = false;

window.addEventListener('pagehide', () => {
  if (pendingSave) pendingSave.flush();
});

function svg(paths, { size = 16, stroke = 'currentColor', strokeWidth = 2, fill = 'none' } = {}) {
  const node = document.createElementNS(SVG_NS, 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('width', String(size));
  node.setAttribute('height', String(size));
  node.setAttribute('fill', fill);
  node.setAttribute('stroke', stroke);
  node.setAttribute('stroke-width', String(strokeWidth));
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  node.innerHTML = paths;
  return node;
}

const chevronIcon = () => svg('<polyline points="9 6 15 12 9 18"/>');
const handleIcon = () =>
  svg('<line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/>',
      { strokeWidth: 2.2 });
const checkIcon = () => svg('<polyline points="5 12 10 17 19 7"/>', { size: 28, strokeWidth: 3 });

function isFinished(list) { return list.finished !== false; }
function flushPending() { if (pendingSave) pendingSave.flush(); }
function persist(list) { if (pendingSave) pendingSave(list); }

function sectionCollapsed(list, sectionName) {
  return !!(list.collapsed && list.collapsed[sectionName]);
}

function visibleItems(list, section) {
  if (editing) return section.items;
  if (!list.hidePacked) return section.items;
  return section.items.filter(i => !i.checked);
}

function isAllPacked(list) {
  let total = 0, done = 0;
  for (const s of list.sections) {
    for (const it of s.items) {
      total++;
      if (it.checked) done++;
    }
  }
  return total > 0 && done === total;
}

export function mountChecklist(container, id) {
  flushPending();

  const list = getList(id);
  if (!list) { go('/mylists'); return; }

  pendingSave = debounce((l) => saveList(l), 200);
  editing = !isFinished(list);
  render(container, list);
}

function render(container, list) {
  clear(container);

  const finished = isFinished(list);

  const titleNode = editing
    ? el('input', {
        class: 'topbar-title-input',
        type: 'text',
        value: list.name,
        maxlength: 60,
        placeholder: 'List name',
        oninput: (e) => {
          const val = e.target.value.trim();
          list.name = val || 'Untitled';
          persist(list);
        }
      })
    : el('div', { class: 'topbar-title' }, list.name);

  let left, right;
  if (editing) {
    if (finished) {
      left = [{ label: 'Done', onClick: () => exitEdit(container, list) }];
      right = [];
    } else {
      left = [{ label: '‹ Lists', onClick: () => { flushPending(); go('/mylists'); } }];
      right = [{ label: 'Finish', onClick: () => onFinish(container, list) }];
    }
  } else {
    left = [{ label: '‹ Lists', onClick: () => { flushPending(); go('/mylists'); } }];
    const menuBtn = el('button', {
      class: 'topbar-btn icon menu-btn',
      'aria-label': 'More options'
    }, '⋮');
    menuBtn.onclick = () => openListActionsMenu(menuBtn, list, container);
    right = [
      { label: 'Edit', onClick: () => { editing = true; render(container, list); } },
      menuBtn
    ];
  }

  container.appendChild(topbar({ titleNode, left, right }));

  const view = el('div', { class: 'view' });

  if (editing && !finished) {
    view.appendChild(el('div', { class: 'banner banner-info' },
      'Add or remove items, then tap Finish to start packing.'
    ));
  }

  if (!editing && isAllPacked(list)) {
    view.appendChild(renderSuccessBanner());
  }

  if (editing) {
    view.appendChild(renderDateRow(list));
  }

  if (!editing && hasAnyChecked(list)) {
    view.appendChild(renderHidePackedToggle(list, container));
  }

  const sectionsWrap = el('div', { class: 'sections' });

  list.sections.forEach(section => {
    const items = visibleItems(list, section);
    const showSection = editing || items.length > 0;
    if (!showSection) return;
    sectionsWrap.appendChild(renderSection(list, section, items, container));
  });

  view.appendChild(sectionsWrap);

  if (editing) {
    view.appendChild(el('div', { class: 'edit-actions' },
      el('button', { class: 'btn-secondary', onclick: () => onReset(list, container) }, 'Reset list')
    ));
  }

  container.appendChild(view);
}

function hasAnyChecked(list) {
  return list.sections.some(s => s.items.some(i => i.checked));
}

function renderSuccessBanner() {
  return el('div', { class: 'success-banner' },
    el('div', { class: 'success-banner-icon' }, checkIcon()),
    el('div', {},
      el('div', { class: 'success-banner-title' }, 'All packed!'),
      el('div', { class: 'success-banner-sub' }, 'Have a great trip.')
    )
  );
}

function renderHidePackedToggle(list, container) {
  const on = !!list.hidePacked;
  return el('div', { class: 'checklist-toolbar' },
    el('button', {
      class: 'text-btn',
      onclick: () => {
        list.hidePacked = !on;
        persist(list);
        render(container, list);
      }
    }, on ? 'Show all items' : 'Hide packed items')
  );
}

function renderDateRow(list) {
  const input = el('input', {
    type: 'date',
    class: 'date-input',
    value: list.tripDate || '',
    onchange: (e) => {
      list.tripDate = e.target.value || null;
      persist(list);
    }
  });
  const clear = el('button', {
    class: 'text-btn',
    onclick: () => {
      list.tripDate = null;
      input.value = '';
      persist(list);
    }
  }, 'Clear');
  return el('section', { class: 'section date-section' },
    el('h3', { class: 'section-name' }, 'Trip date'),
    el('div', { class: 'date-row' }, input, clear)
  );
}

function renderSection(list, section, items, container) {
  const collapsed = sectionCollapsed(list, section.name);
  const sectionEl = el('section', { class: 'section' + (collapsed ? ' collapsed' : '') });

  const done = section.items.filter(i => i.checked).length;
  const total = section.items.length;

  const header = el('button', {
    class: 'section-header',
    'aria-expanded': collapsed ? 'false' : 'true',
    onclick: () => {
      list.collapsed = list.collapsed || {};
      list.collapsed[section.name] = !collapsed;
      persist(list);
      render(container, list);
    }
  },
    el('span', { class: 'chevron' }, chevronIcon()),
    el('span', { class: 'section-name' }, section.name),
    !editing && total > 0
      ? el('span', { class: 'section-progress' }, `${done} / ${total}`)
      : null
  );
  sectionEl.appendChild(header);

  if (!collapsed) {
    if (items.length === 0 && !editing) {
      sectionEl.appendChild(el('div', { class: 'section-empty' }, 'No items'));
    } else {
      const itemsList = el('ul', { class: 'items', dataset: { section: section.name } });
      items.forEach(item => {
        itemsList.appendChild(renderItem(list, section, item, container, itemsList));
      });
      sectionEl.appendChild(itemsList);
    }

    if (editing) {
      sectionEl.appendChild(renderAddRow(list, section, container));
    }
  }

  return sectionEl;
}

function renderItem(list, section, item, container, itemsList) {
  const checkbox = el('input', {
    type: 'checkbox',
    checked: item.checked,
    onclick: (e) => e.stopPropagation(),
    onchange: (e) => {
      item.checked = e.target.checked;
      li.classList.toggle('checked', item.checked);
      persist(list);
      const finished = isFinished(list);
      // Re-render to show/hide success banner or hide-packed-filtered item
      if (!editing && (isAllPacked(list) || list.hidePacked)) {
        flushPending();
        render(container, list);
      }
    }
  });

  const dragHandle = editing
    ? el('button', {
        class: 'drag-handle',
        'aria-label': 'Reorder item',
        type: 'button',
        onclick: (e) => e.preventDefault()
      }, handleIcon())
    : null;

  const deleteBtn = editing
    ? el('button', {
        class: 'delete-btn',
        'aria-label': 'Delete item',
        onclick: (e) => {
          e.stopPropagation();
          section.items = section.items.filter(x => x.id !== item.id);
          persist(list);
          render(container, list);
        }
      }, '×')
    : null;

  const li = el('li', {
    class: 'item' + (item.checked ? ' checked' : ''),
    onclick: () => {
      if (editing) return;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    }
  },
    dragHandle,
    checkbox,
    item.custom ? el('span', { class: 'item-custom-dot', title: 'Custom item' }) : null,
    el('span', { class: 'item-text' }, item.text),
    deleteBtn
  );

  if (dragHandle) {
    attachDrag(dragHandle, li, itemsList, section, list, container);
  }

  return li;
}

function attachDrag(handle, itemEl, itemsList, section, list, container) {
  let startY = 0;
  let started = false;
  let startIndex = -1;
  let liveIndex = -1;
  let itemHeight = 0;
  let siblings = [];
  let pointerId = null;

  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    pointerId = e.pointerId;
    handle.setPointerCapture(pointerId);
    startY = e.clientY;
    started = false;
    startIndex = Array.prototype.indexOf.call(itemsList.children, itemEl);
    liveIndex = startIndex;
    siblings = Array.from(itemsList.children);
    itemHeight = itemEl.getBoundingClientRect().height;
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    e.preventDefault();
  };

  const onMove = (e) => {
    const dy = e.clientY - startY;
    if (!started) {
      if (Math.abs(dy) < 4) return;
      started = true;
      itemEl.classList.add('dragging');
      document.body.classList.add('dragging-active');
    }
    itemEl.style.transform = `translateY(${dy}px)`;

    const offset = Math.round(dy / itemHeight);
    const target = Math.max(0, Math.min(siblings.length - 1, startIndex + offset));
    if (target !== liveIndex) {
      liveIndex = target;
      siblings.forEach((sib, i) => {
        if (sib === itemEl) return;
        let shift = 0;
        if (liveIndex < startIndex && i >= liveIndex && i < startIndex) shift = itemHeight;
        else if (liveIndex > startIndex && i > startIndex && i <= liveIndex) shift = -itemHeight;
        sib.style.transform = `translateY(${shift}px)`;
      });
    }
  };

  const onUp = (e) => {
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
    if (pointerId !== null) {
      try { handle.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
    }
    document.body.classList.remove('dragging-active');
    siblings.forEach(sib => sib.style.transform = '');
    itemEl.style.transform = '';
    itemEl.classList.remove('dragging');

    if (started && liveIndex !== startIndex && liveIndex >= 0 && startIndex >= 0) {
      const items = section.items;
      const [moved] = items.splice(startIndex, 1);
      items.splice(liveIndex, 0, moved);
      persist(list);
      flushPending();
      render(container, list);
    }
    started = false;
  };

  handle.addEventListener('pointerdown', onDown);
}

function renderAddRow(list, section, container) {
  const input = el('input', {
    class: 'add-input',
    type: 'text',
    placeholder: 'Add item…',
    maxlength: 80
  });
  const submit = () => {
    const text = input.value.trim();
    if (!text) return;
    section.items.push({ id: newId(), text, checked: false, custom: true });
    persist(list);
    render(container, list);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  return el('div', { class: 'add-row' },
    input,
    el('button', { class: 'add-btn', onclick: submit }, '+ Add')
  );
}

function exitEdit(container, list) {
  flushPending();
  editing = false;
  render(container, list);
}

function onFinish(container, list) {
  list.finished = true;
  persist(list);
  flushPending();
  editing = false;
  render(container, list);
}

async function onReset(list, container) {
  const ok = await modal({
    title: 'Reset list?',
    body: 'All items will be replaced with the original generated list. Custom items will be removed.',
    confirmLabel: 'Reset',
    danger: true
  });
  if (!ok) return;
  list.sections = resetGeneratedItems(list);
  persist(list);
  flushPending();
  render(container, list);
}

async function onDuplicate(list) {
  const name = await askPrompt({
    title: 'Duplicate list',
    body: 'Enter a name for the new list.',
    initial: list.name + ' (copy)',
    confirmLabel: 'Duplicate'
  });
  if (!name) return;
  flushPending();
  const copy = duplicateList(list.id, name);
  if (copy) go('/list/' + copy.id);
}

async function onDelete(list) {
  const ok = await modal({
    title: 'Delete list?',
    body: `"${list.name}" will be permanently removed.`,
    confirmLabel: 'Delete',
    danger: true
  });
  if (!ok) return;
  deleteList(list.id);
  go('/mylists');
}

function openListActionsMenu(anchor, list, container) {
  openMenu(anchor, [
    { label: 'Duplicate',     onClick: () => onDuplicate(list) },
    { label: 'Share via link', onClick: () => openShareModal(list) },
    { label: 'Delete list',   onClick: () => onDelete(list), danger: true }
  ]);
}
