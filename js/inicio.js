const STORAGE_KEY = 'siare_data';
const ADMIN_KEY_KEY = 'siare_admin_key';

/* =========================
   Carregar dados do projeto (Sigla/Nome)
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const projeto = data.projeto || {};

    const siglaEl = document.getElementById('inicioSigla');
    const nomeEl = document.getElementById('inicioNomeProjeto');

    if (siglaEl && projeto.sigla) siglaEl.textContent = projeto.sigla;
    if (nomeEl && projeto.nome) nomeEl.textContent = projeto.nome;
  } catch {
    // silencioso
  }
});

/* =========================
   Exportar
   ========================= */
document.getElementById('btnExportar').addEventListener('click', () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    alert('Não há dados para exportar.');
    return;
  }

  const projeto = JSON.parse(data).projeto || {};
  const sigla = projeto.sigla || 'SiARe';
  const nomeArquivo = `${sigla}_SiARe.json`;

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();

  URL.revokeObjectURL(url);
});

/* =========================
   Importar
   ========================= */
document.getElementById('fileImportar').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
      alert('Arquivo importado com sucesso.');
      location.reload();
    } catch {
      alert('Arquivo inválido.');
    }
  };
  reader.readAsText(file);
});
