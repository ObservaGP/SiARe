const STORAGE_KEY = 'siare_data';
window.SIARE_FORM_LOADED = true;

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const form = $('equipeForm');
  if (!form) return;

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

  let pending = null;

  const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
  const pad2 = (v) => onlyDigits(v).padStart(2, '0');

  const getData = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEY)) || { equipe: [] };

  const saveData = (d) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

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

  btnNao.onclick = () => modal.classList.add('hidden');
  btnSim.onclick = () => {
    if (!pending) return;
    const { data, novo, index } = pending;
    data.equipe[index] = novo;
    saveData(data);
    modal.classList.add('hidden');
    pending = null;
    saveInfo.textContent = 'Registro ATUALIZADO';
  };

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
    const idx = data.equipe.findIndex((m) => m.idKey === idKey);

    if (idx !== -1) {
      pending = { data, novo, index: idx };
      modal.classList.remove('hidden');
      return;
    }

    data.equipe.push(novo);
    saveData(data);
    saveInfo.textContent = 'Registro SALVO';
    form.reset();
  });
});
