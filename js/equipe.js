const STORAGE_KEY = 'siare_data';
window.SIARE_EQUIPE_LOADED = true;

document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('memberList');
  const empty = document.getElementById('emptyState');

  const btnEditEquipe = document.getElementById('btnEditEquipe');

  const deleteModal = document.getElementById('deleteModal');
  const deleteTitle = document.getElementById('deleteTitle');
  const btnDelNao = document.getElementById('btnDelNao');
  const btnDelSim = document.getElementById('btnDelSim');

  if (!list || !empty) {
    console.error('[SiARe] memberList/emptyState não encontrados no equipe.html.');
    return;
  }

  if (!deleteModal || !deleteTitle || !btnDelNao || !btnDelSim) {
    console.error('[SiARe] deleteModal/deleteTitle/btnDelNao/btnDelSim não encontrados no equipe.html.');
    return;
  }

  let pendingDeleteIndex = null;

  function getData() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      projeto: {},
      equipe: [],
      relatorios: {}
    };
    if (!Array.isArray(raw.equipe)) raw.equipe = [];

    // MIGRAÇÃO: campo "ativo" (default: true)
    let changed = false;
    raw.equipe.forEach((m) => {
      if (typeof m.ativo !== 'boolean') {
        m.ativo = true;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    }

    return raw;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-');
    return (y && m && d) ? `${d}/${m}/${y}` : String(iso);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }


  function formatVersion(m) {
    const v = String(m?.versaoVinculo || (String(m?.idKey || '').split('-')[1] || '')).replace(/\D/g, '');
    return v ? v.padStart(2, '0') : '00';
  }

  function abrirDeleteModal(nome, index) {
    pendingDeleteIndex = index;
    deleteTitle.innerHTML = `Deseja excluir o registro de <strong>${escapeHtml(nome)}</strong>?`;
    deleteModal.classList.remove('hidden');
  }

  function fecharDeleteModal() {
    pendingDeleteIndex = null;
    deleteModal.classList.add('hidden');
  }

  btnDelNao.addEventListener('click', (e) => {
    e.preventDefault();
    fecharDeleteModal();
  });

  btnDelSim.addEventListener('click', (e) => {
    e.preventDefault();
    if (pendingDeleteIndex === null) return;

    const data = getData();
    if (pendingDeleteIndex < 0 || pendingDeleteIndex >= data.equipe.length) {
      fecharDeleteModal();
      return;
    }

    data.equipe.splice(pendingDeleteIndex, 1);
    saveData(data);

    fecharDeleteModal();
    render();
  });

  if (btnEditEquipe) {
    btnEditEquipe.addEventListener('click', () => {
      alert('Edição protegida por senha será implementada depois.\n\nPor enquanto, use os ícones ✏️ (editar) e 🗑️ (excluir) em cada registro.');
    });
  }

  // Delegação de eventos para os ícones
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const index = Number(btn.dataset.index);

    if (!Number.isInteger(index)) return;

    const data = getData();
    if (!Array.isArray(data.equipe)) data.equipe = [];

    if (index < 0 || index >= data.equipe.length) return;

    // Reordenar (persistente via localStorage)
    if (action === 'moveUp' || action === 'moveDown') {
      const target = action === 'moveUp' ? index - 1 : index + 1;
      if (target < 0 || target >= data.equipe.length) return;

      const tmp = data.equipe[index];
      data.equipe[index] = data.equipe[target];
      data.equipe[target] = tmp;

      saveData(data);
      render();
      return;
    }

    const membro = data.equipe[index];
    if (!membro) return;

    if (action === 'edit') {
      window.location.href = `equipe-form.html?edit=${index}`;
      return;
    }

    if (action === 'delete') {
      abrirDeleteModal(membro.nome || 'este registro', index);
    }
  });

  // Toggle do checkbox "Ativar"
  list.addEventListener('change', (e) => {
    const chk = e.target.closest('input.chk-ativo');
    if (!chk) return;

    const index = Number(chk.dataset.index);
    if (!Number.isInteger(index)) return;

    const data = getData();
    if (index < 0 || index >= data.equipe.length) return;

    data.equipe[index].ativo = !!chk.checked;
    saveData(data);
  });

  function render() {
    const data = getData();
    const equipe = data.equipe;

    list.innerHTML = '';

    if (!equipe.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    equipe.forEach((m, idx) => {
      const row = document.createElement('div');
      const isActive = (typeof m.ativo === 'boolean') ? m.ativo : true;
      row.className = 'member-row' + (isActive ? '' : ' is-inactive');

      row.innerHTML = `
        <div class="member-activate">
          <input class="chk-ativo" type="checkbox" data-index="${idx}" ${isActive ? 'checked' : ''} aria-label="Ativar membro" />
        </div>

        <div class="member-content">
          <div class="member-name">${escapeHtml(m.nome || '')}</div>
          <div class="member-meta">
            <span>${escapeHtml(m.vinculo || '')}</span> · <span>${escapeHtml(m.cargo || '')}</span>
          </div>
          <div class="member-meta">
            <strong>C.H.</strong>
            <span>c/ bolsa: ${escapeHtml(m.chBolsa || '')}h</span> ·
            <span>s/ bolsa: ${escapeHtml(m.chSemBolsa || '')}h</span> |
            <span>${formatDateBR(m.inicio)} – ${formatDateBR(m.fim)}</span> |
            <span>Versão: ${escapeHtml(formatVersion(m))}</span>
          </div>
        </div>

        <div class="member-actions">
          <div class="member-order">
            <button class="btn-icon btn-icon-sm" type="button" title="Subir" aria-label="Subir" data-action="moveUp" data-index="${idx}" ${idx === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn-icon btn-icon-sm" type="button" title="Descer" aria-label="Descer" data-action="moveDown" data-index="${idx}" ${idx === (equipe.length - 1) ? 'disabled' : ''}>▼</button>
          </div>
          <button class="btn-icon btn-warning" type="button" title="Editar" aria-label="Editar" data-action="edit" data-index="${idx}">✏️</button>
          <button class="btn-icon btn-danger-icon" type="button" title="Excluir" aria-label="Excluir" data-action="delete" data-index="${idx}">🗑️</button>
        </div>
      `;

      list.appendChild(row);
    });
  }

  render();
  console.log('[SiARe] equipe.js carregado e listando membros ✅');
});
