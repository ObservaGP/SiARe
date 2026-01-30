document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('sidebar');
  if (!container) return;

  try {
    const res = await fetch('sidebar.html');
    if (!res.ok) throw new Error('Falha ao carregar sidebar');

    container.innerHTML = await res.text();

    // marca item ativo
    const page = document.body.dataset.page;
    if (page) {
      const link = container.querySelector(`[data-page="${page}"]`);
      if (link) link.classList.add('active');
    }

  } catch (err) {
    container.innerHTML = '<p style="color:red">Erro ao carregar menu</p>';
    console.error(err);
  }
});

