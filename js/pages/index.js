// js/pages/index.js
import { getFullCache, setFullCache, getKeys, setKeys, exportProjectEncrypted, importProjectEncrypted, clearPagesData, clearEverything } from "../core/storage.js";
import { sha256Hex } from "../core/crypto.js";
import { nowStr } from "../core/time.js";

/* DOM */
const projectInput = document.getElementById('projectSigla');
const cryptoInput  = document.getElementById('cryptoKey');
const adminInput   = document.getElementById('adminKey');
const cryptoNote   = document.getElementById('cryptoNote');
const cryptoWarn   = document.getElementById('cryptoWarn');
const adminStatus  = document.getElementById('adminStatus');
const adminWarn    = document.getElementById('adminWarn');
const exportStatus = document.getElementById('exportStatus');

const btnSaveCrypto = document.getElementById('btnSaveCrypto');
const btnSaveAdmin  = document.getElementById('btnSaveAdmin');
const btnExport     = document.getElementById('btnExport');
const fileImport    = document.getElementById('fileImport');
const btnClearPages = document.getElementById('btnClearPages');
const btnClearAll   = document.getElementById('btnClearAll');

const reAlnum4to10 = /^[A-Za-z0-9]{4,10}$/;

function normalizeFilenameSigla(s){ return (s||'').trim().replace(/[^A-Za-z0-9]/g,''); }

/* ---------- PROJECT SIGLA ---------- */
function loadProjectMeta(){
  const cache = getFullCache();
  projectInput.value = cache.meta?.projectSigla || '';
}
function saveProjectSiglaAutos(){
  const raw = projectInput.value || '';
  const cache = getFullCache(); cache.meta = cache.meta || {}; cache.meta.projectSigla = raw; setFullCache(cache);
  exportStatus.textContent = '';
}
projectInput.addEventListener('input', saveProjectSiglaAutos);

/* ---------- UI update function for keys ---------- */
let adminMasked = false;
function updateKeyStatusUI(){
  const keys = getKeys();
  // crypto (user)
  if(keys.cryptoPlain){
    cryptoInput.value = keys.cryptoPlain;
    cryptoNote.textContent = `Chave de usuário salva: ${keys.cryptoPlain}`;
    cryptoNote.classList.remove('status-negative');
    cryptoNote.classList.add('status-positive');
  } else {
    cryptoInput.value = '';
    cryptoNote.textContent = 'Chave de usuário salva: NENHUMA (INFORME UMA CHAVE)';
    cryptoNote.classList.remove('status-positive');
    cryptoNote.classList.add('status-negative');
  }

  // admin
  if(keys.adminHash){
    adminStatus.textContent = 'Chave Administrativa: CONFIGURADA';
    adminStatus.classList.remove('status-negative');
    adminStatus.classList.add('status-positive');
    // mask admin input visual
    adminInput.value = '*****';
    adminMasked = true;
  } else {
    adminStatus.textContent = 'Chave Administrativa: NÃO CONFIGURADA';
    adminStatus.classList.remove('status-positive');
    adminStatus.classList.add('status-negative');
    adminInput.value = '';
    adminMasked = false;
  }
}

/* ---------- CRYPTO (user) ---------- */
async function saveCryptoKey(){
  cryptoWarn.textContent = ''; cryptoNote.textContent = '';
  const raw = (cryptoInput.value || '').trim();
  if(!reAlnum4to10.test(raw)){ cryptoWarn.textContent = 'A chave de usuário deve conter 4–10 caracteres (letras e/ou números).'; updateKeyStatusUI(); return; }
  const keys = getKeys();
  keys.cryptoPlain = raw;
  keys.cryptoHash = await sha256Hex(raw.toLowerCase());
  setKeys(keys);
  updateKeyStatusUI();
}

/* ---------- ADMIN (masking + save) ---------- */
adminInput.addEventListener('focus', () => {
  if(adminMasked){
    adminInput.value = '';
    adminMasked = false;
    adminWarn.textContent = '';
  }
});
async function saveAdminKey(){
  adminWarn.textContent = '';
  const raw = (adminInput.value || '').trim();

  // if field masked and empty -> no-op
  if(adminMasked && raw === ''){
    adminWarn.textContent = 'Senha administrativa permanece inalterada.';
    return;
  }
  if(!reAlnum4to10.test(raw)){
    adminWarn.textContent = 'A chave administrativa deve conter 4–10 caracteres (letras e/ou números).';
    return;
  }

  const keys = getKeys();
  if(keys.adminHash){
    const atual = prompt('Informe a senha ADMINISTRATIVA ATUAL (case-insensitive) para confirmar alteração:');
    if(atual === null) return;
    const check = await sha256Hex(atual.toLowerCase());
    if(check !== keys.adminHash){ alert('Senha atual incorreta. Alteração cancelada.'); return; }
  }

  const confirmNew = prompt('Confirme a NOVA senha administrativa (digite novamente):');
  if(confirmNew === null) return;
  if(confirmNew.toLowerCase() !== raw.toLowerCase()){ alert('As senhas não coincidem. Tente novamente.'); return; }

  keys.adminHash = await sha256Hex(raw.toLowerCase());
  setKeys(keys);
  adminInput.value = '*****';
  adminMasked = true;
  adminWarn.textContent = '✅ Chave administrativa salva.';
  updateKeyStatusUI();
}

/* ---------- Export / Import ---------- */
async function handleExport(){
  try{
    const filename = await exportProjectEncrypted();
    if (filename) exportStatus.textContent = `Arquivo exportado: ${filename} em ${nowStr()}.`;
  }catch(e){
    console.error(e);
    exportStatus.textContent = '❌ Falha na exportação.';
  }
}
async function handleImport(ev){
  const file = ev.target.files?.[0]; if(!file) return;
  try{
    const ok = await importProjectEncrypted(file);
    if(ok){ alert('✅ Importação concluída. Recarregue páginas para aplicar as alterações.'); }
  }catch(e){
    console.error(e);
    alert('❌ Arquivo inválido ou senha incorreta.');
  }finally{
    ev.target.value = '';
  }
}

/* ---------- Clear ---------- */
function clearLocalPages(){
  if(confirm('Isso apagará apenas os dados das páginas (Organização/Relacionamentos, etc.). Deseja continuar?')){
    clearPagesData();
    alert('🧹 Dados das páginas limpos.');
  }
}
function clearAll(){
  if(confirm('Esta ação apagará dados e chaves. Deseja continuar?')){
    clearEverything();
    alert('🗑️ Tudo apagado. Recarregue a página.');
    location.reload();
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  loadProjectMeta();
  updateKeyStatusUI();
  exportStatus.textContent = '';

  btnSaveCrypto?.addEventListener('click', saveCryptoKey);
  btnSaveAdmin?.addEventListener('click', saveAdminKey);
  btnExport?.addEventListener('click', handleExport);
  fileImport?.addEventListener('change', handleImport);
  btnClearPages?.addEventListener('click', clearLocalPages);
  btnClearAll?.addEventListener('click', clearAll);
});
