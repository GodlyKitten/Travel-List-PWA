import { topbar } from '../components/topbar.js';
import { openMenu } from '../components/menu.js';
import { el, clear, modal } from '../ui.js';
import { listAll, deleteList, progress } from '../state.js';
import { countdownLabel, groupForDate } from '../datefmt.js';
import { exportAll, parseImport } from '../share.js';
import { go } from '../router.js';

export function mountMyLists(container) {
  clear(container);
  const lists = listAll();

  const fileInput = el('input', {
    type: 'file',
    accept: 'application/json,.json',
    style: { display: 'none' },
    onchange: async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) await onImportFile(file, container);
    }
  });

  const menuBtn = el('button', {
    class: 'topbar-btn icon menu-btn',
    'aria-label': 'More options'
  }, '⋮');
  menuBtn.onclick = () => openMenu(menuBtn, [
    { label: 'Export all', onClick: () => onExport() },
    { label: 'Import…',    onClick: () => fileInput.click() }
  ]);

  container.appendChild(topbar({
    title: 'My Lists',
    left: [{ label: '‹ Back', onClick: () => go('/home') }],
    right: [
      { label: '+ New', onClick: () => go('/setup') },
      menuBtn
    ]
  }));
  container.appendChild(fileInput);

  const view = el('div', { class: 'view' });

  if (lists.length === 0) {
    view.appendChild(el('div', { class: 'empty' },
      el('h2', {}, 'No lists yet'),
      el('p', {}, 'Create your first packing list to get started.'),
      el('button', { class: 'btn-primary', onclick: () => go('/setup') }, 'Create a list')
    ));
  } else {
    view.appendChild(renderGrouped(lists, container));
  }

  container.appendChild(view);
}

function renderGrouped(lists, container) {
  const groups = groupLists(lists);
  const wrap = el('div', { class: 'lists' });

  if (groups.upcoming.length > 0) {
    wrap.appendChild(renderGroupHeader('Upcoming'));
    groups.upcoming.forEach(list => wrap.appendChild(renderCard(list, container, false)));
  }
  if (groups.none.length > 0) {
    wrap.appendChild(renderGroupHeader('No date'));
    groups.none.forEach(list => wrap.appendChild(renderCard(list, container, false)));
  }
  if (groups.past.length > 0) {
    wrap.appendChild(renderGroupHeader('Past'));
    groups.past.forEach(list => wrap.appendChild(renderCard(list, container, true)));
  }
  return wrap;
}

function groupLists(lists) {
  const upcoming = [], none = [], past = [];
  for (const list of lists) {
    const g = groupForDate(list.tripDate);
    if (g === 'upcoming') upcoming.push(list);
    else if (g === 'past') past.push(list);
    else none.push(list);
  }
  upcoming.sort((a, b) => String(a.tripDate).localeCompare(String(b.tripDate)));
  none.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  past.sort((a, b) => String(b.tripDate).localeCompare(String(a.tripDate)));
  return { upcoming, none, past };
}

function renderGroupHeader(name) {
  return el('div', { class: 'group-header' }, name);
}

function renderCard(list, container, muted) {
  const { done, total } = progress(list);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const tripLabel = [cap(list.tripType.destination), cap(list.tripType.duration)]
    .filter(Boolean)
    .join(' · ');
  const isDraft = list.finished === false;
  const countdown = countdownLabel(list.tripDate);

  const trash = el('button', {
    class: 'trash-btn',
    'aria-label': 'Delete list',
    onclick: async (e) => {
      e.stopPropagation();
      const ok = await modal({
        title: 'Delete list?',
        body: `"${list.name}" will be permanently removed.`,
        confirmLabel: 'Delete',
        danger: true
      });
      if (!ok) return;
      deleteList(list.id);
      mountMyLists(container);
    }
  }, '×');

  const pills = el('div', { class: 'list-card-row' },
    isDraft ? el('span', { class: 'pill pill-draft' }, 'Draft') : null,
    el('span', { class: 'pill' }, tripLabel || 'Custom'),
    countdown ? el('span', { class: 'pill pill-countdown' }, countdown) : null
  );

  return el('button', {
    class: 'list-card' + (muted ? ' muted' : ''),
    onclick: () => go('/list/' + list.id)
  },
    el('div', { class: 'list-card-row' },
      el('div', { class: 'list-card-name' }, list.name),
      trash
    ),
    pills,
    el('div', { class: 'progress' },
      el('div', { class: 'progress-fill', style: { width: pct + '%' } })
    ),
    el('div', { class: 'progress-text' },
      el('span', {}, isDraft ? 'Not finished yet' : `${done} of ${total} packed`),
      el('span', {}, isDraft ? '' : pct + '%')
    )
  );
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function onExport() {
  try {
    const count = exportAll();
    if (count === 0) {
      modal({
        title: 'Nothing to export',
        body: 'Create at least one list first.',
        confirmLabel: 'OK',
        cancelLabel: ' '
      });
    }
  } catch (err) {
    modal({
      title: 'Export failed',
      body: err.message || 'Could not export lists.',
      confirmLabel: 'OK',
      cancelLabel: ' '
    });
  }
}

async function onImportFile(file, container) {
  let parsed;
  try { parsed = await parseImport(file); }
  catch (err) {
    await modal({
      title: 'Import failed',
      body: err.message || 'Could not read the file.',
      confirmLabel: 'OK',
      cancelLabel: ' '
    });
    return;
  }
  const ok = await modal({
    title: 'Import lists?',
    body: `Add ${parsed.count} list${parsed.count === 1 ? '' : 's'} from "${file.name}" to your existing lists?`,
    confirmLabel: 'Import'
  });
  if (!ok) return;
  parsed.save();
  mountMyLists(container);
}
