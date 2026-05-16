const DEV_HOSTS = ['localhost', '127.0.0.1'];
const API = DEV_HOSTS.includes(window.location.hostname)
  ? 'https://doctorpro-dev.up.railway.app/api'
  : 'https://doctorpro-production.up.railway.app/api';

const token = new URLSearchParams(window.location.search).get('token');
if (!token) {
  showMsg('error', 'Enlace inválido. Solicitá uno nuevo.');
  document.getElementById('form-reset').style.display = 'none';
}

function showMsg(type, text) {
  const el = document.getElementById('msg');
  el.className = `msg ${type}`;
  el.textContent = text;
  el.style.display = 'block';
}

async function doReset() {
  const password = document.getElementById('new-pass').value;
  const confirm  = document.getElementById('confirm-pass').value;
  if (!password || password.length < 6) return showMsg('error', 'La contraseña debe tener al menos 6 caracteres');
  if (password !== confirm) return showMsg('error', 'Las contraseñas no coinciden');
  try {
    const res  = await fetch(`${API}/auth/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (!res.ok) return showMsg('error', data.error);
    showMsg('success', '✓ Contraseña actualizada. Ya podés iniciar sesión.');
    document.getElementById('form-reset').style.display = 'none';
  } catch { showMsg('error', 'Error de conexión con el servidor'); }
}
