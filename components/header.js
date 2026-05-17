import { getSupabase } from '../script.js';

export function renderHeader() {
  const header = document.getElementById('app-header');
  if (!header) return;

  header.innerHTML = `
    <a href="index.html" class="logo">
      <i data-lucide="fish" style="width:18px;height:18px;color:var(--accent)"></i>
      <span>Fiskeappen</span>
    </a>
    <div class="header-actions">
      <button class="icon-btn" id="btn-desktop" title="Växla desktop-läge">
        <i data-lucide="monitor" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn" id="btn-logout" title="Logga ut">
        <i data-lucide="log-out" style="width:16px;height:16px"></i>
      </button>
    </div>`;

  if (window.lucide) lucide.createIcons();

  // Desktop-toggle
  document.getElementById('btn-desktop').addEventListener('click', () => {
    document.body.classList.toggle('desktop-mode');
    const on  = document.body.classList.contains('desktop-mode');
    const btn = document.getElementById('btn-desktop');
    btn.innerHTML = on
      ? `<i data-lucide="smartphone" style="width:16px;height:16px"></i>`
      : `<i data-lucide="monitor"    style="width:16px;height:16px"></i>`;
    if (window.lucide) lucide.createIcons();
    localStorage.setItem('desktopMode', on ? '1' : '0');
  });

  if (localStorage.getItem('desktopMode') === '1') {
    document.body.classList.add('desktop-mode');
    document.getElementById('btn-desktop').innerHTML =
      `<i data-lucide="smartphone" style="width:16px;height:16px"></i>`;
    if (window.lucide) lucide.createIcons();
  }

  // Utloggning
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await getSupabase().auth.signOut();
    location.replace('auth.html');
  });
}
