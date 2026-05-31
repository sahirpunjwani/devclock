// ============================================================
// TABS
// ============================================================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});


// ============================================================
// AUDIO ENGINE
// ============================================================
function makeBeep(freq = 880, dur = 0.35) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}

function startRinging() {
  makeBeep();
  return setInterval(() => makeBeep(), 500);
}


// ============================================================
// NOTIFICATIONS
// ============================================================
function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      document.getElementById('notif-hint').textContent =
        perm === 'granted' ? 'notifications enabled' : 'notifications blocked — alarm will still ring on this tab';
    });
  } else if (Notification.permission === 'granted') {
    document.getElementById('notif-hint').textContent = 'notifications enabled';
  } else {
    document.getElementById('notif-hint').textContent = 'enable notifications for background alarms';
  }
}
requestNotifPermission();

function showNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}


// ============================================================
// HELPERS
// ============================================================
function pad2(n) { return String(Math.floor(n)).padStart(2, '0'); }

function fmtSW(ms) {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const cs = Math.floor((ms % 1000) / 10);
  return `${pad2(m)}:${pad2(s)}<span class="ms">.${pad2(cs)}</span>`;
}

function fmtTM(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}


// ============================================================
// STOPWATCH
// ============================================================
let swRunning = false, swMs = 0, swLapMs = 0, swLapCount = 0;
let swLaps = [], swInterval = null, swStartTime = 0;

function swRender() {
  document.getElementById('sw-display').innerHTML = fmtSW(swMs);
}

function swStartStop() {
  const icon = document.getElementById('sw-main-icon');
  if (swRunning) {
    clearInterval(swInterval);
    swRunning = false;
    document.getElementById('sw-status').textContent = 'paused';
    icon.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>`;
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.5');
  } else {
    swStartTime = Date.now() - swMs;
    swInterval = setInterval(() => { swMs = Date.now() - swStartTime; swRender(); }, 50);
    swRunning = true;
    document.getElementById('sw-status').textContent = 'running';
    icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    icon.setAttribute('fill', 'currentColor');
    icon.removeAttribute('stroke');
  }
}

function swLap() {
  if (!swRunning) return;
  swLapCount++;
  const lapTime = swMs - swLapMs;
  swLapMs = swMs;
  swLaps.unshift({ n: swLapCount, t: lapTime });
  renderLaps();
}

function renderLaps() {
  if (swLaps.length === 0) { document.getElementById('sw-laps').innerHTML = ''; return; }
  const times = swLaps.map(l => l.t);
  const fastest = Math.min(...times);
  const slowest = Math.max(...times);
  document.getElementById('sw-laps').innerHTML = swLaps.map(lap => {
    let cls = '';
    if (swLaps.length > 1) {
      if (lap.t === fastest) cls = 'fastest';
      else if (lap.t === slowest) cls = 'slowest';
    }
    return `<div class="lap-row ${cls}">
      <span class="lap-num">lap ${pad2(lap.n)}</span>
      <span class="lap-time">${fmtSW(lap.t).replace(/<[^>]*>/g, '')}</span>
    </div>`;
  }).join('');
}

function swReset() {
  clearInterval(swInterval);
  swRunning = false;
  swMs = 0; swLapMs = 0; swLapCount = 0; swLaps = [];
  swRender();
  renderLaps();
  document.getElementById('sw-status').textContent = 'ready';
  const icon = document.getElementById('sw-main-icon');
  icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
  icon.setAttribute('fill', 'currentColor');
  icon.removeAttribute('stroke');
}


// ============================================================
// TIMER
// ============================================================
let tmRunning = false, tmLeft = 0, tmInterval = null, tmRingInterval = null;

// FIX 1: Input validation — max 23h, 59m, 59s
document.getElementById('tm-h').addEventListener('change', function() {
  let v = parseInt(this.value) || 0;
  if (v > 23) { v = 23; this.classList.add('input-error'); }
  else this.classList.remove('input-error');
  this.value = v;
  if (!tmRunning) document.getElementById('tm-display').textContent = fmtTM(tmGetInput());
});

document.getElementById('tm-m').addEventListener('change', function() {
  let v = parseInt(this.value) || 0;
  if (v > 59) { v = 59; this.classList.add('input-error'); }
  else this.classList.remove('input-error');
  this.value = v;
  if (!tmRunning) document.getElementById('tm-display').textContent = fmtTM(tmGetInput());
});

document.getElementById('tm-s').addEventListener('change', function() {
  let v = parseInt(this.value) || 0;
  if (v > 59) { v = 59; this.classList.add('input-error'); }
  else this.classList.remove('input-error');
  this.value = v;
  if (!tmRunning) document.getElementById('tm-display').textContent = fmtTM(tmGetInput());
});

['tm-h', 'tm-m', 'tm-s'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    if (!tmRunning) {
      tmLeft = 0;
      document.getElementById('tm-display').textContent = fmtTM(tmGetInput());
    }
  });
});

function tmGetInput() {
  const h = Math.min(parseInt(document.getElementById('tm-h').value) || 0, 23);
  const m = Math.min(parseInt(document.getElementById('tm-m').value) || 0, 59);
  const s = Math.min(parseInt(document.getElementById('tm-s').value) || 0, 59);
  return h * 3600 + m * 60 + s;
}

function tmRender() {
  const el = document.getElementById('tm-display');
  el.textContent = fmtTM(tmLeft);
  el.className = 'time-display' + (tmLeft <= 10 && tmLeft > 0 && tmRunning ? ' danger' : '');
}

function tmStartRing() {
  document.getElementById('tm-banner').classList.add('show');
  showNotification('Clockify', 'Timer done!');
  tmRingInterval = startRinging();
  setTimeout(() => tmStopRing(), 10000);
}

function tmStopRing() {
  clearInterval(tmRingInterval);
  tmRingInterval = null;
  document.getElementById('tm-banner').classList.remove('show');
}

function tmStartStop() {
  const icon = document.getElementById('tm-main-icon');
  if (!tmRunning) {
    if (tmLeft === 0) tmLeft = tmGetInput();
    if (tmLeft === 0) return;
    document.getElementById('tm-inputs').style.opacity = '0.4';
    document.getElementById('tm-inputs').style.pointerEvents = 'none';
    const endTime = Date.now() + tmLeft * 1000;
    tmInterval = setInterval(() => {
      tmLeft = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      tmRender();
      if (tmLeft === 0) {
        clearInterval(tmInterval);
        tmRunning = false;
        document.getElementById('tm-status').textContent = 'done!';
        document.getElementById('tm-inputs').style.opacity = '1';
        document.getElementById('tm-inputs').style.pointerEvents = 'auto';
        icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
        icon.setAttribute('fill', 'currentColor');
        tmStartRing();
      }
    }, 200);
    tmRunning = true;
    document.getElementById('tm-status').textContent = 'counting down';
    icon.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>`;
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.5');
  } else {
    clearInterval(tmInterval);
    tmRunning = false;
    document.getElementById('tm-status').textContent = 'paused';
    icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    icon.setAttribute('fill', 'currentColor');
    icon.removeAttribute('stroke');
  }
}

// FIX 2: Reset also clears the input fields
function tmReset() {
  clearInterval(tmInterval);
  tmStopRing();
  tmRunning = false;
  tmLeft = 0;
  // Clear the input fields
  document.getElementById('tm-h').value = 0;
  document.getElementById('tm-m').value = 0;
  document.getElementById('tm-s').value = 0;
  ['tm-h','tm-m','tm-s'].forEach(id => document.getElementById(id).classList.remove('input-error'));
  document.getElementById('tm-display').textContent = '00:00';
  document.getElementById('tm-display').className = 'time-display';
  document.getElementById('tm-status').textContent = 'ready';
  document.getElementById('tm-inputs').style.opacity = '1';
  document.getElementById('tm-inputs').style.pointerEvents = 'auto';
  const icon = document.getElementById('tm-main-icon');
  icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
  icon.setAttribute('fill', 'currentColor');
  icon.removeAttribute('stroke');
}


// ============================================================
// ALARM
// ============================================================
let alarms = JSON.parse(localStorage.getItem('clockify-alarms') || '[]');
let alRingInterval = null;
let alFiredMinutes = new Set();
let selectedDays = new Set(); // FIX 4: selected days for new alarm

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Day button toggle
document.querySelectorAll('.day-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const day = parseInt(btn.dataset.day);
    if (selectedDays.has(day)) {
      selectedDays.delete(day);
      btn.classList.remove('active');
    } else {
      selectedDays.add(day);
      btn.classList.add('active');
    }
  });
});

function alSave() {
  localStorage.setItem('clockify-alarms', JSON.stringify(alarms));
}

function alStartRing(label) {
  document.getElementById('al-banner-text').textContent = label || 'alarm!';
  document.getElementById('al-banner').classList.add('show');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelector('[data-tab="alarm"]').classList.add('active');
  document.getElementById('alarm').classList.add('active');
  showNotification('Clockify — Alarm', label || 'Time to wake up!');
  alRingInterval = startRinging();
}

function alStopRing() {
  clearInterval(alRingInterval);
  alRingInterval = null;
  document.getElementById('al-banner').classList.remove('show');
}

function alAdd() {
  const time = document.getElementById('al-time').value;
  const label = document.getElementById('al-label').value.trim();
  const errEl = document.getElementById('al-error');

  if (!time) { errEl.textContent = 'please set a time'; return; }

  // FIX 3: No duplicate alarms at same time + same days
  const days = [...selectedDays].sort();
  const duplicate = alarms.some(a => {
    const aDays = [...(a.days || [])].sort();
    return a.time === time && JSON.stringify(aDays) === JSON.stringify(days);
  });

  if (duplicate) {
    errEl.textContent = 'alarm already exists for this time and days';
    document.getElementById('al-time').classList.add('input-error');
    return;
  }

  errEl.textContent = '';
  document.getElementById('al-time').classList.remove('input-error');

  alarms.push({ time, label, on: true, days });
  alSave();
  alRender();

  // Reset inputs
  document.getElementById('al-label').value = '';
  selectedDays.clear();
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
}

function alDelete(index) {
  alarms.splice(index, 1);
  alSave();
  alRender();
}

function alToggle(index) {
  alarms[index].on = !alarms[index].on;
  alSave();
  alRender();
}

function alRender() {
  const list = document.getElementById('al-list');
  if (alarms.length === 0) {
    list.innerHTML = '<div class="empty-state">no alarms set</div>';
    return;
  }
  list.innerHTML = alarms.map((a, i) => {
    const daysLabel = a.days && a.days.length > 0
      ? a.days.map(d => DAY_NAMES[d]).join(' · ')
      : 'every day';
    return `
    <div class="alarm-item ${a.on ? 'on' : 'off'}">
      <div class="alarm-info">
        <div class="alarm-time">${a.time}</div>
        <div class="alarm-label">${a.label || 'alarm'}</div>
        <div class="alarm-days">${daysLabel}</div>
      </div>
      <div class="alarm-actions">
        <button class="toggle-btn ${a.on ? 'on' : 'off'}" onclick="alToggle(${i})" aria-label="toggle"></button>
        <button class="del-btn" onclick="alDelete(${i})" aria-label="delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

// Check every second if any alarm should fire
setInterval(() => {
  const now = new Date();
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  const ss = now.getSeconds();
  const currentTime = `${hh}:${mm}`;
  const currentDay = now.getDay(); // 0=Sun, 1=Mon...

  if (ss === 0 && !alFiredMinutes.has(currentTime)) {
    alarms.forEach(a => {
      if (!a.on || alRingInterval) return;
      if (a.time !== currentTime) return;
      // If days are set, only ring on those days; otherwise ring every day
      const daysOk = !a.days || a.days.length === 0 || a.days.includes(currentDay);
      if (daysOk) {
        alFiredMinutes.add(currentTime);
        alStartRing(a.label);
      }
    });
  }

  if (hh === '00' && mm === '00' && ss === 0) alFiredMinutes.clear();
}, 1000);

alRender();
