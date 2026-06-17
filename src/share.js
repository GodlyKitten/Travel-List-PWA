import { listAll, saveList, newId } from './state.js';
import { el } from './ui.js';

const SCHEMA_VERSION = 1;

function toBase64Url(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(b64url) {
  const pad = '='.repeat((4 - b64url.length % 4) % 4);
  return b64url.replace(/-/g, '+').replace(/_/g, '/') + pad;
}

function utf8Btoa(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function utf8Atob(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

// ---------- Export ----------
export function exportAll() {
  const lists = listAll();
  const payload = {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    lists
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pack-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return lists.length;
}

// ---------- Import ----------
export async function parseImport(file) {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('File is not valid JSON.'); }

  if (!data || typeof data !== 'object' || !Array.isArray(data.lists)) {
    throw new Error('Not a Pack backup file.');
  }

  const valid = data.lists.filter(l =>
    l && typeof l.name === 'string' && Array.isArray(l.sections)
  );
  if (valid.length === 0) throw new Error('No valid lists in the file.');

  return {
    count: valid.length,
    save: () => {
      for (const src of valid) {
        const now = Date.now();
        const copy = {
          id: newId(),
          name: src.name,
          tripType: src.tripType || {},
          tripDate: src.tripDate || null,
          finished: src.finished !== false,
          hidePacked: !!src.hidePacked,
          collapsed: src.collapsed || {},
          createdAt: now,
          updatedAt: now,
          sections: (src.sections || []).map(s => ({
            name: String(s.name || ''),
            items: (s.items || []).map(it => ({
              id: newId(),
              text: String(it.text || ''),
              checked: !!it.checked,
              custom: !!it.custom
            }))
          }))
        };
        saveList(copy);
      }
    }
  };
}

// ---------- Share via URL ----------
export function encodeListForShare(list) {
  const payload = {
    v: SCHEMA_VERSION,
    name: list.name,
    tripType: list.tripType,
    tripDate: list.tripDate || null,
    sections: list.sections.map(s => ({
      name: s.name,
      items: s.items.map(it => ({
        text: it.text,
        custom: !!it.custom
      }))
    }))
  };
  return toBase64Url(utf8Btoa(JSON.stringify(payload)));
}

export function decodeSharedList(encoded) {
  let json;
  try { json = utf8Atob(fromBase64Url(encoded)); }
  catch { throw new Error('Invalid share link.'); }
  let data;
  try { data = JSON.parse(json); }
  catch { throw new Error('Invalid share link.'); }
  if (!data || typeof data.name !== 'string' || !Array.isArray(data.sections)) {
    throw new Error('Invalid share link.');
  }
  return data;
}

export function saveSharedList(payload, nameOverride) {
  const now = Date.now();
  const list = {
    id: newId(),
    name: nameOverride || payload.name,
    tripType: payload.tripType || {},
    tripDate: payload.tripDate || null,
    finished: true,
    sections: (payload.sections || []).map(s => ({
      name: String(s.name || ''),
      items: (s.items || []).map(it => ({
        id: newId(),
        text: String(it.text || ''),
        checked: false,
        custom: !!it.custom
      }))
    })),
    createdAt: now,
    updatedAt: now
  };
  saveList(list);
  return list;
}

export function buildShareUrl(encoded) {
  return `${location.origin}${location.pathname}#/share/${encoded}`;
}

// ---------- Share modal ----------
export function openShareModal(list) {
  const encoded = encodeListForShare(list);
  const url = buildShareUrl(encoded);
  const tooLong = encoded.length > 8000;

  return new Promise(resolve => {
    let resolved = false;
    const close = () => {
      if (resolved) return;
      resolved = true;
      if (backdrop.parentNode) backdrop.remove();
      resolve();
    };

    const urlInput = el('input', {
      class: 'modal-input share-url',
      type: 'text',
      value: url,
      readonly: true,
      onclick: (e) => e.target.select()
    });

    const copyBtn = el('button', { class: 'btn-primary' }, 'Copy link');
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        const original = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = original; }, 1200);
      } catch {
        urlInput.select();
      }
    };

    const actions = [
      el('button', { class: 'btn-secondary', onclick: close }, 'Close'),
      copyBtn
    ];
    if (typeof navigator.share === 'function') {
      const shareBtn = el('button', { class: 'btn-secondary' }, 'Share…');
      shareBtn.onclick = async () => {
        try {
          await navigator.share({ title: list.name, url });
        }
        catch { /* user cancelled */ }
      };
      actions.splice(1, 0, shareBtn);
    }

    const dialog = el('div', { class: 'modal', role: 'dialog' },
      el('h3', {}, 'Share via link'),
      el('p', {}, 'Anyone with this link can save a copy of this list.'),
      urlInput,
      tooLong
        ? el('p', { class: 'modal-warning' },
            'This list is large — some apps may truncate the link.')
        : null,
      el('div', { class: 'modal-actions modal-actions-share' }, actions)
    );

    const backdrop = el('div', {
      class: 'modal-backdrop',
      onclick: (e) => { if (e.target === backdrop) close(); }
    }, dialog);
    document.body.appendChild(backdrop);
  });
}
