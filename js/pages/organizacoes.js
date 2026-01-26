// js/pages/organizacoes.js
import { getKeys } from "../core/storage.js";
import { sha256Hex, normalizeKey } from "../core/crypto.js";
import { savePageData, loadPageData, enableAutoSave, setUISize, loadUISizes } from "../core/cache.js";
import { nowStr } from "../core/time.js";

/* DOM */
const container    = document.getElementById('versionContainer');
const btnNew       = document.getElementById('btnNewVersion');
const btnManual    = document.getElementById('btnManualSave');
const saveStatusEl = document.getElementById('saveStatusTop');

/* Utils */
function uid(){ return Date.now().toString(36) + Math.random().toString(36).substring(2,8); }

/* Auto-grow textarea */
function autoGrow(el){
  if (!(el instanceof HTMLTextAreaElement)) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/* IDs estáveis */
function fieldId(blockId, rowRid, field){ return `org:${blockId}:${rowRid}:${field}`; }
function cellId(blockId, rowRid, field){ return `org:${blockId}:${rowRid}:${field}:cell`; }

/* Linha */
function createRow(rid = uid()){
  const tr = document.createElement('tr');
  tr.dataset.rid = rid;
  tr.innerHTML = `
    <td><button class="line-btn btn-add"  type="button">+</button></td>

    <td><div class="cell resizable"><textarea name="nome" rows="1" placeholder="Nome"></textarea></div></td>
    <td><div class="cell"><input name="sigla" placeholder="Sigla"></div></td>
    <td><div class="cell"><input name="tipo" placeholder="Tipo"></div></td>
    <td><div class="cell"><input name="nome_fantasia" placeholder="Nome Fantasia"></div></td>
    <td><div class="cell"><input name="cnpj" placeholder="00.000.000/0000-00"></div></td>
    <td><div class="cell"><input name="area_atuacao" placeholder="Área de Atuação"></div></td>
    <td><div class="cell"><input name="porte" placeholder="Porte"></div></td>
    <td><div class="cell resizable"><textarea name="observacoes" rows="1" placeholder="Observações"></textarea></div></td>

    <td><button class="line-btn btn-del" type="button">−</button></td>`;
  return tr;
}

/* Bloco versão */
function createVersionBlock(id = uid()){
  const block = document.createElement('section');
  block.className = 'version-block section-box';
  block.dataset.uid = id;
  block.innerHTML = `
    <div class="version-header" style="display:flex; gap:.8rem; justify-content:space-between; align-items:center; margin-bottom:.6rem;">
      <div class="version-left" style="display:flex; flex-wrap:wrap; gap:.5rem; align-items:center;">
        <label>Versão:</label><input class="versao" placeholder="1.0" style="width:90px;">
        <label>Aditivo:</label><input class="aditivo" placeholder="0" style="width:70px;">
        <label>Chancela:</label><span class="chancela-status" style="padding:.25rem .5rem; border-radius:6px; background:#eef3f6; color:#233D4D;">Não solicitada</span>
        <button class="btn-icon btn-approve" title="Aprovar" type="button">✔</button>
        <button class="btn-icon btn-delete"  title="Excluir Versão" type="button">✖</button>
      </div>
      <div class="version-right" style="display:flex; gap:.5rem;">
        <button class="btn primary"   data-action="new-below" type="button">+ Criar Nova Versão</button>
        <button class="btn secondary" data-action="copy"      type="button">Copiar conteúdo</button>
        <button class="btn" data-action="request" type="button">Solicitar Chancela</button>
      </div>
    </div>
    <div class="table-wrapper">
      <table class="orgTable">
        <thead>
          <tr>
            <th></th><th>Nome</th><th>Sigla</th><th>Tipo</th><th>Nome Fantasia</th>
            <th>CNPJ</th><th>Área de Atuação</th><th>Porte</th><th>Observações</th><th></th>
          </tr>
        </thead>
        <tbody>${createRow().outerHTML}</tbody>
      </table>
    </div>`;
  return block;
}

/* Serialização / Aplicação */
function isBlockBlocked(block){
  const any = block.querySelector('input,textarea');
  if(!any) return false;
  return Array.from(block.querySelectorAll('input,textarea')).some(e => e.readOnly === true);
}

function serializePage(){
  const pages = [];
  container.querySelectorAll('.version-block').forEach(block=>{
    const obj = {
      id: block.dataset.uid,
      versao: block.querySelector('.versao').value || '',
      aditivo: block.querySelector('.aditivo').value || '',
      chancela: block.querySelector('.chancela-status').textContent || 'Não solicitada',
      bloqueado: isBlockBlocked(block),
      linhas: []
    };
    block.querySelectorAll('tbody tr').forEach(tr=>{
      const row = { _rid: tr.dataset.rid || uid() };
      tr.querySelectorAll('input,textarea').forEach(el => row[el.name] = el.value);
      obj.linhas.push(row);
    });
    pages.push(obj);
  });
  return pages;
}

function applyPage(data){
  if(!Array.isArray(data)) return;
  container.innerHTML = '';
  const uiSizes = loadUISizes();

  data.forEach(v=>{
    const b = createVersionBlock(v.id || uid());
    b.querySelector('.versao').value = v.versao || '';
    b.querySelector('.aditivo').value = v.aditivo || '';
    const el = b.querySelector('.chancela-status');
    el.textContent = v.chancela || 'Não solicitada';
    if(v.chancela === 'Solicitada'){ el.style.background = '#fff3cd'; el.style.color = '#856404'; }
    if(v.chancela === 'Aprovada'){ el.style.background = '#d4edda'; el.style.color = '#155724'; }

    const tbody = b.querySelector('tbody');
    tbody.innerHTML = '';
    (Array.isArray(v.linhas) ? v.linhas : []).forEach(rowData => {
      const rid = rowData._rid || uid();
      const r = createRow(rid);
      r.querySelectorAll('input,textarea').forEach(el => { el.value = rowData[el.name] || ''; });

      // IDs e tamanhos (textarea altura; wrapper .cell largura)
      const nomeTa = r.querySelector('textarea[name="nome"]');
      const obsTa  = r.querySelector('textarea[name="observacoes"]');
      const nomeCell = nomeTa?.closest('.cell');
      const obsCell  = obsTa?.closest('.cell');

      if (nomeTa) {
        nomeTa.id = fieldId(b.dataset.uid, rid, 'nome');
        const s = uiSizes[nomeTa.id]; if (s?.h) nomeTa.style.height = s.h;
        autoGrow(nomeTa);
      }
      if (obsTa) {
        obsTa.id  = fieldId(b.dataset.uid, rid, 'obs');
        const s = uiSizes[obsTa.id]; if (s?.h) obsTa.style.height = s.h;
        autoGrow(obsTa);
      }
      if (nomeCell) {
        nomeCell.id = cellId(b.dataset.uid, rid, 'nome');
        const s = uiSizes[nomeCell.id]; if (s?.w) nomeCell.style.width = s.w;
      }
      if (obsCell) {
        obsCell.id  = cellId(b.dataset.uid, rid, 'obs');
        const s = uiSizes[obsCell.id]; if (s?.w) obsCell.style.width = s.w;
      }

      tbody.appendChild(r);
    });

    // bloqueio
    if(v.chancela === 'Aprovada' || v.bloqueado){
      b.querySelectorAll('input,textarea').forEach(e=>{
        e.readOnly = true; e.disabled = false; e.style.cursor = 'not-allowed'; e.style.background = '#f8f9fa';
      });
      b.querySelectorAll('button,select').forEach(btn=>{
        const txt = (btn.textContent||'').trim();
        const isExcluir  = btn.classList.contains('btn-delete');
        const isCriar    = txt.includes('Criar Nova Versão');
        const isCopiar   = txt.includes('Copiar conteúdo');
        const isSolicitar= txt.includes('Solicitar');
        const isAprovar  = btn.classList.contains('btn-approve');
        if(isSolicitar || isAprovar) btn.disabled = true;
        else if(!isExcluir && !isCriar && !isCopiar) btn.disabled = true;
      });
    }

    container.appendChild(b);
  });

  // Persistência tamanhos
  container.addEventListener('mouseup', (e)=>{
    const ta = e.target.closest('textarea[name="nome"], textarea[name="observacoes"]');
    if (ta && ta.id) {
      const h = getComputedStyle(ta).height;
      setUISize(ta.id, { h });
    }
    const cell = e.target.closest('.cell.resizable');
    if (cell && cell.id) {
      const w = getComputedStyle(cell).width;
      setUISize(cell.id, { w });
    }
  });

  container.addEventListener('input', (e)=>{
    const ta = e.target.closest('textarea[name="nome"], textarea[name="observacoes"]');
    if (ta) autoGrow(ta);
  });
}

/* Admin */
async function validarAdmin(){
  const keys = getKeys();
  if(!keys.adminHash){
    alert('Nenhuma chave administrativa configurada. Vá à página Início e defina uma.');
    return false;
  }
  const senha = prompt('Ação administrativa. Informe a senha (case-insensitive):');
  if(senha===null) return false;
  const hash = await sha256Hex(normalizeKey(senha));
  if(hash !== keys.adminHash){
    alert('Senha incorreta!');
    return false;
  }
  return true;
}

/* Ações de bloco */
function handleBlockClicks(block){
  block.querySelector('.btn-approve')?.addEventListener('click', async () => {
    const ok = await validarAdmin(); if(!ok) return;
    const el = block.querySelector('.chancela-status');
    el.textContent = 'Aprovada';
    el.style.background = '#d4edda'; el.style.color = '#155724';
    block.querySelectorAll('input,textarea').forEach(e=>{
      e.readOnly = true; e.disabled = false; e.style.cursor = 'not-allowed'; e.style.background = '#f8f9fa';
    });
    block.querySelectorAll('button,select').forEach(btn=>{
      const txt = (btn.textContent||'').trim();
      const isExcluir  = btn.classList.contains('btn-delete');
      const isCriar    = txt.includes('Criar Nova Versão');
      const isCopiar   = txt.includes('Copiar conteúdo');
      const isSolicitar= txt.includes('Solicitar');
      const isAprovar  = btn.classList.contains('btn-approve');
      if(isSolicitar || isAprovar) btn.disabled = true;
      else if(!isExcluir && !isCriar && !isCopiar) btn.disabled = true;
    });
    manualSave();
  });

  block.querySelector('.btn-delete')?.addEventListener('click', async () => {
    const status = block.querySelector('.chancela-status')?.textContent?.trim() || '';
    if(status === 'Aprovada'){
      const ok = await validarAdmin(); if(!ok) return;
      if(!confirm('Esta versão foi chancelada. Deseja realmente excluí-la?')) return;
    } else {
      if(!confirm('Excluir esta versão permanentemente?')) return;
    }
    block.remove();
    manualSave();
    alert('Versão excluída com sucesso.');
  });

  block.querySelector('[data-action="new-below"]')?.addEventListener('click', () => {
    const novo = createVersionBlock();
    block.insertAdjacentElement('afterend', novo);
    wireBlock(novo);
    manualSave();
  });

  block.querySelector('[data-action="copy"]')?.addEventListener('click', () => {
    let proxima = block.nextElementSibling;
    if(!proxima || !proxima.classList.contains('version-block')){
      proxima = createVersionBlock();
      block.insertAdjacentElement('afterend', proxima);
      wireBlock(proxima);
    }
    const origem = block.querySelector('tbody'), destino = proxima.querySelector('tbody');
    destino.innerHTML = '';
    origem.querySelectorAll('tr').forEach(tr=>{
      const rid = uid();
      const nova = createRow(rid);
      tr.querySelectorAll('input,textarea').forEach((el,j)=>{
        const dst = nova.querySelectorAll('input,textarea')[j];
        if (dst) dst.value = el.value;
      });
      destino.appendChild(nova);
    });
    const origemBloqueada = isBlockBlocked(block);
    if(origemBloqueada){
      proxima.querySelectorAll('input,textarea').forEach(e=>{
        e.readOnly = true; e.disabled = false; e.style.cursor = 'not-allowed'; e.style.background = '#f8f9fa';
      });
    }
    manualSave();
  });

  block.querySelector('[data-action="request"]')?.addEventListener('click', () => {
    const el = block.querySelector('.chancela-status');
    el.textContent = 'Solicitada';
    el.style.background = '#fff3cd'; el.style.color = '#856404';
    manualSave();
  });

  // auto-grow inicial
  block.querySelectorAll('textarea[name="nome"], textarea[name="observacoes"]').forEach(autoGrow);
}

function wireBlock(b){ handleBlockClicks(b); }

/* Persistência */
function manualSave(){
  savePageData(serializePage());
  if(saveStatusEl) saveStatusEl.textContent = `As alterações foram salvas localmente em ${nowStr()}.`;
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  const saved = loadPageData();
  if(saved) applyPage(saved); else container.appendChild(createVersionBlock());

  container.querySelectorAll('.version-block').forEach(wireBlock);

  btnNew?.addEventListener('click', () => {
    const novo = createVersionBlock();
    container.appendChild(novo);
    wireBlock(novo);
    manualSave();
  });
  btnManual?.addEventListener('click', manualSave);

  enableAutoSave(serializePage);
});
