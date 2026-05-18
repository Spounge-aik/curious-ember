import { getSupabase } from '../script.js';

export function isAiEnabled() {
  return localStorage.getItem('aiEnabled') !== '0';
}

export function renderHeader() {
  const header = document.getElementById('app-header');
  if (!header) return;

  const aiOn = isAiEnabled();

  header.innerHTML = `
    <a href="index.html" class="logo">
      <i data-lucide="fish" style="width:18px;height:18px;color:var(--accent)"></i>
      <span>Fiskeappen</span>
    </a>
    <div class="header-actions">
      <button class="icon-btn" id="btn-ai" title="${aiOn ? 'Stäng av AI' : 'Slå på AI'}"
              style="${aiOn ? 'color:var(--accent);border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-dim)' : ''}">
        <i data-lucide="sparkles" style="width:16px;height:16px"></i>
      </button>
      <a href="profile.html" class="icon-btn" title="Min profil">
        <i data-lucide="user" style="width:16px;height:16px"></i>
      </a>
      <button class="icon-btn" id="btn-logout" title="Logga ut">
        <i data-lucide="log-out" style="width:16px;height:16px"></i>
      </button>
    </div>`;

  if (window.lucide) lucide.createIcons();

  // AI-toggle
  document.getElementById('btn-ai').addEventListener('click', () => {
    const nowOn = !isAiEnabled();
    localStorage.setItem('aiEnabled', nowOn ? '1' : '0');
    const btn = document.getElementById('btn-ai');
    btn.title = nowOn ? 'Stäng av AI' : 'Slå på AI';
    btn.style.color       = nowOn ? 'var(--accent)' : '';
    btn.style.borderColor = nowOn ? 'var(--accent)' : '';
    btn.style.boxShadow   = nowOn ? '0 0 0 2px var(--accent-dim)' : '';
  });

  // Utloggning
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await getSupabase().auth.signOut();
    location.replace('auth.html');
  });
}
