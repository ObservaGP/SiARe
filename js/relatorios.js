const STORAGE_KEY = 'siare_data';
const UI_KEY = 'siare_reports_ui';

document.addEventListener('DOMContentLoaded', () => {
  // ======= Elementos (Atribuição) =======
  const membersWrap = document.getElementById('reportsMembers');
  const membersEmpty = document.getElementById('reportsMembersEmpty');

  const assignWrap = document.getElementById('reportsAssignTasks');
  const assignEmpty = document.getElementById('reportsAssignEmpty');
  const assignTitle = document.getElementById('assignTitle');
  const assignCounter = document.getElementById('assignCounter');

  const btnPrevAssignMonth = document.getElementById('btnPrevAssignMonth');
  const btnNextAssignMonth = document.getElementById('btnNextAssignMonth');
  const assignMonthLabel = document.getElementById('assignMonthLabel');

  // ======= Elementos (Mês – seletor) =======
  const monthsWrap = document.getElementById('reportsMonthsSelect');
  const btnPrevYear = document.getElementById('btnPrevYear');
  const btnNextYear = document.getElementById('btnNextYear');
  const yearLabel = document.getElementById('yearLabel');
  const monthsSelectionInfo = document.getElementById('monthsSelectionInfo');

  // ======= Elementos (Painel anual) =======
  const panelWrap = document.getElementById('panelMonths');
  const btnPrevPanelYear = document.getElementById('btnPrevPanelYear');
  const btnNextPanelYear = document.getElementById('btnNextPanelYear');
  const panelYearLabel = document.getElementById('panelYearLabel');

  if (!membersWrap || !assignWrap || !monthsWrap || !panelWrap) {
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
    memberKey: null,
    memberIndex: null,
    roleKey: null,
    year: null,
    month: null,       // 1..12 (mês atual para atribuição e seletor)
    panelYear: null    // ano do Painel de Atividades
  };

  /* ======================
     Util
     ====================== */
  function onlyDigits(s) {
    return String(s || '').replace(/\D/g, '');
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function monthKey(year, month) {
    return `${year}-${pad2(month)}`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function makeId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getData() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      projeto: {},
      equipe: [],
      atividades: [],
      relatorios: {},
      atribuicoes: {}
    };

    if (!Array.isArray(raw.equipe)) raw.equipe = [];
    if (!Array.isArray(raw.atividades)) raw.atividades = [];
    if (!raw.relatorios || typeof raw.relatorios !== 'object') raw.relatorios = {};
    if (!raw.atribuicoes || typeof raw.atribuicoes !== 'object') raw.atribuicoes = {};

    // MIGRAÇÃO: atribuicoes antigas (actId->bool) viram template '*' por membro
    raw.equipe.forEach((m) => {
      const mk = getMemberKey(m);
      const obj = raw.atribuicoes[mk];
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const keys = Object.keys(obj);
        const looksMonthly = keys.some(k => /^\d{4}-\d{2}$/.test(k) || k === '*');
        if (!looksMonthly && keys.length) {
          raw.atribuicoes[mk] = { '*': obj };
        }
      }
    });

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
    // Preferência: ID único do registro (CPF + versão), se existir
    const idKey = String(m.idKey || m.id || m.registroId || m.idRegistro || m.registro || '').trim();
    if (idKey) return idKey;

    const digits = onlyDigits(m.cpf);
    if (digits.length >= 11) {
      const cpf11 = digits.slice(0, 11);

      // Se tiver versão explícita, usa CPF-XX
      const vRaw = onlyDigits(m.versaoVinculo || m.versao || m.versao_vinculo || '');
      const v2 = vRaw ? vRaw.slice(-2).padStart(2, '0') : '';

      // Se o próprio campo CPF veio como CPF+versão (13 dígitos), preserva como CPF-XX
      if (!v2 && digits.length >= 13) {
        return `${cpf11}-${digits.slice(11, 13)}`;
      }

      if (v2) return `${cpf11}-${v2}`;
      return cpf11;
    }

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
      month: state.month,
      panelYear: state.panelYear
    };
    localStorage.setItem(UI_KEY, JSON.stringify(out));
  }

  function computeInitialYear(data) {
    const years = data.equipe
      .map(m => (m.inicio || '').slice(0, 4))
      .filter(y => /^\d{4}$/.test(y))
      .map(y => Number(y));
    if (years.length) return Math.min(...years);
    return new Date().getFullYear();
  }

  function getRoleKeyForMember(member) {
    return CARGO_TO_ROLEKEY[member?.cargo] || null;
  }

  function getRoleActivities(data, roleKey) {
    if (!roleKey) return [];
    return data.atividades.filter(a => !!(a.atribuicao && a.atribuicao[roleKey]));
  }

  /* ======================
     Atribuição (mensal)
     ====================== */
  function getAssignmentsBucket(data, memberKey) {
    if (!data.atribuicoes[memberKey] || typeof data.atribuicoes[memberKey] !== 'object') {
      data.atribuicoes[memberKey] = {};
    }
    return data.atribuicoes[memberKey];
  }

  function isAssignedMonthly(data, memberKey, y, m, actId) {
    const bucket = data.atribuicoes?.[memberKey] || {};
    const mk = monthKey(y, m);
    const monthMap = bucket[mk] || {};
    return !!monthMap[actId];
  }

  function setAssignedMonthly(data, memberKey, y, m, actId, value) {
    const bucket = getAssignmentsBucket(data, memberKey);
    const mk = monthKey(y, m);
    if (!bucket[mk] || typeof bucket[mk] !== 'object') bucket[mk] = {};
    bucket[mk][actId] = !!value;
  }

  function renderAssignMonthLabel() {
    if (!assignMonthLabel) return;
    assignMonthLabel.textContent = `${MONTHS[state.month - 1]}/${state.year}`;
  }

  function renderAssignList(data) {
    assignWrap.innerHTML = '';
    assignEmpty.classList.add('hidden');

    if (!data.equipe.length) {
      assignEmpty.classList.remove('hidden');
      assignEmpty.textContent = 'Nenhum membro cadastrado.';
      assignTitle.textContent = 'Selecione um membro';
      assignCounter.textContent = '';
      return;
    }

    if (!state.memberKey || !state.roleKey) {
      assignEmpty.classList.remove('hidden');
      assignEmpty.textContent = 'Selecione um membro para continuar.';
      assignTitle.textContent = 'Selecione um membro';
      assignCounter.textContent = '';
      return;
    }

    const roleActs = getRoleActivities(data, state.roleKey);

    if (!roleActs.length) {
      assignEmpty.classList.remove('hidden');
      assignEmpty.textContent = 'Nenhuma atividade disponível para este perfil.';
      assignTitle.textContent = 'Atividades do perfil';
      assignCounter.textContent = '';
      return;
    }

    let done = 0;
    roleActs.forEach((a, idx) => {
      const checked = isAssignedMonthly(data, state.memberKey, state.year, state.month, a.id);
      if (checked) done++;

      const item = document.createElement('label');
      item.className = 'assign-item' + (checked ? ' is-checked' : '');
      item.dataset.actId = a.id;

      item.innerHTML = `
        <input class="assign-check" type="checkbox" ${checked ? 'checked' : ''} />
        <span class="assign-num">${String(idx + 1).padStart(2, '0')}</span>
        <span class="assign-text">${escapeHtml(a.descricao || '')}</span>
      `;

      assignWrap.appendChild(item);
    });

    assignTitle.textContent = 'Atividades disponíveis para o perfil';
    assignCounter.textContent = `${done}/${roleActs.length} atribuídas`;
  }

  function moveMonth(delta) {
    // delta: +1 ou -1
    let y = state.year;
    let m = state.month + delta;
    if (m <= 0) { m = 12; y -= 1; }
    if (m >= 13) { m = 1; y += 1; }
    state.year = y;
    state.month = m;
  }

  /* ======================
     Mês (seletor 4x3)
     ====================== */
  function getAllIndexById(data) {
    const map = new Map();
    data.atividades.forEach((a, idx) => map.set(a.id, idx + 1));
    return map;
  }

  function getMarkedNumsForMonth(data, memberKey, year, month, allIndexById) {
    // Agora: usa as ATRIBUIÇÕES do mês (não "relatórios" de realizado)
    if (!memberKey) return [];
    const mk = monthKey(year, month);
    const bucket = data.atribuicoes?.[memberKey] || {};
    const map = bucket[mk] || {};
    const nums = Object.keys(map)
      .filter((id) => !!map[id])
      .map((id) => allIndexById.get(id))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    return nums;
  }

  function renderMonthsSelector(data) {
    yearLabel.textContent = String(state.year);

    monthsWrap.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'months-grid';

    const allIndexById = getAllIndexById(data);

    for (let i = 1; i <= 12; i++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'month-tile' + (i === state.month ? ' is-selected' : '');
      tile.dataset.month = String(i);

      const nums = getMarkedNumsForMonth(data, state.memberKey, state.year, i, allIndexById);
      const formatted = nums.map(n => String(n).padStart(2, '0'));
      const preview = (state.memberKey && formatted.length)
        ? formatted.slice(0, 10).join(' ') + (formatted.length > 10 ? ' …' : '')
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

  function renderMonthsSelectionInfo(data) {
    if (!monthsSelectionInfo) return;
    if (!state.memberKey || state.memberIndex == null) {
      monthsSelectionInfo.textContent = 'Selecione um membro acima';
      return;
    }
    const m = data.equipe[state.memberIndex];
    monthsSelectionInfo.textContent = `${m.nome} — ${m.cargo}`;
  }

  /* ======================
     Painel de Atividades (ano)
     ====================== */
  function hasAnyAssignmentForMonth(data, memberKey, y, m) {
    const bucket = data.atribuicoes?.[memberKey] || {};
    const mk = monthKey(y, m);
    const monthMap = bucket[mk] || {};
    return Object.values(monthMap).some(v => !!v);
  }

  function renderPanel(data) {
    panelYearLabel.textContent = String(state.panelYear);

    panelWrap.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'months-grid';

    for (let i = 1; i <= 12; i++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'month-tile panel-month-tile';
      tile.dataset.month = String(i);

      const members = [];
      data.equipe.forEach((m) => {
        const mk = getMemberKey(m);
        if (hasAnyAssignmentForMonth(data, mk, state.panelYear, i)) {
          members.push(m.nome || '—');
        }
      });

      const membersHtml = members.length
        ? members.map(n => `<div>${escapeHtml(n)}</div>`).join('')
        : `<div class="text-muted">—</div>`;

      tile.innerHTML = `
        <div class="month-year">${state.panelYear}</div>
        <div class="month-name">${MONTHS[i - 1]}</div>
        <div class="month-members">${membersHtml}</div>
      `;

      grid.appendChild(tile);
    }

    panelWrap.appendChild(grid);
  }

  /* ======================
     Render membros
     ====================== */
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

      const inicio = (m.inicio || '').trim();
      const fim = (m.fim || '').trim();
      const range = (inicio || fim) ? `${inicio || '—'} – ${fim || '—'}` : '—';

      card.innerHTML = `
        <div class="reports-member-block">
          <div class="reports-member-name">${escapeHtml(m.nome || '')}</div>
          <div class="reports-member-sub">${escapeHtml(m.cargo || '')} <span class="sep-asterisk">*</span> ${escapeHtml(m.vinculo || '')}</div>
          <div class="reports-member-chline"><strong>C.H.</strong> c/ bolsa: ${escapeHtml(m.chBolsa || '')}h · s/ bolsa: ${escapeHtml(m.chSemBolsa || '')}h</div>
          <div class="reports-member-daterange">${escapeHtml(range)}</div>
        </div>
      `;

      membersWrap.appendChild(card);
    });
  }

  /* ======================
     Eventos
     ====================== */
  membersWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button.reports-member-card');
    if (!btn) return;

    const key = btn.dataset.key;
    const idx = Number(btn.dataset.index);

    const data = getData();
    const m = data.equipe[idx];

    state.memberKey = key;
    state.memberIndex = idx;
    state.roleKey = getRoleKeyForMember(m);

    saveUIState();

    renderMembers(data);
    renderAssignMonthLabel();
    renderAssignList(data);
    renderMonthsSelectionInfo(data);
    renderMonthsSelector(data);
    renderPanel(data);
  });

  // checkbox na lista de atribuição
  assignWrap.addEventListener('change', (e) => {
    const chk = e.target.closest('input.assign-check');
    if (!chk) return;

    const item = e.target.closest('.assign-item');
    if (!item) return;

    const actId = item.dataset.actId;
    const data = getData();

    if (!state.memberKey) return;

    setAssignedMonthly(data, state.memberKey, state.year, state.month, actId, chk.checked);
    saveData(data);

    // atualiza UI
    renderAssignList(data);
    // atualiza imediatamente os previews do quadro "Mês"
    renderMonthsSelector(data);
    renderPanel(data);
  });

  // navegação de mês (atribuição)
  btnPrevAssignMonth?.addEventListener('click', () => {
    moveMonth(-1);
    const data = getData();
    saveUIState();
    renderAssignMonthLabel();
    renderAssignList(data);
    renderMonthsSelectionInfo(data);
    renderMonthsSelector(data);
  });

  btnNextAssignMonth?.addEventListener('click', () => {
    moveMonth(+1);
    const data = getData();
    saveUIState();
    renderAssignMonthLabel();
    renderAssignList(data);
    renderMonthsSelectionInfo(data);
    renderMonthsSelector(data);
  });

  // seletor de mês
  monthsWrap.addEventListener('click', (e) => {
    const tile = e.target.closest('button.month-tile');
    if (!tile) return;

    state.month = Number(tile.dataset.month);

    const data = getData();
    saveUIState();
    renderAssignMonthLabel();
    renderAssignList(data);
    renderMonthsSelector(data);
  });

  // navegação de ano (seletor de mês)
  btnPrevYear?.addEventListener('click', () => {
    state.year = Number(state.year) - 1;
    const data = getData();
    saveUIState();
    renderAssignMonthLabel();
    renderAssignList(data);
    renderMonthsSelectionInfo(data);
    renderMonthsSelector(data);
  });

  btnNextYear?.addEventListener('click', () => {
    state.year = Number(state.year) + 1;
    const data = getData();
    saveUIState();
    renderAssignMonthLabel();
    renderAssignList(data);
    renderMonthsSelectionInfo(data);
    renderMonthsSelector(data);
  });

  // painel anual
  btnPrevPanelYear?.addEventListener('click', () => {
    state.panelYear = Number(state.panelYear) - 1;
    const data = getData();
    saveUIState();
    renderPanel(data);
  });

  btnNextPanelYear?.addEventListener('click', () => {
    state.panelYear = Number(state.panelYear) + 1;
    const data = getData();
    saveUIState();
    renderPanel(data);
  });

  // clique no Painel de Atividades: sincroniza mês/ano com o quadro "Mês" e com a navegação da atribuição
  panelWrap?.addEventListener('click', (e) => {
    const tile = e.target.closest('button.panel-month-tile');
    if (!tile) return;

    const m = Number(tile.dataset.month);
    if (!Number.isFinite(m) || m < 1 || m > 12) return;

    const data = getData();

    // ao clicar no painel, o ano/mês "ativos" passam a ser o do painel
    state.year = Number(state.panelYear);
    state.month = m;

    // se não houver membro selecionado, tenta escolher automaticamente um que tenha atribuições nesse mês
    if (!state.memberKey || state.memberIndex == null) {
      const idx = data.equipe.findIndex(mem => hasAnyAssignmentForMonth(data, getMemberKey(mem), state.year, state.month));
      if (idx >= 0) {
        const mem = data.equipe[idx];
        state.memberIndex = idx;
        state.memberKey = getMemberKey(mem);
        state.roleKey = getRoleKeyForMember(mem);
      }
    }

    saveUIState();

    renderMembers(data);
    renderAssignMonthLabel();
    renderAssignList(data);
    renderMonthsSelectionInfo(data);
    renderMonthsSelector(data);
  });

  /* ======================
     Init
     ====================== */
  function init() {
    const data = getData();
    ensureActivityIds(data);

    const ui = loadUIState();
    state.year = ui?.year ? Number(ui.year) : computeInitialYear(data);

    const now = new Date();
    state.month = ui?.month ? Number(ui.month) : (now.getMonth() + 1);

    state.panelYear = ui?.panelYear ? Number(ui.panelYear) : state.year;

    if (data.equipe.length) {
      const idx = ui?.memberKey
        ? data.equipe.findIndex(m => getMemberKey(m) === ui.memberKey)
        : 0;

      const chosenIdx = (idx >= 0) ? idx : 0;
      const m = data.equipe[chosenIdx];

      state.memberIndex = chosenIdx;
      state.memberKey = getMemberKey(m);
      state.roleKey = getRoleKeyForMember(m);
    }

    renderMembers(data);
    renderAssignMonthLabel();
    renderAssignList(data);
    renderMonthsSelectionInfo(data);
    renderMonthsSelector(data);
    renderPanel(data);
  }

  init();
});
