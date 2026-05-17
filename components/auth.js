import { getSupabase } from '../script.js';

export function initAuth() {
  const sb = getSupabase();

  // ── Hjälp: visa/dölj element ───────────────────────────────────
  const show = el => { el.style.removeProperty('display'); el.style.display = 'flex'; };
  const hide = el => { el.style.display = 'none'; };

  const emailEl       = document.getElementById('email');
  const passEl        = document.getElementById('password');
  const submitBtn     = document.getElementById('btn-submit');
  const modeBtn       = document.getElementById('btn-mode');
  const errorEl       = document.getElementById('error-msg');
  const successEl     = document.getElementById('success-msg');
  const subtitle      = document.getElementById('mode-subtitle');
  const switchTxt     = document.getElementById('mode-switch-text');
  const formMain      = document.getElementById('form-main');
  const formReset     = document.getElementById('form-reset');
  const footerLinks   = document.getElementById('footer-links');
  const forgotWrap    = document.getElementById('forgot-link-wrap');
  const forgotBtn     = document.getElementById('btn-forgot');
  const newPassEl     = document.getElementById('new-password');
  const confirmPassEl = document.getElementById('confirm-password');
  const resetBtn      = document.getElementById('btn-reset');

  let mode = 'login'; // 'login' | 'register' | 'forgot' | 'reset'

  // ── Kontrollera om vi kommer från återställningslänk ───────────
  // Supabase skickar #access_token=...&type=recovery i hash
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      setMode('reset');
    } else if (event === 'SIGNED_IN' && mode !== 'reset') {
      redirectAfterLogin();
    }
  });

  // Kontrollera redan inloggad (men inte recovery-läge)
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session && !location.hash.includes('type=recovery')) {
      redirectAfterLogin();
    }
  });

  // ── Sätt läge ──────────────────────────────────────────────────
  function setMode(m) {
    mode = m;
    clearMessages();

    const isReset = m === 'reset';
    formMain.style.display  = isReset ? 'none' : 'flex';
    formReset.style.display = isReset ? 'flex' : 'none';
    footerLinks.style.display = isReset ? 'none' : 'block';
    forgotWrap.style.display  = (isReset || m === 'forgot') ? 'none' : 'block';

    // Lösenordsfältet visas bara i login/register
    passEl.style.display = (m === 'forgot') ? 'none' : 'block';

    switch (m) {
      case 'login':
        subtitle.textContent  = 'Logga in för att fortsätta';
        submitBtn.textContent = 'Logga in';
        modeBtn.textContent   = 'Registrera dig';
        switchTxt.textContent = 'Inget konto?';
        break;
      case 'register':
        subtitle.textContent  = 'Skapa ett konto';
        submitBtn.textContent = 'Skapa konto';
        modeBtn.textContent   = 'Logga in';
        switchTxt.textContent = 'Redan ett konto?';
        break;
      case 'forgot':
        subtitle.textContent  = 'Återställ lösenord';
        submitBtn.textContent = 'Skicka återställningslänk';
        forgotBtn.textContent = '← Tillbaka till login';
        break;
      case 'reset':
        subtitle.textContent = 'Välj nytt lösenord';
        break;
    }
  }

  function clearMessages() {
    errorEl.style.display   = 'none';
    successEl.style.display = 'none';
  }

  function showError(msg)   { errorEl.textContent = msg;   errorEl.style.display   = 'block'; }
  function showSuccess(msg) { successEl.textContent = msg; successEl.style.display = 'block'; }

  // ── Växla login ↔ register ─────────────────────────────────────
  modeBtn.addEventListener('click', () =>
    setMode(mode === 'login' ? 'register' : 'login')
  );

  // ── Glömt lösenord ─────────────────────────────────────────────
  forgotBtn.addEventListener('click', () => {
    if (mode === 'forgot') {
      setMode('login');
    } else {
      setMode('forgot');
    }
  });

  // ── Enter i lösenordsfältet ────────────────────────────────────
  passEl.addEventListener('keydown', e => { if (e.key === 'Enter') submitBtn.click(); });

  // ── Huvud-knapp (login / register / skicka reset-mail) ─────────
  submitBtn.addEventListener('click', async () => {
    clearMessages();
    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!email) { showError('Ange e-postadress.'); return; }
    if (mode !== 'forgot' && !password) { showError('Ange lösenord.'); return; }

    submitBtn.textContent = '…';
    submitBtn.disabled    = true;

    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        redirectAfterLogin();

      } else if (mode === 'register') {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        showSuccess('Kolla din e-post för att bekräfta kontot!');

      } else if (mode === 'forgot') {
        const redirectTo = location.origin + '/auth.html';
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        showSuccess('En återställningslänk har skickats till ' + email);
      }
    } catch (e) {
      showError(e.message || 'Något gick fel, försök igen.');
    } finally {
      submitBtn.disabled = false;
      setMode(mode); // återställer knapptext
    }
  });

  // ── Spara nytt lösenord ────────────────────────────────────────
  resetBtn.addEventListener('click', async () => {
    clearMessages();
    const newPass     = newPassEl.value;
    const confirmPass = confirmPassEl.value;

    if (!newPass || newPass.length < 6) {
      showError('Lösenordet måste vara minst 6 tecken.'); return;
    }
    if (newPass !== confirmPass) {
      showError('Lösenorden matchar inte.'); return;
    }

    resetBtn.textContent = '…';
    resetBtn.disabled    = true;

    try {
      const { error } = await sb.auth.updateUser({ password: newPass });
      if (error) throw error;
      showSuccess('Lösenordet uppdaterat! Du loggas in…');
      setTimeout(() => redirectAfterLogin(), 1500);
    } catch (e) {
      showError(e.message || 'Kunde inte uppdatera lösenordet.');
    } finally {
      resetBtn.textContent = 'Spara nytt lösenord';
      resetBtn.disabled    = false;
    }
  });

  // Starta i login-läge
  setMode('login');
}

function redirectAfterLogin() {
  const saved = sessionStorage.getItem('redirectAfterLogin');
  sessionStorage.removeItem('redirectAfterLogin');
  location.replace(saved && !saved.includes('auth.html') ? saved : 'index.html');
}
