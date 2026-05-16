export function renderNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  const links = [
    { href: 'index.html',   icon: '🗺️',  label: 'Sjöar'    },
    { href: 'history.html', icon: '🎣',  label: 'Mitt Fiske' },
    { href: 'library.html', icon: '🪝',  label: 'Utrustning' },
  ];

  nav.innerHTML = links.map(l => `
    <a href="${l.href}" class="${page === l.href ? 'active' : ''}">
      <span class="nav-icon">${l.icon}</span>${l.label}
    </a>`).join('');
}
