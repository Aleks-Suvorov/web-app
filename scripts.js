// ============================================================
// OASIS v2 — scripts.js
// ============================================================

// ── QUOTES ──────────────────────────────────────────────────
const QUOTES = [
  { text: "Water is the driving force of all nature.", author: "Leonardo da Vinci" },
  { text: "Hydration is the foundation of performance.", author: "Sports Science" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Gandhi" },
  { text: "The groundwork for all happiness is good health.", author: "Leigh Hunt" },
  { text: "To keep the body in good health is a duty.", author: "Buddha" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
];

// ── ACHIEVEMENTS ────────────────────────────────────────────
const BADGES = [
  { id: "first_drop",    icon: "💧", name: "First Drop",      desc: "Log your first drink",              check: (s,h) => s.waterLogs.length > 0 || h.length > 0 },
  { id: "goal_getter",   icon: "🎯", name: "Goal Getter",     desc: "Hit your hydration goal",           check: (s,h) => getTodayTotal(s) >= s.goal || h.some(d => d.waterTotal >= d.goal) },
  { id: "streak_3",      icon: "🔥", name: "On Fire",         desc: "3-day hydration streak",            check: (s,h) => calcStreaks(s,h).hydration >= 3 },
  { id: "streak_7",      icon: "⚡", name: "Lightning",       desc: "7-day hydration streak",            check: (s,h) => calcStreaks(s,h).hydration >= 7 },
  { id: "creatine_first",icon: "💊", name: "Supplement Start",desc: "Log your first creatine serving",   check: (s,h) => s.creatineServings > 0 || h.some(d => d.creatineServings > 0) },
  { id: "creatine_week", icon: "🏆", name: "Creatine Week",   desc: "7-day creatine consistency",        check: (s,h) => calcStreaks(s,h).creatine >= 7 },
  { id: "big_drinker",   icon: "🌊", name: "Big Drinker",     desc: "Log 4+ liters in one day",          check: (s,h) => getTodayTotal(s) >= 4 || h.some(d => d.waterTotal >= 4) },
  { id: "veteran",       icon: "📅", name: "Veteran",         desc: "Track 14 days",                     check: (s,h) => h.length >= 14 },
  { id: "loader",        icon: "🚀", name: "Loading Up",      desc: "Enable creatine loading phase",     check: (s,h) => s.loadingPhase },
  { id: "perfect_week",  icon: "✨", name: "Perfect Week",    desc: "Hit goal 7 days in a row",          check: (s,h) => calcStreaks(s,h).hydration >= 7 },
];

// ── DEFAULT STATE ────────────────────────────────────────────
const DEFAULT = {
  waterLogs: [],           // [{ml, type, coeff, time}]
  creatineServings: 0,
  creatineLastTime: null,
  goal: 3.7,
  name: "",
  weight: 70,
  weightUnit: "kg",
  activity: "moderate",
  units: "metric",
  darkMode: false,
  loadingPhase: false,
  suppNotes: "",
  history: [],             // [{date, waterTotal, creatineServings, goal, goalMet}]
  lastDate: null,
  unlockedBadges: [],
};

let S = {};   // live state
let timerInterval = null;
let activeDrinkCoeff = 1.0;
let activeDrinkType  = "water";
let goalJustHit = false;

// ── PERSIST ──────────────────────────────────────────────────
function saveState() {
  localStorage.setItem("oasis_v2", JSON.stringify(S));
}

function loadState() {
  const raw = localStorage.getItem("oasis_v2");
  S = raw ? Object.assign({}, DEFAULT, JSON.parse(raw)) : { ...DEFAULT };
  // migrate old keys
  const oldLiters = parseFloat(localStorage.getItem("liters") || "0");
  const oldCreatine = parseInt(localStorage.getItem("creatineServings") || "0");
  const oldGoal = parseFloat(localStorage.getItem("hydrationGoalLiters") || "0");
  if (!raw && (oldLiters > 0 || oldCreatine > 0)) {
    if (oldLiters > 0) S.waterLogs.push({ ml: oldLiters * 1000, type: "water", coeff: 1, time: Date.now() });
    S.creatineServings = oldCreatine;
    if (oldGoal > 0) S.goal = oldGoal;
    const oldHistory = JSON.parse(localStorage.getItem("dailyHistory") || "[]");
    S.history = oldHistory.map(d => ({
      date: d.date, waterTotal: d.litersLogged,
      creatineServings: d.creatineServings, goal: S.goal, goalMet: d.litersLogged >= S.goal
    }));
    saveState();
  }
}

// ── DAY RESET ────────────────────────────────────────────────
function checkDayReset() {
  const today = new Date().toDateString();
  if (S.lastDate && S.lastDate !== today) {
    S.history.push({
      date: S.lastDate,
      waterTotal: getTodayTotal(S),
      creatineServings: S.creatineServings,
      goal: S.goal,
      goalMet: getTodayTotal(S) >= S.goal,
    });
    S.waterLogs = [];
    S.creatineServings = 0;
    S.creatineLastTime = null;
    goalJustHit = false;
  }
  S.lastDate = today;
  saveState();
}

// ── HELPERS ──────────────────────────────────────────────────
function getTodayTotal(state) {
  return state.waterLogs.reduce((sum, e) => sum + (e.ml / 1000) * e.coeff, 0);
}

function calcStreaks(state, history) {
  const all = [...history].reverse();
  let hydration = 0, creatine = 0;
  for (const d of all) {
    if (d.goalMet) hydration++; else break;
  }
  for (const d of all) {
    if (d.creatineServings >= 1) creatine++; else break;
  }
  return { hydration, creatine };
}

function fmtLiters(val) {
  if (S.units === "imperial") return (val * 33.814).toFixed(0) + " oz";
  return val.toFixed(1) + " L";
}

function fmtTime(ts) {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return diff + "m ago";
  const h = Math.floor(diff / 60), m = diff % 60;
  return h + "h " + m + "m ago";
}

function drinkEmoji(type) {
  return { water: "💧", coffee: "☕", tea: "🍵", juice: "🧃" }[type] || "💧";
}

// ── NAVIGATION ───────────────────────────────────────────────
function navigateTo(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const page = document.getElementById(pageId);
  if (page) { page.classList.add("active"); page.scrollTop = 0; }
  const btn = document.querySelector(`.nav-btn[data-page="${pageId}"]`);
  if (btn) btn.classList.add("active");
  if (pageId === "page-analytics") renderAnalytics();
}

// ── TOAST ────────────────────────────────────────────────────
function toast(msg, type = "info") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 2800);
}

// ── CONFETTI ─────────────────────────────────────────────────
function triggerConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: 8 + Math.random() * 8,
    h: 6 + Math.random() * 6,
    color: ["#34b8e6","#015486","#79c743","#FFD700","#FF6B6B","#a855f7"][Math.floor(Math.random()*6)],
    rot: Math.random() * 360,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    vr: (Math.random() - 0.5) * 8,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    });
    frame++;
    if (frame < 160) requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = "none"; }
  }
  draw();
}

// ── CIRCULAR RING UPDATE ─────────────────────────────────────
function setRing(id, pct, circumference) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = circumference - (Math.min(pct, 1) * circumference);
  el.style.strokeDashoffset = offset;
}

// ── HYDRATION UI ─────────────────────────────────────────────
function updateHydrationUI() {
  const total = getTodayTotal(S);
  const pct = Math.min(total / S.goal, 1);

  // Big ring (circumference for r=90 = 565.49)
  setRing("hydration-ring", pct, 565.49);
  const rl = document.getElementById("ring-liters");
  const rp = document.getElementById("ring-pct");
  const gt = document.getElementById("goal-text");
  if (rl) rl.textContent = S.units === "imperial" ? (total * 33.814).toFixed(0) : total.toFixed(2);
  if (rp) rp.textContent = Math.round(pct * 100) + "%";
  if (gt) gt.textContent = fmtLiters(S.goal);

  // Goal ring color change
  if (rl) rl.style.color = pct >= 1 ? "var(--success)" : "var(--primary)";

  // Undo button
  const undoBtn = document.getElementById("undo-btn");
  const undoLbl = document.getElementById("undo-label");
  if (undoBtn) undoBtn.disabled = S.waterLogs.length === 0;
  if (undoLbl && S.waterLogs.length > 0) {
    const last = S.waterLogs[S.waterLogs.length - 1];
    undoLbl.textContent = `Last: ${last.ml}ml ${drinkEmoji(last.type)}`;
  } else if (undoLbl) undoLbl.textContent = "";

  // Timeline
  renderTimeline();

  // Confetti on first goal hit
  if (pct >= 1 && !goalJustHit) {
    goalJustHit = true;
    toast("🎉 Hydration goal reached!", "success");
    triggerConfetti();
  }
  if (pct < 1) goalJustHit = false;
}

function renderTimeline() {
  const el = document.getElementById("today-timeline");
  if (!el) return;
  if (S.waterLogs.length === 0) {
    el.innerHTML = '<p class="empty-sm">No drinks logged yet.</p>';
    return;
  }
  el.innerHTML = [...S.waterLogs].reverse().map(e => {
    const t = new Date(e.time);
    const hh = t.getHours().toString().padStart(2, "0");
    const mm = t.getMinutes().toString().padStart(2, "0");
    const effective = ((e.ml / 1000) * e.coeff).toFixed(2);
    return `<div class="timeline-item">
      <span class="tl-time">${hh}:${mm}</span>
      <span class="tl-icon">${drinkEmoji(e.type)}</span>
      <span class="tl-info">${e.ml} ml <span class="tl-eff">(${effective} L eff.)</span></span>
    </div>`;
  }).join("");
}

function logWater(ml) {
  S.waterLogs.push({ ml, type: activeDrinkType, coeff: activeDrinkCoeff, time: Date.now() });
  saveState();
  updateHydrationUI();
  updateDashboard();
  checkBadges();
  toast(`+${ml}ml ${drinkEmoji(activeDrinkType)} logged`, "info");
}

// ── CREATINE UI ───────────────────────────────────────────────
function updateCreatineUI() {
  const maxServings = S.loadingPhase ? 4 : 1;
  const maxGrams    = maxServings * 5;
  const pct         = Math.min(S.creatineServings / maxServings, 1);

  // Ring (circumference for r=26 = 163.4)
  setRing("creatine-ring", pct, 163.4);
  const rp = document.getElementById("creatine-ring-pct");
  if (rp) rp.textContent = Math.round(pct * 100) + "%";

  const sv = document.getElementById("c-servings");
  const gv = document.getElementById("c-grams");
  const tv = document.getElementById("c-timer");
  if (sv) sv.textContent = S.creatineServings;
  if (gv) gv.textContent = (S.creatineServings * 5) + "g";
  if (tv) tv.textContent = fmtTime(S.creatineLastTime);

  const btn = document.getElementById("creatine-log-btn");
  const txt = document.getElementById("cta-btn-text");
  if (btn && txt) {
    if (S.creatineServings >= maxServings) {
      btn.disabled = true;
      btn.classList.add("btn-maxed");
      txt.textContent = "Max Logged (" + maxGrams + "g)";
    } else {
      btn.disabled = false;
      btn.classList.remove("btn-maxed");
      btn.classList.toggle("btn-logged", S.creatineServings > 0);
      txt.textContent = S.creatineServings > 0
        ? `Log Another 5g (${S.creatineServings + 1}/${maxServings})`
        : "Log 5g Serving";
    }
  }

  const phaseLabel = document.getElementById("phase-label");
  if (phaseLabel) {
    phaseLabel.textContent = S.loadingPhase
      ? `Loading Phase · ${S.creatineServings * 5}g / ${maxGrams}g`
      : `Maintenance Phase · ${S.creatineServings * 5}g / 5g`;
  }

  const rd = document.getElementById("ref-daily");
  if (rd) rd.textContent = S.loadingPhase ? "20g (4 servings)" : "5g (1 serving)";

  // Start live timer refresh
  clearInterval(timerInterval);
  if (S.creatineLastTime) {
    timerInterval = setInterval(() => {
      const el = document.getElementById("c-timer");
      if (el) el.textContent = fmtTime(S.creatineLastTime);
    }, 60000);
  }
}

function logCreatine() {
  const maxServings = S.loadingPhase ? 4 : 1;
  if (S.creatineServings >= maxServings) return;
  S.creatineServings++;
  S.creatineLastTime = Date.now();
  saveState();
  updateCreatineUI();
  updateDashboard();
  checkBadges();
  toast("💊 Creatine serving logged!", "success");
}

// ── DASHBOARD ────────────────────────────────────────────────
function updateDashboard() {
  const total = getTodayTotal(S);
  const pct   = Math.min(total / S.goal, 1);

  // Water summary
  const dwv = document.getElementById("dash-water-val");
  const dwp = document.getElementById("dash-water-pct");
  if (dwv) dwv.textContent = fmtLiters(total);
  if (dwp) dwp.textContent = Math.round(pct * 100) + "%";

  // Mini water ring (circumference for r=19 = 119.4)
  setRing("dash-water-ring", pct, 119.4);

  // Creatine summary
  const dcv = document.getElementById("dash-creatine-val");
  const dot = document.getElementById("creatine-dot");
  if (dcv) dcv.textContent = (S.creatineServings * 5) + " g";
  if (dot) {
    dot.className = "status-dot " + (S.creatineServings > 0 ? "dot-on" : "dot-off");
  }

  // Streaks
  const streaks = calcStreaks(S, S.history);
  const se = document.getElementById("st-hydration");
  const sc = document.getElementById("st-creatine");
  const sd = document.getElementById("st-days");
  const hh = document.getElementById("header-streak");
  if (se) se.textContent = streaks.hydration;
  if (sc) sc.textContent = streaks.creatine;
  if (sd) sd.textContent = S.history.length;
  if (hh) hh.textContent = Math.max(streaks.hydration, streaks.creatine);

  // Greeting
  const hour = new Date().getHours();
  const greetName = S.name ? `, ${S.name}` : "!";
  const greetText = hour < 12 ? `Good morning${greetName}` : hour < 17 ? `Good afternoon${greetName}` : `Good evening${greetName}`;
  const ge = document.getElementById("greeting-text");
  const gd = document.getElementById("greeting-date");
  if (ge) ge.textContent = greetText;
  if (gd) gd.textContent = new Date().toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric" });

  // Creatine quick btn state
  const qcb = document.getElementById("dash-creatine-btn");
  const maxServings = S.loadingPhase ? 4 : 1;
  if (qcb) qcb.disabled = S.creatineServings >= maxServings;
}

// ── QUOTE ────────────────────────────────────────────────────
function renderQuote() {
  const idx = new Date().getDay() % QUOTES.length;
  const q   = QUOTES[idx];
  const qt  = document.getElementById("quote-text");
  const qa  = document.getElementById("quote-author");
  if (qt) qt.textContent = q.text;
  if (qa) qa.textContent = "— " + q.author;
}

// ── BADGES ───────────────────────────────────────────────────
function checkBadges() {
  BADGES.forEach(b => {
    if (!S.unlockedBadges.includes(b.id) && b.check(S, S.history)) {
      S.unlockedBadges.push(b.id);
      saveState();
      toast(`🏅 Achievement unlocked: ${b.name}!`, "success");
    const history = JSON.parse(localStorage.getItem('dailyHistory') || '[]');
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<li class="empty-message">No history tracked yet. Start logging!</li>';
    } else {
        // Display stats
        const stats = calculateHistoryStats(history);
        if (avgLitersDisplay) avgLitersDisplay.textContent = stats.avgLiters;
        if (consistencyDisplay) consistencyDisplay.textContent = stats.consistency;
        
        // Display list (last 7 days only, newest first)
        const lastSevenDays = history.slice(-7).reverse(); 
        
        lastSevenDays.forEach(record => {
            const goal = parseFloat(localStorage.getItem('hydrationGoalLiters') || DEFAULT_GOAL_LITERS);
            const hydrationStatus = (record.litersLogged >= goal) ? 'Goal Met ✅' : 'Below Goal ⚠️';
            const creatineStatus = (record.creatineServings >= 1) ? `${record.creatineServings} Serving(s) ` : 'None Logged';

            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${record.date}</span>
                <span>💧 ${record.litersLogged.toFixed(1)} L (${hydrationStatus})</span>
                <span>${creatineStatus}</span>
            `;
            historyList.appendChild(listItem);
        });
    }
  });
  renderBadges();
}

function renderBadges() {
  const grid = document.getElementById("badges-grid");
  const summary = document.getElementById("badge-summary");
  if (!grid) return;
  grid.innerHTML = BADGES.map(b => {
    const unlocked = S.unlockedBadges.includes(b.id);
    return `<div class="badge-item ${unlocked ? "badge-on" : "badge-off"}" title="${b.desc}">
      <span class="badge-icon">${b.icon}</span>
      <span class="badge-name">${b.name}</span>
    </div>`;
  }).join("");
  if (summary) summary.textContent = `${S.unlockedBadges.length} / ${BADGES.length}`;
}

// ── ANALYTICS ────────────────────────────────────────────────
function renderAnalytics() {
  const history = S.history;

  // Stats
  const avgEl   = document.getElementById("s-avg");
  const grEl    = document.getElementById("s-goalrate");
  const consEl  = document.getElementById("s-consistency");
  const bestEl  = document.getElementById("s-best");

  if (history.length === 0) {
    [avgEl, grEl, consEl, bestEl].forEach(e => { if (e) e.textContent = "—"; });
  } else {
    const avg  = history.reduce((s, d) => s + d.waterTotal, 0) / history.length;
    const gr   = Math.round(history.filter(d => d.goalMet).length / history.length * 100);
    const cons = Math.round(history.filter(d => d.creatineServings >= 1).length / history.length * 100);
    const best = Math.max(...history.map(d => d.waterTotal));
    if (avgEl)  avgEl.textContent  = avg.toFixed(1) + " L";
    if (grEl)   grEl.textContent   = gr + "%";
    if (consEl) consEl.textContent = cons + "%";
    if (bestEl) bestEl.textContent = best.toFixed(1) + " L";
  }

  // Charts
  const last14 = [...S.history].slice(-14);
  const waterData    = last14.map(d => d.waterTotal);
  const creatineData = last14.map(d => d.creatineServings);
  const labels       = last14.map(d => {
    const dt = new Date(d.date);
    return (dt.getMonth()+1) + "/" + dt.getDate();
  });

  renderBarChart("chart-water",    waterData,    "url(#waterGradChart)",  Math.max(S.goal * 1.3, ...waterData, 1),    S.goal,   labels, 150, true);
  renderBarChart("chart-creatine", creatineData, "#a78bfa", Math.max(4, ...creatineData, 1), null, labels, 120, false);

  // History list
  renderHistoryList();
}

function renderBarChart(svgId, data, color, maxVal, goalVal, labels, svgH, showGoal) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  // Add gradient def for water chart
  svg.innerHTML = `<defs>
    <linearGradient id="waterGradChart" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#34b8e6"/>
      <stop offset="100%" stop-color="#015486" stop-opacity="0.7"/>
    </linearGradient>
    <linearGradient id="creatineGradChart" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.7"/>
    </linearGradient>
  </defs>`;

  if (data.length === 0) {
    const txt = document.createElementNS("http://www.w3.org/2000/svg","text");
    txt.setAttribute("x","160"); txt.setAttribute("y", svgH/2);
    txt.setAttribute("text-anchor","middle"); txt.setAttribute("fill","#94a3b8");
    txt.setAttribute("font-size","12"); txt.textContent = "No data yet";
    svg.appendChild(txt); return;
  }

  const pL=32, pR=8, pT=10, pB=28;
  const W=320, H=svgH;
  const cW=W-pL-pR, cH=H-pT-pB;
  const n=data.length;
  const slotW=cW/n;
  const barW=Math.max(slotW*0.6, 4);

  // Goal line
  if (showGoal && goalVal && maxVal > 0) {
    const gy = pT + cH - (goalVal/maxVal)*cH;
    const ln = document.createElementNS("http://www.w3.org/2000/svg","line");
    ln.setAttribute("x1",pL); ln.setAttribute("x2",W-pR);
    ln.setAttribute("y1",gy); ln.setAttribute("y2",gy);
    ln.setAttribute("stroke","#79c743"); ln.setAttribute("stroke-width","1.5");
    ln.setAttribute("stroke-dasharray","4,3"); ln.setAttribute("opacity","0.8");
    svg.appendChild(ln);
    const gl = document.createElementNS("http://www.w3.org/2000/svg","text");
    gl.setAttribute("x",pL-2); gl.setAttribute("y",gy-2);
    gl.setAttribute("font-size","8"); gl.setAttribute("fill","#79c743");
    gl.setAttribute("text-anchor","end"); gl.textContent="Goal";
    svg.appendChild(gl);
  }

  data.forEach((val, i) => {
    const x    = pL + i*slotW + (slotW-barW)/2;
    const bH   = maxVal > 0 ? Math.max((val/maxVal)*cH, val>0?2:0) : 0;
    const y    = pT + cH - bH;
    const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
    rect.setAttribute("x",x); rect.setAttribute("y",y);
    rect.setAttribute("width",barW); rect.setAttribute("height",bH);
    rect.setAttribute("rx","3");
    rect.setAttribute("fill", svgId==="chart-water" ? "url(#waterGradChart)" : "url(#creatineGradChart)");
    rect.setAttribute("opacity", val>0?"1":"0.15");
    svg.appendChild(rect);

    // Label
    if (labels && labels[i] && n <= 14) {
      const lbl = document.createElementNS("http://www.w3.org/2000/svg","text");
      lbl.setAttribute("x", x+barW/2); lbl.setAttribute("y", H-pB+12);
      lbl.setAttribute("text-anchor","middle"); lbl.setAttribute("font-size","7");
      lbl.setAttribute("fill","#94a3b8"); lbl.textContent=labels[i];
      svg.appendChild(lbl);
    }
  });
}

function renderHistoryList() {
  const el = document.getElementById("history-list");
  if (!el) return;
  if (S.history.length === 0) {
    el.innerHTML = '<p class="empty-sm">No history yet. Start tracking!</p>'; return;
  }
  el.innerHTML = [...S.history].reverse().slice(0,30).map(d => {
    const statusClass = d.goalMet ? "hist-goal-met" : "hist-goal-miss";
    const statusIcon  = d.goalMet ? "✅" : "⚠️";
    return `<div class="hist-item">
      <div class="hist-date">${d.date}</div>
      <div class="hist-row">
        <span class="${statusClass}">${statusIcon} ${d.waterTotal.toFixed(1)} L</span>
        <span class="hist-creatine">${d.creatineServings > 0 ? "💊 " + d.creatineServings + " serving(s)" : "No creatine"}</span>
      </div>
    </div>`;
  }).join("");
}

// ── SETTINGS ─────────────────────────────────────────────────
function loadSettingsUI() {
  const sn = document.getElementById("s-name");
  const sw = document.getElementById("s-weight");
  const swu= document.getElementById("s-weight-unit");
  const sa = document.getElementById("s-activity");
  const sg = document.getElementById("s-goal");
  const sd = document.getElementById("s-dark");
  const su = document.getElementById("s-units");
  const lt = document.getElementById("loading-phase-toggle");
  const sn2= document.getElementById("supp-notes");

  if (sn)  sn.value  = S.name;
  if (sw)  sw.value  = S.weight;
  if (swu) swu.value = S.weightUnit;
  if (sa)  sa.value  = S.activity;
  if (sg)  sg.value  = S.goal;
  if (sd)  sd.checked= S.darkMode;
  if (su)  su.value  = S.units;
  if (lt)  lt.checked= S.loadingPhase;
  if (sn2) sn2.value = S.suppNotes;
}

function calcSmartGoal() {
  let kg = parseFloat(S.weight) || 70;
  if (S.weightUnit === "lbs") kg = kg / 2.205;
  const multipliers = { sedentary:0.030, light:0.033, moderate:0.036, active:0.040, athlete:0.045 };
  const m = multipliers[S.activity] || 0.036;
  return parseFloat((kg * m).toFixed(1));
}

function applyDarkMode(on) {
  document.documentElement.setAttribute("data-theme", on ? "dark" : "light");
  const icon = document.getElementById("dark-icon");
  if (icon) { icon.className = on ? "fa-solid fa-sun" : "fa-solid fa-moon"; }
}

function exportData() {
  const blob = new Blob([JSON.stringify({ state: S, exportedAt: new Date().toISOString() }, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "oasis-data-" + new Date().toISOString().slice(0,10) + ".json";
  a.click();
}

// ── EVENT LISTENERS ──────────────────────────────────────────
function setupEvents() {
  // Bottom nav
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.page));
  });

  // Summary cards → navigate
  document.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", () => navigateTo(el.dataset.nav));
  });

  // Hydration amount buttons
  document.querySelectorAll(".amt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const ml = parseFloat(btn.dataset.amount) * 1000;
      logWater(ml);
      btn.classList.add("btn-flash");
      setTimeout(() => btn.classList.remove("btn-flash"), 300);
    });
  });

  // Custom log
  const customBtn = document.getElementById("custom-log-btn");
  const customIn  = document.getElementById("custom-ml");
  if (customBtn && customIn) {
    customBtn.addEventListener("click", () => {
      const ml = parseFloat(customIn.value);
      if (ml > 0 && ml <= 5000) { logWater(ml); customIn.value = ""; }
      else toast("Enter a valid amount (1–5000 ml)", "error");
    });
    customIn.addEventListener("keydown", e => { if (e.key === "Enter") customBtn.click(); });
  }

  // Drink type selector
  document.querySelectorAll(".drink-type").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".drink-type").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeDrinkCoeff = parseFloat(btn.dataset.coeff);
      activeDrinkType  = btn.dataset.drink;
    });
  });

  // Undo
  const undoBtn = document.getElementById("undo-btn");
  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      if (S.waterLogs.length === 0) return;
      const removed = S.waterLogs.pop();
      saveState();
      updateHydrationUI();
      updateDashboard();
      checkBadges();
      toast(`↩️ Removed ${removed.ml}ml ${drinkEmoji(removed.type)}`, "info");
    });
  }

  // Clear today
  const clearBtn = document.getElementById("clear-today-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!confirm("Clear all of today's water logs?")) return;
      S.waterLogs = [];
      goalJustHit  = false;
      saveState();
      updateHydrationUI();
      updateDashboard();
      toast("Today's log cleared", "info");
    });
  }

  // Edit goal button → modal
  const editGoalBtn = document.getElementById("edit-goal-btn");
  if (editGoalBtn) {
    editGoalBtn.addEventListener("click", () => {
      const overlay = document.getElementById("modal-overlay");
      const inp     = document.getElementById("modal-goal-input");
      if (inp) inp.value = S.goal;
      overlay.classList.remove("hidden");
      if (inp) inp.focus();
    });
  }

  // Modal cancel
  const modalCancel = document.getElementById("modal-cancel");
  if (modalCancel) {
    modalCancel.addEventListener("click", () => {
      document.getElementById("modal-overlay").classList.add("hidden");
    });
  }

  // Modal save
  const modalSave = document.getElementById("modal-save");
  if (modalSave) {
    modalSave.addEventListener("click", () => {
      const val = parseFloat(document.getElementById("modal-goal-input").value);
      if (val > 0 && val <= 10) {
        S.goal = val;
        goalJustHit = false;
        saveState();
        updateHydrationUI();
        updateDashboard();
        document.getElementById("modal-overlay").classList.add("hidden");
        toast("Goal updated to " + fmtLiters(val), "success");
      } else toast("Enter a goal between 0.5 and 10 L", "error");
    });
  }

  // Close modal on overlay click
  const overlay = document.getElementById("modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) overlay.classList.add("hidden");
    });
  }

  // Quick log dashboard
  document.querySelectorAll(".quick-btn[data-amount]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ml   = parseFloat(btn.dataset.amount) * 1000;
      const type = btn.dataset.type || "water";
      S.waterLogs.push({ ml, type, coeff: 1.0, time: Date.now() });
      saveState();
      updateHydrationUI();
      updateDashboard();
      checkBadges();
      btn.classList.add("btn-flash");
      setTimeout(() => btn.classList.remove("btn-flash"), 300);
      toast(`+${ml}ml ${drinkEmoji(type)} logged`, "info");
    });
  });

  // Dashboard creatine quick btn
  const dashCBtn = document.getElementById("dash-creatine-btn");
  if (dashCBtn) dashCBtn.addEventListener("click", logCreatine);

  // Creatine log button
  const cBtn = document.getElementById("creatine-log-btn");
  if (cBtn) cBtn.addEventListener("click", logCreatine);

  // Loading phase toggle
  const lt = document.getElementById("loading-phase-toggle");
  if (lt) {
    lt.addEventListener("change", () => {
      S.loadingPhase = lt.checked;
      saveState();
      updateCreatineUI();
      checkBadges();
      toast(S.loadingPhase ? "Loading phase enabled (20g/day)" : "Maintenance phase (5g/day)", "info");
    });
  }

  // Supplement notes
  const saveNotesBtn = document.getElementById("save-notes-btn");
  const notesArea    = document.getElementById("supp-notes");
  if (saveNotesBtn && notesArea) {
    saveNotesBtn.addEventListener("click", () => {
      S.suppNotes = notesArea.value;
      saveState();
      toast("Notes saved", "success");
    });
  }

  // Settings: save profile
  const saveProfileBtn = document.getElementById("save-profile-btn");
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", () => {
      S.name       = document.getElementById("s-name")?.value.trim() || "";
      S.weight     = parseFloat(document.getElementById("s-weight")?.value) || 70;
      S.weightUnit = document.getElementById("s-weight-unit")?.value || "kg";
      S.activity   = document.getElementById("s-activity")?.value || "moderate";
      saveState();
      updateDashboard();
      const smart = calcSmartGoal();
      const box   = document.getElementById("smart-goal-box");
      if (box) {
        box.style.display = "block";
        box.innerHTML = `💡 Based on your profile, your recommended goal is <strong>${smart} L/day</strong>. <button class="text-btn" id="apply-smart-goal">Apply</button>`;
        document.getElementById("apply-smart-goal")?.addEventListener("click", () => {
          S.goal = smart;
          goalJustHit = false;
          saveState();
          updateHydrationUI();
          updateDashboard();
          const sg = document.getElementById("s-goal");
          if (sg) sg.value = smart;
          toast("Smart goal applied: " + smart + " L", "success");
          box.style.display = "none";
        });
      }
      toast("Profile saved!", "success");
    });
  }

  // Settings: save goal
  const saveGoalBtn = document.getElementById("save-goal-btn");
  if (saveGoalBtn) {
    saveGoalBtn.addEventListener("click", () => {
      const val = parseFloat(document.getElementById("s-goal")?.value);
      if (val > 0 && val <= 10) {
        S.goal = val;
        goalJustHit = false;
        saveState();
        updateHydrationUI();
        updateDashboard();
        toast("Goal updated to " + fmtLiters(val), "success");
      } else toast("Enter a valid goal", "error");
    });
  }

  // Settings: dark mode toggle
  const darkToggle   = document.getElementById("s-dark");
  const headerDark   = document.getElementById("dark-mode-toggle");
  const syncDark = (on) => {
    S.darkMode = on;
    saveState();
    applyDarkMode(on);
    if (darkToggle)  darkToggle.checked = on;
  };
  if (darkToggle)  darkToggle.addEventListener("change",  () => syncDark(darkToggle.checked));
  if (headerDark)  headerDark.addEventListener("click",   () => syncDark(!S.darkMode));

  // Settings: units
  const unitsEl = document.getElementById("s-units");
  if (unitsEl) {
    unitsEl.addEventListener("change", () => {
      S.units = unitsEl.value;
      saveState();
      updateHydrationUI();
      updateDashboard();
      toast("Display units updated", "info");
    });
  }

  // Export buttons
  document.getElementById("export-btn")?.addEventListener("click", exportData);
  document.getElementById("export-data-btn")?.addEventListener("click", exportData);

  // Clear all data
  const clearAll = document.getElementById("clear-data-btn");
  if (clearAll) {
    clearAll.addEventListener("click", () => {
      if (!confirm("Delete ALL Oasis data? This cannot be undone.")) return;
      localStorage.removeItem("oasis_v2");
      S = { ...DEFAULT };
      goalJustHit = false;
      saveState();
      loadSettingsUI();
      updateHydrationUI();
      updateCreatineUI();
      updateDashboard();
      renderBadges();
      toast("All data cleared", "info");
    });
  }
}

// ── INIT ─────────────────────────────────────────────────────
function init() {
  loadState();
  checkDayReset();
  applyDarkMode(S.darkMode);
  setupEvents();
  loadSettingsUI();
  updateHydrationUI();
  updateCreatineUI();
  updateDashboard();
  renderQuote();
  renderBadges();
  checkBadges();
  navigateTo("page-dashboard");
}

init();
