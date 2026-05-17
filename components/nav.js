export function renderNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const nav  = document.getElementById('bottom-nav');
  if (!nav) return;

  const links = [
    { href: 'lake.html',    icon: 'map',     label: 'Sjöar'      },
    { href: 'history.html', icon: 'fish',    label: 'Mitt Fiske' },
    { href: 'catches.html', icon: 'award',   label: 'Fångster'   },
    { href: 'library.html', icon: 'anchor',  label: 'Utrustning' },
  ];

  nav.innerHTML = links.map(l => `
    <a href="${l.href}" class="${page === l.href ? 'active' : ''}">
      <i data-lucide="${l.icon}" class="nav-icon"></i>
      ${l.label}
    </a>`).join('');

  // Rendera Lucide-ikoner om biblioteket laddats
  if (window.lucide) lucide.createIcons();
}
