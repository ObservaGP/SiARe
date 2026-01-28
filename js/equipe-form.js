const STORAGE_KEY = 'siare_data';
const form = document.getElementById('equipeForm');

let pendingSubstitution = null;

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
   Helpers (exemplos)
   ========================= */
function isExample(input) {
  return input.classList.contains('example') || input.value === input.dataset.example;
}

function applyExample(input) {
  input.value = input.dataset.example || '';
  input.classList.add('example');
  input.classList.remove('valid');
}

/* =========================
   Inputs com exemplo (pré-preenchidos)
   ========================= */
document.querySelectorAll('.input-example').forEach(input => {
  // garante consistência (mesmo que o HTML mude)
  if (!input.value || input.value.trim() === '') applyExample(input);

  input.addEventListener('focus', () => {
    if (input.classList.contains('example')) {
      input.value = '';
      input.classList.remove('example');
      // cursor no começo (campo vazio já nasce no começo)
    }
  });

  input.addEventListener('input', () => {
    input.classList.remove('example');
    input.classList.add('valid');
  });

  input.addEventListener('blur', () => {
    if (input.value.trim() === '') {
      applyExample(input);
    }
  });
});

/* =========================
   CPF — máscara
   ========================= */
const cpfInput = document.querySelector('[data-example="000.000.000-00"]');

function maskCPF(raw) {
  let v = (raw || '').replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v;
}

cpfInput.addEventListener('input', () => {
  if (cpfInput.classList.contains('example')) return;
  cpfInput.value = maskCPF(cpfInput.value);
});

cpfInput.addEventListener('blur', () => {
  if (!cpfInput.classList.contains('example')) {
    cpfInput.value = maskCPF(cpfInput.value);
  }
});

/* =========================
   SIAPE — 9 dígitos
   ========================= */
const siapeInput = document.querySelector('[data-example="000000000"]');

siapeInput.addEventListener('input', () => {
  if (siapeInput.classList.contains('example')) return;
  let v = siapeInput.value.replace(/\D/g, '').slice(0, 9);
  siapeInput.value = v.padStart(9, '0');
});

siapeInput.addEventListener('blur', () => {
  if (siapeInput.classList.contains('example')) return;
  let v = siapeInput.value.replace(/\D/g, '').slice(0, 9);
  siapeInput.value = v.padStart(9, '0');
});

/* =========================
   Carga horária — sempre 2 dígitos (00)
   ========================= */
document.querySelectorAll('.ch').forEach(input => {
  input.addEventListener('input', () => {
    if (input.classList.contains('example')) return;
    let v = input.value.replace(/\D/g, '').slice(0, 2);
    input.value = v.padStart(2, '0');
  });

  input.addEventListener('blur', () => {
    if (input.classList.contains('example')) return;
    let v = input.value.replace(/\D/g, '').slice(0, 2);
    input.value = v.padStart(2, '0');
  });
});

/* =========================
   Selects — estado visual
   ========================= */
document.querySelectorAll('select').forEach(select => {
  select.addEventListener('change', () => {
    select.classList.toggle('valid', !!select.value);
  });
});

/* =========================
   Feedback (SALVO / ERRO)
   ========================= */
function mostrarInfo(texto, erro = false) {
  const info = document.getElementById('saveInfo');
  info.textContent = texto;
  info.style.color = erro ? '#b00020' : '#1f2933';
}

/* =========================
   Validação real
   ========================= */
function camposValidos() {
  // Inputs com exemplo não podem ficar como exemplo
  for (const input of document.querySelectorAll('.input-example')) {
    if (isExample(input)) return false;
    if (input.value.trim() === '') return false;
  }

  // Selects obrigatórios
  for (const select of document.querySelectorAll('select')) {
    if (!select.value) return false;
  }

  // Datas obrigatórias
  const dates = document.querySelectorAll('.date-field');
  for (const d of dates) {
    if (!d.value) return false;
  }

  // CPF precisa ter 11 dígitos (com máscara fica 14 chars)
  const cpfDigits = cpfInput.value.replace(/\D/g, '');
  if (cpfDigits.length !== 11) return false;

  // SIAPE precisa ter 9 dígitos
  const siapeDigits = siapeInput.value.replace(/\D/g, '');
  if (siapeDigits.length !== 9) return false;

  // CHs precisam ter 2 dígitos
  for (const ch of document.querySelectorAll('.ch')) {
    const v = ch.value.replace(/\D/g, '');
    if (v.length !== 2) return false;
  }

  return true;
}

/* =========================
   Modal
   ========================= */
function abrirModal() {
  document.getElementById('confirmModal').classList.remove('hidden');
}

function fecharModal() {
  document.getElementById('confirmModal').classList.add('hidden');
  pendingSubstitution = null;
}

document.getElementById('btnNao').addEventListener('click', (e) => {
  e.preventDefault();
  fecharModal();
});

document.getElementById('btnSim').addEventListener('click', (e) => {
  e.preventDefault();

  if (!pendingSubstitution) return;

  const { data, novo, index } = pendingSubstitution;
  data.equipe[index] = novo;
  saveData(data);

  fecharModal();
  mostrarRegistroSalvo();
});

/* =========================
   Registro salvo
   ========================= */
function mostrarRegistroSalvo() {
  const agora = new Date();
  const dataStr = agora.toLocaleDateString('pt-BR');
  const horaStr = agora.toLocaleTimeString('pt-BR');
  mostrarInfo(`Registro SALVO em ${dataStr} às ${horaStr}`);
}

/* =========================
   Submit principal
   ========================= */
form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!camposValidos()) {
    mostrarInfo('PREENCHA OS CAMPOS OBRIGATÓRIOS', true);
    return;
  }

  const data = getData();

  const selects = form.querySelectorAll('select');
  const chs = form.querySelectorAll('.ch');
  const dates = form.querySelectorAll('.date-field');

  const novo = {
    nome: form.querySelector('[data-example="Fulano de Tal"]').value.trim(),
    cpf: cpfInput.value,
    vinculo: selects[0].value,
    siape: siapeInput.value,
    cargo: selects[1].value,
    forma: selects[2].value,
    chBolsa: chs[0].value,
    chSemBolsa: chs[1].value,
    inicio: dates[0].value,
    fim: dates[1].value
  };

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

/* =========================
   Reset (Limpar) — restaura exemplos
   ========================= */
form.addEventListener('reset', () => {
  // pequeno delay para o reset do browser acontecer primeiro
  setTimeout(() => {
    document.querySelectorAll('.input-example').forEach(applyExample);
    document.querySelectorAll('select').forEach(s => s.classList.remove('valid'));
    mostrarInfo('', false);
    fecharModal();
  }, 0);
});
