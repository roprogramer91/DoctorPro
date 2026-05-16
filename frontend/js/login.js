const DEV_HOSTS = ['localhost', '127.0.0.1'];
const API = DEV_HOSTS.includes(window.location.hostname)
  ? 'https://doctorpro-dev.up.railway.app/api'
  : 'https://doctorpro-production.up.railway.app/api';

function toggleForm() {
  const isLogin = document.getElementById('form-login').style.display !== 'none';
  document.getElementById('form-login').style.display    = isLogin ? 'none' : '';
  document.getElementById('form-register').style.display = isLogin ? '' : 'none';
  showError('');
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function showForgot() {
  document.getElementById('form-login').style.display    = 'none';
  document.getElementById('form-register').style.display = 'none';
  document.getElementById('form-forgot').style.display   = '';
  showError('');
}

function backToLogin() {
  document.getElementById('form-forgot').style.display = 'none';
  document.getElementById('form-login').style.display  = '';
  showError('');
}

async function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!email || !password) return showError('Completá email y contraseña');
  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error);
    localStorage.setItem('dp_token', data.token);
    localStorage.setItem('dp_doctor', JSON.stringify(data.doctor));
    window.location.href = 'form.html';
  } catch { showError('Error de conexión con el servidor'); }
}

async function doForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return showError('Ingresá tu email');
  try {
    const res  = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error);
    showError('');
    document.getElementById('form-forgot').innerHTML =
      `<p style="text-align:center;color:#2a7a2a;padding:20px 0;">
         ✓ Si el email existe, recibirás el enlace en unos minutos.
       </p>
       <div class="toggle"><a onclick="backToLogin()">Volver al inicio de sesión</a></div>`;
  } catch { showError('Error de conexión con el servidor'); }
}

async function doRegister() {
  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-pass').value;
  const name      = document.getElementById('reg-name').value.trim();
  const specialty = document.getElementById('reg-specialty').value.trim();
  const mp        = document.getElementById('reg-mp').value.trim();
  const mn        = document.getElementById('reg-mn').value.trim();
  if (!email || !password) return showError('Email y contraseña son obligatorios');
  if (password.length < 6)  return showError('La contraseña debe tener al menos 6 caracteres');
  try {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, specialty, mp, mn })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error);
    localStorage.setItem('dp_token', data.token);
    localStorage.setItem('dp_doctor', JSON.stringify(data.doctor));
    window.location.href = 'form.html';
  } catch { showError('Error de conexión con el servidor'); }
}
