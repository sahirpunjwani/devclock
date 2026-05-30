// ============================================================
// TABS
// ============================================================

// Select all tab buttons and attach click listeners
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active class from all tabs and sections
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    // Add active to the clicked tab
    tab.classList.add('active');

    // Show the matching section (data-tab matches section id)
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});


// ============================================================
// AUDIO ENGINE
// makeBeep(freq, duration) — generates a beep sound using
// the Web Audio API instead of an audio file.
// AudioContext creates a virtual audio environment in the browser.
// Oscillator = a sound wave generator (like a buzzer)
// GainNode = controls the volume
// ============================================================

const alarmSound = new Audio('alarm.mp3');
alarmSound.loop = false;

function makeBeep() {
  alarmSound.currentTime = 0;
  alarmSound.play().catch(e => {});
}

function startRinging() {
  alarmSound.loop = true;
  alarmSound.currentTime = 0;
  alarmSound.play().catch(e => {});
  return null;
}


// ============================================================
// BROWSER NOTIFICATIONS
// Asks permission to show notifications (used by alarm)
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
    new Notification(title, { body, icon: '' });
  }
}


// ============================================================
// HELPERS
// ============================================================

// Pads a number to 2 digits: 5 → "05"
function pad2(n) {
  return String(Math.floor(n)).padStart(2, '0');
}

// Formats stopwatch milliseconds → "MM:SS.cs"
// e.g. 75430ms → "01:15.43"
function fmtSW(ms) {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const cs = Math.floor((ms % 1000) / 10); // centiseconds
  return `${pad2(m)}:${pad2(s)}<span class="ms">.${pad2(cs)}</span>`;
}

// Formats seconds → "HH:MM:SS" or "MM:SS"
// e.g. 3665s → "01:01:05"
function fmtTM(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}


// ============================================================
// STOPWATCH
// ============================================================

let swRunning = false;    // is it currently running?
let swMs = 0;             // total elapsed milliseconds
let swLapMs = 0;          // ms at the last lap (to calculate lap split)
let swLapCount = 0;       // how many laps recorded
let swLaps = [];          // array of lap times
let swInterval = null;    // reference to the setInterval ticker
let swStartTime = 0;      // timestamp when we last pressed start

function swRender() {
  document.getElementById('sw-display').innerHTML = fmtSW(swMs);
}

function swStartStop() {
  const icon = document.getElementById('sw-main-icon');

  if (swRunning) {
    // PAUSE: stop the interval, save elapsed time
    clearInterval(swInterval);
    swRunning = false;
    document.getElementById('sw-status').textContent = 'paused';

    // Pause icon (two bars)
    icon.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>`;
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.5');
  } else {
    // START / RESUME: record the real-world start time offset
    // We subtract swMs so the timer continues from where it paused
    swStartTime = Date.now() - swMs;

    // setInterval fires every 50ms to update the display
    swInterval = setInterval(() => {
      swMs = Date.now() - swStartTime; // calculate elapsed time
      swRender();
    }, 50);

    swRunning = true;
    document.getElementById('sw-status').textContent = 'running';

    // Play icon (triangle)
    icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    icon.setAttribute('fill', 'currentColor');
    icon.removeAttribute('stroke');
  }
}

function swLap() {
  if (!swRunning) return; // can only lap while running

  swLapCount++;
  const lapTime = swMs - swLapMs; // time since last lap
  swLapMs = swMs;                  // reset lap baseline

  swLaps.unshift({ n: swLapCount, t: lapTime }); // add to front of array

  renderLaps();
}

function renderLaps() {
  if (swLaps.length === 0) {
    document.getElementById('sw-laps').innerHTML = '';
    return;
  }

  // Find fastest and slowest lap times for color coding
  const times = swLaps.map(l => l.t);
  const fastest = Math.min(...times);
  const slowest = Math.max(...times);

  const html = swLaps.map(lap => {
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

  document.getElementById('sw-laps').innerHTML = html;
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

let tmRunning = false;
let tmLeft = 0;           // seconds remaining
let tmInterval = null;
let tmRingInterval = null;

// Read the h/m/s inputs and return total seconds
function tmGetInput() {
  const h = parseInt(document.getElementById('tm-h').value) || 0;
  const m = parseInt(document.getElementById('tm-m').value) || 0;
  const s = parseInt(document.getElementById('tm-s').value) || 0;
  return h * 3600 + m * 60 + s;
}

function tmRender() {
  const el = document.getElementById('tm-display');
  el.textContent = fmtTM(tmLeft);
  // Turn red in last 10 seconds
  el.className = 'time-display' + (tmLeft <= 10 && tmLeft > 0 && tmRunning ? ' danger' : '');
}

function tmStartRing() {
  document.getElementById('tm-banner').classList.add('show');
  showNotification('Clockify', 'Timer done!');
  let count = 0;
  tmRingInterval = startRinging();

  // Auto-stop after 10 seconds (20 beeps × 500ms)
  setTimeout(() => tmStopRing(), 10000);
}

function tmStopRing() {
   alarmSound.pause();        // ← add this
  alarmSound.currentTime = 0; // ← add this
  clearInterval(tmRingInterval);
  tmRingInterval = null;
  document.getElementById('tm-banner').classList.remove('show');
}

function tmStartStop() {
  const icon = document.getElementById('tm-main-icon');

  if (!tmRunning) {
    // If timer is at zero, read from inputs
    if (tmLeft === 0) {
      tmLeft = tmGetInput();
    }
    if (tmLeft === 0) return; // nothing to count down

    // Disable inputs while running
    document.getElementById('tm-inputs').style.opacity = '0.4';
    document.getElementById('tm-inputs').style.pointerEvents = 'none';

    // Calculate the exact end time so pausing is accurate
    const endTime = Date.now() + tmLeft * 1000;

    tmInterval = setInterval(() => {
      // Calculate remaining seconds from real clock
      tmLeft = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      tmRender();

      if (tmLeft === 0) {
        // Timer finished!
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
    // PAUSE
    clearInterval(tmInterval);
    tmRunning = false;
    document.getElementById('tm-status').textContent = 'paused';
    icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    icon.setAttribute('fill', 'currentColor');
    icon.removeAttribute('stroke');
  }
}

function tmReset() {
  clearInterval(tmInterval);
  tmStopRing();
  tmRunning = false;
  tmLeft = 0;
  tmRender();
  document.getElementById('tm-status').textContent = 'ready';
  document.getElementById('tm-inputs').style.opacity = '1';
  document.getElementById('tm-inputs').style.pointerEvents = 'auto';
  const icon = document.getElementById('tm-main-icon');
  icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
  icon.setAttribute('fill', 'currentColor');
  icon.removeAttribute('stroke');
}

// Update display live when user types in inputs
['tm-h', 'tm-m', 'tm-s'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    if (!tmRunning) {
      tmLeft = 0;
      document.getElementById('tm-display').textContent = fmtTM(tmGetInput());
    }
  });
});


// ============================================================
// ALARM
// ============================================================

// Load saved alarms from localStorage (persists after page close)
let alarms = JSON.parse(localStorage.getItem('clockify-alarms') || '[]');
let alRingInterval = null;
let alFiredMinutes = new Set(); // tracks which minutes already fired today

function alSave() {
  // Save alarms array to localStorage as a JSON string
  localStorage.setItem('clockify-alarms', JSON.stringify(alarms));
}

function alStartRing(label) {
  document.getElementById('al-banner-text').textContent = label || 'alarm!';
  document.getElementById('al-banner').classList.add('show');

  // Switch to alarm tab so user sees it
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelector('[data-tab="alarm"]').classList.add('active');
  document.getElementById('alarm').classList.add('active');

  showNotification('Clockify — Alarm', label || 'Time to wake up!');

  // Ring continuously until user hits stop
  alRingInterval = startRinging();
}

function alStopRing() {
   alarmSound.pause();        // ← add this
  alarmSound.currentTime = 0; // ← add this
  clearInterval(alRingInterval);
  alRingInterval = null;
  document.getElementById('al-banner').classList.remove('show');
}

function alAdd() {
  const time = document.getElementById('al-time').value;
  const label = document.getElementById('al-label').value.trim();
  if (!time) return;

  alarms.push({ time, label, on: true });
  alSave();
  alRender();
  document.getElementById('al-label').value = '';
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

  list.innerHTML = alarms.map((a, i) => `
    <div class="alarm-item ${a.on ? 'on' : 'off'}">
      <div class="alarm-info">
        <div class="alarm-time">${a.time}</div>
        <div class="alarm-label">${a.label || 'alarm'}</div>
      </div>
      <div class="alarm-actions">
        <button class="toggle-btn ${a.on ? 'on' : 'off'}" onclick="alToggle(${i})" aria-label="toggle"></button>
        <button class="del-btn" onclick="alDelete(${i})" aria-label="delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Check every second if any alarm should fire
setInterval(() => {
  const now = new Date();
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  const ss = now.getSeconds();
  const currentTime = `${hh}:${mm}`;

  // Only fire at second 0 of the matching minute
  // Use alFiredMinutes to avoid firing multiple times in the same minute
  if (ss === 0 && !alFiredMinutes.has(currentTime)) {
    alarms.forEach(a => {
      if (a.on && a.time === currentTime && !alRingInterval) {
        alFiredMinutes.add(currentTime);
        alStartRing(a.label);
      }
    });
  }

  // Clear fired minutes log at midnight
  if (hh === '00' && mm === '00' && ss === 0) {
    alFiredMinutes.clear();
  }
}, 1000);

// Initial render on page load
alRender();
