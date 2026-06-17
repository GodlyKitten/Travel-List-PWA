// Smoke test for pure-logic modules in Node.
// Polyfills localStorage, crypto, btoa/atob, then runs end-to-end flows.
import { webcrypto } from 'node:crypto';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};
globalThis.window = { crypto: webcrypto, dispatchEvent: () => {}, CustomEvent: class {} };
globalThis.CustomEvent = class { constructor(name) { this.name = name; } };
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const state = await import('../src/state.js');
const tpl = await import('../src/templates.js');
const dfmt = await import('../src/datefmt.js');
const share = await import('../src/share.js');

let passes = 0, fails = 0;
function assert(name, cond, detail = '') {
  if (cond) { passes++; console.log('  PASS', name); }
  else { fails++; console.error('  FAIL', name, detail); }
}

console.log('\n--- Templates: International + Long ---');
const intl = tpl.generateList({ destination: 'international', duration: 'long' });
const intlText = intl.flatMap(s => s.items.map(i => i.text));
assert('has Passport', intlText.includes('Passport'));
assert('has Travel adapter', intlText.includes('Travel adapter'));
assert('has Laundry bag', intlText.includes('Laundry bag'));
assert('no x3/x7 anywhere', !intlText.some(t => /\(x\d+\)/.test(t)));

console.log('\n--- Templates: Domestic + Short ---');
const dom = tpl.generateList({ destination: 'domestic', duration: 'short' });
const domText = dom.flatMap(s => s.items.map(i => i.text));
assert('no Passport', !domText.includes('Passport'));
assert('no Laundry bag', !domText.includes('Laundry bag'));

console.log('\n--- Save / load with new fields ---');
const list = {
  id: state.newId(),
  name: 'Italy Summer Trip',
  tripType: { destination: 'international', duration: 'long' },
  tripDate: '2026-08-15',
  finished: false,
  hidePacked: false,
  collapsed: {},
  sections: intl,
  createdAt: Date.now(),
  updatedAt: Date.now()
};
assert('saveList succeeds', state.saveList(list) === true);
list.hidePacked = true;
list.collapsed['Clothes'] = true;
state.saveList(list);
const loaded = state.getList(list.id);
assert('hidePacked round-trips', loaded.hidePacked === true);
assert('collapsed round-trips', loaded.collapsed.Clothes === true);
assert('tripDate round-trips', loaded.tripDate === '2026-08-15');
assert('finished=false round-trips', loaded.finished === false);

console.log('\n--- Reorder items ---');
const clothes = loaded.sections.find(s => s.name === 'Clothes');
const originalOrder = clothes.items.map(i => i.text);
const [first] = clothes.items.splice(0, 1);
clothes.items.splice(2, 0, first);
state.saveList(loaded);
const reordered = state.getList(loaded.id).sections.find(s => s.name === 'Clothes');
assert('reorder persists', reordered.items.map(i => i.text)[2] === originalOrder[0]);
assert('reorder preserves item count', reordered.items.length === originalOrder.length);

console.log('\n--- Reset wipes customs + unchecks generated ---');
loaded.sections.find(s => s.name === 'Extras').items.push({
  id: state.newId(), text: 'Hiking boots', checked: false, custom: true
});
loaded.sections.find(s => s.name === 'Documents').items.find(i => i.text === 'Passport').checked = true;
state.saveList(loaded);
const before = state.getList(loaded.id);
before.sections = tpl.resetGeneratedItems(before);
assert('Hiking boots removed', before.sections.find(s => s.name === 'Extras').items.length === 0);
assert('Passport unchecked', before.sections.find(s => s.name === 'Documents').items.find(i => i.text === 'Passport').checked === false);

console.log('\n--- datefmt: dayDiff + countdownLabel + groupForDate ---');
function today() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function isoOffset(days) {
  const d = today();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
assert('dayDiff today=0', dfmt.dayDiff(isoOffset(0)) === 0);
assert('dayDiff tomorrow=1', dfmt.dayDiff(isoOffset(1)) === 1);
assert('dayDiff yesterday=-1', dfmt.dayDiff(isoOffset(-1)) === -1);
assert('dayDiff +5=5', dfmt.dayDiff(isoOffset(5)) === 5);
assert('dayDiff null', dfmt.dayDiff(null) === null);
assert('dayDiff garbage', dfmt.dayDiff('not-a-date') === null);

assert('label Today', dfmt.countdownLabel(isoOffset(0)) === 'Today');
assert('label Tomorrow', dfmt.countdownLabel(isoOffset(1)) === 'Tomorrow');
assert('label Yesterday', dfmt.countdownLabel(isoOffset(-1)) === 'Yesterday');
assert('label in 3 days', dfmt.countdownLabel(isoOffset(3)) === 'in 3 days');
assert('label 3 days ago', dfmt.countdownLabel(isoOffset(-3)) === '3 days ago');
assert('label null', dfmt.countdownLabel(null) === null);

assert('group upcoming', dfmt.groupForDate(isoOffset(5)) === 'upcoming');
assert('group today is upcoming', dfmt.groupForDate(isoOffset(0)) === 'upcoming');
assert('group past', dfmt.groupForDate(isoOffset(-5)) === 'past');
assert('group none', dfmt.groupForDate(null) === 'none');

console.log('\n--- Export + Import round-trip ---');
// Reload list as the canonical state-of-truth before export
const beforeExport = state.listAll();
assert('listAll has 1 list pre-export', beforeExport.length === 1);

// Simulate exportAll by hand (we can't trigger DOM download in Node)
const exportPayload = { version: 1, exportedAt: new Date().toISOString(), lists: beforeExport };
const fakeFile = {
  text: async () => JSON.stringify(exportPayload)
};
const parsed = await share.parseImport(fakeFile);
assert('parseImport returns correct count', parsed.count === 1);

// Wipe state to simulate fresh install
store.clear();
assert('listAll empty after wipe', state.listAll().length === 0);

parsed.save();
const restored = state.listAll();
assert('imported list count = 1', restored.length === 1);
assert('imported name matches', restored[0].name === beforeExport[0].name);
assert('imported tripDate matches', restored[0].tripDate === beforeExport[0].tripDate);
assert('imported list has new ID (no collision)', restored[0].id !== beforeExport[0].id);
const origItemIds = new Set(beforeExport[0].sections.flatMap(s => s.items.map(i => i.id)));
const newItemIds = restored[0].sections.flatMap(s => s.items.map(i => i.id));
assert('all imported item IDs are new', newItemIds.every(id => !origItemIds.has(id)));

console.log('\n--- parseImport rejects bad data ---');
try {
  await share.parseImport({ text: async () => '{}' });
  assert('rejects empty object', false);
} catch (e) { assert('rejects empty object', /Not a Pack backup/.test(e.message)); }

try {
  await share.parseImport({ text: async () => 'not json' });
  assert('rejects bad JSON', false);
} catch (e) { assert('rejects bad JSON', /not valid JSON/.test(e.message)); }

try {
  await share.parseImport({ text: async () => '{"lists":[]}' });
  assert('rejects empty list array', false);
} catch (e) { assert('rejects empty list array', /No valid lists/.test(e.message)); }

console.log('\n--- Share encode/decode round-trip ---');
// Make a fresh list to share
store.clear();
const shareSource = {
  id: state.newId(),
  name: 'Switzerland Day Trip',
  tripType: { destination: 'international', duration: 'short' },
  tripDate: '2026-07-20',
  finished: true,
  sections: [
    { name: 'Documents', items: [{ id: 'a', text: 'Passport', checked: true, custom: false }] },
    { name: 'Extras',    items: [{ id: 'b', text: 'Hiking boots', checked: false, custom: true }] }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};
const encoded = share.encodeListForShare(shareSource);
assert('encoded is non-empty', encoded.length > 0);
assert('encoded is base64url (no +,/,=)', !/[+/=]/.test(encoded));

const decoded = share.decodeSharedList(encoded);
assert('decoded name matches', decoded.name === shareSource.name);
assert('decoded tripDate matches', decoded.tripDate === shareSource.tripDate);
assert('decoded section count matches', decoded.sections.length === shareSource.sections.length);
assert('decoded preserves custom flag', decoded.sections.find(s => s.name === 'Extras').items[0].custom === true);

const saved = share.saveSharedList(decoded);
assert('shared save gets new ID', saved.id !== shareSource.id);
assert('shared save is finished=true', saved.finished === true);
assert('shared save items are unchecked', saved.sections.every(s => s.items.every(i => i.checked === false)));
assert('shared save items have new IDs', saved.sections.flatMap(s => s.items.map(i => i.id)).every(id => id !== 'a' && id !== 'b'));

console.log('\n--- Share decode rejects invalid ---');
try { share.decodeSharedList('not-base64-anything!!'); assert('rejects gibberish', false); }
catch { assert('rejects gibberish', true); }

console.log('\n--- Achievements ---');
const ach = await import('../src/achievements.js');

// Fresh state
store.clear();
const blank = ach.getState();
assert('fresh state has no unlocks', Object.keys(blank.unlocked).length === 0);
assert('fresh state has zeroed counters', blank.counters.customsAdded === 0 && blank.counters.exports === 0);
assert('totalCount matches catalog', ach.totalCount() === ach.ACHIEVEMENTS.length);

// State-based: first_list fires when there's a list
store.clear();
state.saveList({
  id: state.newId(), name: 'A', tripType: { destination: 'domestic', duration: 'short' },
  sections: [{ name: 'Documents', items: [] }],
  createdAt: Date.now(), updatedAt: Date.now()
});
ach.evaluate();
assert('first_list unlocked after 1 saved list', ach.isUnlocked('first_list'));
assert('five_lists not unlocked yet', !ach.isUnlocked('five_lists'));

// idempotent
const again = ach.evaluate();
assert('evaluate is idempotent', again.length === 0);

// Five lists
for (let i = 0; i < 4; i++) {
  state.saveList({
    id: state.newId(), name: 'L' + i, tripType: { destination: 'domestic', duration: 'short' },
    sections: [{ name: 'X', items: [] }],
    createdAt: Date.now(), updatedAt: Date.now()
  });
}
ach.evaluate();
assert('five_lists unlocked at 5', ach.isUnlocked('five_lists'));
assert('ten_lists still locked', !ach.isUnlocked('ten_lists'));

// International + globetrotter (need 3 international total)
store.clear();
for (let i = 0; i < 3; i++) {
  state.saveList({
    id: state.newId(), name: 'I' + i, tripType: { destination: 'international', duration: 'short' },
    sections: [{ name: 'X', items: [] }],
    createdAt: Date.now(), updatedAt: Date.now()
  });
}
ach.evaluate();
assert('first_international unlocked', ach.isUnlocked('first_international'));
assert('globetrotter unlocked at 3 intl', ach.isUnlocked('globetrotter'));

// Completionist: list with all items checked
store.clear();
state.saveList({
  id: state.newId(), name: 'Packed', tripType: { destination: 'domestic', duration: 'short' },
  sections: [{ name: 'X', items: [{ id: 'a', text: 'Item', checked: true, custom: false }] }],
  createdAt: Date.now(), updatedAt: Date.now()
});
ach.evaluate();
assert('completionist unlocked', ach.isUnlocked('completionist'));

// Counter-based: custom items
store.clear();
ach.bumpCounter('customsAdded', 1);
assert('first_custom_item unlocked at 1', ach.isUnlocked('first_custom_item'));
assert('centurion still locked at 1', !ach.isUnlocked('centurion'));
ach.bumpCounter('customsAdded', 99);
assert('centurion unlocked at 100', ach.isUnlocked('centurion'));

// Counter persistence
const afterBump = ach.getState();
assert('counter persisted', afterBump.counters.customsAdded === 100);

// Share / export / import counters
store.clear();
ach.bumpCounter('sharesLink', 1);
assert('first_share unlocked', ach.isUnlocked('first_share'));
ach.bumpCounter('exports', 1);
assert('first_export unlocked', ach.isUnlocked('first_export'));
ach.bumpCounter('imports', 1);
assert('first_import unlocked', ach.isUnlocked('first_import'));

// Hide-packed and reorder
ach.bumpCounter('hidePackedToggles', 1);
assert('first_hide_packed unlocked', ach.isUnlocked('first_hide_packed'));
ach.bumpCounter('reorders', 1);
assert('first_reorder unlocked', ach.isUnlocked('first_reorder'));

// Unknown counter is a no-op
const beforeUnknown = ach.getState();
ach.bumpCounter('nope', 5);
const afterUnknown = ach.getState();
assert('unknown counter ignored', JSON.stringify(beforeUnknown.counters) === JSON.stringify(afterUnknown.counters));

// Timestamp preservation across re-evaluation
const t1 = ach.getState().unlocked.first_share;
ach.evaluate();
const t2 = ach.getState().unlocked.first_share;
assert('unlocked timestamp preserved', t1 === t2);

console.log(`\nResults: ${passes} passed, ${fails} failed`);
process.exit(fails === 0 ? 0 : 1);
