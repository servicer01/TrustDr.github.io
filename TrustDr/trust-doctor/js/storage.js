/* js/storage.js — session persistence (localStorage fallback) */

const TDStorage = (() => {

  /* Use the app's window.storage if available (Claude artifact env),
     otherwise fall back to localStorage for standalone deployment. */
  const useNative = typeof window.storage !== 'undefined' &&
                    typeof window.storage.set === 'function';

  async function set(key, value, shared = false) {
    try {
      if (useNative) return await window.storage.set(key, value, shared);
      const store = shared ? 'td_shared' : 'td_session';
      const bucket = JSON.parse(localStorage.getItem(store) || '{}');
      bucket[key] = value;
      localStorage.setItem(store, JSON.stringify(bucket));
    } catch (e) { console.warn('TDStorage.set failed:', e); }
  }

  async function get(key, shared = false) {
    try {
      if (useNative) return await window.storage.get(key, shared);
      const store = shared ? 'td_shared' : 'td_session';
      const bucket = JSON.parse(localStorage.getItem(store) || '{}');
      return bucket[key] != null ? { value: bucket[key] } : null;
    } catch (e) { return null; }
  }

  async function del(key, shared = false) {
    try {
      if (useNative) return await window.storage.delete(key, shared);
      const store = shared ? 'td_shared' : 'td_session';
      const bucket = JSON.parse(localStorage.getItem(store) || '{}');
      delete bucket[key];
      localStorage.setItem(store, JSON.stringify(bucket));
    } catch (e) {}
  }

  async function list(prefix = '', shared = false) {
    try {
      if (useNative) return await window.storage.list(prefix, shared);
      const store = shared ? 'td_shared' : 'td_session';
      const bucket = JSON.parse(localStorage.getItem(store) || '{}');
      const keys = Object.keys(bucket).filter(k => k.startsWith(prefix));
      return { keys };
    } catch (e) { return { keys: [] }; }
  }

  return { set, get, del, list };
})();

/* ─── Session save / load ─────────────────────────────────────────────── */

async function saveSession(S) {
  const payload = {
    g: S.g, needs: S.needs, custom: S.custom,
    parties: S.parties, assets: S.assets,
    stateLaw: S.stateLaw, rec: S.rec,
    scores: S.scores, warns: S.warns,
    step: S.step, generatedDoc: S.generatedDoc
  };
  await TDStorage.set('td_session_main', JSON.stringify(payload));
  showToast('Session saved');
}

async function loadSession(S, renderFn) {
  try {
    const r = await TDStorage.get('td_session_main');
    if (r && r.value) {
      Object.assign(S, JSON.parse(r.value));
      renderFn();
      showToast('Session loaded');
    } else {
      showToast('No saved session found');
    }
  } catch (e) {
    showToast('No saved session found');
  }
}
