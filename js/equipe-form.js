const STORAGE_KEY = 'siare_data';
window.SIARE_FORM_LOADED = true;

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const form = $('equipeForm');
  if (!form) return;

  const formTitle = $('formTitle');

  const nome = $('nome');
  const cpf = $('cpf');
  const vinculo = $('vinculo');
  const siape = $('siape');
  const cargo = $('cargo');
  const forma = $('forma');
  const chBolsa = $('chBolsa');
  const chSemBolsa = $('chSemBolsa');
  const inicio = $('inicio');
  const fim = $('fim');
  const tipoVinculo = $('tipoVinculo');
  const valorBolsa = $('valorBolsa');
  const versao = $('versaoVinculo');
  const observacao = $('observacao');

  const saveInfo = $('saveInfo');
  const modal = $('confirmModal');
  const btnNao = $('btnNao');
  const btnSim = $('btnSim');
  const btnDuplicar = $('btnDuplicar');

  const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
  const pad2 = (v) => onlyDigits(v).padStart(2, '0');

  // Sufixo de duplicação (A, B, ..., Z, AA, AB...)
  function suffixToNumber(s) {
    const up = String(s || '').trim().toUpperCase();
    if (!/^[A-Z]+$/.test(up)) return null;
    let n = 0;
    for (const ch of up) n = n * 26 + (ch.charCodeAt(0) - 64); // A=1
    return n;
  }

  function numberToSuffix(n) {
    let num = Number(n);
    if (!Number.isFinite(num) || num < 1) return null;
    let out = '';
    while (num > 0) {
      const r = (num - 1) % 26;
      out = String.fromCharCode(65 + r) + out;
      num = Math.floor((num - 1) / 26);
    }
    return out;
  }

  function parseIdKey(idKey) {
    const raw = String(idKey || '');
    const parts = raw.split('-');
    const cpfDigits = parts[0] || '';
    const version2 = parts[1] || '';
    const suffix = parts.length >= 3 ? parts.slice(2).join('-') : '';
    return { cpfDigits, version2, suffix };
  }

  function nextDuplicateSuffix(data, baseId) {
    // baseId = CPF-00 (sem sufixo)
    let maxN = 1; // base sem sufixo conta como A (1)
    (data.equipe || []).forEach((m) => {
      const k = String(m?.idKey || '');
      if (k === baseId) {
        maxN = Math.max(maxN, 1);
        return;
      }
      if (k.startsWith(baseId + '-')) {
        const suf = k.slice((baseId + '-').length);
        const n = suffixToNumber(suf);
        if (n) maxN = Math.max(maxN, n);
      }
    });
    return numberToSuffix(maxN + 1); // B, C, ...
  }

  const getData = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEY)) || { equipe: [] };

  const saveData = (d) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

  // ========= MODO EDIÇÃO =========
  let editMode = false;
  let editIndex = null;
  let currentIdKey = null;
  let currentSuffix = '';

  function loadEditFromURL() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('edit');
    if (raw === null) return;

    const idx = Number(raw);
    const data = getData();

    if (!Number.isInteger(idx) || idx < 0 || idx >= (data.equipe?.length || 0)) {
      // parâmetro inválido => permanece em modo cadastro
      return;
    }

    const m = data.equipe[idx];
    if (!m) return;

    editMode = true;
    editIndex = idx;
    currentIdKey = m.idKey || null;
    currentSuffix = parseIdKey(currentIdKey).suffix || '';

    if (btnDuplicar) btnDuplicar.classList.remove('hidden');

    if (formTitle) formTitle.textContent = 'Editar Membro da Equipe';

    // Preenche campos
    nome.value = m.nome || '';
    cpf.value = m.cpf || '';
    vinculo.value = m.vinculo || '';
    siape.value = m.siape || '';
    cargo.value = m.cargo || '';
    forma.value = m.forma || '';
    chBolsa.value = m.chBolsa || '';
    chSemBolsa.value = m.chSemBolsa || '';
    inicio.value = m.inicio || '';
    fim.value = m.fim || '';
    tipoVinculo.value = m.tipoVinculo || '';
    valorBolsa.value = m.valorBolsa || '';
    versao.value = m.versaoVinculo || (String(m.idKey || '').split('-')[1] || '');
    observacao.value = m.observacao || '';

    // Garante formatação visual mínima
    if (versao.value) versao.value = pad2(versao.value);
    if (chBolsa.value) chBolsa.value = pad2(chBolsa.value);
    if (chSemBolsa.value) chSemBolsa.value = pad2(chSemBolsa.value);

    saveInfo.textContent = `Editando: ${m.idKey || ''}`;
  }

  // ========= Máscaras =========

  /* CPF */
  cpf.addEventListener('input', () => {
    let v = onlyDigits(cpf.value).slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    cpf.value = v;
  });

  /* SIAPE */
  siape.addEventListener('input', () => {
    siape.value = onlyDigits(siape.value).slice(0, 9);
  });
  siape.addEventListener('blur', () => {
    if (siape.value) siape.value = siape.value.padStart(9, '0');
  });

  /* Campos numéricos CH / versão */
  [chBolsa, chSemBolsa, versao].forEach((input) => {
    input.addEventListener('input', () => {
      input.value = onlyDigits(input.value).slice(0, 2);
    });
    input.addEventListener('blur', () => {
      if (input.value) input.value = pad2(input.value);
    });
  });

  // ========= Modal (substituição por ID) =========
  // pending.kind:
  //  - 'create_overwrite': cadastro novo tentando salvar ID já existente
  //  - 'edit_collision': edição alterou CPF/versão para um ID já existente em outro registro
  let pending = null;

  btnNao.onclick = () => {
    modal.classList.add('hidden');
    pending = null;
  };

  btnSim.onclick = () => {
    if (!pending) return;

    const { kind, data, novo } = pending;

    if (kind === 'create_overwrite') {
      data.equipe[pending.targetIndex] = novo;
      saveData(data);
      saveInfo.textContent = 'Registro ATUALIZADO (substituído)';
      modal.classList.add('hidden');
      pending = null;
      return;
    }

    if (kind === 'edit_collision') {
      // Remove o registro que conflita e atualiza o registro em edição
      const collisionIdx = pending.collisionIndex;
      let idx = pending.editIndex;

      // Remove primeiro o conflito para manter unicidade
      if (Number.isInteger(collisionIdx) && collisionIdx >= 0 && collisionIdx < data.equipe.length) {
        data.equipe.splice(collisionIdx, 1);
        if (collisionIdx < idx) idx -= 1;
      }

      data.equipe[idx] = novo;
      saveData(data);

      modal.classList.add('hidden');
      pending = null;

      saveInfo.textContent = 'Registro ATUALIZADO (conflito resolvido)';
      window.location.href = 'equipe.html';
      return;
    }
  };


  // ========= Duplicar (apenas em edição) =========
  if (btnDuplicar) {
    btnDuplicar.addEventListener('click', () => {
      if (!editMode || !Number.isInteger(editIndex)) return;

      const data = getData();
      if (!Array.isArray(data.equipe)) data.equipe = [];
      const original = data.equipe[editIndex];
      if (!original) return;

      const cpfDigits = onlyDigits(original.cpf);
      const version2 = pad2(original.versaoVinculo || (String(original.idKey || '').split('-')[1] || '00'));
      const baseId = `${cpfDigits}-${version2}`;

      const suf = nextDuplicateSuffix(data, baseId); // B, C, ...
      const newIdKey = `${baseId}-${suf}`;

      const clone = JSON.parse(JSON.stringify(original));
      clone.idKey = newIdKey;
      clone.versaoVinculo = version2;

      // mantém os campos textuais do clone como estão
      const insertAt = editIndex + 1;
      data.equipe.splice(insertAt, 0, clone);
      saveData(data);

      // abre o clone para edição
      window.location.href = `equipe-form.html?edit=${insertAt}`;
    });
  }

  // ========= Submit =========
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const cpfDigits = onlyDigits(cpf.value);
    if (cpfDigits.length !== 11) return;
    const version2 = pad2(versao.value);
    let idKey = `${cpfDigits}-${version2}`;

    // Se estiver editando um registro duplicado (com sufixo), preserva o sufixo
    if (editMode && currentSuffix) {
      idKey = `${cpfDigits}-${version2}-${currentSuffix}`;
    }

    const novo = {
      idKey,
      nome: nome.value.trim(),
      cpf: cpf.value,
      vinculo: vinculo.value,
      siape: siape.value,
      cargo: cargo.value,
      forma: forma.value,
      chBolsa: pad2(chBolsa.value),
      chSemBolsa: pad2(chSemBolsa.value),
      inicio: inicio.value,
      fim: fim.value,
      tipoVinculo: tipoVinculo.value.trim(),
      valorBolsa: valorBolsa.value.trim(),
      versaoVinculo: version2,
      observacao: observacao.value.trim()
    };

    const data = getData();
    if (!Array.isArray(data.equipe)) data.equipe = [];

    // "Ativo" default: true. Em edição/sobrescrita, preserva se já existir.
    if (editMode && Number.isInteger(editIndex)) {
      const prev = data.equipe[editIndex];
      novo.ativo = (typeof prev?.ativo === 'boolean') ? prev.ativo : true;
    } else {
      const existing = data.equipe.find((m) => m.idKey === idKey);
      novo.ativo = (typeof existing?.ativo === 'boolean') ? existing.ativo : true;
    }

    // ====== EDIÇÃO ======
    if (editMode && Number.isInteger(editIndex)) {
      // Se existir outro registro com o mesmo ID, é conflito (não é o próprio registro)
      const collisionIdx = data.equipe.findIndex((m, i) => i !== editIndex && m.idKey === idKey);

      if (collisionIdx !== -1) {
        // pergunta se quer substituir (mantendo unicidade)
        pending = { kind: 'edit_collision', data, novo, collisionIndex: collisionIdx, editIndex };
        modal.classList.remove('hidden');
        return;
      }

      data.equipe[editIndex] = novo;
      saveData(data);
      saveInfo.textContent = 'Registro ATUALIZADO';
      window.location.href = 'equipe.html';
      return;
    }

    // ====== CADASTRO NOVO ======
    const idx = data.equipe.findIndex((m) => m.idKey === idKey);
    if (idx !== -1) {
      pending = { kind: 'create_overwrite', data, novo, targetIndex: idx };
      modal.classList.remove('hidden');
      return;
    }

    data.equipe.push(novo);
    saveData(data);
    saveInfo.textContent = 'Registro SALVO';
    form.reset();
  });

  // Inicializa modo edição, se houver
  loadEditFromURL();
});
