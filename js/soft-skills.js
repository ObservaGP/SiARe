const STORAGE_KEY = 'siare_data';
const SORT_KEY = 'siare_softskills_sort'; // 'num'|'cat'|'txt' + dir toggle stored separately

document.addEventListener('DOMContentLoaded', () => {
  const btnAdd = document.getElementById('btnAddSoftSkill');
  const head = document.getElementById('softHead');
  const body = document.getElementById('softBody');
  const empty = document.getElementById('softEmpty');

  const modal = document.getElementById('softModal');
  const modalTitle = document.getElementById('softTitle');
  const form = document.getElementById('softForm');
  const inpCat = document.getElementById('softCategoria');
  const inpDesc = document.getElementById('softDescricao');
  const info = document.getElementById('softInfo');
  const btnCancel = document.getElementById('btnSoftCancel');

  const delModal = document.getElementById('softDeleteModal');
  const delTitle = document.getElementById('softDeleteTitle');
  const btnDelNao = document.getElementById('btnSoftDelNao');
  const btnDelSim = document.getElementById('btnSoftDelSim');

  if (!btnAdd || !head || !body || !empty || !form) {
    console.error('[SiARe] soft-skills: elementos principais não encontrados.');
    return;
  }

  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
  let editingId = null;
  let pendingDeleteId = null;

  function getData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw ? JSON.parse(raw) : {};
    if (!Array.isArray(base.equipe)) base.equipe = [];
    if (!Array.isArray(base.softSkills)) base.softSkills = [];
    if (!base.projeto) base.projeto = {};
    return base;
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

  function setInfo(msg = '', danger = false) {
    if (!info) return;
    info.textContent = msg;
    info.style.color = danger ? 'var(--danger)' : 'var(--muted)';
  }

  function getActiveStudents(data) {
    // Regra (igual Relatórios):
    // estudantes ATIVOS = cargo contém "Pesquisador Estudante" e ativo === true
    return (data.equipe || []).filter(m => {
      const isActive = (typeof m?.ativo === 'boolean') ? m.ativo : true;
      const cargo = String(m?.cargo || '').toLowerCase();
      return isActive && cargo.includes('pesquisador estudante');
    });
  }

  function normalizeSkill(s) {
    if (!s.id) s.id = `soft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
    if (!Array.isArray(s.assignedStudentIds)) s.assignedStudentIds = [];
    return s;
  }

  function getSort() {
    const v = localStorage.getItem(SORT_KEY);
    try {
      const obj = JSON.parse(v || 'null');
      if (obj && ['num','cat','txt'].includes(obj.key) && ['asc','desc'].includes(obj.dir)) return obj;
    } catch {}
    return { key: 'num', dir: 'asc' };
  }

  function setSort(key, dir) {
    localStorage.setItem(SORT_KEY, JSON.stringify({ key, dir }));
  }

  function toggleSort(key) {
    const cur = getSort();
    const nextDir = (cur.key === key && cur.dir === 'desc') ? 'asc' : 'desc';
    setSort(key, nextDir);
    render();
  }

  function updateHeader() {
    head.innerHTML = `
      <tr>
        <th class="col-num">
          <div class="th-sort-inline">
            <span>Nº</span>
            <button id="softSortNum" class="sort-toggle" type="button" aria-label="Ordenar por Nº"></button>
          </div>
        </th>
        <th class="col-categoria">
          <div class="th-sort-inline">
            <span>Categoria</span>
            <button id="softSortCat" class="sort-toggle" type="button" aria-label="Ordenar por Categoria"></button>
          </div>
        </th>
        <th class="col-atividade">
          <div class="th-sort-inline">
            <span>Soft Skill</span>
            <button id="softSortTxt" class="sort-toggle" type="button" aria-label="Ordenar por Soft Skill"></button>
          </div>
        </th>
        <th class="col-atribuicao">Atribuições</th>
        <th class="col-acoes">Ações</th>
      </tr>
    `;

    document.getElementById('softSortNum')?.addEventListener('click', () => toggleSort('num'));
    document.getElementById('softSortCat')?.addEventListener('click', () => toggleSort('cat'));
    document.getElementById('softSortTxt')?.addEventListener('click', () => toggleSort('txt'));

    updateSortButtons();
  }

  function updateSortButtons() {
    const pref = getSort();
    const bNum = document.getElementById('softSortNum');
    const bCat = document.getElementById('softSortCat');
    const bTxt = document.getElementById('softSortTxt');

    function apply(btn, active, dir) {
      if (!btn) return;
      btn.classList.toggle('active', active);
      btn.setAttribute('data-dir', dir);
    }

    apply(bNum, pref.key === 'num', pref.key === 'num' ? pref.dir : 'asc');
    apply(bCat, pref.key === 'cat', pref.key === 'cat' ? pref.dir : 'asc');
    apply(bTxt, pref.key === 'txt', pref.key === 'txt' ? pref.dir : 'asc');
  }

  function getStudentId(m) {
    // id estável (igual equipe-form): idKey é o melhor identificador
    return String(m?.idKey || m?.id || m?.siape || m?.cpf || m?.nome || '').trim();
  }

  function openModal(mode, skill) {
    const data = getData();
    editingId = skill?.id || null;

    if (modalTitle) modalTitle.textContent = mode === 'edit' ? 'Editar Soft Skill' : 'Adicionar Soft Skill';
    if (inpCat) inpCat.value = skill?.categoria || '';
    if (inpDesc) inpDesc.value = skill?.descricao || '';

    setInfo('');
    modal?.classList.remove('hidden');
    inpCat?.focus();
  }

  function closeModal() {
    modal?.classList.add('hidden');
    editingId = null;
  }

  function openDelete(skill) {
    pendingDeleteId = skill.id;
    if (delTitle) delTitle.innerHTML = `Deseja excluir a soft skill <strong>${escapeHtml(skill.descricao)}</strong>?`;
    delModal?.classList.remove('hidden');
  }

  function closeDelete() {
    pendingDeleteId = null;
    delModal?.classList.add('hidden');
  }

  btnAdd.addEventListener('click', () => openModal('add'));
  btnCancel?.addEventListener('click', closeModal);
  btnDelNao?.addEventListener('click', closeDelete);

  btnDelSim?.addEventListener('click', () => {
    if (!pendingDeleteId) return;
    const data = getData();
    data.softSkills = (data.softSkills || []).filter(s => String(s.id) !== String(pendingDeleteId));
    saveData(data);
    closeDelete();
    render();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const cat = (inpCat?.value || '').trim();
    const desc = (inpDesc?.value || '').trim();
    if (!cat || !desc) {
      setInfo('PREENCHA OS CAMPOS OBRIGATÓRIOS', true);
      return;
    }

    const data = getData();

    data.softSkills = (data.softSkills || []).map(normalizeSkill);

    if (editingId) {
      const idx = data.softSkills.findIndex(s => String(s.id) === String(editingId));
      if (idx >= 0) {
        data.softSkills[idx] = normalizeSkill({
          ...data.softSkills[idx],
          categoria: cat,
          descricao: desc,
          // atribuições passam a ser feitas direto na tabela
          assignedStudentIds: data.softSkills[idx].assignedStudentIds || []
        });
      }
    } else {
      const newSkill = normalizeSkill({
        id: `soft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,
        categoria: cat,
        descricao: desc,
        assignedStudentIds: []
      });
      data.softSkills.push(newSkill);
    }

    saveData(data);
    closeModal();
    render();
  });

  function render() {
    const data = getData();
    const students = getActiveStudents(data);
    const idToName = new Map(students.map(s => [getStudentId(s), s.nome || '—']));

    data.softSkills = (data.softSkills || []).map(normalizeSkill);

    // ordenação
    const pref = getSort();
    const mult = pref.dir === 'asc' ? 1 : -1;
    const list = [...data.softSkills];
    list.sort((a,b) => {
      if (pref.key === 'num') {
        // Nº é automático: usa índice como ordenação base; aqui usamos categoria/descricao para ser estável
        const ax = String(a.categoria || '').toLowerCase();
        const bx = String(b.categoria || '').toLowerCase();
        const c = collator.compare(ax, bx);
        if (c !== 0) return c * mult;
        return collator.compare(String(a.descricao||''), String(b.descricao||'')) * mult;
      }
      if (pref.key === 'cat') {
        return collator.compare(String(a.categoria||''), String(b.categoria||'')) * mult;
      }
      return collator.compare(String(a.descricao||''), String(b.descricao||'')) * mult;
    });

    updateHeader();

    body.innerHTML = '';
    if (!list.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    list.forEach((s, idx) => {
      const assignedSet = new Set((s.assignedStudentIds || []).map(String));

      // monta lista inline com checkboxes (igual ideia do Relatórios)
      let assignHtml = '—';
      if (students.length) {
        assignHtml = `<div class="checklist checklist-inline">${students.map(st => {
          const sid = getStudentId(st);
          const checked = assignedSet.has(String(sid));
          const safeSid = escapeHtml(String(sid));
          const safeName = escapeHtml(st.nome || '—');
          return `
            <label>
              <input type="checkbox" data-skill-id="${escapeHtml(String(s.id))}" data-student-id="${safeSid}" ${checked ? 'checked' : ''} />
              <span>${safeName}</span>
            </label>
          `;
        }).join('')}</div>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-num">${idx + 1}</td>
        <td class="col-categoria">${escapeHtml(s.categoria)}</td>
        <td class="col-atividade">${escapeHtml(s.descricao)}</td>
        <td class="col-atribuicao">${assignHtml}</td>
        <td class="col-acoes">
          <button class="btn-icon btn-warning" type="button" title="Editar">✏️</button>
          <button class="btn-icon btn-danger-icon" type="button" title="Excluir">🗑️</button>
        </td>
      `;

      // Persistência imediata: clique em checkbox atualiza atribuições do registro
      tr.querySelectorAll('input[type="checkbox"][data-skill-id][data-student-id]').forEach(cb => {
        cb.addEventListener('change', () => {
          const skillId = String(cb.getAttribute('data-skill-id'));
          const studentId = String(cb.getAttribute('data-student-id'));
          const d = getData();
          d.softSkills = (d.softSkills || []).map(normalizeSkill);
          const idxSkill = d.softSkills.findIndex(x => String(x.id) === skillId);
          if (idxSkill < 0) return;
          const cur = new Set((d.softSkills[idxSkill].assignedStudentIds || []).map(String));
          if (cb.checked) cur.add(studentId);
          else cur.delete(studentId);
          d.softSkills[idxSkill].assignedStudentIds = Array.from(cur);
          saveData(d);
        });
      });

      tr.querySelector('.btn-warning')?.addEventListener('click', () => openModal('edit', s));
      tr.querySelector('.btn-danger-icon')?.addEventListener('click', () => openDelete(s));
      body.appendChild(tr);
    });

    updateSortButtons();
  }

  render();
});
