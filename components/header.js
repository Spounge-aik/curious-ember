export function renderHeader(title = null) {
  const header = document.getElementById('app-header');
  if (!header) return;
  header.innerHTML = `
    <a href="index.html" class="logo">
      <span class="logo-flame">🔥</span>
      <span>Curious Ember</span>
    </a>
    <div class="header-actions">
      <button class="icon-btn" id="btn-desktop" title="Växla desktop-läge">🖥️</button>
      <a href="auth.html" class="icon-btn" id="btn-profile" title="Profil">👤</a>
    </div>`;

  // Desktop toggle
  document.getElementById('btn-desktop').addEventListener('click', () => {
    document.body.classList.toggle('desktop-mode');
    const on = document.body.classList.contains('desktop-mode');
    document.getElementById('btn-desktop').textContent = on ? '📱' : '🖥️';
    localStorage.setItem('desktopMode', on ? '1' : '0');
  });

  // Återställ desktop-läge
  if (localStorage.getItem('desktopMode') === '1') {
    document.body.classList.add('desktop-mode');
    document.getElementById('btn-desktop').textContent = '📱';
  }
}
