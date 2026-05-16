export function renderNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  const links = [
    { href: 'index.html',   icon: '🏠', label: 'Hem' },
    { href: 'library.html', icon: '🎣', label: 'Bibliotek' },
  ];
  nav.innerHTML = links.map(l => `
    <a href="${l.href}" class="${page === l.href ? 'active' : ''}">
      <span class="nav-icon">${l.icon}</span>${l.label}
    </a>`).join('');
}
