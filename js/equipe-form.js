const STORAGE_KEY = 'siare_data';
window.SIARE_FORM_LOADED = true;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('equipeForm');
  if (!form) {
    console.error('[SiARe] equipeForm não encontrado. Verifique o id="equipeForm".');
    return;
  }

  // Campos principais
  const nomeInput = document.getElementById('nome');
  const cpfInput = document.getElementById('cpf');
  const vinculoSelect = document.getElementById('vinculo');
  const siapeInput = document.getElementById('siape');
  const cargoSelect = document.getElementById('cargo');
  const formaSelect = document.getElementById('forma');
  const chBolsaInput = document.getElementById('chBolsa');
  const chSemBolsaInput = document.getElementById('chSemBolsa');
  const inicioInput = document.getElementById('inicio');
  const fimInput = document.getElementById('fim');

  // Novos campos
  const tipoVinculoInput = document.getElementById('tipoVinculo');     // obrigatório
  const valorBolsaInput = document.getElementById('valorBolsa');       // opcional
  const versaoVinculoInput = document.getElementById('versaoVinculo'); // obrigatório
  const observacaoInput = document.getElementById('observacao');

  const saveInfo = document.getElementById('saveInfo');
  const confirmModal = document.getElementById('confirmModal');
  const btnNao = document.getElementById('btnNao');
  const btnSim = document.getElementById('btnSim');

  let pendingSubstitution = null;

  const requiredEls = {
    nomeInput, cpfInput, vinculoSelect, siapeInput, cargoSelect, formaSelect,
    chBolsaInput, chSemBolsaInput, inicioInput, fimInput,
    tipoVinculoInput, valorBolsaInput, versaoVinculoInput, observacaoInput,
    saveInfo, confirmModal, btnNao, btnSim
  };
  for (const [k, v] of Object.entries(requiredEls)) {
    if (!v) {
      console.error(`[SiARe] Elemento não encontrado: ${k}. Verifique o id no HTML.`);
      return;
    }
  }

  /* =========================
     Storage
     ========================= */
  function getData() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      projeto: {},
      equipe: [],
      relatorios: {}
    };
    if (!Array.isArray(raw.equipe)) raw.equipe = [];
    if (!raw.relatorios || typeof raw.relatorios !== 'object') raw.relatorios = {};
    return raw;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* =========================
     UI helpers
     ========================= */
  function mostrarInfo(texto, erro = false) {
    saveInfo.textContent = texto;
    saveInfo.style.color = erro ? '#b00020' : '#1f2933';
  }

  function mostrarRegistroSalvo(prefixo = 'Registro SALVO') {
    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR');
    const horaStr = agora.toLocaleTimeString('pt-BR');
    mostrarInfo(`${prefixo} em ${dataStr} às ${horaStr}`);
  }

  function setInvalid(el, msg) {
    el.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    if (msg) el.title = msg;
  }

  function clearInvalid(el) {
    el.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
    el.title = '';
  }

  function onlyDigits(s) {
    return String(s || '').replace(/\D/g, '');
  }

  function padLeft(s, len, ch = '0') {
    const v = String(s || '');
    return v.padStart(len, ch);
  }

  function pad2(d) {
    const x = onlyDigits(d).slice(0, 2);
    return padLeft(x.length ? x : '0', 2, '0');
  }

  /* =========================
     CPF mask
     ========================= */
  function maskCPF(digits) {
    let v = (digits || '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  }

  // ID interna: CPF(dígitos)-Versão(2d)
  function computeIds() {
    const cpfDigits = onlyDigits(cpfInput.value).slice(0, 11);
    const versao = pad2(versaoVinculoInput.value);

    const idKey = (cpfDigits.length === 11) ? `${cpfDigits}-${versao}` : '';
    const idDisplay = (cpfDigits.length === 11) ? `${maskCPF(cpfDigits)}-${versao}` : '';

    return { idKey, idDisplay, cpfDigits, versao };
  }

  /* =========================
     UX + estilo: campos numéricos "como SIAPE"
     - Se tiver valor padrão (ex.: "00"), ao clicar/focar ele some e você digita direto.
     - Se tiver outro valor, seleciona tudo (digitou, substitui).
     - No blur/submit, padStart para 2 dígitos.
     - "00" fica cinza quando não está em foco (classe .is-default no CSS).
     ========================= */
  function setDefaultMuted(input, isDefault) {
    input.classList.toggle('is-default', !!isDefault);
  }

  function refreshDefaultMuted() {
    const active = document.activeElement;
    setDefaultMuted(chBolsaInput, String(chBolsaInput.value || '').trim() === '00' && active !== chBolsaInput);
    setDefaultMuted(chSemBolsaInput, String(chSemBolsaInput.value || '').trim() === '00' && active !== chSemBolsaInput);
    setDefaultMuted(versaoVinculoInput, String(versaoVinculoInput.value || '').trim() === '00' && active !== versaoVinculoInput);
  }

  function enhance00Numeric(input, { maxLen = 2, padLen = 2, defaultValue = '00', onAfterBlur = null } = {}) {

    const isDefault = () => String(input.value || '').trim() === defaultValue;

    const clearIfDefault = () => {
      if (isDefault()) input.value = '';
    };

    const selectAll = () => {
      try {
        input.setSelectionRange(0, String(input.value || '').length);
      } catch (_) {
        // ignore (some types don't support)
      }
    };

    // Captura cedo: limpa ANTES de posicionar o caret
    const early = (e) => {
      // Só em interações do usuário; não limpa em programático
      clearIfDefault();
      refreshDefaultMuted();
    };

    input.addEventListener('pointerdown', early, { capture: true });
    input.addEventListener('mousedown', early, { capture: true });
    input.addEventListener('touchstart', early, { capture: true, passive: true });

    input.addEventListener('focus', () => {
      clearIfDefault();
      refreshDefaultMuted();
      // Se ficou vazio (era default), não precisa selecionar; se não, seleciona tudo
      requestAnimationFrame(() => {
        if (String(input.value || '') !== '') selectAll();
      });
    });

    input.addEventListener('click', () => {
      // Se já estava focado, focus não dispara: garante comportamento
      clearIfDefault();
      refreshDefaultMuted();
      requestAnimationFrame(() => {
        if (String(input.value || '') !== '') selectAll();
      });
    });

    input.addEventListener('input', () => {
      const d = onlyDigits(input.value).slice(0, maxLen);
      input.value = d;
      refreshDefaultMuted();
      if (input === versaoVinculoInput) computeIds();
    });

    input.addEventListener('keydown', (e) => {
      // Enter: pad imediatamente e sai de foco
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });

    input.addEventListener('blur', () => {
      const d = onlyDigits(input.value).slice(0, maxLen);
      if (d.length === 0) {
        input.value = defaultValue;
      } else {
        input.value = padLeft(d, padLen, '0');
      }
      if (onAfterBlur) onAfterBlur();
      refreshDefaultMuted();
    });
  }

  enhance00Numeric(chBolsaInput, { maxLen: 2, padLen: 2, defaultValue: '00' });
  enhance00Numeric(chSemBolsaInput, { maxLen: 2, padLen: 2, defaultValue: '00' });
  enhance00Numeric(versaoVinculoInput, {
    maxLen: 2,
    padLen: 2,
    defaultValue: '00',
    onAfterBlur: () => computeIds()
  });

  // SIAPE: facilita edição (seleciona tudo ao focar se tiver valor)
  siapeInput.addEventListener('focus', () => {
    requestAnimationFrame(() => {
      if (String(siapeInput.value || '').trim() !== '') {
        try { siapeInput.setSelectionRange(0, String(siapeInput.value).length); } catch (_) {}
      }
    });
  });

  /* =========================
     CPF — máscara
     ========================= */
  cpfInput.addEventListener('input', () => {
    const digits = onlyDigits(cpfInput.value).slice(0, 11);
    cpfInput.value = maskCPF(digits);
    computeIds();
  });

  cpfInput.addEventListener('blur', () => {
    const digits = onlyDigits(cpfInput.value).slice(0, 11);
    cpfInput.value = maskCPF(digits);
    computeIds();
  });

  /* =========================
     SIAPE — somente dígitos, 9 max; padStart no blur/submit
     ========================= */
  siapeInput.addEventListener('input', () => {
    siapeInput.value = onlyDigits(siapeInput.value).slice(0, 9);
  });

  siapeInput.addEventListener('blur', () => {
    const d = onlyDigits(siapeInput.value).slice(0, 9);
    if (d.length > 0) siapeInput.value = d.padStart(9, '0');
  });

  /* =========================
     Modal
     ========================= */
  function abrirModal() {
    confirmModal.classList.remove('hidden');
  }

  function fecharModal() {
    confirmModal.classList.add('hidden');
    pendingSubstitution = null;
  }

  btnNao.addEventListener('click', (e) => {
    e.preventDefault();
    fecharModal();
  });

  btnSim.addEventListener('click', (e) => {
    e.preventDefault();
    if (!pendingSubstitution) return;

    const { data, novo, index } = pendingSubstitution;
    data.equipe[index] = novo;
    saveData(data);

    fecharModal();
    mostrarRegistroSalvo('Registro ATUALIZADO');
  });

  /* =========================
     Validação (hard)
     ========================= */
  function camposValidos() {
    clearInvalid(tipoVinculoInput);

    if (!nomeInput.value.trim()) return false;

    const cpfDigits = onlyDigits(cpfInput.value);
    if (cpfDigits.length !== 11) return false;

    if (!vinculoSelect.value) return false;
    if (!cargoSelect.value) return false;
    if (!formaSelect.value) return false;

    // Vínculo/Código obrigatório
    if (!tipoVinculoInput.value.trim()) {
      setInvalid(tipoVinculoInput, 'Preencha Vínculo/Código.');
      return false;
    }

    const siapeDigits = onlyDigits(siapeInput.value);
    if (siapeDigits.length > 0 && siapeDigits.length !== 9) return false;

    // CH e Versão já estão normalizados para 2 dígitos no blur/submit
    if (onlyDigits(chBolsaInput.value).length !== 2) return false;
    if (onlyDigits(chSemBolsaInput.value).length !== 2) return false;
    if (onlyDigits(versaoVinculoInput.value).length !== 2) return false;

    if (!inicioInput.value) return false;
    if (!fimInput.value) return false;
    if (fimInput.value < inicioInput.value) return false;

    return true;
  }

  /* =========================
     Edit via ?edit=INDEX
     ========================= */
  function carregarParaEdicaoSeHouver() {
    const params = new URLSearchParams(window.location.search);
    const edit = params.get('edit');
    if (edit === null) return;

    const idx = Number(edit);
    if (!Number.isInteger(idx)) return;

    const data = getData();
    const m = data.equipe?.[idx];
    if (!m) return;

    nomeInput.value = m.nome || '';
    cpfInput.value = m.cpf || '';
    vinculoSelect.value = m.vinculo || '';
    siapeInput.value = m.siape || '';
    cargoSelect.value = m.cargo || '';
    formaSelect.value = m.forma || '';
    chBolsaInput.value = pad2(m.chBolsa || '00');
    chSemBolsaInput.value = pad2(m.chSemBolsa || '00');
    inicioInput.value = m.inicio || '';
    fimInput.value = m.fim || '';

    tipoVinculoInput.value = m.tipoVinculo || '';
    valorBolsaInput.value = m.valorBolsa || '';
    versaoVinculoInput.value = pad2(m.versaoVinculo || '00');
    observacaoInput.value = m.observacao || '';

    form.dataset.editIndex = String(idx);

    const t = document.getElementById('formTitle');
    const b = document.getElementById('btnSubmit');
    if (t) t.textContent = 'Editar Membro da Equipe';
    if (b) b.textContent = 'Salvar alterações';

    // normaliza visual
    const digits = onlyDigits(cpfInput.value).slice(0, 11);
    cpfInput.value = maskCPF(digits);
    computeIds();
    refreshDefaultMuted();
  }

  carregarParaEdicaoSeHouver();

  // inicializa
  computeIds();
  refreshDefaultMuted();

  /* =========================
     Submit
     ========================= */
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Normaliza caso não tenha dado blur
    const cpfDigits = onlyDigits(cpfInput.value).slice(0, 11);
    cpfInput.value = maskCPF(cpfDigits);

    const siapeDigits = onlyDigits(siapeInput.value).slice(0, 9);
    if (siapeDigits.length > 0) siapeInput.value = siapeDigits.padStart(9, '0');

    // CH e Versão sempre em 2 dígitos
    chBolsaInput.value = pad2(chBolsaInput.value);
    chSemBolsaInput.value = pad2(chSemBolsaInput.value);
    versaoVinculoInput.value = pad2(versaoVinculoInput.value);

    const { idKey, idDisplay, versao } = computeIds();

    if (!camposValidos() || !idKey) {
      mostrarInfo('PREENCHA OS CAMPOS OBRIGATÓRIOS', true);
      if (!tipoVinculoInput.value.trim()) tipoVinculoInput.focus();
      refreshDefaultMuted();
      return;
    }

    const data = getData();

    const novo = {
      // identificação (interna) — DUPLICIDADE só por CPF+Versão
      idKey,          // "00000000000-02"
      idDisplay,      // "000.000.000-00-02" (não exibido; útil p/ debug)
      versaoVinculo: versao,

      // dados
      nome: nomeInput.value.trim(),
      cpf: cpfInput.value.trim(),
      vinculo: vinculoSelect.value,
      siape: siapeInput.value.trim(),
      cargo: cargoSelect.value,
      forma: formaSelect.value,
      chBolsa: chBolsaInput.value.trim(),
      chSemBolsa: chSemBolsaInput.value.trim(),
      inicio: inicioInput.value,
      fim: fimInput.value,

      tipoVinculo: tipoVinculoInput.value.trim(),
      valorBolsa: (valorBolsaInput.value || '').trim(),
      observacao: (observacaoInput.value || '').trim()
    };

    // EDIÇÃO direta
    if (form.dataset.editIndex) {
      const idx = Number(form.dataset.editIndex);

      // colisão: mesma ID (CPF+versão) já existe em outro índice
      const collision = data.equipe.findIndex((m, i) => i !== idx && (m.idKey === novo.idKey));
      if (collision !== -1) {
        pendingSubstitution = { data, novo, index: collision };
        abrirModal();
        return;
      }

      data.equipe[idx] = novo;
      saveData(data);
      mostrarRegistroSalvo('Registro ATUALIZADO');
      return;
    }

    // NOVO: duplicidade por ID (CPF+versão), NÃO por nome
    const index = data.equipe.findIndex((m) => (m.idKey || '') === novo.idKey);
    if (index !== -1) {
      pendingSubstitution = { data, novo, index };
      abrirModal();
      return;
    }

    data.equipe.push(novo);
    saveData(data);
    mostrarRegistroSalvo();
  });

  form.addEventListener('reset', () => {
    setTimeout(() => {
      mostrarInfo('', false);
      fecharModal();
      delete form.dataset.editIndex;

	  versaoVinculoInput.value = '';
	  chBolsaInput.value = '';
	  chSemBolsaInput.value = '';
      clearInvalid(tipoVinculoInput);

      computeIds();
      refreshDefaultMuted();

      const t = document.getElementById('formTitle');
      const b = document.getElementById('btnSubmit');
      if (t) t.textContent = 'Cadastrar Membro da Equipe';
      if (b) b.textContent = 'Salvar';
    }, 0);
  });

  console.log('[SiARe] equipe-form.js carregado e ativo ✅');
});
