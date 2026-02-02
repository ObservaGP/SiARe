document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('sidebar');
  if (!container) return;

  const STORAGE_KEY = 'siare_sidebar_admin_open';

  const getCurrentFile = () => {
    try {
      const path = window.location.pathname || '';
      const file = path.split('/').pop();
      return (file && file.trim()) ? file : 'inicio.html';
    } catch {
      return 'inicio.html';
    }
  };

  const setGroupOpen = (groupEl, isOpen) => {
    if (!groupEl) return;
    groupEl.classList.toggle('open', isOpen);

    const btn = groupEl.querySelector('.nav-toggle');
    const submenu = groupEl.querySelector('.submenu');

    if (btn) btn.setAttribute('aria-expanded', String(!!isOpen));
    if (submenu) submenu.hidden = !isOpen;
  };

  try {
    const res = await fetch('sidebar.html');
    if (!res.ok) throw new Error('Falha ao carregar sidebar');

    container.innerHTML = await res.text();

    // 1) Toggle do grupo "Administrativo"
    const adminGroup = container.querySelector('.nav-group[data-group="administrativo"]');
    if (adminGroup) {
      const persisted = localStorage.getItem(STORAGE_KEY);
      const defaultOpen = persisted === '1';
      setGroupOpen(adminGroup, defaultOpen);

      const btn = adminGroup.querySelector('.nav-toggle');
      if (btn) {
        btn.addEventListener('click', () => {
          const next = !adminGroup.classList.contains('open');
          setGroupOpen(adminGroup, next);
          localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
        });
      }
    }

    // 2) Marca item ativo (data-page ou fallback pelo nome do arquivo)
    const page = document.body.dataset.page;
    let activeLink = null;
    if (page) {
      activeLink = container.querySelector(`[data-page="${page}"]`);
    }
    if (!activeLink) {
      const file = getCurrentFile();
      activeLink = container.querySelector(`a[href="${CSS.escape(file)}"]`);
    }
    if (activeLink) {
      activeLink.classList.add('active');

      // Se o ativo está dentro do submenu do Administrativo, abre o grupo
      const group = activeLink.closest('.nav-group');
      if (group && group.matches('[data-group="administrativo"]')) {
        setGroupOpen(group, true);
        localStorage.setItem(STORAGE_KEY, '1');
      }
    }

  } catch (err) {
    container.innerHTML = '<p style="color:red">Erro ao carregar menu</p>';
    console.error(err);
  }
});

