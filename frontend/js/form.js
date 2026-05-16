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
  } catch {
    const cached = localStorage.getItem('dp_doctor');
    if (cached) loadDoctorProfile(JSON.parse(cached));
  }

  const today = new Date();
  document.getElementById('fecha').value =
    today.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

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
