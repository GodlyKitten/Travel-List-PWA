const INDEX_KEY = 'pack:index';
const LIST_PREFIX = 'pack:list:';

let quotaWarned = false;

function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    if (!quotaWarned) {
      quotaWarned = true;
      console.warn('Pack: localStorage write failed (private mode or quota).', err);
      window.dispatchEvent(new CustomEvent('pack:storage-error'));
    }
    return false;
  }
}

function getIndex() {
  const parsed = safeParse(localStorage.getItem(INDEX_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

function setIndex(ids) {
  safeWrite(INDEX_KEY, ids);
}

export function newId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getList(id) {
  const raw = localStorage.getItem(LIST_PREFIX + id);
  if (!raw) return null;
  return safeParse(raw);
}

export function listAll() {
  const ids = getIndex();
  const lists = [];
  const liveIds = [];
  for (const id of ids) {
    const list = getList(id);
    if (list) {
      lists.push(list);
      liveIds.push(id);
    }
  }
  if (liveIds.length !== ids.length) setIndex(liveIds);
  lists.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return lists;
}

export function saveList(list) {
  if (!list || !list.id) throw new Error('saveList: list.id required');
  list.updatedAt = Date.now();
  const ok = safeWrite(LIST_PREFIX + list.id, list);
  if (!ok) return false;
  const ids = getIndex();
  if (!ids.includes(list.id)) {
    ids.unshift(list.id);
    setIndex(ids);
  }
  return true;
}

export function deleteList(id) {
  localStorage.removeItem(LIST_PREFIX + id);
  setIndex(getIndex().filter(x => x !== id));
}

export function duplicateList(id, newName) {
  const src = getList(id);
  if (!src) return null;
  const now = Date.now();
  const copy = {
    id: newId(),
    name: newName || (src.name + ' (copy)'),
    tripType: { ...src.tripType },
    finished: true,
    sections: src.sections.map(s => ({
      name: s.name,
      items: s.items.map(it => ({
        id: newId(),
        text: it.text,
        checked: it.checked,
        custom: it.custom
      }))
    })),
    createdAt: now,
    updatedAt: now
  };
  saveList(copy);
  return copy;
}

export function progress(list) {
  let done = 0, total = 0;
  for (const s of list.sections) {
    for (const it of s.items) {
      total++;
      if (it.checked) done++;
    }
  }
  return { done, total };
}
