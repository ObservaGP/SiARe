const STORAGE_KEY = 'siare_data';

document.addEventListener('DOMContentLoaded', () => {
  const btnAdd = document.getElementById('btnAddAtividade');
  const tbody = document.getElementById('activitiesBody');
  const empty = document.getElementById('activitiesEmpty');

  const activityModal = document.getElementById('activityModal');
  const activityTitle = document.getElementById('activityTitle');
  const activityForm = document.getElementById('activityForm');
  const atividadeDescricao = document.getElementById('atividadeDescricao');
  const activityInfo = document.getElementById('activityInfo');
  const btnActCancel = document.getElementById('btnActCancel');

  const chkCoord = document.getElementById('role_coordenador');
  const chkPesq = document.getElementById('role_pesquisador');
  const chkPesqEst = document.getElementById('role_pesquisador_estudante');
  const chkPesqExt = document.getElementById('role_pesquisador_externo');

  const deleteModal = document.getElementById('deleteModal');
  const deleteTitle = document.getElementById('deleteTitle');
  const btnDelNao = document.getElementById('btnDelNao');
  const btnDelSim = document.getElementById('btnDelSim');

  if (!btnAdd || !tbody || !empty) {
    console.error('[SiARe] Elementos da página Atividades não encontrados (btnAddAtividade/activitiesBody/activitiesEmpty).');
    return;
  }

  const roles = [
    { key: 'coordenador', label: 'Coordenador', checkbox: chkCoord },
    { key: 'pesquisador', label: 'Pesquisador', checkbox: chkPesq },
    { key: 'pesquisador_estudante', label: 'Pesquisador Estudante', checkbox: chkPesqEst },
    { key: 'pesquisador_externo', label: 'Pesquisador Externo', checkbox: chkPesqExt },
  ];

  let editingIndex = null;
  let pendingDeleteIndex = null;

  function getData() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      projeto: {},
      equipe: [],
      relatorios: {},
      atividades: []
    };
    if (!Array.isArray(raw.atividades)) raw.atividades = [];
    return raw;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function makeId(prefix = 'act') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  }

  function ensureActivityIds(data) {
    let changed = false;
    data.atividades.forEach((a) => {
      if (!a.id) { a.id = makeId('act'); changed = true; }
    });
    if (changed) saveData(data);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setInfo(texto, erro = false) {
    if (!activityInfo) return;
    activityInfo.textContent = texto;
    activityInfo.style.color = erro ? '#b00020' : '#1f2933';
  }

  function abrirModalAdicionar() {
    editingIndex = null;
    if (activityTitle) activityTitle.textContent = 'Adicionar Atividade';
    if (atividadeDescricao) atividadeDescricao.value = '';
    roles.forEach(r => { if (r.checkbox) r.checkbox.checked = false; });
    setInfo('');
    activityModal?.classList.remove('hidden');
    atividadeDescricao?.focus();
  }

  function abrirModalEditar(idx) {
    const data = getData();
    const item = data.atividades[idx];
    if (!item) return;

    editingIndex = idx;
    if (activityTitle) activityTitle.textContent = 'Editar Atividade';
    if (atividadeDescricao) atividadeDescricao.value = item.descricao || '';

    roles.forEach(r => {
      if (!r.checkbox) return;
      r.checkbox.checked = !!(item.atribuicao && item.atribuicao[r.key]);
    });

    setInfo('');
    activityModal?.classList.remove('hidden');
    atividadeDescricao?.focus();
  }

  function fecharModalAtividade() {
    activityModal?.classList.add('hidden');
    editingIndex = null;
  }

  function abrirDeleteModal(descricao, idx) {
    pendingDeleteIndex = idx;
    if (deleteTitle) deleteTitle.innerHTML = `Deseja excluir a atividade <strong>${escapeHtml(descricao)}</strong>?`;
    deleteModal?.classList.remove('hidden');
  }

  function fecharDeleteModal() {
    pendingDeleteIndex = null;
    deleteModal?.classList.add('hidden');
  }

  btnAdd.addEventListener('click', () => abrirModalAdicionar());

  btnActCancel?.addEventListener('click', (e) => {
    e.preventDefault();
    fecharModalAtividade();
  });

  btnDelNao?.addEventListener('click', (e) => {
    e.preventDefault();
    fecharDeleteModal();
  });

  btnDelSim?.addEventListener('click', (e) => {
    e.preventDefault();
    if (pendingDeleteIndex === null) return;

    const data = getData();
    if (pendingDeleteIndex < 0 || pendingDeleteIndex >= data.atividades.length) {
      fecharDeleteModal();
      return;
    }

    data.atividades.splice(pendingDeleteIndex, 1);
    saveData(data);

    fecharDeleteModal();
    render();
  });

  activityForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const desc = (atividadeDescricao?.value || '').trim();
    if (!desc) {
      setInfo('PREENCHA OS CAMPOS OBRIGATÓRIOS', true);
      return;
    }

    const atribuicao = {};
    roles.forEach(r => {
      atribuicao[r.key] = !!(r.checkbox && r.checkbox.checked);
    });

    const data = getData();
    const existingId = (editingIndex !== null && data.atividades[editingIndex]) ? data.atividades[editingIndex].id : null;
    const novo = { id: existingId || makeId('act'), descricao: desc, atribuicao };

    if (editingIndex !== null) {
      data.atividades[editingIndex] = novo;
      saveData(data);
      fecharModalAtividade();
      render();
      return;
    }

    data.atividades.push(novo);
    saveData(data);
    fecharModalAtividade();
    render();
  });

  // Delegação: editar/excluir
  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const index = Number(btn.dataset.index);
    if (!Number.isInteger(index)) return;

    const data = getData();
    const item = data.atividades?.[index];
    if (!item) return;

    if (action === 'edit') abrirModalEditar(index);
    if (action === 'delete') abrirDeleteModal(item.descricao || 'esta atividade', index);
  });

  // Delegação: checkboxes
  tbody.addEventListener('change', (e) => {
    const chk = e.target;
    if (!(chk instanceof HTMLInputElement)) return;
    if (chk.type !== 'checkbox') return;

    const index = Number(chk.dataset.index);
    const roleKey = chk.dataset.role;
    if (!Number.isInteger(index) || !roleKey) return;

    const data = getData();
    const item = data.atividades?.[index];
    if (!item) return;

    if (!item.atribuicao || typeof item.atribuicao !== 'object') item.atribuicao = {};
    item.atribuicao[roleKey] = chk.checked;

    data.atividades[index] = item;
    saveData(data);
  });

  function render() {
    const data = getData();
    ensureActivityIds(data);
    const atividades = data.atividades;

    tbody.innerHTML = '';

    if (!atividades.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    atividades.forEach((a, idx) => {
      const tr = document.createElement('tr');

      const desc = escapeHtml(a.descricao || '');

      const checks = roles.map(r => {
        const checked = !!(a.atribuicao && a.atribuicao[r.key]);
        return `
          <td class="col-check">
            <input class="activity-check" type="checkbox" data-index="${idx}" data-role="${r.key}" ${checked ? 'checked' : ''} />
          </td>
        `;
      }).join('');

      tr.innerHTML = `
        <td class="col-num">${idx + 1}</td>
        <td class="col-atividade">${desc}</td>
        ${checks}
        <td class="col-acoes">
          <div class="table-actions">
            <button class="icon-btn icon-edit" type="button" title="Editar" aria-label="Editar" data-action="edit" data-index="${idx}">✏️</button>
            <button class="icon-btn icon-delete" type="button" title="Excluir" aria-label="Excluir" data-action="delete" data-index="${idx}">🗑️</button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  render();
});
