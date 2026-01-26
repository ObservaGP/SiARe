// js/components/sidebar.js
(function () {
  const container = document.getElementById('sidebar');
  if (!container) return;

  const isInPages = location.pathname.toLowerCase().includes('/pages/');
  const base = isInPages ? '../' : './';
  const current = (document.body.dataset.page || '').toLowerCase();

  const items = [
    { key: 'inicio',           href: `${base}index.html`,                 icon: '🏠', label: 'Início' },
    { key: 'organizacao',      href: `${base}pages/organizacoes.html`,    icon: '🏢', label: 'Organização' },
    { key: 'relacionamentos',  href: `${base}pages/relacionamentos.html`, icon: '🤝', label: 'Relacionamento' },
    { key: 'cronograma',       href: '#',                                 icon: '📅', label: 'Cronograma' },
    { key: 'macroentregas',    href: '#',                                 icon: '📦', label: 'Macroentregas' },
    { key: 'equipe',           href: '#',                                 icon: '👥', label: 'Equipe' },
    { key: 'infra',            href: '#',                                 icon: '🏗️', label: 'Infraestrutura' },
    { key: 'vitrine',          href: '#',                                 icon: '💡', label: 'Vitrine Tecnológica' },
    { key: 'eventos',          href: '#',                                 icon: '🎓', label: 'Eventos e Treinamentos' },
    { key: 'compras',          href: '#',                                 icon: '🛒', label: 'Compras' },
  ];

  container.innerHTML = `
    <div class="sidebar-top">
      <h1>StatusProj</h1>
      <p>Status de Projetos de Inovação</p>
    </div>
    <nav class="sidebar-nav"></nav>
    <footer>
      <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">
        <img alt="Licença: CC BY-NC 4.0" src="https://img.shields.io/badge/Licen%C3%A7a-CC%20BY--NC%204.0-lightgrey?style=flat-square"/>
      </a>
      <p class="footer-text">
        <span>StatusProj é um projeto do</span><br>
        <strong>Observatório da Gestão Pública</strong><br>
        <strong>ObservaGP</strong>
      </p>
      <small class="footer-warning">
        Nenhuma informação deste projeto é monitorada nem guardada em nuvem.<br>
        Seu conteúdo é de acesso exclusivo de seus usuários.
      </small>
    </footer>
  `;

  const nav = container.querySelector('.sidebar-nav');
  items.forEach(it => {
    const a = document.createElement('a');
    a.href = it.href;
    a.className = 'nav-item';
    a.dataset.key = it.key;
    a.innerHTML = `
      <span class="icon">${it.icon}</span>
      <span class="label">${it.label}</span>
      <span class="chev" aria-hidden="true">➜</span>
    `;
    if (current && it.key === current) a.classList.add('active');
    if (!current) {
      const path = location.pathname.toLowerCase();
      if (it.key === 'inicio' && (path.endsWith('/index.html') || path.endsWith('/'))) a.classList.add('active');
      if (it.key === 'organizacao' && path.includes('organiz')) a.classList.add('active');
      if (it.key === 'relacionamentos' && path.includes('relaciona')) a.classList.add('active');
    }
    nav.appendChild(a);
  });
})();
