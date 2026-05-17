const DEV_HOSTS = ['localhost', '127.0.0.1'];
const API = DEV_HOSTS.includes(window.location.hostname)
  ? 'https://doctorpro-dev.up.railway.app/api'
  : 'https://doctorpro-production.up.railway.app/api';

let riesgoClinicoActual = null;
let riesgoCirugiaActual = null;
let conclManual = null;

window.onload = async function() {
  const token = localStorage.getItem('dp_token');
  if (!token) { window.location.href = 'index.html'; return; }

  try {
    const res = await fetch(`${API}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { localStorage.clear(); window.location.href = 'index.html'; return; }
    const doctor = await res.json();
    loadDoctorProfile(doctor);
    checkAccess(doctor);
  } catch {
    const cached = localStorage.getItem('dp_doctor');
    if (cached) {
      loadDoctorProfile(JSON.parse(cached));
      checkAccess(JSON.parse(cached));
    }
  }

  const today = new Date();
  document.getElementById('fecha').value =
    today.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function checkAccess(doctor) {
  const now = new Date();
  const trialOk  = doctor.trial_ends && new Date(doctor.trial_ends) > now;
  const subOk    = doctor.subscription_status === 'active' &&
                   doctor.subscribed_until && new Date(doctor.subscribed_until) > now;

  if (!trialOk && !subOk) {
    showPaywall();
  }
}

function showPaywall() {
  document.querySelector('.page').style.display = 'none';
  document.querySelector('.toolbar').style.display = 'none';

  const wall = document.createElement('div');
  wall.style.cssText = 'max-width:420px;margin:80px auto;background:#fff;padding:40px 32px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.12);text-align:center;font-family:Arial,sans-serif;';
  wall.innerHTML = `
    <div style="font-size:26px;font-weight:bold;margin-bottom:8px;">Doctor<span style="color:#cc0000">Pro</span></div>
    <p style="color:#555;margin-bottom:24px;">Tu período de prueba ha finalizado.<br>Suscribite para seguir usando DoctorPro.</p>
    <button onclick="subscribe()" style="background:#cc0000;color:white;border:none;padding:13px 32px;border-radius:4px;font-size:16px;font-weight:bold;cursor:pointer;width:100%;">
      Suscribirme ahora
    </button>
    <p style="font-size:12px;color:#888;margin-top:16px;">Renovación mensual automática. Cancelá cuando quieras.</p>
    <div style="margin-top:20px;"><a href="index.html" style="color:#cc0000;font-size:13px;">Cerrar sesión</a></div>
  `;
  document.body.appendChild(wall);
}

async function subscribe() {
  const token = localStorage.getItem('dp_token');
  try {
    const res  = await fetch(`${API}/payments/subscribe`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.init_point) window.location.href = data.init_point;
  } catch { alert('Error al procesar el pago. Intentá de nuevo.'); }
}

function loadDoctorProfile(doctor) {
  const img = document.getElementById('sig-img');
  img.src = doctor.signature_url || '';
  img.style.display = doctor.signature_url ? 'block' : 'none';
  const elName = document.querySelector('.sig-nombre');
  const elSpec = document.querySelector('.sig-especialidad');
  const elMat  = document.querySelector('.sig-mat');
  if (elName) elName.textContent = doctor.name || '';
  if (elSpec) elSpec.textContent = doctor.specialty || '';
  if (elMat)  elMat.textContent  = [doctor.mp ? `MP ${doctor.mp}` : '', doctor.mn ? `MN ${doctor.mn}` : ''].filter(Boolean).join('  |  ');
  localStorage.setItem('dp_doctor', JSON.stringify(doctor));
}

function logout() {
  localStorage.removeItem('dp_token');
  localStorage.removeItem('dp_doctor');
  window.location.href = 'index.html';
}

// ── Riesgo Clínico ───────────────────────────────────────────────────────────
function calcRiesgoClinico() {
  const mayores = ['cm1','cm2','cm3'].filter(id => document.getElementById(id).checked).length;
  const menores = ['cn1','cn2','cn3','cn4','cn5','cn6','cn7','cn8','cn9','cn10']
                    .filter(id => document.getElementById(id).checked).length;
  let resultado;
  if (mayores >= 1 || menores >= 2) resultado = 'alto';
  else if (menores === 1) resultado = 'moderado';
  else resultado = 'bajo';
  applyRiesgoClinico(resultado, true);
  conclManual = null;
  updateConclusion();
}

function selectRiesgoClinico(nivel) {
  applyRiesgoClinico(nivel, false);
  conclManual = null;
  updateConclusion();
}

function applyRiesgoClinico(nivel, isComputed) {
  riesgoClinicoActual = nivel;
  const ids     = { alto: 'box-alto-cli', moderado: 'box-moderado-cli', bajo: 'box-bajo-cli' };
  const classes = { alto: 'active-alto', moderado: 'active-moderado', bajo: 'active-bajo' };
  Object.entries(ids).forEach(([k, id]) => {
    const el = document.getElementById(id);
    el.className = 'risk-box';
    if (k === nivel) {
      el.classList.add(classes[k]);
      if (isComputed) el.classList.add('computed');
    }
  });
}

// ── Riesgo Cirugía ───────────────────────────────────────────────────────────
function calcRiesgoCirugia() {
  const altoChecked = document.querySelectorAll('input[name="surg_alto"]:checked').length;
  const modChecked  = document.querySelectorAll('input[name="surg_mod"]:checked').length;
  const bajoChecked = document.querySelectorAll('input[name="surg_bajo"]:checked').length;
  if (altoChecked > 0)      riesgoCirugiaActual = 'alto';
  else if (modChecked > 0)  riesgoCirugiaActual = 'moderado';
  else if (bajoChecked > 0) riesgoCirugiaActual = 'bajo';
  else                      riesgoCirugiaActual = null;
  conclManual = null;
  updateConclusion();
}

// ── Conclusión ───────────────────────────────────────────────────────────────
function updateConclusion() {
  if (conclManual !== null) return;
  const map = {
    bajo:     { bajo: 'c-bajo-bajo', moderado: 'c-bajo-mod',  alto: 'c-bajo-alto' },
    moderado: { bajo: 'c-mod-bajo',  moderado: 'c-mod-mod',   alto: 'c-mod-alto'  },
    alto:     { bajo: 'c-alto-bajo', moderado: 'c-alto-mod',  alto: 'c-alto-alto' }
  };
  clearConclHighlight();
  if (riesgoClinicoActual && riesgoCirugiaActual) {
    highlightConcl(map[riesgoClinicoActual][riesgoCirugiaActual], true);
  }
  updateConclResumen();
}

function selectConcl(id) {
  conclManual = id;
  clearConclHighlight();
  highlightConcl(id, false);
  updateConclResumen();
}

function clearConclHighlight() {
  document.querySelectorAll('.concl-cell').forEach(el => {
    el.classList.remove('selected-bajo','selected-moderado','selected-alto','auto-highlight');
  });
}

function highlightConcl(id, isAuto) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('selected-' + el.getAttribute('data-val').toLowerCase());
  if (isAuto) el.classList.add('auto-highlight');
}

function updateConclResumen() {
  const cirugia = document.getElementById('cirugia_text').value.trim() || 'la cirugía programada';
  const sel = document.querySelector('.concl-cell.selected-bajo, .concl-cell.selected-moderado, .concl-cell.selected-alto');
  const el  = document.getElementById('concl-texto');
  if (!sel) {
    el.textContent = 'Se completará automáticamente al seleccionar criterios y tipo de cirugía.';
    el.classList.add('vacio');
    return;
  }
  const nivel = sel.classList.contains('selected-alto') ? 'ALTO'
              : sel.classList.contains('selected-moderado') ? 'MODERADO' : 'BAJO';
  el.textContent = `${nivel} para ${cirugia}.`;
  el.classList.remove('vacio');
}

// ── Copiar para HC ───────────────────────────────────────────────────────────
function copyToHC() {
  const v = id => document.getElementById(id)?.value?.trim() || '';
  const lines = [
    `Antecedentes: ${v('antecedentes')}`,
    `Medicación habitual: ${v('medicacion')}`,
    `Examen físico: ${v('examen')} | PA: ${v('pa')}`,
    `ECG: ${v('ecg')}`
  ];
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    const btn = document.getElementById('btn-copy-hc');
    btn.textContent = '✓ Copiado';
    btn.classList.add('copiado');
    setTimeout(() => { btn.textContent = 'Copiar para HC'; btn.classList.remove('copiado'); }, 2500);
  });
}

// ── Firma ────────────────────────────────────────────────────────────────────
function loadSignature(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const sigDataUrl = e.target.result;
    localStorage.setItem('cardiomed_firma', sigDataUrl);
    const img = document.getElementById('sig-img');
    img.src = sigDataUrl;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ── Limpiar ──────────────────────────────────────────────────────────────────
function clearForm() {
  if (!confirm('¿Limpiar todos los datos del formulario?')) return;
  ['paciente','edad','cirugia_text','antecedentes','medicacion','examen','pa','ecg','examenes','recomendaciones']
    .forEach(id => document.getElementById(id).value = '');
  document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
  clearConclHighlight();
  document.querySelectorAll('.risk-box').forEach(el => el.className = 'risk-box');
  riesgoClinicoActual = null;
  riesgoCirugiaActual = null;
  conclManual = null;
  const cf = document.getElementById('concl-texto');
  cf.textContent = 'Se completará automáticamente al seleccionar criterios y tipo de cirugía.';
  cf.classList.add('vacio');
  const today = new Date();
  document.getElementById('fecha').value =
    today.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Enviar informe al paciente ────────────────────────────────────────────────
function openEmailModal() {
  document.getElementById('modal-email').value = '';
  document.getElementById('modal-status').textContent = '';
  document.getElementById('modal-send-btn').disabled = false;
  document.getElementById('modal-send-btn').textContent = 'Enviar';
  document.getElementById('email-modal').classList.add('open');
}

function closeEmailModal() {
  document.getElementById('email-modal').classList.remove('open');
}

async function doSendReport() {
  const email = document.getElementById('modal-email').value.trim();
  if (!email) { document.getElementById('modal-status').textContent = 'Ingresá un email válido.'; return; }

  const btn    = document.getElementById('modal-send-btn');
  const status = document.getElementById('modal-status');
  btn.disabled = true;

  try {
    status.textContent = 'Generando PDF...';
    const pdf = await html2pdf().set({
      margin: 0,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 1200 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(document.querySelector('.page')).outputPdf('datauristring');

    status.textContent = 'Enviando...';
    const token = localStorage.getItem('dp_token');
    const res = await fetch(`${API}/reports/send`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_email: email,
        pdf_base64: pdf.split(',')[1],
        patient_name: document.getElementById('paciente').value.trim()
      })
    });

    if (res.ok) {
      closeEmailModal();
      alert('Informe enviado correctamente.');
    } else {
      status.textContent = 'Error al enviar. Intentá de nuevo.';
      btn.disabled = false;
    }
  } catch {
    status.textContent = 'Error al generar el PDF.';
    btn.disabled = false;
  }
}
