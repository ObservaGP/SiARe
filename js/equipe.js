const STORAGE_KEY = 'siare_data';

console.log("[SiARe] SIARE_EQUIPE_V=2026-01-28c");
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

  function digits(v) {
    return String(v ?? '').replace(/\D/g, '');
  }

  function ensureMemberId(m) {
    const cpf = digits(m?.cpf);
    const versao = String(digits(m?.versaoVinculo) || '00').slice(0, 2).padStart(2, '0');
    if (m && !m.id && cpf.length === 11) m.id = `${cpf}-${versao}`;
    if (m && !m.versaoVinculo) m.versaoVinculo = versao;
    return m?.id || (cpf.length === 11 ? `${cpf}-${versao}` : '');
  }

  function getData() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      projeto: {},
      equipe: [],
      atividades: [],
      relatorios: {}
    };
    if (!Array.isArray(raw.equipe)) raw.equipe = [];
    if (!raw.relatorios || typeof raw.relatorios !== 'object') raw.relatorios = {};

    // Migração leve: garante id/versão nos registros antigos
    let changed = false;
    raw.equipe.forEach((m) => {
      const beforeId = m?.id;
      const beforeVer = m?.versaoVinculo;
      ensureMemberId(m);
      if (beforeId !== m?.id || beforeVer !== m?.versaoVinculo) changed = true;
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

  function moneyText(v) {
    const s = String(v ?? '').trim();
    return s ? s : '';
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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

    const membro = data.equipe[pendingDeleteIndex];
    const memberId = ensureMemberId(membro);
    const cpfKeyLegacy = digits(membro?.cpf);

    // Remove relatórios associados (novo e legado)
    if (data.relatorios && typeof data.relatorios === 'object') {
      if (memberId && data.relatorios[memberId]) delete data.relatorios[memberId];
      if (cpfKeyLegacy && data.relatorios[cpfKeyLegacy]) delete data.relatorios[cpfKeyLegacy];
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
    const membro = data.equipe?.[index];
    if (!membro) return;

    if (action === 'edit') {
      window.location.href = `equipe-form.html?edit=${index}`;
      return;
    }

    if (action === 'delete') {
      abrirDeleteModal(membro.nome || 'este registro', index);
    }
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
      row.className = 'member-row';

      const id = ensureMemberId(m);
      const siape = digits(m.siape) ? ` · SIAPE: ${digits(m.siape).padStart(9, '0')}` : '';
      const ver = String(digits(m.versaoVinculo) || '00').slice(0, 2).padStart(2, '0');

      const naoBolsista = !!m.naoBolsista;
      const indicador = naoBolsista
        ? '[x] Não é bolsista (Voluntariado/Contrapartida)'
        : '[ ] Não é bolsista (Voluntariado/Contrapartida)';

      const tipo = String(m.tipoBolsa ?? '').trim();
      const valor = moneyText(m.valorBolsa);
      const bolsaTxt = (tipo || valor)
        ? `Bolsa: ${escapeHtml(tipo || '—')}${valor ? ` (R$ ${escapeHtml(valor)})` : ''}`
        : 'Bolsa: —';

      row.innerHTML = `
        <div class="member-content">
          <div class="member-name">${escapeHtml(m.nome || '')}</div>

          <div class="member-meta">
            <span>${escapeHtml(m.vinculo || '')}</span> ·
            <span>${escapeHtml(m.cargo || '')}</span> ·
            <span>${escapeHtml(m.forma || '')}</span>
            ${id ? ` · <span><strong>ID:</strong> ${escapeHtml(id)}</span>` : ''}
            · <span><strong>Versão:</strong> ${escapeHtml(ver)}</span>
            ${siape}
          </div>

          <div class="member-meta">
            <span><strong>Período:</strong> ${escapeHtml(formatDateBR(m.inicio))} – ${escapeHtml(formatDateBR(m.fim))}</span>
            · <span><strong>C.H.</strong> c/ bolsa: ${escapeHtml(m.chBolsa || '')}h · s/ bolsa: ${escapeHtml(m.chSemBolsa || '')}h</span>
            · <span>${bolsaTxt}</span>
            · <span>${escapeHtml(indicador)}</span>
          </div>
        </div>

        <div class="member-actions">
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
