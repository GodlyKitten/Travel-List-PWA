import { topbar } from '../components/topbar.js';
import { el, clear } from '../ui.js';
import { decodeSharedList, saveSharedList } from '../share.js';
import { countdownLabel } from '../datefmt.js';
import { go } from '../router.js';

export function mountShare(container, encoded) {
  clear(container);

  let payload;
  try { payload = decodeSharedList(encoded); }
  catch (err) {
    container.appendChild(topbar({
      title: 'Shared list',
      left: [{ label: '‹ Home', onClick: () => go('/home') }]
    }));
    container.appendChild(el('div', { class: 'view' },
      el('div', { class: 'empty' },
        el('h2', {}, 'Link not valid'),
        el('p', {}, err.message || 'This share link could not be opened.'),
        el('button', { class: 'btn-primary', onclick: () => go('/home') }, 'Back to home')
      )
    ));
    return;
  }

  const onSave = () => {
    const saved = saveSharedList(payload);
    go('/list/' + saved.id);
  };

  container.appendChild(topbar({
    title: 'Shared list',
    left: [{ label: 'Cancel', onClick: () => go('/home') }],
    right: [{ label: 'Save', onClick: onSave }]
  }));

  const view = el('div', { class: 'view' });

  const trip = [cap(payload.tripType?.destination), cap(payload.tripType?.duration)]
    .filter(Boolean).join(' · ');
  const countdown = countdownLabel(payload.tripDate);
  const metaParts = [trip, countdown].filter(Boolean);

  view.appendChild(el('div', { class: 'banner banner-info' },
    `Preview of "${payload.name}". Tap Save to add it to your lists.`
  ));

  if (metaParts.length > 0) {
    view.appendChild(el('div', { class: 'shared-meta' },
      metaParts.map(p => el('span', { class: 'pill' }, p))
    ));
  }

  const sectionsWrap = el('div', { class: 'sections' });
  payload.sections.forEach(section => {
    if (!section.items || section.items.length === 0) return;
    const sectionEl = el('section', { class: 'section' });
    sectionEl.appendChild(el('h3', { class: 'section-name' }, section.name));
    const itemsList = el('ul', { class: 'items' });
    section.items.forEach(item => {
      itemsList.appendChild(el('li', { class: 'item' },
        item.custom ? el('span', { class: 'item-custom-dot' }) : null,
        el('span', { class: 'item-text' }, item.text)
      ));
    });
    sectionEl.appendChild(itemsList);
    sectionsWrap.appendChild(sectionEl);
  });
  view.appendChild(sectionsWrap);

  view.appendChild(el('div', { class: 'edit-actions' },
    el('button', { class: 'btn-secondary', onclick: () => go('/home') }, 'Cancel'),
    el('button', { class: 'btn-primary', onclick: onSave }, 'Save to my lists')
  ));

  container.appendChild(view);
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
