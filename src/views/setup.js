import { topbar } from '../components/topbar.js';
import { el, clear, prompt as askPrompt } from '../ui.js';
import { generateList } from '../templates.js';
import { saveList, newId } from '../state.js';
import { go } from '../router.js';

export function mountSetup(container) {
  clear(container);

  const state = { destination: null, duration: null, tripDate: null };
  const left = [{ label: '‹ Back', onClick: () => go('/home') }];

  container.appendChild(topbar({ title: 'New Trip', left }));

  const view = el('div', { class: 'view setup' });

  const continueBtn = el('button',
    { class: 'btn-primary', disabled: true, onclick: onContinue },
    'Continue'
  );

  function refresh() {
    continueBtn.disabled = !(state.destination && state.duration);
    view.querySelectorAll('.choice').forEach(btn => {
      const k = btn.dataset.key;
      const v = btn.dataset.value;
      btn.classList.toggle('selected', state[k] === v);
    });
  }

  view.appendChild(renderStep(
    'destination',
    'Destination',
    'Where are you going?',
    [
      { value: 'domestic',      title: 'Domestic',      sub: 'Within the country' },
      { value: 'international', title: 'International', sub: 'Cross-border travel' }
    ],
    (v) => { state.destination = v; refresh(); }
  ));

  view.appendChild(renderStep(
    'duration',
    'Duration',
    'How long is your trip?',
    [
      { value: 'short', title: 'Short trip', sub: '1–3 days' },
      { value: 'long',  title: 'Long trip',  sub: '4+ days' }
    ],
    (v) => { state.duration = v; refresh(); }
  ));

  view.appendChild(renderDateStep((v) => { state.tripDate = v; }));

  view.appendChild(continueBtn);
  container.appendChild(view);

  async function onContinue() {
    const name = await askPrompt({
      title: 'Name your list',
      body: 'Give this packing list a name.',
      placeholder: 'e.g. Italy Summer Trip',
      confirmLabel: 'Create'
    });
    if (!name) return;
    const now = Date.now();
    const list = {
      id: newId(),
      name,
      tripType: { destination: state.destination, duration: state.duration },
      tripDate: state.tripDate || null,
      finished: false,
      sections: generateList(state),
      createdAt: now,
      updatedAt: now
    };
    saveList(list);
    go('/list/' + list.id);
  }
}

function renderStep(key, heading, prompt, choices, onSelect) {
  const grid = el('div', { class: 'choice-grid' });
  choices.forEach(c => {
    grid.appendChild(el('button', {
      class: 'choice',
      dataset: { key, value: c.value },
      onclick: () => onSelect(c.value)
    },
      el('div', { class: 'choice-title' }, c.title),
      el('div', { class: 'choice-sub' }, c.sub)
    ));
  });
  return el('div', { class: 'setup-step' },
    el('h2', {}, heading),
    el('p', {}, prompt),
    grid
  );
}

function renderDateStep(onChange) {
  const input = el('input', {
    type: 'date',
    class: 'date-input',
    oninput: (e) => onChange(e.target.value || null)
  });
  return el('div', { class: 'setup-step' },
    el('h2', {}, 'Trip date'),
    el('p', {}, 'When are you leaving? (Optional)'),
    el('div', { class: 'date-row' }, input)
  );
}
