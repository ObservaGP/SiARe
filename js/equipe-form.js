const STORAGE_KEY = 'siare_data';
window.SIARE_FORM_LOADED = true;
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('equipeForm');

  // Se isso falhar, seu HTML não bate com o JS ou o arquivo não carregou.
  if (!form) {
    console.error('[SiARe] equipeForm não encontrado. Verifique o id="equipeForm".');
    return;
  }

  // Campos
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

  const saveInfo = document.getElementById('saveInfo');

  const confirmModal = document.getElementById('confirmModal');
  const btnNao = document.getElementById('btnNao');
  const btnSim = document.getElementById('btnSim');

  let pendingSubstitution = null;

  // Guard (se algum id não existir, você vai saber no console)
  const requiredEls = {
    nomeInput, cpfInput, vinculoSelect, siapeInput, cargoSelect, formaSelect,
    chBolsaInput, chSemBolsaInput, inicioInput, fimInput, saveInfo,
    confirmModal, btnNao, btnSim
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
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      projeto: {},
      equipe: [],
      relatorios: {}
    };
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

  function onlyDigits(s) {
    return String(s || '').replace(/\D/g, '');
  }

  /* =========================
     CPF — somente dígitos, 11 max, sempre com máscara
     ========================= */
  function maskCPF(digits) {
    let v = (digits || '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  }

  cpfInput.addEventListener('input', () => {
    const digits = onlyDigits(cpfInput.value).slice(0, 11);
    cpfInput.value = maskCPF(digits);
  });

  cpfInput.addEventListener('blur', () => {
    const digits = onlyDigits(cpfInput.value).slice(0, 11);
    cpfInput.value = maskCPF(digits);
  });

  /* =========================
     SIAPE — somente dígitos, 9 max; padStart só no blur/submit
     ========================= */
  siapeInput.addEventListener('input', () => {
    siapeInput.value = onlyDigits(siapeInput.value).slice(0, 9);
  });

  siapeInput.addEventListener('blur', () => {
    const d = onlyDigits(siapeInput.value).slice(0, 9);
    if (d.length > 0) siapeInput.value = d.padStart(9, '0');
  });

  /* =========================
     CH — somente dígitos, 2 max; padStart só no blur/submit
     ========================= */
  if ((chBolsaInput.value||"" ).trim()==="") chBolsaInput.value="00";
  if ((chSemBolsaInput.value||"" ).trim()==="") chSemBolsaInput.value="00";

  [chBolsaInput, chSemBolsaInput].forEach((input) => {
    input.addEventListener('input', () => {
      input.value = onlyDigits(input.value).slice(0, 2);
    });

    input.addEventListener('blur', () => {
      const d = onlyDigits(input.value).slice(0, 2);
      if (d.length > 0) input.value = d.padStart(2, '0');
    });
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
     Validação
     ========================= */
  function camposValidos() {
    if (!nomeInput.value.trim()) return false;

    const cpfDigits = onlyDigits(cpfInput.value);
    if (cpfDigits.length !== 11) return false;

    if (!vinculoSelect.value) return false;
    if (!cargoSelect.value) return false;
    if (!formaSelect.value) return false;

    const siapeDigits = onlyDigits(siapeInput.value);
    if (siapeDigits.length > 0 && siapeDigits.length !== 9) return false;

    const ch1 = onlyDigits(chBolsaInput.value);
    const ch2 = onlyDigits(chSemBolsaInput.value);
    if (ch1.length !== 2) return false;
    if (ch2.length !== 2) return false;

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
    chBolsaInput.value = m.chBolsa || '';
    chSemBolsaInput.value = m.chSemBolsa || '';
    inicioInput.value = m.inicio || '';
    fimInput.value = m.fim || '';

    form.dataset.editIndex = String(idx);

    const t = document.getElementById("formTitle");
    const b = document.getElementById("btnSubmit");
    if (t) t.textContent = "Editar Membro da Equipe";
    if (b) b.textContent = "Atualizar";
  }
  carregarParaEdicaoSeHouver();

  /* =========================
     Submit
     ========================= */
  form.addEventListener('submit', (e) => {
    e.preventDefault(); // <- isso impede “sumir tudo”

    // normaliza caso não tenha dado blur
    const cpfDigits = onlyDigits(cpfInput.value).slice(0, 11);
    cpfInput.value = maskCPF(cpfDigits);

    const siapeDigits = onlyDigits(siapeInput.value).slice(0, 9);
    if (siapeDigits.length > 0) siapeInput.value = siapeDigits.padStart(9, '0');

    const ch1 = onlyDigits(chBolsaInput.value).slice(0, 2);
    if (ch1.length > 0) chBolsaInput.value = ch1.padStart(2, '0');

    const ch2 = onlyDigits(chSemBolsaInput.value).slice(0, 2);
    if (ch2.length > 0) chSemBolsaInput.value = ch2.padStart(2, '0');

    if (!camposValidos()) {
      mostrarInfo('PREENCHA OS CAMPOS OBRIGATÓRIOS', true);
      return;
    }

    const data = getData();

    const novo = {
      nome: nomeInput.value.trim(),
      cpf: cpfInput.value.trim(),
      vinculo: vinculoSelect.value,
      siape: siapeInput.value.trim(),
      cargo: cargoSelect.value,
      forma: formaSelect.value,
      chBolsa: chBolsaInput.value.trim(),
      chSemBolsa: chSemBolsaInput.value.trim(),
      inicio: inicioInput.value,
      fim: fimInput.value
    };

    // edição direta
    if (form.dataset.editIndex) {
      const idx = Number(form.dataset.editIndex);
      data.equipe[idx] = novo;
      saveData(data);
      mostrarRegistroSalvo('Registro ATUALIZADO');
      return;
    }

    // substituição por nome
    const index = data.equipe.findIndex(
      (m) => (m.nome || '').trim().toLowerCase() === novo.nome.toLowerCase()
    );

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
      const t = document.getElementById("formTitle");
      const b = document.getElementById("btnSubmit");
      if (t) t.textContent = "Cadastrar Membro da Equipe";
      if (b) b.textContent = "Salvar";
    }, 0);
  });

  console.log('[SiARe] equipe-form.js carregado e ativo ✅');
});
