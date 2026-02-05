const STORAGE_KEY = 'siare_data';
const SORT_KEY = 'siare_atividades_sort_page'; // 'num_asc'|'num_desc'|'cat_asc'|'cat_desc'|'txt_asc'|'txt_desc'|'none'

document.addEventListener('DOMContentLoaded', () => {
  const btnAdd = document.getElementById('btnAddAtividade');

  const sortNumToggle = document.getElementById('sortActNumToggle');
  const sortCatToggle = document.getElementById('sortActCatToggle');
  const sortTxtToggle = document.getElementById('sortActTxtToggle');

  const tbody = document.getElementById('activitiesBody');
  const empty = document.getElementById('activitiesEmpty');

  const modal = document.getElementById('activityModal');
  const title = document.getElementById('activityTitle');
  const form = document.getElementById('activityForm');
  const inpCat = document.getElementById('atividadeCategoria');
  const inpDesc = document.getElementById('atividadeDescricao');
  const info = document.getElementById('activityInfo');
  const btnCancel = document.getElementById('btnActCancel');

  const chkCoord = document.getElementById('role_coordenador');
  const chkPesq = document.getElementById('role_pesquisador');
  const chkPesqEst = document.getElementById('role_pesquisador_estudante');
  const chkPesqExt = document.getElementById('role_pesquisador_externo');

  const delModal = document.getElementById('deleteModal');
  const delTitle = document.getElementById('deleteTitle');
  const btnDelNao = document.getElementById('btnDelNao');
  const btnDelSim = document.getElementById('btnDelSim');

  if (!btnAdd || !tbody || !empty || !form) {
    console.error('[SiARe] atividades: elementos principais não encontrados.');
    return;
  }

  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

  const roles = [
    { key: 'coordenador', checkbox: chkCoord },
    { key: 'pesquisador', checkbox: chkPesq },
    { key: 'pesquisador_estudante', checkbox: chkPesqEst },
    { key: 'pesquisador_externo', checkbox: chkPesqExt },
  ];

  let editingIndex = null;
  let pendingDeleteIndex = null;

  function getData() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { projeto: {}, equipe: [], relatorios: {}, atividades: [] };
    if (!Array.isArray(raw.atividades)) raw.atividades = [];
    return raw;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function makeId(prefix = 'act') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function ensureSeq(data) {
    let changed = false;
    let max = 0;

    data.atividades.forEach(a => {
      const n = Number(a.seq);
      if (Number.isFinite(n) && n > max) max = n;
    });

    data.atividades.forEach(a => {
      const n = Number(a.seq);
      if (!Number.isFinite(n) || n <= 0) {
        max += 1;
        a.seq = max;
        changed = true;
      }
      if (!a.id) {
        a.id = makeId('act');
        changed = true;
      }
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

  function setInfo(msg = '', danger = false) {
    if (!info) return;
    info.textContent = msg;
    info.style.color = danger ? 'var(--danger)' : 'var(--muted)';
  }

  function getSortPref() {
    const v = String(localStorage.getItem(SORT_KEY) || 'none');
    return ['num_asc','num_desc','cat_asc','cat_desc','txt_asc','txt_desc','none'].includes(v) ? v : 'none';
  }

  function setSortPref(v) {
    const val = ['num_asc','num_desc','cat_asc','cat_desc','txt_asc','txt_desc','none'].includes(v) ? v : 'none';
    localStorage.setItem(SORT_KEY, val);
  }

  function updateSortButtons() {
    const pref = getSortPref();

    function apply(btn, active, desc) {
      if (!btn) return;
      btn.classList.toggle('active', active);
      btn.setAttribute('data-dir', desc ? 'desc' : 'asc');
    }

    apply(sortNumToggle, pref === 'num_asc' || pref === 'num_desc', pref === 'num_desc');
    apply(sortCatToggle, pref === 'cat_asc' || pref === 'cat_desc', pref === 'cat_desc');
    apply(sortTxtToggle, pref === 'txt_asc' || pref === 'txt_desc', pref === 'txt_desc');
  }

  function openAdd() {
    editingIndex = null;
    if (title) title.textContent = 'Adicionar Atividade';
    if (inpCat) inpCat.value = '';
    if (inpDesc) inpDesc.value = '';
    roles.forEach(r => { if (r.checkbox) r.checkbox.checked = false; });
    setInfo('');
    modal?.classList.remove('hidden');
    inpCat?.focus();
  }

  function openEdit(idx) {
    const data = getData();
    const item = data.atividades[idx];
    if (!item) return;

    editingIndex = idx;
    if (title) title.textContent = 'Editar Atividade';
    if (inpCat) inpCat.value = item.categoria || '';
    if (inpDesc) inpDesc.value = item.descricao || '';
    roles.forEach(r => {
      if (!r.checkbox) return;
      r.checkbox.checked = !!(item.atribuicao && item.atribuicao[r.key]);
    });
    setInfo('');
    modal?.classList.remove('hidden');
    inpCat?.focus();
  }

  function closeModal() {
    modal?.classList.add('hidden');
    editingIndex = null;
  }

  function openDelete(desc, idx) {
    pendingDeleteIndex = idx;
    if (delTitle) delTitle.innerHTML = `Deseja excluir a atividade <strong>${escapeHtml(desc)}</strong>?`;
    delModal?.classList.remove('hidden');
  }

  function closeDelete() {
    pendingDeleteIndex = null;
    delModal?.classList.add('hidden');
  }

  btnAdd.addEventListener('click', openAdd);
  btnCancel?.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

  btnDelNao?.addEventListener('click', (e) => { e.preventDefault(); closeDelete(); });
  btnDelSim?.addEventListener('click', (e) => {
    e.preventDefault();
    if (pendingDeleteIndex === null) return;
    const data = getData();
    if (pendingDeleteIndex < 0 || pendingDeleteIndex >= data.atividades.length) return closeDelete();
    data.atividades.splice(pendingDeleteIndex, 1);
    saveData(data);
    closeDelete();
    render();
  });

  function toggleSort(kind) {
    const pref = getSortPref();
    let next = 'none';

    if (kind === 'num') {
      if (pref === 'num_desc') next = 'num_asc';
      else next = 'num_desc';
    } else if (kind === 'cat') {
      if (pref === 'cat_desc') next = 'cat_asc';
      else next = 'cat_desc';
    } else {
      if (pref === 'txt_desc') next = 'txt_asc';
      else next = 'txt_desc';
    }

    setSortPref(next);
    render();
  }

  sortNumToggle?.addEventListener('click', () => toggleSort('num'));
  sortCatToggle?.addEventListener('click', () => toggleSort('cat'));
  sortTxtToggle?.addEventListener('click', () => toggleSort('txt'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const cat = (inpCat?.value || '').trim();
    const desc = (inpDesc?.value || '').trim();
    if (!cat || !desc) {
      setInfo('PREENCHA OS CAMPOS OBRIGATÓRIOS', true);
      return;
    }

    const atribuicao = {};
    roles.forEach(r => { atribuicao[r.key] = !!(r.checkbox && r.checkbox.checked); });

    const data = getData();
    ensureSeq(data);

    const existing = (editingIndex !== null && data.atividades[editingIndex]) ? data.atividades[editingIndex] : null;
    const novo = {
      id: existing?.id || makeId('act'),
      seq: existing?.seq, // preserva seq do registro
      categoria: cat,
      descricao: desc,
      atribuicao
    };

    if (editingIndex !== null) {
      data.atividades[editingIndex] = novo;
    } else {
      const maxSeq = Math.max(0, ...data.atividades.map(a => Number(a.seq) || 0));
      novo.seq = maxSeq + 1;
      data.atividades.push(novo);
    }

    saveData(data);
    closeModal();
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
    if (action === 'edit') openEdit(index);
    if (action === 'delete') openDelete(item.descricao || 'esta atividade', index);
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
    saveData(data);
  });

  function render() {
    const data = getData();
    ensureSeq(data);
    updateSortButtons();

    const list = data.atividades || [];
    tbody.innerHTML = '';

    if (!list.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    const display = list.map((a, idx) => ({ a, idx }));
    const pref = getSortPref();

    if (pref === 'num_asc' || pref === 'num_desc') {
      display.sort((x, y) => {
        const sx = Number(x.a?.seq) || 0;
        const sy = Number(y.a?.seq) || 0;
        if (sx !== sy) return pref === 'num_asc' ? (sx - sy) : (sy - sx);
        return collator.compare(String(x.a?.descricao || ''), String(y.a?.descricao || ''));
      });
    }

    if (pref === 'cat_asc' || pref === 'cat_desc') {
      display.sort((x, y) => {
        const ax = String(x.a?.categoria || '');
        const ay = String(y.a?.categoria || '');
        const c = collator.compare(ax, ay);
        if (c !== 0) return pref === 'cat_asc' ? c : -c;
        return collator.compare(String(x.a?.descricao || ''), String(y.a?.descricao || ''));
      });
    }

    if (pref === 'txt_asc' || pref === 'txt_desc') {
      display.sort((x, y) => {
        const ax = String(x.a?.descricao || '');
        const ay = String(y.a?.descricao || '');
        const c = collator.compare(ax, ay);
        if (c !== 0) return pref === 'txt_asc' ? c : -c;
        return collator.compare(String(x.a?.categoria || ''), String(y.a?.categoria || ''));
      });
    }

    display.forEach(({ a, idx }, pos) => {
      const tr = document.createElement('tr');
      const desc = escapeHtml(a.descricao || '');
      const cat = escapeHtml(a.categoria || '');

      const checks = roles.map(r => {
        const checked = !!(a.atribuicao && a.atribuicao[r.key]);
        return `
          <td class="col-check">
            <input class="activity-check" type="checkbox" data-index="${idx}" data-role="${r.key}" ${checked ? 'checked' : ''} />
          </td>
        `;
      }).join('');

      tr.innerHTML = `
        <td class="col-num">${escapeHtml(String(pos + 1))}</td>
        <td class="col-categoria">${cat}</td>
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

  // Escape fecha modais
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDelete();
    }
  });

  render();
});
