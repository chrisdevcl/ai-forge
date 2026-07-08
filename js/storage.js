/* ── storage.js ── IndexedDB wrapper (idb v8) ────────────── */

const storage = (() => {
  let _db = null;

  async function init() {
    _db = await idb.openDB('ai-forge', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bm = db.createObjectStore('bookmarks', { keyPath: 'id' });
          bm.createIndex('savedAt', 'savedAt');
        }
        if (!db.objectStoreNames.contains('prompt-history')) {
          const ph = db.createObjectStore('prompt-history', {
            keyPath: 'id', autoIncrement: true,
          });
          ph.createIndex('savedAt', 'savedAt');
        }
        if (!db.objectStoreNames.contains('read-cards')) {
          db.createObjectStore('read-cards', { keyPath: 'id' });
        }
      },
    });
  }

  // ── Settings ──────────────────────────────────────────────
  async function getSetting(key) {
    const record = await _db.get('settings', key);
    return record ? record.value : null;
  }

  async function setSetting(key, value) {
    await _db.put('settings', { key, value });
  }

  // ── Bookmarks ─────────────────────────────────────────────
  async function getBookmarkedIds() {
    const all = await _db.getAll('bookmarks');
    return new Set(all.map(b => b.id));
  }

  async function addBookmark(cardId) {
    await _db.put('bookmarks', { id: cardId, savedAt: new Date() });
  }

  async function removeBookmark(cardId) {
    await _db.delete('bookmarks', cardId);
  }

  // ── Prompt history ────────────────────────────────────────
  async function getPromptHistory() {
    const all = await _db.getAllFromIndex('prompt-history', 'savedAt');
    // Newest first, max 5
    return all.reverse().slice(0, 5);
  }

  async function savePrompt(promptObj) {
    await _db.add('prompt-history', { ...promptObj, savedAt: new Date() });
    // Prune: keep only the 5 most recent
    const all = await _db.getAllFromIndex('prompt-history', 'savedAt');
    if (all.length > 5) {
      const toDelete = all.slice(0, all.length - 5);
      await Promise.all(toDelete.map(item => _db.delete('prompt-history', item.id)));
    }
  }

  async function deletePrompt(id) {
    await _db.delete('prompt-history', id);
  }

  // ── Read progress ─────────────────────────────────────────
  async function getReadIds() {
    const all = await _db.getAll('read-cards');
    return new Set(all.map(r => r.id));
  }

  async function markRead(cardId) {
    await _db.put('read-cards', { id: cardId, readAt: new Date() });
  }

  return {
    init,
    getSetting, setSetting,
    getBookmarkedIds, addBookmark, removeBookmark,
    getPromptHistory, savePrompt, deletePrompt,
    getReadIds, markRead,
  };
})();
