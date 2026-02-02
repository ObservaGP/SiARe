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

  const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
  const pad2 = (v) => onlyDigits(v).padStart(2, '0');

  const getData = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEY)) || { equipe: [] };

  const saveData = (d) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

  // ========= MODO EDIÇÃO =========
  let editMode = false;
  let editIndex = null;

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

  // ========= Submit =========
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const cpfDigits = onlyDigits(cpf.value);
    if (cpfDigits.length !== 11) return;

    const idKey = `${cpfDigits}-${pad2(versao.value)}`;

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
      versaoVinculo: pad2(versao.value),
      observacao: observacao.value.trim()
    };

    const data = getData();
    if (!Array.isArray(data.equipe)) data.equipe = [];

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
