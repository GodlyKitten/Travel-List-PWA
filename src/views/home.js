import { topbar } from '../components/topbar.js';
import { el, clear } from '../ui.js';
import { listAll, progress } from '../state.js';
import { countdownLabel } from '../datefmt.js';
import { go } from '../router.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgIcon(paths, { size = 24, stroke = 'currentColor', strokeWidth = 2 } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', stroke);
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = paths;
  return svg;
}

const suitcase = () => svgIcon(
  '<rect x="3" y="7" width="18" height="13" rx="2"/>' +
  '<path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
  '<line x1="3" y1="12" x2="21" y2="12"/>',
  { size: 30, stroke: '#FFFFFF' }
);

const arrow = () => svgIcon('<polyline points="9 18 15 12 9 6"/>', { size: 16 });

function ratLogo(size = 64) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.innerHTML = `
    <g fill="#FFFFFF" stroke="#FFFFFF" stroke-linejoin="round" stroke-linecap="round" stroke-width="0.6">
      <path d="M5 16.5 Q1.5 15.5, 2 10.5" fill="none" stroke-width="1.4"/>
      <ellipse cx="10" cy="16.5" rx="6" ry="3.6"/>
      <circle cx="16" cy="14.5" r="3.3"/>
      <ellipse cx="14.4" cy="10.6" rx="1.5" ry="2"/>
      <ellipse cx="17.6" cy="10.6" rx="1.5" ry="2"/>
      <ellipse cx="19.4" cy="15" rx="2" ry="1.5"/>
    </g>
    <ellipse cx="14.4" cy="11.1" rx="0.6" ry="1" fill="#F687B3"/>
    <ellipse cx="17.6" cy="11.1" rx="0.6" ry="1" fill="#F687B3"/>
    <circle cx="17" cy="14" r="0.45" fill="#1A202C"/>
    <circle cx="20.7" cy="15.2" r="0.5" fill="#F687B3"/>
  `;
  return svg;
}

export function mountHome(container) {
  clear(container);
  const lists = listAll();
  const count = lists.length;
  const draftCount = lists.filter(l => l.finished === false).length;

  container.appendChild(topbar({ title: 'PackRat' }));

  const view = el('div', { class: 'view home' },
    renderHero(),
    count > 0 ? renderRecent(lists) : renderEmptyHint()
  );

  container.appendChild(view);

  function renderHero() {
    const draftMsg = draftCount > 0
      ? `${draftCount} draft ${draftCount === 1 ? 'list' : 'lists'} in progress`
      : 'Build a packing list in seconds.';

    return el('div', { class: 'hero-card' },
      el('div', { class: 'hero-dots' }),
      el('div', { class: 'hero-logo' }, ratLogo(72)),
      el('h1', { class: 'hero-title' }, 'Ready for your next trip?'),
      el('p', { class: 'hero-sub' }, draftMsg),
      el('button',
        { class: 'btn-on-green', onclick: () => go('/setup') },
        '+ New List'
      )
    );
  }

  function renderRecent(allLists) {
    const top = allLists.slice(0, 3);
    return el('div', { class: 'recent-section' },
      el('div', { class: 'recent-heading' },
        el('span', {}, 'Recent'),
        el('button', {
          class: 'recent-link',
          onclick: () => go('/mylists')
        }, `See all (${count})`, arrow())
      ),
      el('div', { class: 'recent-cards' },
        top.map(list => renderRecentCard(list))
      )
    );
  }

  function renderRecentCard(list) {
    const { done, total } = progress(list);
    const isDraft = list.finished === false;
    const trip = [cap(list.tripType.destination), cap(list.tripType.duration)]
      .filter(Boolean).join(' · ');
    const countdown = countdownLabel(list.tripDate);

    const parts = [trip];
    if (countdown) parts.push(countdown);
    parts.push(isDraft ? 'Draft' : `${done} of ${total} packed`);

    return el('button', {
      class: 'recent-card',
      onclick: () => go('/list/' + list.id)
    },
      el('div', { class: 'recent-card-dot' + (isDraft ? ' is-draft' : '') }),
      el('div', { class: 'recent-card-text' },
        el('div', { class: 'recent-card-name' }, list.name),
        el('div', { class: 'recent-card-meta' }, parts.join(' · '))
      ),
      arrow()
    );
  }

  function renderEmptyHint() {
    return el('div', { class: 'home-empty-hint' },
      'Your saved lists will appear here.'
    );
  }
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
