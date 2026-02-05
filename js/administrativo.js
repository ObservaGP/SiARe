const STORAGE_KEY = 'siare_data';

document.addEventListener('DOMContentLoaded', () => {
  // =====================
  // Helpers (storage)
  // =====================
  function getData() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { projeto: {}, equipe: [], relatorios: {}, atividades: [], softSkills: [], parceiros: [] };
    if (!raw.projeto || typeof raw.projeto !== 'object') raw.projeto = {};
    if (!Array.isArray(raw.parceiros)) raw.parceiros = [];
    return raw;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function makeId(prefix = 'p') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // =====================
  // Dados do Projeto
  // =====================
  const projSigla = document.getElementById('projSigla');
  const projExtrato = document.getElementById('projExtrato');
  const projNome = document.getElementById('projNome');
  const projCodFund = document.getElementById('projCodFund');
  const projProcesso = document.getElementById('projProcesso');
  const projVigIni = document.getElementById('projVigIni');
  const projVigFim = document.getElementById('projVigFim');

  const projectInputs = [projSigla, projExtrato, projNome, projCodFund, projProcesso, projVigIni, projVigFim].filter(Boolean);

  function applyProcessMask(v) {
    // Máscara: 00000.000000/0000-00
    const d = String(v || '').replace(/\D/g, '').slice(0, 17);
    const p1 = d.slice(0, 5);
    const p2 = d.slice(5, 11);
    const p3 = d.slice(11, 15);
    const p4 = d.slice(15, 17);

    let out = p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `/${p3}`;
    if (p4) out += `-${p4}`;
    return out;
  }

  function applyCnpjMask(v) {
    // Máscara solicitada: 00.000.000.0000-00
    const d = String(v || '').replace(/\D/g, '').slice(0, 14);
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 5);
    const p3 = d.slice(5, 8);
    const p4 = d.slice(8, 12);
    const p5 = d.slice(12, 14);

    let out = p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `.${p3}`;
    if (p4) out += `.${p4}`;
    if (p5) out += `-${p5}`;
    return out;
  }

  function loadProject() {
    const data = getData();
    const p = data.projeto || {};
    if (projSigla) projSigla.value = p.sigla || '';
    if (projExtrato) projExtrato.value = p.extrato || '';
    if (projNome) projNome.value = p.nome || '';
    if (projCodFund) projCodFund.value = p.codFund || '';
    if (projProcesso) projProcesso.value = p.processo || '';
    if (projVigIni) projVigIni.value = p.vigIni || '';
    if (projVigFim) projVigFim.value = p.vigFim || '';
  }

  function saveProject() {
    const data = getData();
    data.projeto = {
      sigla: (projSigla?.value || '').trim(),
      extrato: (projExtrato?.value || '').trim(),
      nome: (projNome?.value || '').trim(),
      codFund: (projCodFund?.value || '').trim(),
      processo: (projProcesso?.value || '').trim(),
      vigIni: projVigIni?.value || '',
      vigFim: projVigFim?.value || ''
    };
    saveData(data);
  }

  if (projProcesso) {
    projProcesso.addEventListener('input', () => {
      projProcesso.value = applyProcessMask(projProcesso.value);
    });
  }

  // salvar em blur/change
  projectInputs.forEach((el) => {
    el.addEventListener('change', saveProject);
    el.addEventListener('blur', saveProject);
  });

  loadProject();

  // =====================
  // Relacionamentos (Parceiros)
  // =====================
  const btnAddPartner = document.getElementById('btnAddPartner');
  const partnersBody = document.getElementById('partnersBody');
  const partnersEmpty = document.getElementById('partnersEmpty');

  const partnerModal = document.getElementById('partnerModal');
  const partnerTitle = document.getElementById('partnerTitle');
  const partnerForm = document.getElementById('partnerForm');
  const partnerNome = document.getElementById('partnerNome');
  const partnerCnpj = document.getElementById('partnerCnpj');
  const partnerInfo = document.getElementById('partnerInfo');
  const btnPartnerCancel = document.getElementById('btnPartnerCancel');

  const partnerDeleteModal = document.getElementById('partnerDeleteModal');
  const partnerDeleteTitle = document.getElementById('partnerDeleteTitle');
  const btnPartnerDelNao = document.getElementById('btnPartnerDelNao');
  const btnPartnerDelSim = document.getElementById('btnPartnerDelSim');

  let editingIdx = null;
  let pendingDeleteIdx = null;

  if (partnerCnpj) {
    partnerCnpj.addEventListener('input', () => {
      partnerCnpj.value = applyCnpjMask(partnerCnpj.value);
    });
  }

  function setPartnerInfo(msg = '', danger = false) {
    if (!partnerInfo) return;
    partnerInfo.textContent = msg;
    partnerInfo.style.color = danger ? 'var(--danger)' : 'var(--muted)';
  }

  function openPartnerAdd() {
    editingIdx = null;
    if (partnerTitle) partnerTitle.textContent = 'Adicionar Parceiro';
    if (partnerNome) partnerNome.value = '';
    if (partnerCnpj) partnerCnpj.value = '';
    setPartnerInfo('');
    partnerModal?.classList.remove('hidden');
    partnerNome?.focus();
  }

  function openPartnerEdit(idx) {
    const data = getData();
    const p = data.parceiros?.[idx];
    if (!p) return;
    editingIdx = idx;
    if (partnerTitle) partnerTitle.textContent = 'Editar Parceiro';
    if (partnerNome) partnerNome.value = p.nome || '';
    if (partnerCnpj) partnerCnpj.value = p.cnpj || '';
    setPartnerInfo('');
    partnerModal?.classList.remove('hidden');
    partnerNome?.focus();
  }

  function closePartnerModal() {
    partnerModal?.classList.add('hidden');
    editingIdx = null;
  }

  function openPartnerDelete(nome, idx) {
    pendingDeleteIdx = idx;
    if (partnerDeleteTitle) partnerDeleteTitle.innerHTML = `Deseja excluir o parceiro <strong>${escapeHtml(nome)}</strong>?`;
    partnerDeleteModal?.classList.remove('hidden');
  }

  function closePartnerDelete() {
    pendingDeleteIdx = null;
    partnerDeleteModal?.classList.add('hidden');
  }

  function renderPartners() {
    if (!partnersBody || !partnersEmpty) return;
    const data = getData();
    const list = data.parceiros || [];

    partnersBody.innerHTML = '';
    if (!list.length) {
      partnersEmpty.classList.remove('hidden');
      return;
    }
    partnersEmpty.classList.add('hidden');

    list.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(p.nome || '')}</td>
        <td>${escapeHtml(p.cnpj || '')}</td>
        <td class="col-acoes">
          <div class="table-actions">
            <button class="icon-btn icon-edit" type="button" title="Editar" aria-label="Editar" data-action="edit" data-index="${idx}">✏️</button>
            <button class="icon-btn icon-delete" type="button" title="Excluir" aria-label="Excluir" data-action="delete" data-index="${idx}">🗑️</button>
          </div>
        </td>
      `;
      partnersBody.appendChild(tr);
    });
  }

  btnAddPartner?.addEventListener('click', openPartnerAdd);
  btnPartnerCancel?.addEventListener('click', (e) => { e.preventDefault(); closePartnerModal(); });
  btnPartnerDelNao?.addEventListener('click', (e) => { e.preventDefault(); closePartnerDelete(); });
  btnPartnerDelSim?.addEventListener('click', (e) => {
    e.preventDefault();
    if (pendingDeleteIdx === null) return;
    const data = getData();
    if (pendingDeleteIdx < 0 || pendingDeleteIdx >= data.parceiros.length) return closePartnerDelete();
    data.parceiros.splice(pendingDeleteIdx, 1);
    saveData(data);
    closePartnerDelete();
    renderPartners();
  });

  partnerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = (partnerNome?.value || '').trim();
    const cnpj = (partnerCnpj?.value || '').trim();
    if (!nome || !cnpj) {
      setPartnerInfo('PREENCHA OS CAMPOS OBRIGATÓRIOS', true);
      return;
    }

    const data = getData();
    const existing = (editingIdx !== null && data.parceiros[editingIdx]) ? data.parceiros[editingIdx] : null;
    const novo = { id: existing?.id || makeId('partner'), nome, cnpj };

    if (editingIdx !== null) data.parceiros[editingIdx] = novo;
    else data.parceiros.push(novo);

    saveData(data);
    closePartnerModal();
    renderPartners();
  });

  partnersBody?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const idx = Number(btn.dataset.index);
    if (!Number.isInteger(idx)) return;
    const data = getData();
    const p = data.parceiros?.[idx];
    if (!p) return;
    if (action === 'edit') openPartnerEdit(idx);
    if (action === 'delete') openPartnerDelete(p.nome || 'este parceiro', idx);
  });

  // Escape fecha modais
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePartnerModal();
      closePartnerDelete();
    }
  });

  renderPartners();
});
