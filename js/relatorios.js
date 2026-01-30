/* =========================================================
   SiARe — Relatórios
   Seleção de membro + mês + marcação de atividades
   (armazenamento em localStorage)
   ========================================================= */

window.SIARE_RELATORIOS_LOADED = true;
console.log('[SiARe] SIARE_RELATORIOS_V=2026-01-28f');

const STORAGE_KEY = 'siare_data';
const UI_KEY = 'siare_ui_relatorios';

const MONTHS = [
  'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'
];

function onlyDigits(v) {
  return String(v ?? '').replace(/\D/g, '');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmtDateBR(iso) {
  if (!iso) return '';
  const parts = String(iso).split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { projeto: {}, equipe: [], atividades: [], relatorios: {} };
  }

  try {
    const data = JSON.parse(raw) || {};
    data.projeto ??= {};
    data.equipe = Array.isArray(data.equipe) ? data.equipe : [];
    data.atividades = Array.isArray(data.atividades) ? data.atividades : [];
    data.relatorios = (data.relatorios && typeof data.relatorios === 'object') ? data.relatorios : {};

    const changed = migrateMembersAndReports(data);
    if (changed) saveData(data);

    return data;
  } catch {
    return { projeto: {}, equipe: [], atividades: [], relatorios: {} };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadUIState() {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveUIState(state) {
  localStorage.setItem(UI_KEY, JSON.stringify({
    memberKey: state.memberKey || '',
    year: state.year,
    month: state.month
  }));
}

function ensureMemberId(m) {
  if (!m) return '';

  const cpf = onlyDigits(m.cpf);
  const versaoRaw = onlyDigits(m.versaoVinculo ?? m.versao ?? '');
  const versao = (versaoRaw || '00').slice(0, 2).padStart(2, '0');

  if (cpf.length === 11) {
    const id = `${cpf}-${versao}`;
    if (!m.versaoVinculo) m.versaoVinculo = versao;
    if (!m.id) m.id = id;
    return m.id;
  }

  if (m.id) return m.id;

  const base = (m.nome || 'membro')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'membro';

  m.id = `${base}-${Math.random().toString(16).slice(2, 8)}`;
  return m.id;
}

function migrateMembersAndReports(data) {
  let changed = false;

  const map = Object.create(null); // oldKey -> newKey

  for (const m of data.equipe) {
    if (!m) continue;

    const cpf = onlyDigits(m.cpf);
    const oldKeyCandidates = [];
    if (m.id) oldKeyCandidates.push(m.id);
    if (cpf.length === 11) oldKeyCandidates.push(cpf); // legado
    if (m.nome) oldKeyCandidates.push(String(m.nome).toLowerCase()); // fallback legado

    const oldKey = oldKeyCandidates[0] || '';

    const beforeId = m.id;
    const newKey = ensureMemberId(m);
    if (beforeId !== m.id) changed = true;

    if (oldKey && newKey && oldKey !== newKey) {
      map[oldKey] = newKey;
      if (cpf.length === 11 && cpf !== newKey) {
        // também mapeia a chave legado (cpf puro)
        map[cpf] = newKey;
      }
    }
  }

  // migra relatórios do legado (cpf puro) para id cpf-versão
  for (const oldKey of Object.keys(map)) {
    const newKey = map[oldKey];
    if (!oldKey || !newKey || oldKey === newKey) continue;
    if (!data.relatorios[oldKey]) continue;

    const src = data.relatorios[oldKey] || {};
    const dst = data.relatorios[newKey] || {};

    for (const monthKey of Object.keys(src)) {
      if (!dst[monthKey]) {
        dst[monthKey] = src[monthKey];
      } else {
        const s = src[monthKey];
        const d = dst[monthKey];
        if (s && typeof s === 'object' && d && typeof d === 'object') {
          for (const actId of Object.keys(s)) {
            if (d[actId] === undefined) d[actId] = s[actId];
          }
        }
      }
    }

    data.relatorios[newKey] = dst;
    delete data.relatorios[oldKey];
    changed = true;
  }

  // migra UI state (memberKey)
  try {
    const ui = loadUIState();
    if (ui?.memberKey && map[ui.memberKey]) {
      ui.memberKey = map[ui.memberKey];
      localStorage.setItem(UI_KEY, JSON.stringify(ui));
      changed = true;
    }
  } catch {
    // ignore
  }

  return changed;
}

function roleKeyFromCargo(cargo) {
  const c = String(cargo || '').toLowerCase();
  if (c.includes('coordenador')) return 'coord';
  if (c.includes('pesquisador estudante')) return 'pesqEst';
  if (c.includes('pesquisador externo')) return 'pesqExt';
  // default: pesquisador
  return 'pesq';
}

function getMemberByKey(data, memberKey) {
  return data.equipe.find(m => ensureMemberId(m) === memberKey) || null;
}

function getMonthKey(year, month) {
  return `${year}-${pad2(month)}`;
}

function getActivityIndexMap(data) {
  const map = Object.create(null);
  const list = Array.isArray(data.atividades) ? data.atividades : [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a?.id) continue;
    map[String(a.id)] = i + 1; // 1-based
  }
  return map;
}

function getMarkedActIds(monthObj) {
  if (!monthObj || typeof monthObj !== 'object') return [];
  return Object.keys(monthObj)
    .filter(actId => monthObj[actId])
    .map(actId => String(actId));
}

function getMarkedNumsForMonth(data, memberKey, year, month, indexMap) {
  const mk = getMonthKey(year, month);
  const monthObj = data.relatorios?.[memberKey]?.[mk] || {};

  const ids = getMarkedActIds(monthObj);
  const nums = ids
    .map(id => indexMap[id])
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b);

  return nums.map(n => pad2(n));
}

function formatNumsForCell(nums, maxItems = 6) {
  if (!nums?.length) return '';
  if (nums.length <= maxItems) return nums.join(' ');
  return `${nums.slice(0, maxItems).join(' ')} …`;
}

function getApplicableActivitiesForMember(data, member) {
  const roleKey = roleKeyFromCargo(member?.cargo);
  const list = Array.isArray(data.atividades) ? data.atividades : [];

  return list
    .filter(a => a?.roles && a.roles[roleKey])
    .map(a => ({
      id: String(a.id),
      nome: a.nome || a.descricao || ''
    }));
}

function countCheckedInMonth(data, memberKey, year, month) {
  const mk = getMonthKey(year, month);
  const monthObj = data.relatorios?.[memberKey]?.[mk] || {};
  return getMarkedActIds(monthObj).length;
}

function ensureReportMonthObj(data, memberKey, year, month) {
  data.relatorios ??= {};
  data.relatorios[memberKey] ??= {};

  const mk = getMonthKey(year, month);
  data.relatorios[memberKey][mk] ??= {};

  return data.relatorios[memberKey][mk];
}

// ---------------- UI ----------------
document.addEventListener('DOMContentLoaded', () => {
  const membersWrap = document.getElementById('reportsMembers');
  const membersEmpty = document.getElementById('reportsMembersEmpty');

  const monthsWrap = document.getElementById('reportsMonths');
  const yearLabel = document.getElementById('yearLabel');
  const btnPrevYear = document.getElementById('btnPrevYear');
  const btnNextYear = document.getElementById('btnNextYear');

  const tasksWrap = document.getElementById('reportsTasks');
  const tasksEmpty = document.getElementById('reportsTasksEmpty');
  const selectionInfo = document.getElementById('reportsSelectionInfo');
  const counter = document.getElementById('reportsCounter');

  const dashboardTable = document.getElementById('reportsDashboard');

  const state = {
    memberKey: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  };

  const data = getData();
  const activityIndexMap = getActivityIndexMap(data);

  // Restore UI
  const ui = loadUIState();
  if (ui) {
    if (typeof ui.year === 'number') state.year = ui.year;
    if (typeof ui.month === 'number') state.month = ui.month;
    if (typeof ui.memberKey === 'string') state.memberKey = ui.memberKey;
  }

  // Default member
  if (!state.memberKey && data.equipe.length) {
    state.memberKey = ensureMemberId(data.equipe[0]);
  }

  // Sanity
  if (state.month < 1 || state.month > 12) state.month = 1;

  function setSelectionInfo() {
    if (!state.memberKey) {
      selectionInfo.textContent = 'Selecione um membro e um mês';
      counter.textContent = '';
      return;
    }

    const member = getMemberByKey(data, state.memberKey);
    const cargo = member?.cargo || '';
    selectionInfo.textContent = `${member?.nome || '—'} — ${cargo || '—'} — ${MONTHS[state.month - 1]}/${state.year}`;

    const checked = countCheckedInMonth(data, state.memberKey, state.year, state.month);
    counter.textContent = `${checked} marcadas`;
  }

  function renderMembers() {
    if (!data.equipe.length) {
      membersWrap.innerHTML = '';
      membersEmpty.classList.remove('hidden');
      return;
    }
    membersEmpty.classList.add('hidden');

    const html = data.equipe
      .map((m, idx) => {
        const key = ensureMemberId(m);
        const isActive = key === state.memberKey;

        const roleLabel = `${m.vinculo || '—'} · ${m.cargo || '—'}`;
        const chLabel = `C.H. c/ bolsa: ${pad2(m.chBolsa ?? '00')}h · s/ bolsa: ${pad2(m.chSemBolsa ?? '00')}h`;
        const dateRange = (m.inicio && m.fim) ? `${fmtDateBR(m.inicio)} – ${fmtDateBR(m.fim)}` : '';
        const rightLabel = dateRange ? `${chLabel} | ${dateRange}` : chLabel;

        return `
          <button type="button" class="reports-member-card ${isActive ? 'is-selected' : ''}" data-index="${idx}" data-key="${key}">
            <div class="reports-member-line">
              <div class="reports-member-name">${m.nome || '—'}</div>
              <div class="reports-member-role">${roleLabel}</div>
              <div class="reports-member-ch">${rightLabel}</div>
            </div>
          </button>
        `;
      })
      .join('');

    membersWrap.innerHTML = html;

    // Click handlers
    membersWrap.querySelectorAll('button.reports-member-card').forEach(btn => {
      const key = btn.getAttribute('data-key') || '';
      btn.addEventListener('click', () => {
        state.memberKey = key;
        saveUIState(state);
        renderMembers();
        renderMonths();
        renderTasks();
        renderDashboard();
        setSelectionInfo();
      });
    });
  }

  function renderMonths() {
    yearLabel.textContent = String(state.year);

    const memberKey = state.memberKey;
    const tiles = MONTHS.map((name, i) => {
      const month = i + 1;
      const isActive = month === state.month;

      let nums = [];
      if (memberKey) {
        nums = getMarkedNumsForMonth(data, memberKey, state.year, month, activityIndexMap);
      }
      const numsTxt = formatNumsForCell(nums, 8);

      return `
        <div class="month-tile ${isActive ? 'is-selected' : ''}" data-month="${month}" role="button" tabindex="0">
          <div class="month-year">${state.year}</div>
          <div class="month-name">${name}</div>
          <div class="month-nums">${numsTxt}</div>
        </div>
      `;
    }).join('');

    monthsWrap.innerHTML = tiles;

    monthsWrap.querySelectorAll('.month-tile').forEach(el => {
      const month = parseInt(el.getAttribute('data-month') || '1', 10);
      el.addEventListener('click', () => {
        state.month = month;
        saveUIState(state);
        renderMonths();
        renderTasks();
        setSelectionInfo();
      });
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          el.click();
        }
      });
    });
  }

  function renderTasks() {
    if (!state.memberKey) {
      tasksWrap.innerHTML = '';
      tasksEmpty.classList.remove('hidden');
      tasksEmpty.innerHTML = 'Selecione um membro.';
      return;
    }

    const member = getMemberByKey(data, state.memberKey);
    if (!member) {
      tasksWrap.innerHTML = '';
      tasksEmpty.classList.remove('hidden');
      tasksEmpty.innerHTML = 'Selecione um membro.';
      return;
    }

    const applicable = getApplicableActivitiesForMember(data, member);

    if (!applicable.length) {
      tasksWrap.innerHTML = '';
      tasksEmpty.classList.remove('hidden');
      return;
    }

    tasksEmpty.classList.add('hidden');

    const monthObj = ensureReportMonthObj(data, state.memberKey, state.year, state.month);

    const rows = applicable.map(a => {
      const n = activityIndexMap[a.id];
      const num = Number.isFinite(n) ? pad2(n) : '--';
      const checked = !!monthObj[a.id];

      return `
        <label class="task-row" data-act="${a.id}">
          <span class="task-check"><input type="checkbox" ${checked ? 'checked' : ''} /></span>
          <span class="task-num">${num}</span>
          <span class="task-name">${a.nome || ''}</span>
        </label>
      `;
    }).join('');

    tasksWrap.innerHTML = `<div class="tasks-list">${rows}</div>`;

    // Events
    tasksWrap.querySelectorAll('.task-row input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', (ev) => {
        const row = ev.target.closest('.task-row');
        const actId = row?.getAttribute('data-act');
        if (!actId) return;

        const monthObj = ensureReportMonthObj(data, state.memberKey, state.year, state.month);
        if (ev.target.checked) {
          monthObj[actId] = true;
        } else {
          delete monthObj[actId];
        }

        saveData(data);
        setSelectionInfo();
        renderMonths();
        renderDashboard();
      });
    });

    setSelectionInfo();
  }

  function renderDashboard() {
    if (!dashboardTable) return;

    if (!data.equipe.length) {
      dashboardTable.innerHTML = '<tbody><tr><td class="text-muted">Nenhum membro cadastrado.</td></tr></tbody>';
      return;
    }

    const header = `
      <thead>
        <tr>
          <th class="dash-sticky-col">Equipe / Cargo</th>
          <th class="dash-sticky-col dash-year">Ano</th>
          ${MONTHS.map(m => `<th class="dash-month">${m}</th>`).join('')}
        </tr>
      </thead>
    `;

    const bodyRows = data.equipe.map((m) => {
      const key = ensureMemberId(m);
      const isActive = key === state.memberKey;

      const cells = MONTHS.map((_, i) => {
        const month = i + 1;
        const nums = getMarkedNumsForMonth(data, key, state.year, month, activityIndexMap);
        const txt = formatNumsForCell(nums, 8);
        return `<td class="dash-cell" title="${txt}">${txt}</td>`;
      }).join('');

      return `
        <tr class="${isActive ? 'is-selected' : ''}" data-key="${key}">
          <td class="dash-sticky-col dash-name" title="${(m.nome || '') + (m.cargo ? ' — ' + m.cargo : '')}">${(m.nome || '—') + (m.cargo ? ' — ' + m.cargo : '')}</td>
          <td class="dash-sticky-col dash-year">${state.year}</td>
          ${cells}
        </tr>
      `;
    }).join('');

    dashboardTable.innerHTML = `${header}<tbody>${bodyRows}</tbody>`;
  }

  // Year controls
  btnPrevYear.addEventListener('click', () => {
    state.year -= 1;
    saveUIState(state);
    renderMonths();
    renderTasks();
    renderDashboard();
    setSelectionInfo();
  });

  btnNextYear.addEventListener('click', () => {
    state.year += 1;
    saveUIState(state);
    renderMonths();
    renderTasks();
    renderDashboard();
    setSelectionInfo();
  });

  // Initial render
  renderMembers();
  renderMonths();
  renderTasks();
  renderDashboard();
  setSelectionInfo();
});
