const STORAGE_KEY = 'siare_data';
window.SIARE_EQUIPE_LOADED = true;
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('memberList');
  const empty = document.getElementById('emptyState');

  if (!list || !empty) {
    console.error('[SiARe] memberList/emptyState não encontrados no equipe.html.');
    return;
  }

  function getData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { equipe: [] };
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return (y && m && d) ? `${d}/${m}/${y}` : iso;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function render() {
    const data = getData();
    const equipe = Array.isArray(data.equipe) ? data.equipe : [];

    list.innerHTML = '';

    if (equipe.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    equipe.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'member-row';
      row.innerHTML = `
        <div class="member-content">
          <div class="member-name">${escapeHtml(m.nome || '')}</div>
          <div class="member-meta">
            <span>${escapeHtml(m.vinculo || '')}</span> · <span>${escapeHtml(m.cargo || '')}</span>
          </div>
          <div class="member-meta">
            <strong>C.H.</strong>
            <span>c/ bolsa: ${escapeHtml(m.chBolsa || '')}h</span> ·
            <span>s/ bolsa: ${escapeHtml(m.chSemBolsa || '')}h</span> |
            <span>${formatDateBR(m.inicio)} – ${formatDateBR(m.fim)}</span>
          </div>
        </div>
      `;
      list.appendChild(row);
    });
  }

  render();
  console.log('[SiARe] equipe.js carregado e listando membros ✅');
});
