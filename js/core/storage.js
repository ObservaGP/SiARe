// js/core/storage.js
import { encryptJSON, decryptJSON, normalizeKey, reAlnum4to10 } from './crypto.js';
import { getAllPagesSnapshot, setAllPagesSnapshot, loadUISizes, saveUISizes, getLegacyCache, setLegacyCache, clearAllPagesData, clearUISizes } from './cache.js';

/* Chaves de armazenamento de chaves */
export const CACHE_KEY = 'statusproj_cache';   // legado (meta)
export const KEYS_KEY  = 'statusproj_keys';    // chaves de usuário/admin

/* Cache (meta legado — apenas para sigla, timestamp, etc.) */
export function getFullCache(){
  try{ return JSON.parse(localStorage.getItem(CACHE_KEY)) || { meta:{}, pages:{} }; }
  catch(e){ return { meta:{}, pages:{} }; }
}
export function setFullCache(obj){
  localStorage.setItem(CACHE_KEY, JSON.stringify(obj || { meta:{}, pages:{} }));
}

/* Chaves (usuário/admin) */
export function getKeys(){
  try{ return JSON.parse(localStorage.getItem(KEYS_KEY)) || {}; }
  catch(e){ return {}; }
}
export function setKeys(obj){
  localStorage.setItem(KEYS_KEY, JSON.stringify(obj || {}));
}

/* ===== Exportar/Importar criptografado (.spj) ===== */
function pad(n){ return String(n).padStart(2,'0'); }
function buildFilename(sigla){
  const d = new Date();
  const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const sig = (sigla || 'NOSIGLA').toUpperCase().replace(/[^A-Z0-9]/g,'');
  return `statusproj_export_${sig}_${ts}.spj`;
}

function currentSigla(){
  // tenta do meta legado
  const cache = getLegacyCache();
  return (cache?.meta?.projectSigla || '').trim();
}

export async function exportProjectEncrypted(){
  const keys = getKeys();
  let password = keys.cryptoPlain || '';
  if (!reAlnum4to10.test(password || '')) {
    const p = prompt('Informe a CHAVE DE USUÁRIO (4–10 letras/números) para criptografar:');
    if (p === null) return;
    if (!reAlnum4to10.test(p)) { alert('Chave inválida.'); return; }
    password = p;
  }
  const passNorm = normalizeKey(password);

  // monta estado completo
  const state = {
    meta: { projectSigla: currentSigla(), exportedAt: new Date().toISOString() },
    pages: getAllPagesSnapshot(),
    ui: { sizes: loadUISizes() }
  };

  const pkg = await encryptJSON(state, passNorm);
  const blob = new Blob([JSON.stringify(pkg, null, 2)], {type:'application/json'});
  const name = buildFilename(state.meta.projectSigla);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
  return name;
}

export async function importProjectEncrypted(file){
  const text = await file.text();
  const obj = JSON.parse(text);

  const isEncrypted = !!(obj && obj.ct && obj.iv && obj.salt);
  let state;

  if (isEncrypted) {
    const keys = getKeys();
    let password = keys.cryptoPlain || '';
    if (!reAlnum4to10.test(password || '')) {
      const p = prompt('Arquivo criptografado. Informe a CHAVE DE USUÁRIO:');
      if (p === null) return false;
      if (!reAlnum4to10.test(p)) { alert('Chave inválida.'); return false; }
      password = p;
    }
    state = await decryptJSON(obj, normalizeKey(password));
  } else {
    // compatibilidade com JSON aberto
    state = obj;
  }

  // aplica
  if (state?.pages) setAllPagesSnapshot(state.pages);
  if (state?.ui?.sizes) saveUISizes(state.ui.sizes);

  // meta legado para sigla/extras
  const legacy = getLegacyCache();
  legacy.meta = { ...(legacy.meta||{}), ...(state?.meta||{}) };
  setLegacyCache(legacy);

  return true;
}

/* ===== Limpezas (botões do Index) ===== */
export function clearPagesData(){
  clearAllPagesData();
}
export function clearEverything(){
  localStorage.removeItem(KEYS_KEY);
  localStorage.removeItem(CACHE_KEY);
  clearAllPagesData();
  clearUISizes();
}
