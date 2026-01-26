// js/pages/relacionamentos.js
import { getKeys } from "../core/storage.js";
import { sha256Hex, normalizeKey } from "../core/crypto.js";
import { savePageData, loadPageData, enableAutoSave, setUISize, loadUISizes } from "../core/cache.js";
import { nowStr } from "../core/time.js";

const container    = document.getElementById('versionContainer');
const btnNew       = document.getElementById('btnNewVersion');
const btnManual    = document.getElementById('btnManualSave');
const saveStatusEl = document.getElementById('saveStatusTop');

function uid(){ return Date.now().toString(36) + Math.random().toString(36).substring(2,8); }

/* Auto-grow */
function autoGrow(el){
  if (!(el instanceof HTMLTextAreaElement)) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/* IDs */
function fieldId(blockId, rowRid, field){ return `rel:${blockId}:${rowRid}:${field}`; }
function cellId(blockId, rowRid, field){ return `rel:${blockId}:${rowRid}:${field}:cell`; }

function monthsBetween(iniStr, fimStr){
  const a = iniStr ? new Date(iniStr) : null;
  const b = fimStr ? new Date(fimStr) : null;
  if (!a || !b || Number.isNaN(a) || Number.isNaN(b)) return '';
  let months = (b.getFullYear() - a.getFullYear())*12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return months < 0 ? 0 : months;
}

/* Linha */
function createRow(rid = uid()){
  const tr = document.createElement('tr');
  tr.dataset.rid = rid;
  tr.innerHTML = `
    <td><button class="line-btn btn-add"  type="button">+</button></td>

    <td><div class="cell"><input name="titulo_projeto" placeholder="Título do Projeto"></div></td>
    <td><div class="cell"><input name="organizacao" placeholder="Organização"></div></td>
    <td><div class="cell"><input name="tipo_relacionamento" placeholder="Tipo de Relacionamento"></div></td>
    <td><div class="cell"><input name="tipologia" placeholder="Tipologia"></div></td>
    <td><div class="cell"><input name="etapa_processo" placeholder="Etapa do Processo"></div></td>

    <td><div class="cell resizable"><textarea name="descricao" rows="1" placeholder="Descrição (Objetivo Geral)"></textarea></div></td>

    <td><div class="cell"><input name="unidade_institucional" placeholder="Unidade Institucional"></div></td>
    <td><div class="cell"><input name="campus" placeholder="Campus"></div></td>

    <td><div class="cell"><input type="date" name="data_inicio"></div></td>
    <td><div class="cell"><input type="date" name="data_termino"></div></td>
    <td><div class="cell"><input type="number" step="1" min="0" name="duracao_meses" placeholder="meses"></div></td>

    <td><div class="cell"><input name="contrap_fin_org" placeholder="Contrapartida Financeira: Organização"></div></td>
    <td><div class="cell"><input type="number" step="0.01" min="0" name="contrap_fin_valor" placeholder="R$"></div></td>

    <td><div class="cell"><input name="contrap_eco_org" placeholder="Contrapartida Econômica: Organização"></div></td>
    <td><div class="cell"><input type="number" step="0.01" min="0" name="contrap_eco_valor" placeholder="R$"></div></td>

    <td><div class="cell"><input name="fundacao_apoio" placeholder="Fundação de Apoio"></div></td>
    <td><div class="cell"><input name="numero_processo" placeholder="Número do Processo"></div></td>
    <td><div class="cell"><input type="date" name="data_dou"></div></td>
    <td><div class="cell"><input name="titulo_extrato_dou" placeholder="Título do Extrato de Convênio no DOU"></div></td>
    <td><div class="cell"><input name="termo_aditivo_num" placeholder="Termo Aditivo nº"></div></td>
    <td><div class="cell"><input name="versao_pt_num" placeholder="Versão do Plano de Trabalho nº"></div></td>

    <td><button class="line-btn btn-del" type="button">−</button></td>
  `;
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
            <th></th>
            <th>Título do Projeto</th>
            <th>Organização</th>
            <th>Tipo de Relacionamento</th>
            <th>Tipologia</th>
            <th>Etapa do Processo</th>
            <th>Descrição (Objetivo Geral)</th>
            <th>Unidade Institucional</th>
            <th>Campus</th>
            <th>Início</th>
            <th>Término</th>
            <th>Duração (meses)</th>
            <th>Contrap. Financeira — Org.</th>
            <th>Contrap. Financeira — R$</th>
            <th>Contrap. Econômica — Org.</th>
            <th>Contrap. Econômica — R$</th>
            <th>Fundação de Apoio</th>
            <th>Nº do Processo</th>
            <th>Publicação no DOU</th>
            <th>Título do Extrato no DOU</th>
            <th>Termo Aditivo nº</th>
            <th>Versão PT nº</th>
            <th></th>
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

      // descrição: altura (textarea) + largura (wrapper .cell)
      const descTa = r.querySelector('textarea[name="descricao"]');
      const descCell = descTa?.closest('.cell');
      if (descTa) {
        descTa.id = fieldId(b.dataset.uid, rid, 'descricao');
        const s = uiSizes[descTa.id]; if (s?.h) descTa.style.height = s.h;
        autoGrow(descTa);
      }
      if (descCell) {
        descCell.id = cellId(b.dataset.uid, rid, 'descricao');
        const s = uiSizes[descCell.id]; if (s?.w) descCell.style.width = s.w;
      }

      // duração auto
      const dtIni = r.querySelector('input[name="data_inicio"]');
      const dtFim = r.querySelector('input[name="data_termino"]');
      const dur   = r.querySelector('input[name="duracao_meses"]');
      if (dtIni && dtFim && dur && (!dur.value || dur.value === '')) {
        const m = monthsBetween(dtIni.value, dtFim.value);
        if (m !== '') dur.value = m;
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
    const ta = e.target.closest('textarea[name="descricao"]');
    if (ta && ta.id) {
      const h = getComputedStyle(ta).height; setUISize(ta.id, { h });
    }
    const cell = e.target.closest('.cell.resizable');
    if (cell && cell.id) {
      const w = getComputedStyle(cell).width; setUISize(cell.id, { w });
    }
  });

  container.addEventListener('input', (e)=>{
    const ta = e.target.closest('textarea[name="descricao"]');
    if (ta) autoGrow(ta);

    const tr = e.target.closest('tr');
    if (tr) {
      const dtIni = tr.querySelector('input[name="data_inicio"]');
      const dtFim = tr.querySelector('input[name="data_termino"]');
      const dur   = tr.querySelector('input[name="duracao_meses"]');
      if (dtIni && dtFim && dur && (e.target === dtIni || e.target === dtFim)) {
        const m = monthsBetween(dtIni.value, dtFim.value);
        if (m !== '') dur.value = m;
      }
    }
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

  block.querySelectorAll('textarea[name="descricao"]').forEach(autoGrow);
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
