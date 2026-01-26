// js/core/cache.js

// Namespace por página
const PAGES_NS = 'statusproj:page:';
const UI_SIZES_KEY = 'statusproj:ui:sizes';

/* ===== Página corrente ===== */
function currentPageKey() {
  const k = (document.body?.dataset?.page || '').trim();
  return k ? k.toLowerCase() : 'inicio';
}

/* ===== Persistência por Página ===== */
export function savePageData(data, page = currentPageKey()) {
  localStorage.setItem(PAGES_NS + page, JSON.stringify(data || null));
}
export function loadPageData(page = currentPageKey()) {
  try { return JSON.parse(localStorage.getItem(PAGES_NS + page)); }
  catch(e){ return null; }
}
export function enableAutoSave(serializeFn, debounceMs = 500) {
  let t;
  const handler = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      try {
        const data = serializeFn();
        savePageData(data);
      } catch (e) { console.error('AutoSave error:', e); }
    }, debounceMs);
  };
  document.addEventListener('input', handler);
  document.addEventListener('change', handler);
}

/* ===== Snapshot de TODAS as páginas (para export/import) ===== */
export function getAllPagesSnapshot() {
  const snapshot = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PAGES_NS)) {
      const page = k.slice(PAGES_NS.length);
      try { snapshot[page] = JSON.parse(localStorage.getItem(k)); } catch { /* ignore */ }
    }
  }
  return snapshot;
}
export function setAllPagesSnapshot(snapshot) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PAGES_NS)) localStorage.removeItem(k);
  }
  Object.entries(snapshot || {}).forEach(([page, data]) => {
    localStorage.setItem(PAGES_NS + page, JSON.stringify(data || null));
  });
}

/* ===== UI sizes (w/h por elemento) ===== */
export function loadUISizes(){
  try { return JSON.parse(localStorage.getItem(UI_SIZES_KEY)) || {}; }
  catch { return {}; }
}
export function saveUISizes(map){
  localStorage.setItem(UI_SIZES_KEY, JSON.stringify(map || {}));
}
export function setUISize(id, partial){
  const map = loadUISizes();
  const prev = map[id] || {};
  map[id] = { ...prev, ...partial };  // mescla {w,h}
  saveUISizes(map);
}
export function getUISize(id){
  const map = loadUISizes();
  return map[id] || null;
}

/* ===== Compat meta legado para nome do arquivo etc. ===== */
const LEGACY_CACHE_KEY = 'statusproj_cache';
export function getLegacyCache(){
  try{ return JSON.parse(localStorage.getItem(LEGACY_CACHE_KEY)) || { meta:{}, pages:{} }; }
  catch(e){ return { meta:{}, pages:{} }; }
}
export function setLegacyCache(obj){
  localStorage.setItem(LEGACY_CACHE_KEY, JSON.stringify(obj || { meta:{}, pages:{} }));
}

/* ===== Limpeza utilitária ===== */
export function clearAllPagesData(){
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && (k.startsWith(PAGES_NS))) localStorage.removeItem(k);
  }
}
export function clearUISizes(){
  localStorage.removeItem(UI_SIZES_KEY);
}
