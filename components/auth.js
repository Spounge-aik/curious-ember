import { getSupabase } from '../script.js';

export function initAuth() {
  const sb = getSupabase();
  const emailEl   = document.getElementById('email');
  const passEl    = document.getElementById('password');
  const submitBtn = document.getElementById('btn-submit');
  const modeBtn   = document.getElementById('btn-mode');
  const errorEl   = document.getElementById('error-msg');
  const successEl = document.getElementById('success-msg');
  const subtitle  = document.getElementById('mode-subtitle');
  const switchTxt = document.getElementById('mode-switch-text');

  let mode = 'login';

  modeBtn.addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    const isLogin = mode === 'login';
    submitBtn.textContent = isLogin ? 'Logga in' : 'Skapa konto';
    modeBtn.textContent   = isLogin ? 'Registrera dig' : 'Logga in';
    switchTxt.textContent = isLogin ? 'Inget konto?' : 'Redan ett konto?';
    subtitle.textContent  = isLogin ? 'Logga in för att fortsätta' : 'Skapa ett konto';
    errorEl.style.display = 'none';
  });

  passEl.addEventListener('keydown', e => { if (e.key === 'Enter') submitBtn.click(); });

  submitBtn.addEventListener('click', async () => {
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    const email = emailEl.value.trim();
    const password = passEl.value;
    if (!email || !password) return;
    submitBtn.textContent = '…';
    submitBtn.disabled = true;

    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.href = 'library.html';
      } else {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        successEl.textContent = 'Kolla din e-post för att bekräfta kontot!';
        successEl.style.display = 'block';
      }
    } catch (e) {
      errorEl.textContent = e.message || 'Något gick fel.';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.textContent = mode === 'login' ? 'Logga in' : 'Skapa konto';
      submitBtn.disabled = false;
    }
  });
}
