/* =============================================
   CUIDAPP — JavaScript Application (CLEAN)
   ============================================= */

'use strict';

// =============================================
// HTML ESCAPING (evita XSS en contenido de usuario)
// =============================================
const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

// =============================================
// NAVBAR + PAGE ROUTER
// =============================================
const navbar    = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

// Sections available as pages
const PAGE_IDS = ['dashboard','situacion','herramientas','foro','noticias','recursos','alertas','infografia'];

// Navigate to a page by section ID
window.navigateTo = function(pageId) {
  // Default to dashboard if unknown
  if (!PAGE_IDS.includes(pageId)) pageId = 'dashboard';

  // Hide all sections
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));

  // Show target section
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === pageId);
  });

  // Navbar: scrolled state reset
  navbar.classList.toggle('scrolled', false);

  // Scroll to top of page
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Update browser hash for bookmarking (silently)
  history.replaceState(null, '', '#' + pageId);

  // Close mobile menu
  navLinks.classList.remove('open');
};

// Also expose goToPage for any remaining references (maps index → navigateTo)
window.goToPage = function(index) {
  if (PAGE_IDS[index]) navigateTo(PAGE_IDS[index]);
};

// Nav link clicks
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.section);
  });
});

// Hamburger
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));

// Navbar scrolled class on window scroll (rAF-throttled to avoid redundant work per event)
let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    scrollTicking = false;
  });
}, { passive: true });

// Keyboard Escape closes mobile nav
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') navLinks.classList.remove('open');
});

// On load: check hash or default to dashboard
const initPage = (location.hash.slice(1) in Object.fromEntries(PAGE_IDS.map(id => [id,1])))
  ? location.hash.slice(1) : 'dashboard';
navigateTo(initPage);

// =============================================
// COUNTER ANIMATIONS
// =============================================
function animateCounter(el, target, duration = 2000) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { el.textContent = target; clearInterval(timer); return; }
    el.textContent = Math.floor(start);
  }, 16);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target, parseInt(e.target.dataset.target));
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.hstat-num').forEach(el => counterObserver.observe(el));

// =============================================
// TOAST NOTIFICATIONS
// =============================================
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span class="toast-msg">${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// =============================================
// PANEL MODALS (open/close)
// =============================================
function openPanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) { panel.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) { panel.classList.remove('active'); document.body.style.overflow = ''; }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['panelTest','panelPlanificador','panelRegistro','panelDerechos',
     'panelDirectorio','panelMensajes','panelAuth','panelAdmin','panelPostDetail']
    .forEach(id => closePanel(id));
  }
});

// =============================================
// USUARIOS Y AUTENTICACIÓN
// =============================================
const DEFAULT_USERS = [
  { id: 'u-admin', email: 'admin@cuidapp.es', pass: 'admin123', name: 'Administrador CuidApp', role: 'admin', banned: false },
  { id: 'u-1', email: 'maria@ejemplo.com', pass: '123456', name: 'María G.', role: 'padre', banned: false },
  { id: 'u-2', email: 'javier@ejemplo.com', pass: '123456', name: 'Javier P.', role: 'padre', banned: false },
  { id: 'u-3', email: 'elena@ejemplo.com', pass: '123456', name: 'Dra. Elena', role: 'profesional', banned: false }
];

let _usersCache = null;
function getUsers() {
  if (_usersCache) return _usersCache;
  const data = localStorage.getItem('cuidapp_users');
  _usersCache = data ? JSON.parse(data) : DEFAULT_USERS;
  if (!data) localStorage.setItem('cuidapp_users', JSON.stringify(_usersCache));
  return _usersCache;
}
function saveUsers(users) { _usersCache = users; localStorage.setItem('cuidapp_users', JSON.stringify(users)); }

let _currentUserCache, _currentUserCached = false;
function getCurrentUser() {
  if (_currentUserCached) return _currentUserCache;
  const data = localStorage.getItem('cuidapp_current_user');
  _currentUserCache = data ? JSON.parse(data) : null;
  _currentUserCached = true;
  return _currentUserCache;
}
function setCurrentUser(user) {
  _currentUserCache = user || null;
  _currentUserCached = true;
  if (user) localStorage.setItem('cuidapp_current_user', JSON.stringify(user));
  else localStorage.removeItem('cuidapp_current_user');
  updateUserNavUI();
}

function updateUserNavUI() {
  const area = document.getElementById('userNavArea');
  if (!area) return;
  const cu = getCurrentUser();
  if (cu) {
    area.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        ${cu.role === 'admin' ? '<button class="btn-micro" style="color:var(--orange);border-color:var(--orange)" onclick="openAdminPanel()">🛡️ Moderación</button>' : ''}
        <div class="avatar" title="${escapeHtml(cu.name)}">${escapeHtml(cu.name.substring(0,2).toUpperCase())}</div>
        <button class="btn-micro" onclick="logoutUser()">Salir</button>
      </div>`;
  } else {
    area.innerHTML = '<button class="btn-secondary sm" onclick="openAuthModal()">Iniciar Sesión / Registro</button>';
  }
}

// Abrir modal Auth
window.openAuthModal = function() { openPanel('panelAuth'); };
document.getElementById('panelAuthClose').addEventListener('click', () => closePanel('panelAuth'));
document.getElementById('panelAuthOverlay').addEventListener('click', () => closePanel('panelAuth'));

// Cambiar pestaña login/register
window.switchAuthTab = function(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab !== 'login');
  document.getElementById('formLogin').classList.toggle('hidden', tab !== 'login');
  document.getElementById('formRegister').classList.toggle('hidden', tab === 'login');
};

// LOGIN
window.handleLogin = function(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) { showToast('Rellena correo y contraseña', 'error'); return false; }
  const users = getUsers();
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pass === pass);
  if (!found) { showToast('Credenciales incorrectas', 'error'); return false; }
  if (found.banned) { showToast('⛔ Cuenta suspendida por violar las normas', 'error', 6000); return false; }
  setCurrentUser(found);
  showToast(`👋 Bienvenido/a, ${found.name}`, 'success');
  closePanel('panelAuth');
  renderForum();
  renderMyTrayectoria();
  return false;
};

// REGISTRO
window.handleRegister = function(e) {
  if (e) e.preventDefault();
  const name  = document.getElementById('regNombre').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const role  = document.getElementById('regRol').value;
  if (!name || !email || !pass) { showToast('Rellena todos los campos', 'error'); return false; }
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    showToast('Este correo ya está registrado', 'error'); return false;
  }
  const newUser = { id: 'u-' + Date.now(), email, pass, name, role, banned: false };
  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);
  showToast('✅ Cuenta creada. Bienvenido/a a la comunidad.', 'success');
  closePanel('panelAuth');
  renderForum();
  renderMyTrayectoria();
  return false;
};

window.logoutUser = function() {
  setCurrentUser(null);
  showToast('Sesión cerrada', 'info');
  renderForum();
  renderMyTrayectoria();
};

// =============================================
// TRAYECTORIA POR USUARIO Y DETECCIÓN DE RIESGO
// =============================================
// Cada "Registro de Situación" queda guardado por usuario (no solo como
// post del foro), para poder ver su evolución y detectar patrones de
// riesgo que requieran contacto proactivo del equipo de apoyo.
const MOOD_SEVERITY = { 'muy-bien': 0, 'bien': 1, 'regular': 2, 'mal': 3, 'muy-mal': 4 };
const MOOD_EMOJI = { 'muy-bien': '😄', 'bien': '🙂', 'regular': '😐', 'mal': '😟', 'muy-mal': '😢' };

let _situacionLogCache = null;
function getSituacionLog() {
  if (_situacionLogCache) return _situacionLogCache;
  const data = localStorage.getItem('cuidapp_situacion_log');
  _situacionLogCache = data ? JSON.parse(data) : [];
  return _situacionLogCache;
}
function saveSituacionLog(log) {
  _situacionLogCache = log;
  localStorage.setItem('cuidapp_situacion_log', JSON.stringify(log));
}

let _riskCasesCache = null;
function getRiskCases() {
  if (_riskCasesCache) return _riskCasesCache;
  const data = localStorage.getItem('cuidapp_risk_cases');
  _riskCasesCache = data ? JSON.parse(data) : [];
  return _riskCasesCache;
}
function saveRiskCases(cases) {
  _riskCasesCache = cases;
  localStorage.setItem('cuidapp_risk_cases', JSON.stringify(cases));
}

// Regla simple y transparente: mira los últimos 3 registros del usuario.
// "grave" si en 2+ de ellos coinciden ánimo del cuidador bajo Y energía baja;
// "atención" si eso ocurre 1 vez, o si ánimo bajo/energía baja aparecen sueltos 2+ veces.
function computeRiskForUser(userId) {
  const records = getSituacionLog()
    .filter(r => r.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);
  if (records.length === 0) return { level: 'ok', records };

  let severeCount = 0, attentionCount = 0;
  records.forEach(r => {
    const caregiverSeverity = MOOD_SEVERITY[r.caregiverMoodVal] ?? 2;
    const lowMood = caregiverSeverity >= 3;
    const lowEnergy = r.energy <= 3;
    if (lowMood && lowEnergy) severeCount++;
    else if (lowMood || lowEnergy) attentionCount++;
  });

  let level = 'ok';
  if (severeCount >= 2) level = 'grave';
  else if (severeCount >= 1 || attentionCount >= 2) level = 'atencion';
  return { level, records };
}

function flagRiskCase(user, level) {
  const cases = getRiskCases();
  const existing = cases.find(c => c.userId === user.id);
  if (level === 'ok') {
    if (existing) existing.level = 'ok';
    saveRiskCases(cases);
    return;
  }
  if (existing) {
    existing.level = level;
    existing.userName = user.name;
    existing.updatedAt = Date.now();
    existing.resolved = false;
  } else {
    cases.push({ userId: user.id, userName: user.name, level, updatedAt: Date.now(), resolved: false });
  }
  saveRiskCases(cases);
}

window.resolveRiskCase = function(userId) {
  const cases = getRiskCases();
  const c = cases.find(x => x.userId === userId);
  if (c) {
    c.resolved = true;
    saveRiskCases(cases);
    renderAdminRiesgo();
    showToast('Caso marcado como contactado', 'success');
  }
};

function renderMyTrayectoria() {
  const container = document.getElementById('miTrayectoriaCard');
  if (!container) return;
  const cu = getCurrentUser();

  if (!cu) {
    container.innerHTML = `
      <div class="trayectoria-empty">
        <span>📊 Inicia sesión y registra tu situación diaria para ver aquí tu trayectoria personal.</span>
        <button class="btn-secondary sm" onclick="openAuthModal()">Iniciar Sesión</button>
      </div>`;
    return;
  }

  const allRecords = getSituacionLog()
    .filter(r => r.userId === cu.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (allRecords.length === 0) {
    container.innerHTML = `
      <div class="trayectoria-empty">
        <span>📊 Todavía no tenés registros. Usá "Registrar Situación" para empezar tu seguimiento diario.</span>
        <button class="btn-primary sm" onclick="openRegistro()">+ Registrar Situación</button>
      </div>`;
    return;
  }

  const risk = computeRiskForUser(cu.id);
  const RISK_LABELS = {
    ok:       ['🟢 Estable', 'risk-ok'],
    atencion: ['🟡 Necesita atención', 'risk-atencion'],
    grave:    ['🔴 Riesgo alto — apoyo prioritario', 'risk-grave']
  };
  const [riskText, riskClass] = RISK_LABELS[risk.level];

  const chartRecords = [...allRecords].reverse().slice(-14); // orden cronológico para el gráfico
  const energyColor = (e) => (e >= 7 ? 'var(--green)' : e >= 4 ? 'var(--gold)' : 'var(--red)');

  const last = allRecords[0];
  const avgEnergy = (allRecords.slice(0, 7).reduce((sum, r) => sum + r.energy, 0) / Math.min(7, allRecords.length)).toFixed(1);
  const activityCounts = {};
  allRecords.slice(0, 7).forEach(r => (r.actividades || []).forEach(a => { activityCounts[a] = (activityCounts[a] || 0) + 1; }));
  const topActivities = Object.entries(activityCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);

  container.innerHTML = `
    <div class="trayectoria-header">
      <h3>📊 Mi Situación</h3>
      <span class="risk-badge ${riskClass}">${riskText}</span>
    </div>

    <div class="tray-stats-row">
      <div class="tray-stat-tile">
        <span class="tray-stat-label">Último ánimo (cuidador)</span>
        <span class="tray-stat-value">${escapeHtml(last.caregiverMood)}</span>
      </div>
      <div class="tray-stat-tile">
        <span class="tray-stat-label">Energía media (últimos ${Math.min(7, allRecords.length)})</span>
        <span class="tray-stat-value">${avgEnergy}/10</span>
      </div>
      <div class="tray-stat-tile">
        <span class="tray-stat-label">Actividades frecuentes</span>
        <span class="tray-stat-value tray-stat-small">${topActivities.length ? escapeHtml(topActivities.join(', ')) : 'Sin registrar'}</span>
      </div>
    </div>

    <div class="tray-swimlane-wrap">
      <div class="tray-swimlane" style="grid-template-columns: 96px repeat(${chartRecords.length}, minmax(38px, 1fr));">
        <span class="tray-lane-label">👶 Niño/a</span>
        ${chartRecords.map(r => `<span class="tray-lane-cell" title="Niño/a: ${escapeHtml(r.childMood)}">${MOOD_EMOJI[r.childMoodVal] ?? '🙂'}</span>`).join('')}

        <span class="tray-lane-label">🧠 Cuidador/a</span>
        ${chartRecords.map(r => `<span class="tray-lane-cell" title="Cuidador/a: ${escapeHtml(r.caregiverMood)}">${MOOD_EMOJI[r.caregiverMoodVal] ?? '😐'}</span>`).join('')}

        <span class="tray-lane-label">⚡ Energía</span>
        ${chartRecords.map(r => `
          <span class="tray-lane-energy" title="Energía: ${r.energy}/10">
            <span class="tray-lane-energy-fill" style="height:${r.energy * 10}%;background:${energyColor(r.energy)}"></span>
          </span>
        `).join('')}

        <span class="tray-lane-label"></span>
        ${chartRecords.map(r => `<span class="tray-lane-date">${new Date(r.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>`).join('')}
      </div>
    </div>
    <p class="tray-legend">👶 y 🧠 muestran el ánimo del día · la barra de energía es verde (alta), amarilla (media) o roja (baja)</p>

    ${risk.level === 'grave' ? `
      <div class="risk-alert-banner">
        <strong>💜 No estás solo/a.</strong> Detectamos varios días difíciles seguidos y tu caso quedó marcado como prioritario para nuestro equipo. Podés escribirnos ahora mismo.
        <button class="btn-primary sm" onclick="openPanel('panelMensajes')">Contactar con apoyo →</button>
      </div>` : ''}

    <div class="tray-history">
      <h4 class="tray-history-title">Todos mis registros (${allRecords.length})</h4>
      <div class="tray-history-list">
        ${allRecords.map(r => `
          <div class="tray-history-item">
            <div class="tray-history-date">${new Date(r.timestamp).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} · ${new Date(r.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="tray-history-pills">
              <span class="tray-history-pill">👶 Niño/a: ${escapeHtml(r.childMood)}</span>
              <span class="tray-history-pill">🧠 Cuidador/a: ${escapeHtml(r.caregiverMood)}</span>
              <span class="tray-history-pill">⚡ Energía: ${r.energy}/10</span>
              ${r.publicadoEnForo ? '<span class="tray-history-pill tray-pill-public">🌍 Publicado en el foro</span>' : '<span class="tray-history-pill tray-pill-private">🔒 Privado</span>'}
            </div>
            ${(r.actividades && r.actividades.length) ? `<div class="tray-history-activities">✅ ${r.actividades.map(a => escapeHtml(a)).join(' · ')}</div>` : ''}
            ${r.notas ? `<p class="tray-history-notes">${escapeHtml(r.notas)}</p>` : ''}
            <div class="tray-history-actions">
              <button class="btn-micro" onclick="editSituacionRecord('${r.id}')">✏️ Editar</button>
              <button class="btn-micro" onclick="toggleForoRecord('${r.id}')">${r.publicadoEnForo ? '🔒 Hacer privado' : '🌍 Publicar en el Foro'}</button>
              <button class="btn-micro" style="color:var(--red)" onclick="deleteSituacionRecord('${r.id}')">🗑️ Eliminar</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAdminRiesgo() {
  const list = document.getElementById('adminRiesgoList');
  if (!list) return;
  const cases = getRiskCases()
    .filter(c => !c.resolved && c.level !== 'ok')
    .sort((a, b) => b.updatedAt - a.updatedAt);

  if (cases.length === 0) {
    list.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;padding:20px">No hay casos de riesgo activos. 🎉</p>';
    return;
  }

  list.innerHTML = cases.map(c => `
    <div class="admin-user-row" style="${c.level === 'grave' ? 'border:2px solid var(--red);background:var(--red-pale);' : ''}">
      <div class="admin-user-info">
        <strong>${escapeHtml(c.userName)} <span class="user-banned-tag" style="${c.level === 'grave' ? 'background:var(--red);color:white;' : 'background:var(--gold-pale);color:var(--gold);'}">${c.level === 'grave' ? 'RIESGO ALTO' : 'ATENCIÓN'}</span></strong>
        <span>Última actualización: ${new Date(c.updatedAt).toLocaleString('es-ES')}</span>
      </div>
      <button class="btn-micro" style="color:var(--green)" onclick="resolveRiskCase('${c.userId}')">✅ Marcar contactado</button>
    </div>
  `).join('');
}

// =============================================
// FORO DE SITUACIONES (localStorage)
// =============================================
// Timestamp real para poder filtrar por fecha; los posts de ejemplo se
// anclan a "hoy" relativo para que "Hoy"/"Ayer" siga siendo coherente
// sin importar qué día se abra la demo.
function daysAgoAt(days, hour, min) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d.getTime();
}

const SAMPLE_POSTS = [
  {
    id: 'post-1', author: 'María G.', authorId: 'u-1',
    date: 'Hoy, 09:30', timestamp: daysAgoAt(0, 9, 30), category: 'emocional', catLabel: 'Apoyo Emocional',
    title: 'Días difíciles con el descanso nocturno',
    content: 'Mi hijo Lucas (5 años, PCI) lleva una semana despierto casi todas las noches por espasmos. Me siento desbordada. ¿Alguien ha probado algún cambio de postura o rutina?',
    childMood: '😟 Mal', caregiverMood: '😢 Muy mal', energy: '3/10', likes: 12, userLiked: false,
    comments: [
      { author: 'Carlos M. (Padre)', date: 'Hoy, 10:15', text: 'A nosotros nos ayudó mucho un cojín posicional en cuña. ¡Mucho ánimo!' },
      { author: 'Dra. Elena (Profesional)', date: 'Hoy, 11:00', text: 'Hola María. Es muy importante revisar la postura nocturna con tu fisioterapeuta de referencia.' }
    ]
  },
  {
    id: 'post-2', author: 'Javier P.', authorId: 'u-2',
    date: 'Ayer, 18:20', timestamp: daysAgoAt(1, 18, 20), category: 'escolar', catLabel: 'Colegio / Educación',
    title: '¡Gran avance en el colegio de integración!',
    content: 'Hoy hemos tenido la reunión trimestral con orientación escolar. Han adaptado los materiales y nuestro Mateo está súper motivado.',
    childMood: '😄 Muy bien', caregiverMood: '🙂 Bien', energy: '8/10', likes: 24, userLiked: false,
    comments: [
      { author: 'Ana R. (Madre)', date: 'Ayer, 19:40', text: '¡Qué gran noticia! Da tranquilidad cuando el colegio se involucra de verdad. ❤️' }
    ]
  },
  {
    id: 'post-3', author: 'Carmen L.', authorId: 'u-1',
    date: '23 Jul, 14:10', timestamp: daysAgoAt(4, 14, 10), category: 'medico', catLabel: 'Salud y Terapias',
    title: 'Dudas sobre trámites de la dependencia',
    content: 'Llevamos 8 meses esperando la resolución del grado de dependencia. ¿Sabéis si hay canal para consultar el estado del expediente sin ir presencialmente?',
    childMood: '😐 Regular', caregiverMood: '😐 Regular', energy: '5/10', likes: 7, userLiked: false,
    comments: [
      { author: 'Laura (Trabajadora Social)', date: '23 Jul, 16:00', text: 'Puedes consultar por la carpeta ciudadana con certificado digital o a través de nuestra asesoría legal.' }
    ]
  }
];

let _postsCache = null;
function getStoredPosts() {
  if (_postsCache) return _postsCache;
  const data = localStorage.getItem('cuidapp_forum_posts');
  _postsCache = data ? JSON.parse(data) : SAMPLE_POSTS;
  if (!data) localStorage.setItem('cuidapp_forum_posts', JSON.stringify(_postsCache));
  return _postsCache;
}
function savePosts(posts) { _postsCache = posts; localStorage.setItem('cuidapp_forum_posts', JSON.stringify(posts)); }

// Mantiene el selector de "personas" con las autoras/es realmente presentes
// en el foro, preservando la selección actual si sigue siendo válida.
function populateForumAuthorFilter(posts) {
  const select = document.getElementById('forumAuthorFilter');
  if (!select) return;
  const current = select.value;
  const authors = [...new Set(posts.map(p => p.author))].sort((a, b) => a.localeCompare(b, 'es'));
  select.innerHTML = '<option value="all">Todas las personas</option>' +
    authors.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  if (authors.includes(current)) select.value = current;
}

function renderForum() {
  const posts    = getStoredPosts();
  const users    = getUsers();
  const cu       = getCurrentUser();
  const search   = (document.getElementById('forumSearchInput')?.value || '').toLowerCase();
  const cat      = document.getElementById('forumCategoryFilter')?.value || 'all';
  const author   = document.getElementById('forumAuthorFilter')?.value || 'all';
  const dateFrom = document.getElementById('forumDateFrom')?.value || '';
  const dateTo   = document.getElementById('forumDateTo')?.value || '';

  const visiblePosts = posts.filter(p => {
    const authorUser = users.find(u => u.id === p.authorId || u.name === p.author);
    return !(authorUser && authorUser.banned);
  });
  populateForumAuthorFilter(visiblePosts);

  const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
  const toTs   = dateTo   ? new Date(dateTo + 'T23:59:59').getTime()   : null;

  const filtered = visiblePosts.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search) || p.content.toLowerCase().includes(search) || p.author.toLowerCase().includes(search);
    const matchCat    = cat === 'all' || p.category === cat;
    const matchAuthor = author === 'all' || p.author === author;
    const matchFrom   = fromTs === null || (p.timestamp || 0) >= fromTs;
    const matchTo     = toTs === null || (p.timestamp || 0) <= toTs;
    return matchSearch && matchCat && matchAuthor && matchFrom && matchTo;
  });

  const listEl = document.getElementById('forumList');
  if (!listEl) return;

  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">No hay publicaciones para esta búsqueda.</div>';
    return;
  }

  listEl.innerHTML = filtered.map(p => `
    <div class="forum-card" id="${p.id}">
      <div class="forum-card-header">
        <div class="forum-author-info">
          <div class="forum-avatar">${escapeHtml(p.author.substring(0,2).toUpperCase())}</div>
          <div>
            <div class="forum-author-name">${escapeHtml(p.author)}</div>
            <div class="forum-date">${escapeHtml(p.date)}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span class="forum-tag">${escapeHtml(p.catLabel)}</span>
          ${cu && cu.role === 'admin' ? `<button class="btn-micro" style="color:var(--red)" onclick="deletePost('${p.id}')">🗑️</button>` : ''}
        </div>
      </div>
      <div class="forum-body">
        <h3 class="forum-title">${escapeHtml(p.title)}</h3>
        <p class="forum-snippet">${escapeHtml(p.content)}</p>
        <div class="forum-mood-pills">
          <span class="mood-pill">👶 Niño/a: ${escapeHtml(p.childMood || '🙂 Bien')}</span>
          <span class="mood-pill">🧠 Cuidador/a: ${escapeHtml(p.caregiverMood || '😐 Regular')}</span>
          <span class="mood-pill">⚡ Energía: ${escapeHtml(p.energy || '5/10')}</span>
        </div>
      </div>
      <div class="forum-footer">
        <button class="btn-like ${p.userLiked ? 'liked' : ''}" onclick="toggleLike('${p.id}')">❤️ <span>${p.likes} Apoyos</span></button>
        <div class="forum-actions">
          <span class="forum-comments-count">💬 ${p.comments.length} respuestas</span>
          <button class="btn-micro" onclick="openPostDetail('${p.id}')">Ver y Responder →</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.toggleLike = function(postId) {
  if (!getCurrentUser()) { showToast('Inicia sesión para dar apoyo', 'info'); openAuthModal(); return; }
  const posts = getStoredPosts();
  const post = posts.find(p => p.id === postId);
  if (post) {
    post.likes += post.userLiked ? -1 : 1;
    post.userLiked = !post.userLiked;
    savePosts(posts);
    renderForum();
  }
};

window.deletePost = function(postId) {
  if (!confirm('¿Eliminar esta publicación?')) return;
  savePosts(getStoredPosts().filter(p => p.id !== postId));
  // Si el post venía de un registro de situación, ese registro vuelve a quedar privado.
  const log = getSituacionLog();
  const linked = log.find(r => r.forumPostId === postId);
  if (linked) {
    linked.publicadoEnForo = false;
    linked.forumPostId = undefined;
    saveSituacionLog(log);
    renderMyTrayectoria();
  }
  showToast('Publicación eliminada', 'info');
  renderForum();
  renderAdminPosts();
};

window.openPostDetail = function(postId) {
  const p  = getStoredPosts().find(x => x.id === postId);
  const cu = getCurrentUser();
  if (!p) return;

  const renderComment = (c, i) => `
    <div class="comment-item">
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(c.author)}</span>
        <span class="comment-date">${escapeHtml(c.date)}</span>
      </div>
      <div class="comment-body">${escapeHtml(c.text)}</div>
      ${c.image ? `
        <div class="comment-image-wrap">
          <img src="${escapeHtml(c.image)}" alt="Imagen adjunta" class="comment-image"
               onclick="openImageLightbox('${c.image}')" />
        </div>` : ''}
      ${c.link ? `
        <a href="${escapeHtml(c.link)}" target="_blank" rel="noopener noreferrer" class="comment-link">
          🔗 ${escapeHtml(c.link)}
        </a>` : ''}
      ${cu && cu.role === 'admin' ? `<button class="btn-micro" style="color:var(--red);margin-top:6px" onclick="deleteComment('${p.id}',${i})">🗑️ Borrar</button>` : ''}
    </div>
  `;

  document.getElementById('postDetailContainer').innerHTML = `
    <div class="forum-author-info" style="margin-bottom:16px;">
      <div class="forum-avatar">${escapeHtml(p.author.substring(0,2).toUpperCase())}</div>
      <div>
        <div class="forum-author-name">${escapeHtml(p.author)}</div>
        <div class="forum-date">${escapeHtml(p.date)} · <span style="color:var(--blue)">${escapeHtml(p.catLabel)}</span></div>
      </div>
    </div>
    <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:12px;color:var(--text-primary)">${escapeHtml(p.title)}</h2>
    <p style="font-size:0.92rem;color:var(--text-secondary);line-height:1.6;margin-bottom:20px;">${escapeHtml(p.content)}</p>
    <div style="border-top:1px solid var(--border);padding-top:20px;">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px;color:var(--text-primary);">💬 Respuestas (${p.comments.length})</h3>
      <div style="max-height:240px;overflow-y:auto;margin-bottom:20px;">
        ${p.comments.length === 0 ? '<p style="color:var(--text-muted);font-size:0.85rem">Sé el primero en responder.</p>' : ''}
        ${p.comments.map((c,i) => renderComment(c,i)).join('')}
      </div>

      ${cu ? `
        <!-- REPLY FORM -->
        <div class="reply-form" id="replyForm">
          <textarea class="reg-textarea" id="replyInput" placeholder="Escribe tu respuesta o consejo..." style="min-height:80px;"></textarea>

          <!-- ADJUNTAR FOTO -->
          <div class="reply-attach-row">
            <label class="reply-attach-btn" for="replyImageInput" title="Adjuntar foto">
              📷 Añadir foto
              <input type="file" id="replyImageInput" accept="image/*" style="display:none"
                     onchange="previewReplyImage(event)" />
            </label>
            <span class="reply-attach-sep">|</span>
            <input type="url" id="replyLinkInput" class="reply-link-input"
                   placeholder="🔗 Pegar enlace (https://...)" />
          </div>

          <!-- PREVIEW IMAGEN -->
          <div id="replyImagePreview" class="reply-image-preview hidden">
            <img id="replyPreviewImg" src="" alt="Vista previa" />
            <button class="reply-remove-img" onclick="removeReplyImage()" title="Quitar foto">✕</button>
          </div>

          <button class="btn-primary full" style="margin-top:12px" onclick="submitReply('${p.id}')">💬 Enviar Respuesta</button>
        </div>
      ` : `
        <div style="text-align:center;padding:16px;background:var(--bg-section);border-radius:8px;border:1px solid var(--border)">
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px">Inicia sesión para poder responder a esta familia.</p>
          <button class="btn-primary sm" onclick="closePanel('panelPostDetail');openAuthModal()">Iniciar Sesión</button>
        </div>
      `}
    </div>
  `;
  openPanel('panelPostDetail');
};

// Lightbox sencillo para ver imagen a pantalla completa
window.openImageLightbox = function(src) {
  let lb = document.getElementById('imgLightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'imgLightbox';
    lb.innerHTML = `<div class="lb-overlay" onclick="closeLightbox()"></div><div class="lb-box"><img id="lbImg" src="" /><button class="lb-close" onclick="closeLightbox()">✕</button></div>`;
    document.body.appendChild(lb);
  }
  document.getElementById('lbImg').src = src;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};
window.closeLightbox = function() {
  const lb = document.getElementById('imgLightbox');
  if (lb) { lb.style.display = 'none'; document.body.style.overflow = ''; }
};

// Preview imagen seleccionada
window.previewReplyImage = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    showToast('La imagen no puede superar 3 MB', 'error'); e.target.value = ''; return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('replyImagePreview');
    const img     = document.getElementById('replyPreviewImg');
    img.src       = ev.target.result;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
};

window.removeReplyImage = function() {
  const input   = document.getElementById('replyImageInput');
  const preview = document.getElementById('replyImagePreview');
  if (input)   input.value = '';
  if (preview) preview.classList.add('hidden');
};

window.deleteComment = function(postId, idx) {
  const posts = getStoredPosts();
  const post  = posts.find(p => p.id === postId);
  if (post && post.comments[idx] !== undefined) {
    post.comments.splice(idx, 1);
    savePosts(posts);
    showToast('Comentario eliminado', 'info');
    openPostDetail(postId);
    renderForum();
  }
};

window.submitReply = function(postId) {
  const cu   = getCurrentUser();
  if (!cu) { openAuthModal(); return; }
  const text = document.getElementById('replyInput')?.value.trim();
  if (!text) { showToast('Escribe tu respuesta primero', 'error'); return; }

  // Collect optional image (base64) and link
  const previewImg = document.getElementById('replyPreviewImg');
  const image = previewImg && previewImg.src && !document.getElementById('replyImagePreview').classList.contains('hidden')
    ? previewImg.src : null;
  const link = (document.getElementById('replyLinkInput')?.value.trim()) || null;

  // Basic URL validation
  if (link && !link.match(/^https?:\/\//i)) {
    showToast('El enlace debe empezar por https:// o http://', 'error'); return;
  }

  const posts = getStoredPosts();
  const post  = posts.find(p => p.id === postId);
  if (post) {
    post.comments.push({
      author: `${cu.name} (${cu.role === 'profesional' ? 'Profesional' : 'Familia'})`,
      date: 'Ahora',
      text,
      image: image || undefined,
      link:  link  || undefined
    });
    savePosts(posts);
    showToast('❤️ Respuesta publicada', 'success');
    openPostDetail(postId);
    renderForum();
    renderFeaturedFamilyWidget();
  }
};

document.getElementById('panelPostClose').addEventListener('click',  () => closePanel('panelPostDetail'));
document.getElementById('panelPostOverlay').addEventListener('click', () => closePanel('panelPostDetail'));

document.getElementById('forumSearchInput')?.addEventListener('input', renderForum);
document.getElementById('forumCategoryFilter')?.addEventListener('change', renderForum);
document.getElementById('forumAuthorFilter')?.addEventListener('change', renderForum);
document.getElementById('forumDateFrom')?.addEventListener('change', renderForum);
document.getElementById('forumDateTo')?.addEventListener('change', renderForum);
document.getElementById('btnClearForumFilters')?.addEventListener('click', () => {
  const searchEl = document.getElementById('forumSearchInput');
  const catEl    = document.getElementById('forumCategoryFilter');
  const authorEl = document.getElementById('forumAuthorFilter');
  const fromEl   = document.getElementById('forumDateFrom');
  const toEl     = document.getElementById('forumDateTo');
  if (searchEl) searchEl.value = '';
  if (catEl) catEl.value = 'all';
  if (authorEl) authorEl.value = 'all';
  if (fromEl) fromEl.value = '';
  if (toEl) toEl.value = '';
  renderForum();
});
document.getElementById('btnNuevaPublicacion')?.addEventListener('click', () => openRegistro(true));

// =============================================
// REGISTRO DIARIO → PUBLICACIÓN EN FORO
// =============================================
// Si estamos editando un registro existente, guarda su id; null = registro nuevo.
let editingRecordId = null;

// Crea, actualiza o elimina el post del foro ligado a un registro, según si
// se quiere publicado o no. Devuelve el id del post vigente (o undefined).
function syncForumPost(cu, previousForumPostId, wantsPublish, postData) {
  const posts = getStoredPosts();
  if (wantsPublish) {
    const existingPost = previousForumPostId && posts.find(p => p.id === previousForumPostId);
    if (existingPost) {
      Object.assign(existingPost, postData);
      savePosts(posts);
      renderForum();
      return existingPost.id;
    }
    const newPost = {
      id: 'post-' + Date.now(), author: cu.name, authorId: cu.id,
      date: 'Ahora mismo', timestamp: Date.now(), category: 'emocional', catLabel: 'Registro Diario',
      likes: 0, userLiked: false, comments: [], ...postData
    };
    posts.unshift(newPost);
    savePosts(posts);
    renderForum();
    return newPost.id;
  }
  if (previousForumPostId) {
    savePosts(posts.filter(p => p.id !== previousForumPostId));
    renderForum();
  }
  return undefined;
}

// Formato requerido por <input type="datetime-local">, en hora local (no UTC).
function toDatetimeLocalValue(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Etiqueta legible para el post del foro ("Hoy, 09:30" / "Ayer, 18:20" / "23 jul, 14:10").
function formatPostDateLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return `Hoy, ${time}`;
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `Ayer, ${time}`;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ', ' + time;
}

function buildForumPostData(notas, childMood, caregiverMood, energyVal, timestamp) {
  const content = notas || '(Sin notas adicionales)';
  return {
    title: 'Registro: ' + (content.length > 45 ? content.substring(0, 45) + '...' : content),
    content, childMood, caregiverMood, energy: energyVal + '/10',
    timestamp, date: formatPostDateLabel(timestamp)
  };
}

// arg: undefined = registro nuevo en blanco; true = nuevo pero premarcado
// para publicar (llegó desde "+ Publicar mi Situación" del foro);
// objeto registro = editar ese registro existente.
function openRegistro(arg) {
  if (!getCurrentUser()) { showToast('Inicia sesión para registrar tu situación', 'info'); openAuthModal(); return; }
  const isEditing = arg && typeof arg === 'object';
  editingRecordId = isEditing ? arg.id : null;

  const dateTimeEl = document.getElementById('regDateTime');
  if (dateTimeEl) dateTimeEl.value = toDatetimeLocalValue(isEditing ? arg.timestamp : Date.now());

  const notasEl = document.getElementById('regNotas');
  if (notasEl) notasEl.value = isEditing ? (arg.notas || '') : '';
  document.querySelectorAll('#childMood .emoji-opt').forEach(b => b.classList.toggle('active', isEditing && b.dataset.val === arg.childMoodVal));
  document.querySelectorAll('#caregiverMood .emoji-opt').forEach(b => b.classList.toggle('active', isEditing && b.dataset.val === arg.caregiverMoodVal));
  const slider = document.getElementById('energySlider');
  const energyValEl = document.getElementById('energyVal');
  const energyDefault = isEditing ? arg.energy : 5;
  if (slider) slider.value = energyDefault;
  if (energyValEl) energyValEl.textContent = energyDefault + '/10';
  document.querySelectorAll('#activityChecks input[type="checkbox"]').forEach(cb => {
    cb.checked = isEditing && (arg.actividades || []).includes(cb.value);
  });

  // Por defecto el registro es privado; premarcado para publicar si venimos
  // de "Publicar mi Situación" del foro, o si estamos editando uno que ya
  // estaba publicado.
  const publicarCheck = document.getElementById('regPublicarForo');
  if (publicarCheck) publicarCheck.checked = isEditing ? !!arg.publicadoEnForo : (arg === true);

  const titleEl = document.getElementById('panelRegTitle');
  if (titleEl) titleEl.textContent = isEditing ? '✏️ Editar Registro' : '📝 Registro Diario de Situación';
  const btnEl = document.getElementById('saveRegBtn');
  if (btnEl) btnEl.textContent = isEditing ? '💾 Guardar Cambios' : '💾 Guardar Registro';

  openPanel('panelRegistro');
}

document.getElementById('btnRegistrar')?.addEventListener('click',         () => openRegistro());
document.getElementById('btnRegistroSituacion')?.addEventListener('click', () => openRegistro());
document.getElementById('panelRegClose')?.addEventListener('click',        () => closePanel('panelRegistro'));
document.getElementById('panelRegOverlay')?.addEventListener('click',      () => closePanel('panelRegistro'));

window.editSituacionRecord = function(recordId) {
  const cu = getCurrentUser();
  if (!cu) return;
  const rec = getSituacionLog().find(r => r.id === recordId && r.userId === cu.id);
  if (rec) openRegistro(rec);
};

window.deleteSituacionRecord = function(recordId) {
  const cu = getCurrentUser();
  if (!cu) return;
  if (!confirm('¿Eliminar este registro de tu historial? Esta acción no se puede deshacer.')) return;
  const log = getSituacionLog();
  const rec = log.find(r => r.id === recordId && r.userId === cu.id);
  if (!rec) return;
  if (rec.forumPostId) {
    savePosts(getStoredPosts().filter(p => p.id !== rec.forumPostId));
    renderForum();
  }
  saveSituacionLog(log.filter(r => r.id !== recordId));
  flagRiskCase(cu, computeRiskForUser(cu.id).level);
  showToast('🗑️ Registro eliminado', 'info');
  renderMyTrayectoria();
};

window.toggleForoRecord = function(recordId) {
  const cu = getCurrentUser();
  if (!cu) return;
  const log = getSituacionLog();
  const idx = log.findIndex(r => r.id === recordId && r.userId === cu.id);
  if (idx === -1) return;
  const rec = log[idx];
  const wantsPublish = !rec.publicadoEnForo;
  const postData = buildForumPostData(rec.notas, rec.childMood, rec.caregiverMood, rec.energy, rec.timestamp);
  const forumPostId = syncForumPost(cu, rec.forumPostId, wantsPublish, postData);
  log[idx] = { ...rec, publicadoEnForo: wantsPublish, forumPostId };
  saveSituacionLog(log);
  showToast(wantsPublish ? '🌍 Registro publicado en el Foro' : '🔒 Registro pasado a privado', 'success');
  renderMyTrayectoria();
};

document.getElementById('saveRegBtn')?.addEventListener('click', () => {
  const cu = getCurrentUser();
  if (!cu) { openAuthModal(); return; }
  const notas            = document.getElementById('regNotas')?.value.trim();
  const childOpt         = document.querySelector('#childMood .emoji-opt.active');
  const caregiverOpt     = document.querySelector('#caregiverMood .emoji-opt.active');
  const energyVal        = parseInt(document.getElementById('energySlider')?.value || '5', 10);
  const childMoodVal     = childOpt     ? childOpt.dataset.val     : 'bien';
  const caregiverMoodVal = caregiverOpt ? caregiverOpt.dataset.val : 'regular';
  const childMood        = childOpt     ? childOpt.title     : '🙂 Bien';
  const caregiverMood    = caregiverOpt ? caregiverOpt.title : '😐 Regular';
  const publicarForo     = document.getElementById('regPublicarForo')?.checked || false;
  const actividades      = [...document.querySelectorAll('#activityChecks input:checked')].map(cb => cb.value);
  const wantsPublish     = !!(notas && publicarForo);
  const dateTimeVal      = document.getElementById('regDateTime')?.value;
  const chosenTimestamp  = dateTimeVal ? new Date(dateTimeVal).getTime() : Date.now();
  const log = getSituacionLog();

  if (isNaN(chosenTimestamp)) { showToast('La fecha y hora no son válidas', 'error'); return; }

  // MODO EDICIÓN: actualiza el registro existente y sincroniza su post del foro.
  if (editingRecordId) {
    const idx = log.findIndex(r => r.id === editingRecordId && r.userId === cu.id);
    if (idx === -1) { showToast('No se encontró el registro', 'error'); editingRecordId = null; closePanel('panelRegistro'); return; }
    const existing = log[idx];
    const postData = buildForumPostData(notas, childMood, caregiverMood, energyVal, chosenTimestamp);
    const forumPostId = syncForumPost(cu, existing.forumPostId, wantsPublish, postData);
    log[idx] = {
      ...existing, timestamp: chosenTimestamp, childMoodVal, caregiverMoodVal, childMood, caregiverMood,
      energy: energyVal, notas: notas || '', actividades, publicadoEnForo: wantsPublish, forumPostId
    };
    saveSituacionLog(log);
    flagRiskCase(cu, computeRiskForUser(cu.id).level);
    showToast('✏️ Registro actualizado' + (wantsPublish ? ' (publicado en el Foro)' : ''), 'success');
    editingRecordId = null;
    renderMyTrayectoria();
    closePanel('panelRegistro');
    return;
  }

  // MODO CREACIÓN: registro estructurado por usuario, siempre privado salvo
  // que se marque explícitamente publicarlo en el foro.
  const forumPostId = wantsPublish ? syncForumPost(cu, undefined, true, buildForumPostData(notas, childMood, caregiverMood, energyVal, chosenTimestamp)) : undefined;
  log.push({
    id: 'reg-' + Date.now(), userId: cu.id, userName: cu.name,
    timestamp: chosenTimestamp, childMoodVal, caregiverMoodVal,
    childMood, caregiverMood, energy: energyVal, notas: notas || '',
    actividades, publicadoEnForo: wantsPublish, forumPostId
  });
  saveSituacionLog(log);

  const risk = computeRiskForUser(cu.id);
  flagRiskCase(cu, risk.level);

  if (risk.level === 'grave') {
    showToast('💜 Detectamos varios días difíciles seguidos. Tu caso quedó marcado como prioritario para que nuestro equipo te contacte.', 'error', 7000);
  } else {
    showToast('💾 Situación guardada en privado' + (wantsPublish ? ' y publicada en el Foro' : ''), 'success');
  }

  renderMyTrayectoria();
  setTimeout(() => {
    closePanel('panelRegistro');
    goToPage(PAGE_IDS.indexOf(wantsPublish ? 'foro' : 'situacion'));
  }, 900);
});

// emoji selectors
document.querySelectorAll('.emoji-selector').forEach(sel => {
  sel.querySelectorAll('.emoji-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      sel.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

// energy slider
const slider   = document.getElementById('energySlider');
const energyVal = document.getElementById('energyVal');
if (slider) slider.addEventListener('input', () => { if (energyVal) energyVal.textContent = slider.value + '/10'; });

// =============================================
// PANEL DE MODERACIÓN (ADMIN)
// =============================================
window.openAdminPanel = function() {
  renderAdminUsers();
  renderAdminPosts();
  renderAdminRiesgo();
  openPanel('panelAdmin');
};
document.getElementById('panelAdminClose')?.addEventListener('click',  () => closePanel('panelAdmin'));
document.getElementById('panelAdminOverlay')?.addEventListener('click', () => closePanel('panelAdmin'));

window.switchAdminTab = function(tab) {
  document.getElementById('btnTabUsers').classList.toggle('active', tab === 'users');
  document.getElementById('btnTabPosts').classList.toggle('active', tab === 'posts');
  document.getElementById('btnTabPortada').classList.toggle('active', tab === 'portada');
  document.getElementById('btnTabRiesgo').classList.toggle('active', tab === 'riesgo');
  document.getElementById('adminUsersTab').classList.toggle('hidden', tab !== 'users');
  document.getElementById('adminPostsTab').classList.toggle('hidden', tab !== 'posts');
  document.getElementById('adminPortadaTab').classList.toggle('hidden', tab !== 'portada');
  document.getElementById('adminRiesgoTab').classList.toggle('hidden', tab !== 'riesgo');
  if (tab === 'portada') renderAdminPortada();
  if (tab === 'riesgo') renderAdminRiesgo();
};

function renderAdminUsers() {
  const users = getUsers();
  const list  = document.getElementById('adminUserList');
  if (!list) return;
  list.innerHTML = users.map(u => `
    <div class="admin-user-row">
      <div class="admin-user-info">
        <strong>${escapeHtml(u.name)} ${u.banned ? '<span class="user-banned-tag">BANEADO</span>' : ''}</strong>
        <span>📧 ${escapeHtml(u.email)} · ${escapeHtml(u.role)}</span>
      </div>
      ${u.role !== 'admin' ? `
        <button class="btn-micro" style="${u.banned ? 'color:var(--green)' : 'color:var(--red)'}" onclick="toggleBanUser('${u.id}')">
          ${u.banned ? '🔓 Desbanear' : '🚫 Banear'}
        </button>` : '<span style="font-size:0.75rem;color:var(--text-muted)">SuperAdmin</span>'}
    </div>
  `).join('');
}

window.toggleBanUser = function(userId) {
  const users = getUsers();
  const u = users.find(x => x.id === userId);
  if (u) {
    u.banned = !u.banned;
    saveUsers(users);
    showToast(u.banned ? `🚫 ${u.name} bloqueado del foro` : `🔓 ${u.name} desbloqueado`, 'info');
    renderAdminUsers();
    renderForum();
  }
};

function renderAdminPosts() {
  const posts = getStoredPosts();
  const list  = document.getElementById('adminPostList');
  if (!list) return;
  const pinned = getPinnedPostId();
  list.innerHTML = posts.map(p => `
    <div class="admin-user-row">
      <div class="admin-user-info">
        <strong>${escapeHtml(p.title)}</strong>
        <span>Por: ${escapeHtml(p.author)} · ${escapeHtml(p.date)} · ❤️ ${p.likes} apoyos</span>
      </div>
      <button class="btn-micro" style="color:var(--red)" onclick="deletePost('${p.id}')">🗑️ Eliminar</button>
    </div>
  `).join('');
}

// =============================================
// FEATURED FAMILY WIDGET (Portada)
// =============================================
function getPinnedPostId() {
  return localStorage.getItem('cuidapp_pinned_post') || null;
}
function getPinnedPost() {
  const id = getPinnedPostId();
  if (!id) return null;
  return getStoredPosts().find(p => p.id === id) || null;
}

window.setPinnedPost = function(postId) {
  localStorage.setItem('cuidapp_pinned_post', postId);
  showToast('📌 Familia fijada en portada', 'success');
  renderFeaturedFamilyWidget();
  renderAdminPortada();
};

window.clearPinnedPost = function() {
  localStorage.removeItem('cuidapp_pinned_post');
  showToast('📌 Portada vuelve a modo automático (más apoyos)', 'info');
  renderFeaturedFamilyWidget();
  renderAdminPortada();
};

function renderAdminPortada() {
  const list   = document.getElementById('adminPortadaList');
  if (!list) return;
  const posts  = getStoredPosts();
  const pinned = getPinnedPostId();
  // Sort by likes desc for overview
  const sorted = [...posts].sort((a,b) => b.likes - a.likes);

  list.innerHTML = sorted.map(p => {
    const isPinned = p.id === pinned;
    return `
      <div class="admin-user-row" style="${isPinned ? 'border:2px solid var(--gold);background:var(--gold-pale);' : ''}">
        <div class="admin-user-info">
          <strong>${escapeHtml(p.title)} ${isPinned ? '<span class="ffw-pinned-tag">📌 EN PORTADA</span>' : ''}</strong>
          <span>Por: ${escapeHtml(p.author)} · ❤️ ${p.likes} apoyos · ${p.comments.length} respuestas</span>
        </div>
        <div style="display:flex;gap:6px;">
          ${isPinned
            ? `<button class="btn-micro" style="color:var(--text-muted)" onclick="clearPinnedPost()">📌 Desfijar</button>`
            : `<button class="btn-micro" style="color:var(--gold);border-color:var(--gold)" onclick="setPinnedPost('${p.id}')">📌 Fijar en portada</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  if (sorted.length === 0) {
    list.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;padding:20px">No hay publicaciones en el foro todavía.</p>';
  }
}

function renderFeaturedFamilyWidget() {
  const body = document.getElementById('ffwBody');
  const ctaBtn = document.getElementById('ffwCta');
  if (!body) return;

  const posts = getStoredPosts();
  if (posts.length === 0) {
    body.innerHTML = '<div class="ffw-empty">Aún no hay situaciones publicadas en el foro. ¡Sé el primero/a en compartir!</div>';
    if (ctaBtn) { ctaBtn.textContent = '+ Publicar mi situación'; ctaBtn.onclick = () => openRegistro(); }
    return;
  }

  // Use pinned post or auto-select highest likes
  const pinned = getPinnedPost();
  const featured = pinned || [...posts].sort((a,b) => b.likes - a.likes)[0];
  const isManualPin = !!pinned;

  body.innerHTML = `
    <div class="ffw-author-row">
      <div class="ffw-avatar">${escapeHtml(featured.author.substring(0,2).toUpperCase())}</div>
      <div>
        <div class="ffw-name">${escapeHtml(featured.author)}</div>
        <div class="ffw-date">${escapeHtml(featured.date)}</div>
      </div>
      ${isManualPin ? '<span class="ffw-pinned-tag">📌 Destacado por admin</span>' : ''}
    </div>
    <div class="ffw-title">${escapeHtml(featured.title)}</div>
    <div class="ffw-excerpt">${escapeHtml(featured.content)}</div>
    <div class="ffw-stats">
      <span class="ffw-stat">${escapeHtml(featured.catLabel)}</span>
      <span class="ffw-stat">💬 ${featured.comments.length} respuestas</span>
    </div>
    <div class="ffw-likes">❤️ ${featured.likes} familias dan su apoyo</div>
  `;

  if (ctaBtn) {
    ctaBtn.textContent = 'Ver su situación y apoyar →';
    ctaBtn.onclick = () => {
      closePanel('panelAuth');
      // Go to forum page
      goToPage(PAGE_IDS.indexOf('foro'));
      // After scroll, open the post detail
      setTimeout(() => openPostDetail(featured.id), 700);
    };
  }
}

// =============================================
// NEWS
// =============================================
const newsData = [
  { cat:'legislacion', catLabel:'Legislación', emoji:'📜', gradient:'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(37,99,235,0.2))', title:'RD 469/2026: Nuevas prestaciones para cuidadores no profesionales', excerpt:'El nuevo real decreto amplía las coberturas de la Seguridad Social para cuidadores en el hogar de personas con discapacidad severa.', date:'Julio 2026' },
  { cat:'ayudas', catLabel:'Ayudas', emoji:'💰', gradient:'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(13,148,136,0.2))', title:'Convocatoria de ayudas para adaptación de vivienda 2026', excerpt:'El IMSERSO abre la convocatoria de subvenciones para adaptar el hogar a las necesidades de niños con movilidad reducida.', date:'Julio 2026' },
  { cat:'investigacion', catLabel:'Investigación', emoji:'🔬', gradient:'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(124,58,237,0.2))', title:'Estudio: intervención temprana mejora calidad de vida en TEA', excerpt:'Nuevos resultados del estudio PIATEA muestran mejoras del 40% en habilidades comunicativas con intervención antes de los 3 años.', date:'Junio 2026' },
  { cat:'consejos', catLabel:'Consejos', emoji:'💡', gradient:'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(236,72,153,0.1))', title:'10 técnicas de descanso para cuidadores en tiempo reducido', excerpt:'Psicólogos especializados comparten estrategias validadas para recuperar energía incluso en rutinas muy exigentes.', date:'Junio 2026' },
  { cat:'eventos', catLabel:'Eventos', emoji:'🎪', gradient:'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(124,58,237,0.2))', title:'Jornada Nacional de Familias con Hijos con Discapacidad', excerpt:'Madrid, 15 de septiembre. Talleres, ponencias y espacio de networking para cuidadores. Inscripción gratuita.', date:'Sep 2026' },
  { cat:'ayudas', catLabel:'Ayudas', emoji:'🏫', gradient:'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(245,158,11,0.1))', title:'Nuevas plazas en centros de atención temprana para 2026-27', excerpt:'Las comunidades autónomas amplían la red de centros con 2.800 nuevas plazas para el próximo curso.', date:'Julio 2026' }
];

function renderNews(filter = 'all') {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  const filtered = filter === 'all' ? newsData : newsData.filter(n => n.cat === filter);
  grid.innerHTML = filtered.map(n => `
    <div class="news-card">
      <div class="news-img" style="background:${n.gradient}"><span style="font-size:3.5rem">${n.emoji}</span></div>
      <div class="news-body">
        <span class="news-cat cat-${n.cat}">${n.catLabel}</span>
        <h3 class="news-title">${n.title}</h3>
        <p class="news-excerpt">${n.excerpt}</p>
        <div class="news-meta">
          <span class="news-date">📅 ${n.date}</span>
          <button class="news-read" onclick="showToast('Cargando artículo...','info')">Leer más →</button>
        </div>
      </div>
    </div>
  `).join('');
  if (filtered.length === 0) grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:40px">No hay noticias en esta categoría.</p>';
}
renderNews();

document.querySelectorAll('.nfilter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nfilter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderNews(btn.dataset.filter);
  });
});

// =============================================
// TEST DE BIENESTAR
// =============================================
const testQuestions = [
  { q:'¿Sientes que cuidas a tu hijo/a más allá de lo que puedes asumir?', opts:['Nunca','Raramente','A veces','Bastante a menudo','Casi siempre'], scores:[0,1,2,3,4] },
  { q:'¿Sientes que por el tiempo dedicado no tienes suficiente tiempo para ti?', opts:['Nunca','Raramente','A veces','Bastante a menudo','Casi siempre'], scores:[0,1,2,3,4] },
  { q:'¿Te sientes agotado/a cuando tienes que estar junto a tu hijo/a?', opts:['Nunca','Raramente','A veces','Bastante a menudo','Casi siempre'], scores:[0,1,2,3,4] },
  { q:'¿Sientes que tu salud se ha resentido por el cuidado?', opts:['Nunca','Raramente','A veces','Bastante a menudo','Casi siempre'], scores:[0,1,2,3,4] },
  { q:'¿Sientes que tienes apoyo suficiente de tu entorno?', opts:['Siempre','Bastante a menudo','A veces','Raramente','Nunca'], scores:[0,1,2,3,4] }
];
let currentQ = 0, testScore = 0;
const testAnswers = [];

function renderTestQuestion() {
  const q = testQuestions[currentQ];
  document.getElementById('testProgressFill').style.width = ((currentQ / testQuestions.length) * 100) + '%';
  document.getElementById('testQuestion').textContent = `Pregunta ${currentQ+1}/${testQuestions.length}: ${q.q}`;
  document.getElementById('testOptions').innerHTML = q.opts.map((opt,i) =>
    `<button class="test-opt" onclick="selectTestAnswer(this,${q.scores[i]})">${opt}</button>`
  ).join('');
}

window.selectTestAnswer = function(btn, score) {
  document.querySelectorAll('.test-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  testAnswers[currentQ] = score;
  setTimeout(() => { currentQ++; currentQ < testQuestions.length ? renderTestQuestion() : showTestResult(); }, 500);
};

function showTestResult() {
  testScore = testAnswers.reduce((a,b) => a+b, 0);
  document.getElementById('testQuestion').style.display = 'none';
  document.getElementById('testOptions').style.display  = 'none';
  document.getElementById('testProgressFill').style.width = '100%';
  const res = document.getElementById('testResult');
  res.classList.remove('hidden');
  let level, color, msg;
  if (testScore <= 4)       { level='Carga leve';    color='var(--green)';  msg='¡Estás bien! Sigue cuidándote y mantén estos hábitos de autocuidado.'; }
  else if (testScore <= 9)  { level='Carga moderada';color='var(--orange)'; msg='Estás experimentando cierto agotamiento. Busca apoyo adicional y explora los recursos de descanso.'; }
  else                      { level='Carga severa';  color='var(--red)';    msg='Estás en sobrecarga importante. Por favor contacta con nuestro equipo o llama al 900 100 001. No estás solo/a.'; }
  res.innerHTML = `
    <div class="result-score" style="color:${color}">${testScore}/16</div>
    <div class="result-label" style="color:${color}">${level}</div>
    <p class="result-msg">${msg}</p>
    <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn-primary" onclick="resetTest()">🔄 Repetir</button>
      <button class="btn-secondary" onclick="showToast('Resultado guardado','success')">💾 Guardar</button>
    </div>`;
}

window.resetTest = function() {
  currentQ = 0; testScore = 0; testAnswers.length = 0;
  document.getElementById('testQuestion').style.display = '';
  document.getElementById('testOptions').style.display  = '';
  document.getElementById('testResult').classList.add('hidden');
  document.getElementById('testResult').innerHTML = '';
  renderTestQuestion();
};

document.getElementById('btnTest')?.addEventListener('click', () => { resetTest(); openPanel('panelTest'); });
document.getElementById('panelTestClose')?.addEventListener('click',  () => closePanel('panelTest'));
document.getElementById('panelTestOverlay')?.addEventListener('click',() => closePanel('panelTest'));

// =============================================
// PLANIFICADOR SEMANAL
// =============================================
const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const plannerData = {
  Lun:[{text:'Fisioterapia',type:'terapia'},{text:'Medicación',type:'medico'}],
  Mar:[{text:'Logopedia',type:'terapia'}],
  Mié:[{text:'Médico',type:'medico'},{text:'Juego libre',type:'ocio'}],
  Jue:[{text:'T. Ocupacional',type:'terapia'}],
  Vie:[{text:'Rutina mañana',type:'rutina'},{text:'Parque',type:'ocio'}],
  Sáb:[{text:'Descanso cuidador',type:'descanso'}],
  Dom:[{text:'Familia',type:'ocio'}]
};

function renderPlanner() {
  const grid = document.getElementById('plannerGrid');
  if (!grid) return;
  grid.innerHTML = days.map(day => `
    <div class="planner-day-col" data-day="${day}">
      <div class="planner-day-header">${day}</div>
      ${(plannerData[day]||[]).map(t => `<div class="planner-task ${escapeHtml(t.type)}" title="${escapeHtml(t.text)}">${escapeHtml(t.text)}</div>`).join('')}
    </div>`).join('');
}

document.getElementById('plannerAddBtn')?.addEventListener('click', () => {
  const input = document.getElementById('plannerInput');
  const day   = document.getElementById('plannerDay').value;
  const type  = document.getElementById('plannerType').value;
  const text  = input.value.trim();
  if (!text) { showToast('Escribe una actividad', 'error'); return; }
  if (!plannerData[day]) plannerData[day] = [];
  plannerData[day].push({ text, type });
  renderPlanner();
  input.value = '';
  showToast(`"${text}" añadido el ${day}`, 'success');
});

document.getElementById('btnPlanificador')?.addEventListener('click', () => { renderPlanner(); openPanel('panelPlanificador'); });
document.getElementById('panelPlanClose')?.addEventListener('click',  () => closePanel('panelPlanificador'));
document.getElementById('panelPlanOverlay')?.addEventListener('click',() => closePanel('panelPlanificador'));

// =============================================
// CALCULADORA DE DERECHOS
// =============================================
document.getElementById('btnDerechos')?.addEventListener('click', () => {
  document.querySelectorAll('.calc-step').forEach(s => s.classList.add('hidden'));
  document.querySelector('.calc-step[data-step="1"]')?.classList.remove('hidden');
  document.getElementById('calcResult')?.classList.add('hidden');
  openPanel('panelDerechos');
});
document.getElementById('panelDerechosClose')?.addEventListener('click',  () => closePanel('panelDerechos'));
document.getElementById('panelDerechosOverlay')?.addEventListener('click',() => closePanel('panelDerechos'));

window.calcNextStep = function(step) {
  document.querySelectorAll('.calc-step').forEach(s => s.classList.add('hidden'));
  document.querySelector(`.calc-step[data-step="${step}"]`)?.classList.remove('hidden');
};

window.calcularPrestaciones = function() {
  const disc = document.getElementById('calcDiscapacidad').value;
  const dep  = document.getElementById('calcDependencia').value;
  const lab  = document.getElementById('calcLaboral').value;
  const results = [];
  if (disc !== 'none') {
    results.push({ title:'💵 Deducción IRPF por hijo con discapacidad', desc:'Hasta 1.200€/año o 100€/mes anticipado.' });
    results.push({ title:'🚌 Tarjeta de estacionamiento y transporte adaptado', desc:'Reserva de plaza y descuento en transporte público.' });
  }
  if (dep === 'g2' || dep === 'g3') {
    results.push({ title:'💶 Prestación PECEF', desc:'Entre 300€ y 715€/mes para el cuidador/a del entorno familiar.' });
    results.push({ title:'🛡️ Convenio Especial SS Cuidadores', desc:'La Seguridad Social cotiza por ti sin coste.' });
  } else if (dep === 'g1') {
    results.push({ title:'🏡 Servicio de Ayuda a Domicilio (SAD)', desc:'Horas mensuales de apoyo profesional en el hogar.' });
  }
  if (lab === 'empleado') results.push({ title:'⏱️ Reducción de jornada CUMME', desc:'Reducción hasta el 99% de la jornada manteniendo el 100% de la base reguladora.' });
  if (results.length === 0) results.push({ title:'ℹ️ Orientación inicial', desc:'Solicita valoración de discapacidad en el Centro Base de tu localidad.' });

  const resDiv = document.getElementById('calcResult');
  resDiv.innerHTML = `
    <h3 style="color:var(--purple-light);margin-bottom:16px">Ayudas Estimadas (${results.length})</h3>
    ${results.map(r => `<div class="calc-result-item"><h4>${r.title}</h4><p>${r.desc}</p></div>`).join('')}
    <div style="margin-top:20px;display:flex;gap:10px">
      <button class="btn-secondary" onclick="calcNextStep(1)">🔄 Recalcular</button>
      <button class="btn-primary" style="flex:1" onclick="showToast('Descargando informe PDF...','success')">📥 Descargar PDF</button>
    </div>`;
  document.querySelectorAll('.calc-step').forEach(s => s.classList.add('hidden'));
  resDiv.classList.remove('hidden');
};

// =============================================
// DIRECTORIO DE SERVICIOS
// =============================================
const directorioCentros = [
  { nombre:'Centro de Atención Temprana Integra',                       tipo:'Atención Temprana', ciudad:'Madrid',    tel:'912 345 678' },
  { nombre:'Asociación de Familias Neurodiversas',                      tipo:'Asociación / Apoyo', ciudad:'Barcelona', tel:'933 456 789' },
  { nombre:'Gabinete de Terapia Ocupacional y Fisioterapia Pediátrica', tipo:'Terapia Privada',   ciudad:'Valencia',  tel:'961 234 567' },
  { nombre:'Centro de Respiro Familiar El Hogar',                       tipo:'Respiro / Cuidado', ciudad:'Sevilla',   tel:'954 123 456' }
];

function renderDirectorio(filterText = '') {
  const list = document.getElementById('dirList');
  if (!list) return;
  const ft = filterText.toLowerCase();
  const filtered = directorioCentros.filter(c => c.nombre.toLowerCase().includes(ft) || c.tipo.toLowerCase().includes(ft) || c.ciudad.toLowerCase().includes(ft));
  list.innerHTML = filtered.map(c => `
    <div class="dir-item">
      <div class="dir-info"><h4>${c.nombre}</h4><p>🏷️ ${c.tipo} · 📍 ${c.ciudad}</p></div>
      <a href="tel:${c.tel}" class="btn-micro" style="color:var(--green)">📞 ${c.tel}</a>
    </div>`).join('');
}

document.getElementById('btnDirectorio')?.addEventListener('click', () => { renderDirectorio(); openPanel('panelDirectorio'); });
document.getElementById('panelDirClose')?.addEventListener('click',  () => closePanel('panelDirectorio'));
document.getElementById('panelDirOverlay')?.addEventListener('click',() => closePanel('panelDirectorio'));
document.getElementById('btnSearchDir')?.addEventListener('click', () => renderDirectorio(document.getElementById('dirSearch').value));

// =============================================
// CHAT / MENSAJES
// =============================================
document.getElementById('btnComunicacion')?.addEventListener('click', () => openPanel('panelMensajes'));
document.getElementById('panelMsgClose')?.addEventListener('click',   () => closePanel('panelMensajes'));
document.getElementById('panelMsgOverlay')?.addEventListener('click', () => closePanel('panelMensajes'));

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const txt   = input?.value.trim();
  if (!txt) return;
  const box = document.getElementById('chatBox');
  const uMsg = document.createElement('div'); uMsg.className='chat-msg user'; uMsg.innerHTML=`<span>${escapeHtml(txt)}</span>`;
  box.appendChild(uMsg);
  input.value = '';
  box.scrollTop = box.scrollHeight;
  setTimeout(() => {
    const sMsg = document.createElement('div'); sMsg.className='chat-msg system';
    sMsg.innerHTML='<span>Mensaje recibido. Un/a profesional del equipo se pondrá en contacto contigo a la brevedad.</span>';
    box.appendChild(sMsg);
    box.scrollTop = box.scrollHeight;
  }, 1000);
}

document.getElementById('btnSendMsg')?.addEventListener('click', sendChatMessage);
document.getElementById('chatInput')?.addEventListener('keydown', e => { if (e.key==='Enter') sendChatMessage(); });

// =============================================
// RECURSOS Y OTROS BOTONES
// =============================================
document.getElementById('btnVerGuia')?.addEventListener('click',       () => showToast('Descargando guía rápida...','info'));
document.getElementById('btnGuia')?.addEventListener('click',          () => showToast('Preparando descarga de la guía...','info'));
document.getElementById('btnComunidad')?.addEventListener('click',     () => showToast('Conectando con grupos de apoyo...','success'));
document.getElementById('btnAsesoriaLegal')?.addEventListener('click', () => showToast('Abriendo formulario de cita...','info'));
document.getElementById('btnFormacion')?.addEventListener('click',     () => showToast('Cargando catálogo de cursos...','info'));
document.getElementById('btnAutocuidado')?.addEventListener('click',   () => showToast('Abriendo sección de autocuidado...','info'));
document.getElementById('btnLeerMas')?.addEventListener('click',       () => showToast('Cargando artículo completo...','info'));

// ALERTAS
document.querySelectorAll('.alert-action').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.id)?.classList.add('resolved');
    const badge = document.getElementById('notifBadge');
    if (badge) badge.textContent = Math.max(0, parseInt(badge.textContent) - 1);
    showToast('Alerta resuelta', 'success');
  });
});

document.getElementById('btnMarkAllRead')?.addEventListener('click', () => {
  document.querySelectorAll('.alert-item:not(.resolved)').forEach(i => i.classList.add('resolved'));
  const badge = document.getElementById('notifBadge'); if (badge) badge.textContent = '0';
  showToast('Todas las alertas marcadas como leídas', 'success');
});

document.getElementById('btnNotif')?.addEventListener('click', () => {
  goToPage(PAGE_IDS.indexOf('alertas'));
});

// =============================================
// ENTRANCE ANIMATIONS
// =============================================
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
      fadeObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.tool-card,.news-card,.res-card,.info-stat-card,.alert-item,.tl-item').forEach((el,i) => {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = `opacity 0.5s ease ${i*0.05}s, transform 0.5s ease ${i*0.05}s`;
  fadeObserver.observe(el);
});

// =============================================
// SMOOTH SCROLL (anchor links use navigateTo)
// =============================================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const targetId = a.getAttribute('href').slice(1);
    if (PAGE_IDS.includes(targetId)) { e.preventDefault(); navigateTo(targetId); }
  });
});

// =============================================
// INIT
// =============================================
updateUserNavUI();
renderForum();
renderFeaturedFamilyWidget();
renderMyTrayectoria();

setTimeout(() => showToast('👋 Bienvenido/a a CuidApp. Tienes 3 alertas pendientes.', 'info', 5000), 1500);
console.log('%c💜 CuidApp cargado correctamente', 'color:#0072BB;font-size:14px;font-weight:bold;');
