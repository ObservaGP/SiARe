const STORAGE_KEY = 'siare_data';
const UI_KEY = 'siare_reports_ui';

document.addEventListener('DOMContentLoaded', () => {
  const membersWrap = document.getElementById('reportsMembers');
  const membersEmpty = document.getElementById('reportsMembersEmpty');

  const monthsWrap = document.getElementById('reportsMonths');
  const btnPrevYear = document.getElementById('btnPrevYear');
  const btnNextYear = document.getElementById('btnNextYear');
  const yearLabel = document.getElementById('yearLabel');

  const tasksWrap = document.getElementById('reportsTasks');
  const tasksEmpty = document.getElementById('reportsTasksEmpty');

  const selectionInfo = document.getElementById('reportsSelectionInfo');
  const counterInfo = document.getElementById('reportsCounter');

  if (!membersWrap || !monthsWrap || !tasksWrap) {
    console.error('[SiARe] relatorios: elementos principais não encontrados no HTML.');
    return;
  }

  const MONTHS = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  const CARGO_TO_ROLEKEY = {
    'Coordenador': 'coordenador',
    'Pesquisador': 'pesquisador',
    'Pesquisador Estudante': 'pesquisador_estudante',
    'Pesquisador Externo': 'pesquisador_externo',
  };

  let state = {
    memberKey: null,  // cpfDigits (preferencial)
    memberIndex: null,
    roleKey: null,
    year: null,
    month: null,      // 1..12
  };

  function onlyDigits(s) {
    return String(s || '').replace(/\D/g, '');
  }

  function makeId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getData() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      projeto: {},
      equipe: [],
      atividades: [],
      relatorios: {}
    };
    if (!Array.isArray(raw.equipe)) raw.equipe = [];
    if (!Array.isArray(raw.atividades)) raw.atividades = [];
    if (!raw.relatorios || typeof raw.relatorios !== 'object') raw.relatorios = {};
    return raw;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function ensureActivityIds(data) {
    let changed = false;
    data.atividades.forEach((a) => {
      if (!a.id) {
        a.id = makeId('act');
        changed = true;
      }
    });
    if (changed) saveData(data);
  }

  function getMemberKey(m) {
    const cpf = onlyDigits(m.cpf);
    if (cpf.length === 11) return cpf;
    // fallback: slug simples do nome
    return (m.nome || '').trim().toLowerCase().replace(/\s+/g, '_') || makeId('m');
  }

  function loadUIState() {
    try {
      const raw = JSON.parse(localStorage.getItem(UI_KEY));
      if (raw && typeof raw === 'object') return raw;
    } catch {}
    return null;
  }

  function saveUIState() {
    const out = {
      memberKey: state.memberKey,
      year: state.year,
      month: state.month
    };
    localStorage.setItem(UI_KEY, JSON.stringify(out));
  }

  function computeInitialYear(data) {
    // tenta usar o menor ano de início da equipe, senão ano atual
    const years = data.equipe
      .map(m => (m.inicio || '').slice(0, 4))
      .filter(y => /^\d{4}$/.test(y))
      .map(y => Number(y));
    if (years.length) return Math.min(...years);
    return new Date().getFullYear();
  }

  function setSelectionInfo(data) {
    if (!state.memberKey || !state.year || !state.month) {
      selectionInfo.textContent = 'Selecione um membro e um mês';
      counterInfo.textContent = '';
      return;
    }

    const m = data.equipe[state.memberIndex];
    const mesNome = MONTHS[state.month - 1];
    selectionInfo.textContent = `${m.nome} — ${m.cargo} — ${mesNome}/${state.year}`;
  }

  function renderMembers(data) {
    membersWrap.innerHTML = '';

    if (!data.equipe.length) {
      membersEmpty.classList.remove('hidden');
      return;
    }
    membersEmpty.classList.add('hidden');

    data.equipe.forEach((m, idx) => {
      const key = getMemberKey(m);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'reports-member-card' + (key === state.memberKey ? ' is-selected' : '');
      card.dataset.key = key;
      card.dataset.index = String(idx);

      // layout otimizado em 1 linha (quebra apenas se faltar espaço)
      card.innerHTML = `
        <div class="reports-member-line">
          <span class="reports-member-name">${escapeHtml(m.nome || '')}</span>
          <span class="reports-member-meta reports-member-role">${escapeHtml(m.vinculo || '')} · ${escapeHtml(m.cargo || '')}</span>
          <span class="reports-member-meta reports-member-ch"><strong>C.H.</strong> c/ bolsa: ${escapeHtml(m.chBolsa || '')}h · s/ bolsa: ${escapeHtml(m.chSemBolsa || '')}h</span>
        </div>
      `;

      membersWrap.appendChild(card);
    });
  }

  function getAllIndexById(data) {
    const map = new Map();
    data.atividades.forEach((a, idx) => map.set(a.id, idx + 1));
    return map;
  }

  function getMarkedNumsForMonth(data, memberKey, year, month, allIndexById) {
    if (!memberKey) return [];
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const map = data.relatorios?.[memberKey]?.[monthKey] || {};
    const nums = Object.keys(map)
      .filter((id) => !!map[id])
      .map((id) => allIndexById.get(id))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    return nums;
  }

  function renderMonths(data) {
    yearLabel.textContent = String(state.year);

    monthsWrap.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'months-grid';

    // numeração estável: 1..N conforme a página Atividades
    const allIndexById = getAllIndexById(data);

    for (let i = 1; i <= 12; i++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'month-tile' + (i === state.month ? ' is-selected' : '');
      tile.dataset.month = String(i);

      const nums = getMarkedNumsForMonth(data, state.memberKey, state.year, i, allIndexById);
      const preview = nums.length
        ? nums.slice(0, 8).join(' ') + (nums.length > 8 ? ' …' : '')
        : '';

      tile.innerHTML = `
        <div class="month-year">${state.year}</div>
        <div class="month-name">${MONTHS[i - 1]}</div>
        <div class="month-acts">${escapeHtml(preview)}</div>
      `;

      grid.appendChild(tile);
    }

    monthsWrap.appendChild(grid);
  }

  function getRoleActivities(data) {
    if (!state.roleKey) return [];

    const roleKey = state.roleKey;
    const monthKey = `${state.year}-${String(state.month).padStart(2, '0')}`;

    const memberReports = data.relatorios?.[state.memberKey]?.[monthKey] || {};
    const checkedIds = new Set(Object.keys(memberReports).filter(id => memberReports[id]));

    // mostra atividades atribuídas ao cargo, e também as já marcadas (pra não “sumir”)
    const list = [];
    data.atividades.forEach((a) => {
      const assigned = !!(a.atribuicao && a.atribuicao[roleKey]);
      const checked = checkedIds.has(a.id);
      if (assigned || checked) list.push(a);
    });

    return list;
  }

  function renderTasks(data) {
    tasksWrap.innerHTML = '';
    tasksEmpty.classList.add('hidden');

    if (!data.equipe.length) {
      tasksEmpty.classList.add('hidden');
      return;
    }

    if (!state.memberKey || !state.year || !state.month) {
      // ainda não selecionou tudo
      return;
    }

    ensureActivityIds(data);

    const monthKey = `${state.year}-${String(state.month).padStart(2, '0')}`;
    if (!data.relatorios[state.memberKey]) data.relatorios[state.memberKey] = {};
    if (!data.relatorios[state.memberKey][monthKey]) data.relatorios[state.memberKey][monthKey] = {};

    const reportsMap = data.relatorios[state.memberKey][monthKey];

    const roleActs = getRoleActivities(data);

    if (!roleActs.length) {
      tasksEmpty.classList.remove('hidden');
      counterInfo.textContent = '';
      return;
    }

    // numeração: baseada na posição na lista completa de atividades (1..N)
    const allIndexById = getAllIndexById(data);

    let done = 0;

    roleActs.forEach((a) => {
      const num = allIndexById.get(a.id) || 0;
      const checked = !!reportsMap[a.id];
      if (checked) done++;

      const item = document.createElement('label');
      item.className = 'task-item' + (checked ? ' is-checked' : '');
      item.dataset.actId = a.id;

      item.innerHTML = `
        <input class="task-check" type="checkbox" ${checked ? 'checked' : ''} />
        <span class="task-num">${String(num).padStart(2, '0')}</span>
        <span class="task-text">${escapeHtml(a.descricao || '')}</span>
      `;

      tasksWrap.appendChild(item);
    });

    counterInfo.textContent = `${done}/${roleActs.length} marcadas`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // Eventos
  membersWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button.reports-member-card');
    if (!btn) return;

    const key = btn.dataset.key;
    const idx = Number(btn.dataset.index);
    const data = getData();
    const m = data.equipe[idx];

    state.memberKey = key;
    state.memberIndex = idx;
    state.roleKey = CARGO_TO_ROLEKEY[m.cargo] || null;

    saveUIState();
    setSelectionInfo(data);

    renderMembers(data);
    renderMonths(data);
    renderTasks(data);
  });

  monthsWrap.addEventListener('click', (e) => {
    const tile = e.target.closest('button.month-tile');
    if (!tile) return;

    state.month = Number(tile.dataset.month);

    const data = getData();
    saveUIState();
    setSelectionInfo(data);

    renderMonths(data);
    renderTasks(data);
  });

  btnPrevYear.addEventListener('click', () => {
    state.year = Number(state.year) - 1;
    const data = getData();
    saveUIState();
    setSelectionInfo(data);
    renderMonths(data);
    renderTasks(data);
  });

  btnNextYear.addEventListener('click', () => {
    state.year = Number(state.year) + 1;
    const data = getData();
    saveUIState();
    setSelectionInfo(data);
    renderMonths(data);
    renderTasks(data);
  });

  tasksWrap.addEventListener('change', (e) => {
    const chk = e.target.closest('input.task-check');
    if (!chk) return;

    const item = e.target.closest('.task-item');
    if (!item) return;

    const actId = item.dataset.actId;
    const data = getData();

    if (!state.memberKey || !state.year || !state.month) return;

    const monthKey = `${state.year}-${String(state.month).padStart(2, '0')}`;
    if (!data.relatorios[state.memberKey]) data.relatorios[state.memberKey] = {};
    if (!data.relatorios[state.memberKey][monthKey]) data.relatorios[state.memberKey][monthKey] = {};

    data.relatorios[state.memberKey][monthKey][actId] = chk.checked;

    saveData(data);

    // atualiza estilo e contador
    renderTasks(data);
    // atualiza números nos meses
    renderMonths(data);
  });

  // Inicialização
  function init() {
    const data = getData();
    ensureActivityIds(data);

    const ui = loadUIState();

    state.year = ui?.year ? Number(ui.year) : computeInitialYear(data);

    // mês inicial: do UI, senão mês atual
    const now = new Date();
    state.month = ui?.month ? Number(ui.month) : (now.getMonth() + 1);

    // membro inicial: do UI, senão primeiro
    if (data.equipe.length) {
      const idx = ui?.memberKey
        ? data.equipe.findIndex(m => getMemberKey(m) === ui.memberKey)
        : 0;

      const chosenIdx = (idx >= 0) ? idx : 0;
      const m = data.equipe[chosenIdx];

      state.memberIndex = chosenIdx;
      state.memberKey = getMemberKey(m);
      state.roleKey = CARGO_TO_ROLEKEY[m.cargo] || null;
    }

    renderMembers(data);
    renderMonths(data);
    setSelectionInfo(data);
    renderTasks(data);
  }

  init();
});
