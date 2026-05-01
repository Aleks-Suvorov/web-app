// === OASIS v3 ===

// ── Ambient Background System ──────────────────────────────────────────────
(function initAmbientBg(){
  const cv = document.getElementById("oasis-bg");
  if (!cv) return;

  // Respect reduced motion
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  const ctx = cv.getContext("2d");
  let W, H, orbs, particles, raf;

  function resize(){
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
    buildOrbs();
  }

  function buildOrbs(){
    const light = document.documentElement.getAttribute("data-theme") === "light";
    orbs = [
      { x:W*0.18, y:H*0.12, r:W*0.55, ox:W*0.18, oy:H*0.12,
        vx:0.12, vy:0.07,
        c: light ? "rgba(0,160,230,0.10)" : "rgba(0,180,255,0.13)" },
      { x:W*0.82, y:H*0.80, r:W*0.45, ox:W*0.82, oy:H*0.80,
        vx:-0.09, vy:-0.11,
        c: light ? "rgba(100,60,200,0.07)" : "rgba(130,80,255,0.11)" },
      { x:W*0.55, y:H*0.45, r:W*0.30, ox:W*0.55, oy:H*0.45,
        vx:0.06, vy:0.09,
        c: light ? "rgba(0,200,180,0.05)" : "rgba(0,220,200,0.07)" },
    ];

    // Lightweight floating particles (bubbles/flecks)
    particles = Array.from({length: 28}, () => ({
      x: Math.random() * W,
      y: H + Math.random() * H * 0.3,
      r: 0.8 + Math.random() * 2.2,
      vy: -(0.15 + Math.random() * 0.35),
      vx: (Math.random() - 0.5) * 0.2,
      opacity: 0.06 + Math.random() * 0.14,
      pulse: Math.random() * Math.PI * 2,
    }));
  }

  let t = 0;
  function draw(){
    ctx.clearRect(0, 0, W, H);
    t += 0.003;

    // Draw slow-moving glow orbs
    orbs.forEach(o => {
      o.x = o.ox + Math.sin(t * o.vx * 3) * W * 0.06;
      o.y = o.oy + Math.cos(t * o.vy * 3) * H * 0.05;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, o.c);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw floating particles
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const pc = light ? "rgba(0,140,210," : "rgba(120,200,255,";
    particles.forEach(p => {
      p.y += p.vy;
      p.x += p.vx;
      p.pulse += 0.02;
      const op = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));
      if (p.y < -20) { p.y = H + 10; p.x = Math.random() * W; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = pc + op + ")";
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize, { passive: true });
  // Rebuild orbs when theme changes
  const obs = new MutationObserver(() => buildOrbs());
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  resize();
  draw();
})();

const QUOTES = [
  {t:"Water is the driving force of all nature.",a:"Leonardo da Vinci"},
  {t:"Hydration is the foundation of performance.",a:"Sports Science"},
  {t:"Take care of your body. It's the only place you have to live.",a:"Jim Rohn"},
  {t:"Strength does not come from the body. It comes from the will.",a:"Gandhi"},
  {t:"Small daily improvements over time lead to stunning results.",a:"Robin Sharma"},
  {t:"Discipline is choosing between what you want now and what you want most.",a:"Abraham Lincoln"},
  {t:"The groundwork for all happiness is good health.",a:"Leigh Hunt"},
  {t:"To keep the body in good health is a duty.",a:"Buddha"},
];

const BADGES = [
  {id:"first_drop",    ico:"💧",nm:"First Drop",   desc:"Log first drink",          fn:(s,h)=>s.waterLogs.length>0||h.length>0},
  {id:"goal_getter",  ico:"🎯",nm:"Goal Getter",   desc:"Hit hydration goal",        fn:(s,h)=>total(s)>=s.goal||h.some(d=>d.w>=d.goal)},
  {id:"streak_3",     ico:"🔥",nm:"On Fire",       desc:"3-day water streak",        fn:(s,h)=>streaks(h).w>=3},
  {id:"streak_7",     ico:"⚡",nm:"Lightning",     desc:"7-day water streak",        fn:(s,h)=>streaks(h).w>=7},
  {id:"creatine_1",   ico:"💊",nm:"First Dose",    desc:"Log first creatine",        fn:(s,h)=>s.creatineServings>0||h.some(d=>d.c>0)},
  {id:"creatine_7",   ico:"🏆",nm:"Creatine Week", desc:"7-day creatine streak",     fn:(s,h)=>streaks(h).c>=7},
  {id:"big_drinker",  ico:"🌊",nm:"Big Drinker",   desc:"4+ liters in one day",      fn:(s,h)=>total(s)>=4||h.some(d=>d.w>=4)},
  {id:"veteran",      ico:"📅",nm:"Veteran",       desc:"14 days tracked",           fn:(s,h)=>h.length>=14},
  {id:"loader",       ico:"🚀",nm:"Loading Up",    desc:"Enable loading phase",      fn:(s,h)=>s.loadingPhase},
  {id:"perfect_week", ico:"✨",nm:"Perfect Week",  desc:"7 days hitting goal",       fn:(s,h)=>streaks(h).w>=7},
];

const DEF = {
  waterLogs:[],creatineServings:0,creatineLastTime:null,
  goal:3.7,name:"",weight:70,weightUnit:"kg",activity:"moderate",
  units:"metric",darkMode:true,loadingPhase:false,suppNotes:"",
  workoutDay:false,weightLog:[],reminders:false,reminderInterval:2,
  history:[],lastDate:null,unlockedBadges:[],
};

let S={}, timerInt=null, drinkCoeff=1.0, drinkType="water", goalHit=false;

// === STORAGE ===
const save = ()=>localStorage.setItem("oasis_v2",JSON.stringify(S));
function load(){
  const raw=localStorage.getItem("oasis_v2");
  S=raw?Object.assign({},DEF,JSON.parse(raw)):{...DEF};
  // migrate v1
  if(!raw){
    const ol=parseFloat(localStorage.getItem("liters")||0);
    const oc=parseInt(localStorage.getItem("creatineServings")||0);
    const og=parseFloat(localStorage.getItem("hydrationGoalLiters")||0);
    if(ol>0) S.waterLogs.push({ml:ol*1000,type:"water",coeff:1,time:Date.now()});
    if(oc>0) S.creatineServings=oc;
    if(og>0) S.goal=og;
    const oh=JSON.parse(localStorage.getItem("dailyHistory")||"[]");
    S.history=oh.map(d=>({date:d.date,w:d.litersLogged,c:d.creatineServings,goal:S.goal,goalMet:d.litersLogged>=S.goal}));
    save();
  }
}

function dayReset(){
  const today=new Date().toDateString();
  if(S.lastDate&&S.lastDate!==today){
    S.history.push({date:S.lastDate,w:total(S),c:S.creatineServings,goal:S.goal,goalMet:total(S)>=S.goal});
    S.waterLogs=[];S.creatineServings=0;S.creatineLastTime=null;
    S.workoutDay=false;goalHit=false;
  }
  S.lastDate=today;save();
}

// === HELPERS ===
const total=st=>st.waterLogs.reduce((s,e)=>s+(e.ml/1000)*e.coeff,0);

function countUp(el, to, dur=650) {
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) { el.textContent = to; return; }
  const from = parseFloat(el.textContent) || 0;
  if (from === to) return;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = to;
  };
  requestAnimationFrame(step);
}
function streaks(history){
  const rev=[...history].reverse();
  let w=0,c=0;
  for(const d of rev){if(d.goalMet)w++;else break;}
  for(const d of rev){if(d.c>=1)c++;else break;}
  return{w,c};
}
const fmtL=v=>S.units==="imperial"?(v*33.814).toFixed(0)+" oz":v.toFixed(2)+" L";
const fmtTime=ts=>{if(!ts)return"—";const d=Math.floor((Date.now()-ts)/60000);if(d<1)return"Just now";if(d<60)return d+"m ago";return Math.floor(d/60)+"h "+d%60+"m ago";};
const emoji=t=>({water:"💧",coffee:"☕",tea:"🍵",juice:"🧃"}[t]||"💧");
const setRing=(id,pct,circ)=>{const e=document.getElementById(id);if(e)e.style.strokeDashoffset=circ-(Math.min(pct,1)*circ);};

// === NAVIGATION ===
function go(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nb").forEach(b=>b.classList.remove("active"));
  const pg=document.getElementById(id);if(pg){pg.classList.add("active");pg.scrollTop=0;}
  const nb=document.querySelector(`.nb[data-page="${id}"]`);if(nb)nb.classList.add("active");
  if(id==="page-stats")renderAnalytics();
}

// === TOAST ===
function toast(msg,type="info"){
  const c=document.getElementById("toasts");
  const t=document.createElement("div");t.className=`toast ${type}`;t.textContent=msg;
  c.appendChild(t);requestAnimationFrame(()=>t.classList.add("show"));
  setTimeout(()=>{t.classList.remove("show");setTimeout(()=>t.remove(),400);},2800);
}

// === CONFETTI ===
function confetti(){
  const cv=document.getElementById("confetti");cv.style.display="block";
  const ctx=cv.getContext("2d");cv.width=innerWidth;cv.height=innerHeight;
  const ps=Array.from({length:120},()=>({
    x:Math.random()*cv.width,y:Math.random()*-cv.height,
    w:7+Math.random()*9,h:5+Math.random()*7,
    c:["#38bdf8","#0369a1","#4ade80","#fbbf24","#f87171","#c084fc"][~~(Math.random()*6)],
    rot:Math.random()*360,vx:(Math.random()-.5)*3,vy:2+Math.random()*4,vr:(Math.random()-.5)*8
  }));
  let f=0;
  (function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);
    ps.forEach(p=>{ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.c;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;});
    if(++f<160)requestAnimationFrame(draw);else{ctx.clearRect(0,0,cv.width,cv.height);cv.style.display="none";}
  })();
}

// === DARK MODE ===
function applyTheme(dark){
  document.documentElement.setAttribute("data-theme",dark?"dark":"light");
  const i=document.getElementById("theme-icon");if(i)i.className=dark?"fa-solid fa-sun":"fa-solid fa-moon";
  const sd=document.getElementById("s-dark");if(sd)sd.checked=dark;
}

// === DASHBOARD ===
function updateDash(){
  const t=total(S),pct=Math.min(t/S.goal,1);
  const dv=document.getElementById("dash-water-val");if(dv)dv.textContent=fmtL(t);
  const dp=document.getElementById("dash-water-pct");if(dp)dp.textContent=Math.round(pct*100)+"% of goal";
  setRing("dash-ring",pct,131.95);
  const cv=document.getElementById("dash-creatine-val");if(cv)cv.textContent=(S.creatineServings*5)+"g";
  const maxS=S.loadingPhase?4:1;
  const cp=document.getElementById("dash-creatine-pct");
  if(cp)cp.textContent=S.creatineServings>0?S.creatineServings+"/"+maxS+" servings":"Not logged";
  const dot=document.getElementById("dash-supp-dot");
  if(dot)dot.className="supp-dot "+(S.creatineServings>0?"dot-done":"dot-idle");
  // streaks
  const str=streaks(S.history);
  const sw=document.getElementById("sb-water");countUp(sw,str.w);
  const sc=document.getElementById("sb-creatine");countUp(sc,str.c);
  const sd=document.getElementById("sb-days");countUp(sd,S.history.length);
  const hs=document.getElementById("hdr-streak-num");countUp(hs,Math.max(str.w,str.c));
  // greeting
  const hr=new Date().getHours();
  const gn=S.name?`, ${S.name}`:"!";
  const gm=hr<12?"Good morning"+gn:hr<17?"Good afternoon"+gn:"Good evening"+gn;
  const ge=document.getElementById("greet-main");if(ge)ge.textContent=gm;
  const gd=document.getElementById("greet-sub");
  if(gd)gd.textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  // quick log label
  const al=document.getElementById("active-drink-label");
  if(al)al.textContent=emoji(drinkType)+" "+drinkType.charAt(0).toUpperCase()+drinkType.slice(1);
  // creatine quick btn
  const cb=document.getElementById("dash-creatine-btn");if(cb)cb.disabled=S.creatineServings>=maxS;
  // workout toggle sync
  const wt=document.getElementById("workout-toggle");if(wt)wt.checked=S.workoutDay;
  renderWeekBars();
  renderDailyInsight();
}

function renderDailyInsight(){
  const el=document.getElementById("insight-text");
  const ac=document.getElementById("insight-action");
  const ic=document.getElementById("insight-icon");
  if(!el)return;
  const t=total(S),pct=Math.round(t/S.goal*100);
  const str=streaks(S.history);
  const kg=S.weightUnit==="lbs"?S.weight/2.205:S.weight;
  const hr=new Date().getHours();
  const creatineDays=S.history.filter(d=>d.c>0).length;
  const satEst=Math.min(Math.round(creatineDays/28*100),100);

  // Priority-ordered insights based on current state
  if(pct>=100&&S.creatineServings>0){
    ic.textContent="🏆";
    el.textContent=`You've hit both targets today! Hydration is full and creatine is logged. Your consistency over ${S.history.length} days is building real results.`;
    ac.textContent="Keep this up — come back tomorrow.";
  } else if(hr>=20&&pct<80){
    ic.textContent="🌙";
    const need=(S.goal-t).toFixed(2);
    el.textContent=`It's evening and you're at ${pct}% of your water goal. You need ${need}L to hit your target tonight.`;
    ac.textContent=`→ Try ${pct<50?"two 500ml glasses":"one large glass"} before bed.`;
  } else if(S.creatineServings===0&&hr>=10){
    ic.textContent="💊";
    el.textContent=`You haven't logged creatine today. ${satEst<80?`You're ~${satEst}% saturated — consistency is key to reaching peak saturation.`:"You're well saturated — keep the daily habit going."}`;
    ac.textContent="→ Log your 5g serving now.";
  } else if(str.w>=7){
    ic.textContent="🔥";
    el.textContent=`${str.w}-day hydration streak! That's a genuine habit now. Research shows consistent hydration improves cognitive performance by 10–15%.`;
    ac.textContent="→ Keep the streak alive — log water now if you haven't.";
  } else if(pct<30&&hr>=12){
    ic.textContent="⚠️";
    el.textContent=`It's midday and you're only at ${pct}% hydration. Mild dehydration (as little as 2%) reduces strength output and focus.`;
    ac.textContent=`→ Drink 500ml right now to get back on track.`;
  } else if(S.workoutDay&&pct<50){
    ic.textContent="💪";
    el.textContent=`Workout day! You need an extra 0.5L today. You're currently at ${pct}% — pre-workout hydration directly impacts performance by 5–10%.`;
    ac.textContent="→ Log a bottle before you hit the gym.";
  } else if(S.history.length===0){
    ic.textContent="🌱";
    el.textContent="Welcome to Oasis! Log water and creatine consistently for 3 days and your stats, trends, and streaks will come alive.";
    ac.textContent="→ Start by logging today's water above.";
  } else {
    ic.textContent="💡";
    const remaining=(S.goal-t).toFixed(2);
    el.textContent=`You're at ${pct}% today${str.w>0?`, on a ${str.w}-day streak`:""}.${S.creatineServings>0?" Creatine is done.":""}${pct<100?` You need ${remaining}L more to hit your goal.`:" Goal hit!"}`;
    ac.textContent=pct<100?`→ ${pct<50?"Log a 500ml drink to build momentum.":"Almost there — log your next drink."}`:str.c>0?"→ Great day all around. Rest and recover.":"→ Don't forget creatine before the day ends.";
  }
}

function renderWeekBars(){
  const bars=document.getElementById("week-bars");
  const lbls=document.getElementById("week-labels");
  if(!bars||!lbls)return;
  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=d.toDateString();
    if(i===0){days.push({label:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()],w:total(S),goal:S.goal,today:true});}
    else{const h=S.history.find(r=>r.date===ds);days.push({label:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()],w:h?h.w:0,goal:h?h.goal:S.goal,today:false});}
  }
  const maxW=Math.max(...days.map(d=>d.w),S.goal,0.1);
  bars.innerHTML=days.map(d=>{
    const h=Math.max((d.w/maxW)*54,d.w>0?4:0);
    const cls=d.today?"today":d.w>=d.goal?"hit":"miss";
    return`<div class="wbar-col"><div class="wbar ${cls}" style="height:${h}px"></div></div>`;
  }).join("");
  lbls.innerHTML=days.map(d=>`<div class="wlabel">${d.label}</div>`).join("");
}

// === HYDRATION ===
function updateWater(){
  const t=total(S),pct=Math.min(t/S.goal,1);
  setRing("big-ring",pct,628.32);
  const rn=document.getElementById("ring-num");
  if(rn){rn.textContent=S.units==="imperial"?(t*33.814).toFixed(0):t.toFixed(2);rn.classList.toggle("goal-hit",pct>=1);}
  const rp=document.getElementById("ring-pct");if(rp)rp.textContent=Math.round(pct*100)+"%";
  const ru=document.getElementById("ring-unit-lbl");if(ru)ru.textContent=S.units==="imperial"?"fl oz":"liters";
  const gl=document.getElementById("goal-lbl");if(gl)gl.textContent=fmtL(S.goal);
  const ub=document.getElementById("undo-btn");if(ub)ub.disabled=S.waterLogs.length===0;
  const ui=document.getElementById("undo-info");
  if(ui&&S.waterLogs.length>0){const l=S.waterLogs[S.waterLogs.length-1];ui.textContent=`Last: ${l.ml}ml ${emoji(l.type)}`;}
  else if(ui)ui.textContent="";
  renderTimeline();
  if(pct>=1&&!goalHit){goalHit=true;toast("🎉 Hydration goal reached!","success");confetti();}
  if(pct<1)goalHit=false;
  if(typeof calcWellness==="function")calcWellness();
}

function renderTimeline(){
  const el=document.getElementById("timeline");if(!el)return;
  if(S.waterLogs.length===0){el.innerHTML='<div class="empty-guidance"><div class="eg-icon">💧</div><div class="eg-title">Nothing logged yet</div><div class="eg-desc">Tap a button above to log your first drink today.</div></div>';return;}
  el.innerHTML=[...S.waterLogs].reverse().map(e=>{
    const t=new Date(e.time);
    const ts=t.getHours().toString().padStart(2,"0")+":"+t.getMinutes().toString().padStart(2,"0");
    const eff=((e.ml/1000)*e.coeff).toFixed(2);
    return`<div class="tl-item"><span class="tl-time">${ts}</span><span class="tl-emoji">${emoji(e.type)}</span><span class="tl-desc">${e.ml}ml <span class="tl-eff">(${eff}L eff.)</span></span></div>`;
  }).join("");
}

function logWater(ml){
  S.waterLogs.push({ml,type:drinkType,coeff:drinkCoeff,time:Date.now()});
  save();updateWater();updateDash();checkBadges();
  toast(`+${ml}ml ${emoji(drinkType)} logged`,"info");
}

// === CREATINE ===
function updateCreatine(){
  const maxS=S.loadingPhase?4:1;
  const pct=Math.min(S.creatineServings/maxS,1);
  setRing("supp-ring",pct,175.93);
  const rp=document.getElementById("supp-ring-pct");if(rp)rp.textContent=Math.round(pct*100)+"%";
  const sv=document.getElementById("c-servings");if(sv)sv.textContent=S.creatineServings;
  const gv=document.getElementById("c-grams");if(gv)gv.textContent=(S.creatineServings*5)+"g";
  const tv=document.getElementById("c-timer");if(tv)tv.textContent=fmtTime(S.creatineLastTime);
  const btn=document.getElementById("creatine-btn");
  const txt=document.getElementById("cta-txt");
  if(btn&&txt){
    if(S.creatineServings>=maxS){btn.disabled=true;btn.className="cta-btn maxed";txt.textContent=`Max Logged (${maxS*5}g)`;}
    else{btn.disabled=false;btn.className="cta-btn"+(S.creatineServings>0?" logged":"");txt.textContent=S.creatineServings>0?`Log Another 5g (${S.creatineServings+1}/${maxS})`:"Log 5g Serving";}
  }
  const pl=document.getElementById("supp-phase-lbl");
  if(pl)pl.textContent=S.loadingPhase?`Loading Phase · ${S.creatineServings*5}g / ${maxS*5}g`:`Maintenance · ${S.creatineServings*5}g / 5g`;
  const rd=document.getElementById("ref-daily");if(rd)rd.textContent=S.loadingPhase?"20g (4 servings)":"5g (1 serving)";
  clearInterval(timerInt);
  if(S.creatineLastTime)timerInt=setInterval(()=>{const t=document.getElementById("c-timer");if(t)t.textContent=fmtTime(S.creatineLastTime);},60000);
}

function logCreatine(){
  const maxS=S.loadingPhase?4:1;
  if(S.creatineServings>=maxS)return;
  S.creatineServings++;S.creatineLastTime=Date.now();
  save();updateCreatine();updateDash();checkBadges();
  toast("💊 Creatine serving logged!","success");
}

// === WEIGHT ===
function renderWeightHistory(){
  const el=document.getElementById("weight-history");if(!el)return;
  if(!S.weightLog||S.weightLog.length===0){el.innerHTML='<div class="empty-guidance"><div class="eg-icon">⚖️</div><div class="eg-title">No weight logged</div><div class="eg-desc">Add body weight entries to view progress trends.</div></div>';return;}
  el.innerHTML=[...S.weightLog].reverse().slice(0,7).map(e=>{
    return`<div class="w-entry"><span class="w-val">${e.val} ${e.unit}</span><span class="w-date">${e.date}</span></div>`;
  }).join("");
}

function logWeight(val,unit){
  if(!S.weightLog)S.weightLog=[];
  S.weightLog.push({val,unit,date:new Date().toLocaleDateString()});
  save();renderWeightHistory();toast(`⚖️ ${val}${unit} logged`,"info");
}

// === BADGES ===
function checkBadges(){
  BADGES.forEach(b=>{
    if(!S.unlockedBadges.includes(b.id)&&b.fn(S,S.history)){
      S.unlockedBadges.push(b.id);save();toast(`🏅 Unlocked: ${b.nm}!`,"success");
    }
  });
  renderBadges();
}
function renderBadges(){
  const g=document.getElementById("badges-grid");const chip=document.getElementById("badge-chip");
  if(!g)return;
  g.innerHTML=BADGES.map(b=>{
    const on=S.unlockedBadges.includes(b.id);
    return`<div class="badge ${on?"unlocked":"locked"}" title="${b.desc}"><span class="badge-ico">${b.ico}</span><span class="badge-nm">${b.nm}</span></div>`;
  }).join("");
  if(chip)chip.textContent=`${S.unlockedBadges.length} / ${BADGES.length}`;
}

// === QUOTE ===
function renderQuote(){
  const q=QUOTES[new Date().getDay()%QUOTES.length];
  const qt=document.getElementById("quote-txt");const qa=document.getElementById("quote-auth");
  if(qt)qt.textContent=q.t;if(qa)qa.textContent="— "+q.a;
}

// === ANALYTICS ===
function renderAnalytics(){
  const h=S.history;
  const sAvg=document.getElementById("s-avg"),sRate=document.getElementById("s-rate"),sCr=document.getElementById("s-creatine"),sBest=document.getElementById("s-best");
  if(h.length===0){[sAvg,sRate,sCr,sBest].forEach(e=>{if(e)e.textContent="—";});}
  else{
    const avg=h.reduce((s,d)=>s+d.w,0)/h.length;
    const rate=Math.round(h.filter(d=>d.goalMet).length/h.length*100);
    const cr=Math.round(h.filter(d=>d.c>=1).length/h.length*100);
    const best=Math.max(...h.map(d=>d.w));
    if(sAvg)sAvg.textContent=avg.toFixed(1)+"L";
    if(sRate)sRate.textContent=rate+"%";
    if(sCr)sCr.textContent=cr+"%";
    if(sBest)sBest.textContent=best.toFixed(1)+"L";
  }
  const last14=h.slice(-14);
  drawBars("chart-water",last14.map(d=>d.w),last14.map(d=>new Date(d.date).toLocaleDateString(undefined,{month:"numeric",day:"numeric"})),S.goal,150,"#38bdf8","#0369a1");
  drawBars("chart-creatine",last14.map(d=>d.c),last14.map(d=>new Date(d.date).toLocaleDateString(undefined,{month:"numeric",day:"numeric"})),null,120,"#c084fc","#7c3aed");
  const hl=document.getElementById("history-list");
  if(hl){
    if(h.length===0){
      hl.innerHTML='<div class="empty-guidance"><div class="eg-icon">📅</div><div class="eg-title">No history yet</div><div class="eg-desc">Log water and creatine today — your data appears here tomorrow. Track 3 days to unlock trend charts.</div></div>';
    } else {
      hl.innerHTML=[...h].reverse().slice(0,30).map(d=>{
        return`<div class="hist-item"><div class="hist-date">${d.date}</div><div class="hist-row"><span class="${d.goalMet?"hist-met":"hist-miss"}">${d.goalMet?"✅":"⚠️"} ${d.w.toFixed(1)}L</span><span class="hist-c">${d.c>0?`💊 ${d.c} serving(s)`:"No creatine"}</span></div></div>`;
      }).join("");
    }
  }
}

function drawBars(id,data,labels,goal,H,c1,c2){
  const svg=document.getElementById(id);if(!svg)return;
  const ns="http://www.w3.org/2000/svg";
  svg.innerHTML=`<defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}" stop-opacity=".7"/></linearGradient></defs>`;
  if(data.length===0){const t=document.createElementNS(ns,"text");t.setAttribute("x","160");t.setAttribute("y",H/2);t.setAttribute("text-anchor","middle");t.setAttribute("fill","#6b86a8");t.setAttribute("font-size","12");t.textContent="Log 3 days to unlock trend charts";svg.appendChild(t);return;}
  const pL=28,pR=6,pT=8,pB=22,W=320,cW=W-pL-pR,cH=H-pT-pB,n=data.length;
  const max=Math.max(...data,goal||0,0.1);
  const sw=cW/n,bw=Math.max(sw*.65,3);
  if(goal){
    const gy=pT+cH-(goal/max)*cH;
    const ln=document.createElementNS(ns,"line");ln.setAttribute("x1",pL);ln.setAttribute("x2",W-pR);ln.setAttribute("y1",gy);ln.setAttribute("y2",gy);ln.setAttribute("stroke","#4ade80");ln.setAttribute("stroke-width","1.5");ln.setAttribute("stroke-dasharray","4,3");svg.appendChild(ln);
  }
  data.forEach((v,i)=>{
    const x=pL+i*sw+(sw-bw)/2,bH=v>0?Math.max((v/max)*cH,3):0,y=pT+cH-bH;
    const r=document.createElementNS(ns,"rect");r.setAttribute("x",x);r.setAttribute("y",y);r.setAttribute("width",bw);r.setAttribute("height",bH);r.setAttribute("rx","3");r.setAttribute("fill",`url(#g${id})`);r.setAttribute("opacity",v>0?"1":"0.12");svg.appendChild(r);
    if(labels&&n<=14){const t=document.createElementNS(ns,"text");t.setAttribute("x",x+bw/2);t.setAttribute("y",H-pB+13);t.setAttribute("text-anchor","middle");t.setAttribute("font-size","7");t.setAttribute("fill","#6b86a8");t.textContent=labels[i];svg.appendChild(t);}
  });
}

// === SETTINGS LOAD ===
function loadSettingsUI(){
  const f=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  const fc=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=v;};
  f("s-name",S.name);f("s-weight",S.weight);f("s-wunit",S.weightUnit);
  f("s-activity",S.activity);f("s-goal",S.goal);f("s-units",S.units);
  f("s-remind-interval",S.reminderInterval||2);
  fc("s-dark",S.darkMode);fc("s-notifs",S.reminders||false);
  fc("loading-toggle",S.loadingPhase);
  const sn=document.getElementById("supp-notes");if(sn)sn.value=S.suppNotes||"";
  const wu=document.getElementById("weight-unit-select");if(wu)wu.value=S.weightUnit||"kg";
}

function smartGoal(){
  let kg=parseFloat(S.weight)||70;
  if(S.weightUnit==="lbs")kg/=2.205;
  const m={sedentary:.030,light:.033,moderate:.036,active:.040,athlete:.045}[S.activity]||.036;
  const wBonus=S.workoutDay?.5:0;
  return parseFloat((kg*m+wBonus).toFixed(1));
}

// === EXPORT ===
function exportData(){
  const blob=new Blob([JSON.stringify({state:S,exported:new Date().toISOString()},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="oasis-"+new Date().toISOString().slice(0,10)+".json";a.click();
}

// === EVENTS ===
function events(){
  // nav
  document.querySelectorAll(".nb").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));
  document.querySelectorAll("[data-nav]").forEach(e=>e.addEventListener("click",()=>go(e.dataset.nav)));
  // amount btns
  document.querySelectorAll(".amt-btn").forEach(b=>b.addEventListener("click",()=>{
    logWater(parseFloat(b.dataset.amount)*1000);b.classList.add("flash");setTimeout(()=>b.classList.remove("flash"),300);
  }));
  // quick btns
  document.querySelectorAll(".qbtn[data-amount]").forEach(b=>b.addEventListener("click",()=>{
    const ml=parseFloat(b.dataset.amount)*1000;
    S.waterLogs.push({ml,type:"water",coeff:1,time:Date.now()});
    save();updateWater();updateDash();checkBadges();
    toast(`+${ml}ml 💧 logged`,"info");
    b.classList.add("flash");setTimeout(()=>b.classList.remove("flash"),300);
  }));
  // drink types
  document.querySelectorAll(".dtype").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".dtype").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");drinkCoeff=parseFloat(b.dataset.coeff);drinkType=b.dataset.drink;
    updateDash();
  }));
  // custom ml
  const cb=document.getElementById("custom-btn"),ci=document.getElementById("custom-ml");
  if(cb)cb.addEventListener("click",()=>{const v=parseFloat(ci.value);if(v>0&&v<=5000){logWater(v);ci.value="";}else toast("Enter 1–5000 ml","error");});
  if(ci)ci.addEventListener("keydown",e=>{if(e.key==="Enter")cb&&cb.click();});
  // undo
  const ub=document.getElementById("undo-btn");
  if(ub)ub.addEventListener("click",()=>{if(!S.waterLogs.length)return;const r=S.waterLogs.pop();save();updateWater();updateDash();toast(`↩ Removed ${r.ml}ml`,"info");});
  // clear today
  const ct=document.getElementById("clear-today-btn");
  if(ct)ct.addEventListener("click",()=>{if(!confirm("Clear all of today's water logs?"))return;S.waterLogs=[];goalHit=false;save();updateWater();updateDash();toast("Today's log cleared","info");});
  // edit goal modal
  document.getElementById("edit-goal-btn")?.addEventListener("click",()=>{
    document.getElementById("modal-inp").value=S.goal;
    document.getElementById("modal").classList.remove("hidden");
  });
  document.getElementById("modal-cancel")?.addEventListener("click",()=>document.getElementById("modal").classList.add("hidden"));
  document.getElementById("modal-save")?.addEventListener("click",()=>{
    const v=parseFloat(document.getElementById("modal-inp").value);
    if(v>.4&&v<=10){S.goal=v;goalHit=false;save();updateWater();updateDash();document.getElementById("modal").classList.add("hidden");toast("Goal updated to "+fmtL(v),"success");}
    else toast("Enter 0.5–10 L","error");
  });
  document.getElementById("modal")?.addEventListener("click",e=>{if(e.target.id==="modal")document.getElementById("modal").classList.add("hidden");});
  // creatine
  document.getElementById("creatine-btn")?.addEventListener("click",logCreatine);
  document.getElementById("dash-creatine-btn")?.addEventListener("click",logCreatine);
  // loading phase
  document.getElementById("loading-toggle")?.addEventListener("change",e=>{S.loadingPhase=e.target.checked;save();updateCreatine();updateDash();checkBadges();toast(S.loadingPhase?"Loading phase ON (20g/day)":"Maintenance phase (5g/day)","info");});
  // workout toggle
  document.getElementById("workout-toggle")?.addEventListener("change",e=>{S.workoutDay=e.target.checked;save();updateDash();toast(S.workoutDay?"💪 Workout day — +0.5L goal boost":"Workout day off","info");});
  // weight log
  document.getElementById("log-weight-btn")?.addEventListener("click",()=>{
    const v=parseFloat(document.getElementById("weight-log-input")?.value);
    const u=document.getElementById("weight-unit-select")?.value||"kg";
    if(v>0)logWeight(v,u);else toast("Enter a valid weight","error");
  });
  // notes
  document.getElementById("save-notes-btn")?.addEventListener("click",()=>{
    S.suppNotes=document.getElementById("supp-notes")?.value||"";save();toast("Notes saved","success");
  });
  // theme
  document.getElementById("theme-btn")?.addEventListener("click",()=>{S.darkMode=!S.darkMode;save();applyTheme(S.darkMode);});
  document.getElementById("s-dark")?.addEventListener("change",e=>{S.darkMode=e.target.checked;save();applyTheme(S.darkMode);});
  // units
  document.getElementById("s-units")?.addEventListener("change",e=>{S.units=e.target.value;save();updateWater();updateDash();});
  // settings profile
  document.getElementById("save-profile-btn")?.addEventListener("click",()=>{
    S.name=document.getElementById("s-name")?.value.trim()||"";
    S.weight=parseFloat(document.getElementById("s-weight")?.value)||70;
    S.weightUnit=document.getElementById("s-wunit")?.value||"kg";
    S.activity=document.getElementById("s-activity")?.value||"moderate";
    save();updateDash();
    const sg=smartGoal();
    const box=document.getElementById("smart-goal-box");
    if(box){box.style.display="block";box.innerHTML=`💡 Recommended goal: <strong>${sg} L/day</strong> <button class="text-btn" id="apply-sg">Apply</button>`;}
    document.getElementById("apply-sg")?.addEventListener("click",()=>{S.goal=sg;goalHit=false;save();updateWater();updateDash();document.getElementById("s-goal").value=sg;toast("Smart goal applied: "+sg+"L","success");box.style.display="none";});
    toast("Profile saved!","success");
  });
  // save goal
  document.getElementById("save-goal-btn")?.addEventListener("click",()=>{
    const v=parseFloat(document.getElementById("s-goal")?.value);
    if(v>.4&&v<=10){S.goal=v;goalHit=false;save();updateWater();updateDash();toast("Goal updated to "+fmtL(v),"success");}
    else toast("Enter 0.5–10 L","error");
  });
  // notifications
  document.getElementById("s-notifs")?.addEventListener("change",e=>{
    if(e.target.checked&&"Notification" in window){
      Notification.requestPermission().then(p=>{
        S.reminders=p==="granted";e.target.checked=S.reminders;save();
        toast(S.reminders?"🔔 Reminders enabled":"Notifications blocked in browser","info");
        if(S.reminders)scheduleReminder();
      });
    } else {S.reminders=false;save();}
  });
  document.getElementById("s-remind-interval")?.addEventListener("change",e=>{S.reminderInterval=parseInt(e.target.value);save();if(S.reminders)scheduleReminder();});
  // export
  document.getElementById("export-btn")?.addEventListener("click",exportData);
  document.getElementById("export-data-btn")?.addEventListener("click",exportData);
  // clear all
  document.getElementById("clear-data-btn")?.addEventListener("click",()=>{
    if(!confirm("Delete ALL Oasis data? This cannot be undone."))return;
    localStorage.removeItem("oasis_v2");S={...DEF};goalHit=false;save();
    loadSettingsUI();updateWater();updateCreatine();updateDash();renderBadges();renderWeightHistory();
    toast("All data cleared","info");
  });
  // notif icon quick toggle
  document.getElementById("notif-btn")?.addEventListener("click",()=>{
    const goal=total(S),pct=Math.round(Math.min(goal/S.goal,1)*100);
    toast(`You're at ${pct}% of your water goal today`,"info");
  });
}

function scheduleReminder(){
  if(!S.reminders||!("Notification" in window))return;
  const ms=(S.reminderInterval||2)*3600000;
  setTimeout(()=>{
    if(S.reminders&&total(S)<S.goal)new Notification("💧 Oasis Reminder",{body:"Time to hydrate! You're at "+Math.round(total(S)/S.goal*100)+"% of your goal.",icon:"favicon.png"});
    scheduleReminder();
  },ms);
}

// === INIT ===
function init(){
  load();dayReset();applyTheme(S.darkMode);
  events();loadSettingsUI();
  updateWater();updateCreatine();updateDash();
  renderQuote();renderBadges();checkBadges();renderWeightHistory();
  if(S.reminders)scheduleReminder();
  go("page-home");
}
init();

// === PRO SYSTEM ===
const isPro = ()=>localStorage.getItem("oasis_pro")==="true";
function showUpgrade(){
  document.getElementById("upgrade-modal")?.classList.remove("hidden");
}
function activatePro(){
  localStorage.setItem("oasis_pro","true");
  document.getElementById("upgrade-modal")?.classList.add("hidden");
  document.querySelectorAll(".pro-lock-overlay").forEach(o=>o.style.display="none");
  toast("🎉 Welcome to Oasis Pro! All features unlocked.","success");
  confetti();
  updateCoachFab();
}
function updateCoachFab(){
  const fab=document.getElementById("coach-fab");
  if(fab&&isPro())fab.querySelector(".pro-badge-fab").textContent="✓";
}
function unlockProCards(){
  if(isPro())document.querySelectorAll(".pro-lock-overlay").forEach(o=>o.style.display="none");
}

// === WELLNESS SCORE ===
function calcWellness(){
  const t=total(S),pct=Math.min(t/S.goal,1);
  const str=streaks(S.history);

  const hydrPts=Math.round(pct*45);
  const crPts=S.creatineServings>0?20:0;
  const strPts=Math.min(str.w*2,15);
  const wrkPts=(S.workoutDay&&pct>.5)?10:0;
  let avgPts=0;
  if(S.history.length>0){
    const avg=S.history.slice(-7).reduce((s,d)=>s+d.w,0)/Math.min(S.history.length,7);
    if(avg>=S.goal) avgPts=10;
  }
  const score=Math.min(hydrPts+crPts+strPts+wrkPts+avgPts,100);

  const grades=[
    {min:90,g:"Elite 🏆",c:"#f59e0b"},
    {min:75,g:"Strong 💪",c:"#4ade80"},
    {min:55,g:"Good 👍",c:"#38bdf8"},
    {min:35,g:"Building 📈",c:"#94a3b8"},
    {min:0, g:"Starting 🌱",c:"#6b86a8"},
  ];
  const {g,c}=grades.find(x=>score>=x.min);
  const circ=175.93;
  setRing("ws-ring",score/100,circ);
  const ring=document.getElementById("ws-ring");if(ring)ring.style.stroke=c;
  const wsn=document.getElementById("ws-score");countUp(wsn,score);
  const wsg=document.getElementById("ws-grade");if(wsg){wsg.textContent=g;wsg.style.color=c;}

  // smart tip based on biggest missing points
  const wst=document.getElementById("ws-tip");
  if(wst){
    const missing=[
      {pts:45-hydrPts, msg:`💧 Drink ${fmtL(S.goal-t)} more to max hydration (+${45-hydrPts} pts)`},
      {pts:20-crPts,   msg:`💊 Log your creatine serving to gain +20 pts`},
      {pts:15-strPts,  msg:`🔥 Keep your streak going — hit goal today (+${15-strPts} pts)`},
      {pts:10-wrkPts,  msg:`💪 Mark today as a workout day after hitting 50% hydration (+10 pts)`},
      {pts:10-avgPts,  msg:`📈 Hit your goal 7 days in a row to unlock avg bonus (+10 pts)`},
    ].filter(x=>x.pts>0).sort((a,b)=>b.pts-a.pts);
    wst.textContent=missing.length?missing[0].msg:"🎯 Perfect wellness today — keep it up!";
  }

  // update breakdown bars
  const setBar=(id,pts,max)=>{
    const bar=document.getElementById(`wsbr-bar-${id}`);
    const lbl=document.getElementById(`wsbr-pts-${id}`);
    if(bar) bar.style.width=Math.round(pts/max*100)+"%";
    if(lbl) lbl.textContent=pts+"/"+max;
  };
  setBar("hydration",hydrPts,45);
  setBar("creatine",crPts,20);
  setBar("streak",strPts,15);
  setBar("workout",wrkPts,10);
  setBar("avg",avgPts,10);

  return score;
}

// === AI COACH ===
function coachMsg(text,type="bot",label=""){
  return`<div class="cp-msg ${type}">${label?`<div class="msg-label">${label}</div>`:""}${text}</div>`;
}

function getCoachInsights(topic){
  const t=total(S),pct=Math.round(t/S.goal*100),str=streaks(S.history);
  const ws=calcWellness();
  const kg=S.weightUnit==="lbs"?S.weight/2.205:S.weight;
  const protein=Math.round(kg*(S.activity==="athlete"?2.2:S.activity==="active"?2.0:1.6));
  const tdee=Math.round(kg*({sedentary:26,light:30,moderate:35,active:40,athlete:45}[S.activity]||35));

  const msgs={
    hydration:[
      `You're at <strong>${pct}%</strong> of your ${fmtL(S.goal)} goal today.`,
      pct>=100?"🌊 Goal crushed! You're fully hydrated — performance is optimized.":
      pct>=60?`Almost there! Drink <strong>${fmtL(S.goal-t)}</strong> more to hit your goal.`:
      `You need <strong>${fmtL(S.goal-t)}</strong> more today. Try logging a 500ml bottle right now.`,
      `Your ${str.w}-day hydration streak is ${str.w>=7?"🔥 incredible":"building nicely"}. Consistency is everything.`,
      `💡 Tip: Creatine requires extra hydration — drink an additional 0.5L on the days you supplement.`,
    ],
    creatine:[
      S.creatineServings>0?`✅ You've logged ${S.creatineServings} serving(s) today (${S.creatineServings*5}g total).`:`⚠️ You haven't logged creatine yet today.`,
      `Your creatine consistency is <strong>${S.history.length>0?Math.round(S.history.filter(d=>d.c>0).length/S.history.length*100):0}%</strong> over ${S.history.length} tracked days.`,
      S.loadingPhase?"Loading phase: Take 20g/day for 5–7 days, split into 4 servings.":"Maintenance phase: 3–5g/day is all you need to maintain saturation.",
      `💡 Best timing: Post-workout with a simple carb source (like fruit juice) improves uptake by ~60%.`,
      `After ${Math.min(S.history.filter(d=>d.c>0).length,28)} days of consistent use, your muscles are roughly <strong>${Math.min(Math.round(S.history.filter(d=>d.c>0).length/28*100),100)}%</strong> saturated.`,
    ],
    body:[
      `Based on your profile: <strong>${S.weight}${S.weightUnit}</strong>, activity: <strong>${S.activity}</strong>.`,
      `📊 Estimated TDEE: <strong>${tdee} kcal/day</strong>`,
      `🥩 Daily protein target: <strong>${protein}g</strong> (${Math.round(protein/kg*10)/10}g per kg)`,
      `💧 Optimal water intake: <strong>${(kg*0.035).toFixed(1)}L + ${S.workoutDay?"0.5L workout bonus":"0L"}</strong>`,
      `BMI: <strong>${(kg/((S.weightUnit==="lbs"?1.78:1.75)**2)).toFixed(1)}</strong> — For accurate body comp, track body weight daily.`,
    ],
    plan:[
      `<strong>Today's Oasis Plan</strong> — Wellness Score: ${ws}/100`,
      `☀️ Morning: Log 500ml water immediately after waking.`,
      `💊 ${S.creatineServings===0?"Take your creatine serving (5g) with breakfast.":"✅ Creatine done for today."}`,
      `🕐 Every 2 hrs: Drink 250–500ml water throughout the day.`,
      `🎯 Target: ${fmtL(S.goal)} total${S.workoutDay?" + 0.5L workout bonus":""}`,
      `🌙 Evening: If under goal, have a large glass before bed.`,
    ],
  };
  return msgs[topic]||msgs.hydration;
}

function openCoach(){
  const panel=document.getElementById("coach-panel");
  if(!panel)return;
  panel.classList.remove("hidden");
  const msgs=document.getElementById("coach-messages");
  if(msgs&&msgs.children.length===0){
    const ws=calcWellness();
    msgs.innerHTML=coachMsg(`Hey${S.name?" "+S.name:""}! 👋 I'm your Oasis AI Coach.<br><br>Your wellness score today is <strong>${ws}/100</strong>. ${ws>=75?"You're doing great!":ws>=50?"Good progress — let's push further.":"There's room to improve — I'm here to help!"}<br><br>What would you like to explore?`,"bot","AI Coach");
  }
}

function closeCoach(){
  document.getElementById("coach-panel")?.classList.add("hidden");
  document.body.style.overflow="";
}

// === PRO + COACH EVENTS ===
function proEvents(){
  // Pro lock overlays → show upgrade
  document.querySelectorAll(".pro-lock-overlay").forEach(o=>{
    o.addEventListener("click",()=>{
      if(!isPro())showUpgrade();
    });
  });
  // Upgrade modal
  document.getElementById("upgrade-cancel")?.addEventListener("click",()=>{
    document.getElementById("upgrade-modal")?.classList.add("hidden");
  });
  document.getElementById("upgrade-modal")?.addEventListener("click",e=>{
    if(e.target.id==="upgrade-modal")document.getElementById("upgrade-modal").classList.add("hidden");
  });
  document.getElementById("upgrade-btn")?.addEventListener("click",activatePro);
  // Plan selectors
  document.getElementById("plan-monthly")?.addEventListener("click",()=>{
    document.querySelectorAll(".plan-card").forEach(p=>p.classList.remove("active-plan"));
    document.getElementById("plan-monthly").classList.add("active-plan");
  });
  document.getElementById("plan-yearly")?.addEventListener("click",()=>{
    document.querySelectorAll(".plan-card").forEach(p=>p.classList.remove("active-plan"));
    document.getElementById("plan-yearly").classList.add("active-plan");
  });
  // Coach FAB
  document.getElementById("coach-fab")?.addEventListener("click",()=>{
    if(!isPro()){showUpgrade();return;}
    openCoach();
  });
  document.getElementById("coach-close")?.addEventListener("click",closeCoach);
  // Coach topic buttons
  document.querySelectorAll(".cp-action-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const topic=btn.dataset.topic;
      const msgs=document.getElementById("coach-messages");
      if(!msgs)return;
      const insights=getCoachInsights(topic);
      const labels={hydration:"💧 Hydration Analysis",creatine:"💊 Creatine Insights",body:"🧪 Body Composition",plan:"📋 Today's Plan"};
      msgs.innerHTML+=coachMsg(insights.join("<br><br>"),"insight",labels[topic]||"Insights");
      setTimeout(()=>msgs.scrollTo({top:msgs.scrollHeight,behavior:"smooth"}),100);
    });
  });
}

// Run pro additions after original init() already ran
proEvents();
unlockProCards();
updateCoachFab();
calcWellness();

// ── COACH CHAT ENGINE ─────────────────────────────────────────────────────
let chatHistory = [];
const getApiKey = () => localStorage.getItem("oasis_api_key") || "";

function buildSystemPrompt() {
  const t = total(S), pct = Math.round(t / S.goal * 100);
  const str = streaks(S.history);
  const kg = S.weightUnit === "lbs" ? S.weight / 2.205 : S.weight;
  const protein = Math.round(kg * ({sedentary:1.4,light:1.6,moderate:1.8,active:2.0,athlete:2.2}[S.activity]||1.8));
  const tdee = Math.round(kg * ({sedentary:26,light:30,moderate:35,active:40,athlete:45}[S.activity]||35));
  const avgWater = S.history.length > 0
    ? (S.history.slice(-7).reduce((s,d) => s+d.w, 0) / Math.min(S.history.length,7)).toFixed(1)
    : "N/A";
  const creatineDays = S.history.filter(d => d.c > 0).length;
  const saturation = Math.min(Math.round(creatineDays / 28 * 100), 100);
  const ws = (() => {
    let sc = Math.round(Math.min(t/S.goal,1)*45);
    if (S.creatineServings > 0) sc += 20;
    sc += Math.min(str.w * 2, 15);
    if (S.workoutDay) sc += 10;
    return Math.min(sc, 100);
  })();

  return `You are Dima (Daily Intelligence & Metrics Assistant) — the AI performance coach inside the Oasis health tracker app. You have real-time access to this user's exact health data. Give hyper-personalized, concise, science-backed coaching. You are NOT a general-purpose AI — stay focused on hydration, creatine, supplements, recovery, body performance, and Oasis app guidance. If asked off-topic questions, redirect warmly to their health data.

=== USER PROFILE ===
Name: ${S.name || "the user"}
Body weight: ${S.weight} ${S.weightUnit} (${kg.toFixed(1)} kg)
Activity level: ${S.activity}
Goal: ${S.goal}L water / day

=== TODAY'S DATA (${new Date().toDateString()}) ===
Water logged: ${t.toFixed(2)}L (${pct}% of goal, ${pct >= 100 ? "GOAL HIT ✅" : (S.goal - t).toFixed(2) + "L remaining"})
Creatine: ${S.creatineServings} serving(s) = ${S.creatineServings * 5}g ${S.creatineServings === 0 ? "(not yet logged)" : "✅"}
Phase: ${S.loadingPhase ? "Loading (20g/day target)" : "Maintenance (5g/day)"}
Workout day: ${S.workoutDay ? "Yes 💪" : "No"}
Wellness score: ${ws}/100

=== HISTORY ===
Days tracked: ${S.history.length}
Hydration streak: ${str.w} days
Creatine streak: ${str.c} days
Avg water (last 7 days): ${avgWater}L
Creatine consistency: ${S.history.length > 0 ? Math.round(creatineDays/S.history.length*100) : 0}% of tracked days
Estimated creatine muscle saturation: ~${saturation}%

=== CALCULATED TARGETS ===
TDEE estimate: ~${tdee} kcal/day
Daily protein target: ~${protein}g/day
Optimal water: ${(kg * 0.035).toFixed(1)}L base${S.workoutDay ? " + 0.5L workout = " + (kg * 0.035 + 0.5).toFixed(1) + "L" : ""}

=== COACHING STYLE ===
- Warm, direct, motivating — like a knowledgeable friend who is also their trainer
- Always reference their ACTUAL numbers, never generic advice
- Be concise (2-4 sentences) unless they ask for detail
- Use emojis naturally but sparingly
- Celebrate specific wins ("You've hit 85% today — almost there!")
- If they're behind, give ONE clear actionable next step
- Deep knowledge of creatine: timing, saturation, loading, water requirements, caffeine interactions
- Deep knowledge of hydration: electrolytes, performance impact, optimal timing
- Basic sports nutrition: protein synthesis, TDEE, macros, meal timing
- Give real answers to supplement/hydration questions
- If asked something off-topic: "I'm best at health coaching — want to talk about your ${t.toFixed(1)}L hydration today?"`;
}

async function callClaudeCoach(userMessage) {
  const key = getApiKey();
  if (!key) return null;
  chatHistory.push({ role: "user", content: userMessage });
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: buildSystemPrompt(),
      messages: chatHistory,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${resp.status}`);
  }
  const data = await resp.json();
  const reply = data.content[0].text;
  chatHistory.push({ role: "assistant", content: reply });
  return reply;
}

function addChatMsg(html, role = "bot") {
  const msgs = document.getElementById("coach-messages");
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = `cp-msg ${role}`;
  div.innerHTML = html;
  msgs.appendChild(div);
  msgs.scrollTo({ top: msgs.scrollHeight, behavior: "smooth" });
}

function showTyping() {
  const msgs = document.getElementById("coach-messages");
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = "typing-indicator";
  div.id = "typing-indicator";
  div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  msgs.appendChild(div);
  msgs.scrollTo({ top: msgs.scrollHeight, behavior: "smooth" });
}

function removeTyping() {
  document.getElementById("typing-indicator")?.remove();
}

// ── DIMA ENGINE (Daily Intelligence & Metrics Assistant) ──────────────────────

function dimaCtx() {
  const t = total(S), pct = Math.round(t / S.goal * 100);
  const str = streaks(S.history);
  const kg = S.weightUnit === "lbs" ? S.weight / 2.205 : S.weight;
  const remaining = Math.max(0, S.goal - t);
  const maxServ = S.loadingPhase ? 4 : 1;
  const crDone = S.creatineServings >= maxServ;
  const crg = S.creatineServings * 5;
  const avgWater = S.history.length >= 2
    ? (S.history.slice(-7).reduce((s, d) => s + (d.w || 0), 0) / Math.min(S.history.length, 7)).toFixed(1)
    : null;
  const crDays = S.history.filter(d => d.c > 0).length;
  const sat = Math.min(Math.round(crDays / 28 * 100), 100);
  const actMap = {sedentary:1.4,light:1.6,moderate:1.8,active:2.0,athlete:2.2};
  const protein = Math.round(kg * (actMap[S.activity] || 1.8));
  const tdee = Math.round(kg * ({sedentary:26,light:30,moderate:35,active:40,athlete:45}[S.activity]||35));
  const ws = Math.min(Math.round(Math.min(t/S.goal,1)*45) + (S.creatineServings>0?20:0) + Math.min(str.w*2,15) + (S.workoutDay?10:0), 100);
  const hour = new Date().getHours();
  const hoursLeft = Math.max(0, 22 - hour);
  const rateNeeded = hoursLeft > 0 ? remaining / hoursLeft : remaining;
  const newUser = S.history.length === 0 && t === 0;
  return { t, pct, str, kg, remaining, maxServ, crDone, crg, avgWater, crDays, sat, protein, tdee, ws, hour, hoursLeft, rateNeeded, newUser };
}

function kwScore(m, words) {
  let s = 0;
  for (const w of words) if (m.includes(w)) s += w.includes(" ") ? 4 : w.length > 6 ? 3 : 2;
  return s;
}

function dimaIntent(msg) {
  const m = msg.toLowerCase();
  const sc = {
    greet:      kwScore(m, ["hello","hi ","hey ","hey!","good morning","good evening","what's up","sup "]),
    status:     kwScore(m, ["status","how am i","am i behind","check in","check-in","progress","where am i","overview","update me","how's my"]),
    hydration:  kwScore(m, ["water","hydrat","drink","fluid","h2o","thirst","how much water","catch up","behind on water","how many liters","how many oz"]),
    hplan:      kwScore(m, ["plan","schedule","break it down","hit my goal","reach my goal","timing","when should i drink","how do i hit","catch me up on water","hydration plan"]),
    creatine:   kwScore(m, ["creatine","did i take","creatine today","my creatine","supplement","supp "]),
    saturation: kwScore(m, ["saturation","saturate","loading phase","loading","how long does creatine","when will i","fully saturated"]),
    score:      kwScore(m, ["score","wellness score","why is my score","explain my score","what's my score","improve my score","wellness points","why low","why is it low"]),
    improve:    kwScore(m, ["improve","what should i focus","how to boost","optimize","what's holding","what can i do better","how do i get better","get better","raise my"]),
    next:       kwScore(m, ["what next","what should i","next step","should i log","do next","right now","what do i do","log next","what can i do now"]),
    plan:       kwScore(m, ["today's plan","plan for today","full plan","action plan","rest of today","plan my day","what should i do today","daily plan"]),
    streak:     kwScore(m, ["streak","days in a row","consecutive","broken","start my streak","my streak","keep my streak"]),
    body:       kwScore(m, ["weight","body comp","bmi","muscle","protein","macro","bulk","cut","lean body","composition","nutrition","diet","fat","calorie","tdee"]),
    caffeine:   kwScore(m, ["caffeine","coffee","tea ","energy drink","pre-workout","pre workout","espresso"]),
    sleep:      kwScore(m, ["sleep","rest","recovery","tired","fatigue","recover","bed time","nap","insomnia"]),
    motivation: kwScore(m, ["motivat","inspir","encourage","hype me","pump me","proud","keep going","push me","cheer"]),
    history:    kwScore(m, ["last week","last 7","trend","history","average","review my week","how have i been","over time","past days","my progress"]),
    apphelp:    kwScore(m, ["how do i use","how does","navigate","oasis app","what is the","which tab","which page","how to log","how do i log","help me use"]),
    pro:        kwScore(m, ["pro ","pro?","premium","upgrade","unlock","subscription","worth it","pro features","what's pro","what is pro"]),
    who:        kwScore(m, ["who are you","what are you","your name","are you ai","are you real","are you human","dima","what is dima"]),
  };
  const best = Object.entries(sc).sort((a,b) => b[1]-a[1])[0];
  if (best[1] === 0) {
    const offWords = ["weather","news","president","capital city","write my essay","recipe","movie","politics","stock market","crypto","bitcoin","who won","celebrity","sports score","trivia","age of","year was","what year"];
    if (kwScore(m, offWords) > 0) return "offtopic";
    return "unclear";
  }
  return best[0];
}

function dimaReply(intent, ctx) {
  const { t, pct, str, kg, remaining, maxServ, crDone, crg, avgWater, crDays, sat, protein, tdee, ws, hour, hoursLeft, rateNeeded, newUser } = ctx;
  const n = S.name ? ` <strong>${S.name}</strong>` : "";

  switch (intent) {

    case "greet": {
      if (newUser) return `Hey${n}! I'm <strong>Dima</strong>, your Oasis performance coach. 👋<br><br>I'll track your hydration, creatine, and wellness and give you personalized coaching. Try: <em>"What should I do today?"</em> or <em>"Build my hydration plan."</em>`;
      return `Hey${n}! 👋<br><br>` +
        `💧 <strong>${pct}%</strong> hydrated (${t.toFixed(2)}/${S.goal}L)${pct < 100 ? ` — ${remaining.toFixed(2)}L left` : " 🎯"}<br>` +
        `💊 Creatine: ${crDone ? "✅ Done" : "❌ Not logged yet"}<br>` +
        `🔥 Streak: ${str.w}d water · ${str.c}d creatine<br><br>` +
        (pct < 50 ? `You're behind on water — want me to build a catch-up plan?` :
          !crDone ? `Don't forget creatine today — it's 20pts on your wellness score.` :
          `Looking solid. What do you need?`);
    }

    case "status": {
      const rStr = hoursLeft > 1 ? `~${rateNeeded.toFixed(2)}L/hr for the next ${hoursLeft}h` : `finish it before bed`;
      return `<strong>Status check:</strong><br><br>` +
        `💧 Water: ${t.toFixed(2)}L / ${S.goal}L — <strong>${pct}%</strong>${pct >= 100 ? " ✅" : `, ${remaining.toFixed(2)}L left`}<br>` +
        `💊 Creatine: ${S.creatineServings}/${maxServ} serving${maxServ>1?"s":""}${crDone ? " ✅" : " ❌"}<br>` +
        `🔥 Streaks: ${str.w}d hydration · ${str.c}d creatine<br>` +
        `⭐ Wellness: <strong>${ws}/100</strong><br><br>` +
        (pct < 100 ? `To hit goal: drink ${rStr}.` : `Goal complete. Stay consistent tomorrow.`);
    }

    case "hydration": {
      if (pct >= 100) return `You've already hit your ${S.goal}L goal today 🎯 ${str.w > 0 ? `That's ${str.w} days in a row — keep going.` : "Nice work!"}`;
      const steps = [];
      let left = remaining;
      if (left >= 0.5) { steps.push(`500ml right now`); left -= 0.5; }
      if (left >= 0.5) { steps.push(`500ml with your next meal`); left -= 0.5; }
      if (left >= 0.25) { steps.push(`${Math.round(left * 1000)}ml before 9pm`); left = 0; }
      if (left > 0) steps.push(`${Math.round(left * 1000)}ml to finish`);
      return `You're at <strong>${t.toFixed(2)}L</strong> — <strong>${remaining.toFixed(2)}L</strong> from your ${S.goal}L goal.<br><br>` +
        steps.map(s => `• ${s}`).join("<br>") +
        (S.workoutDay ? `<br>• +500ml extra for your workout today` : ``) +
        `<br><br>Sip steadily — don't chug it all at once.`;
    }

    case "hplan": {
      if (pct >= 100) return `You've already hit your ${S.goal}L goal — no plan needed today. Just sip normally and repeat tomorrow.`;
      const slots = [];
      if (hour < 9)  slots.push({label:"Right now (morning)", ml: Math.round(remaining * 0.3 * 1000)});
      else if (hour < 12) slots.push({label:"Right now", ml: Math.round(remaining * 0.35 * 1000)});
      else slots.push({label:"Right now", ml: Math.round(remaining * 0.4 * 1000)});
      if (hour < 14) slots.push({label:"Lunch", ml: Math.round(remaining * 0.25 * 1000)});
      if (hour < 18) slots.push({label:"Afternoon", ml: Math.round(remaining * 0.2 * 1000)});
      slots.push({label:"Evening (before 9pm)", ml: Math.round(remaining * 0.15 * 1000)});
      const total_planned = slots.reduce((s,sl)=>s+sl.ml,0);
      const scale = (remaining * 1000) / total_planned;
      return `<strong>Your hydration plan for today:</strong><br><br>` +
        slots.map(sl => `• <strong>${sl.label}:</strong> ${Math.round(sl.ml * scale)}ml`).join("<br>") +
        (S.workoutDay ? `<br>• <strong>Around workout:</strong> +500ml` : ``) +
        `<br><br>Total left: <strong>${remaining.toFixed(2)}L</strong>. Small consistent sips beat gulping.`;
    }

    case "creatine": {
      if (crDone) return `You've taken <strong>${crg}g</strong> creatine today ✅ — ${S.loadingPhase ? "loading phase" : "maintenance"} dose done. Take it with a carb-rich meal for best absorption. ${str.c > 0 ? `${str.c}-day streak 💪` : ""}`;
      const need = (maxServ - S.creatineServings) * 5;
      return `You haven't logged creatine yet today — <strong>${need}g</strong> needed${S.loadingPhase ? ` (loading: ${maxServ} servings of 5g spread through the day)` : ""}.<br><br>` +
        `<strong>Best timing:</strong> post-workout with food. The insulin spike from carbs drives creatine into muscle cells faster.<br><br>` +
        `Your consistency so far: ${crDays > 0 ? `${crDays}/${S.history.length} tracked days — estimated muscle saturation <strong>~${sat}%</strong>` : "no days logged yet — start today"}.`;
    }

    case "saturation": {
      return `Creatine takes ~<strong>28 days</strong> of consistent daily dosing to fully saturate muscles.<br><br>` +
        `Your history: <strong>${crDays} days</strong> logged → estimated saturation <strong>~${sat}%</strong>.<br><br>` +
        (S.loadingPhase
          ? `You're in <strong>loading phase</strong> (20g/day) — this saturates ~30% faster, reaching full saturation in 5–7 days.`
          : `At 5g/day (maintenance), full saturation takes ~28 days. <strong>Loading phase</strong> (20g/day for 5–7 days) gets there faster — toggle it in the Supps page.`);
    }

    case "score": {
      const hyPts = Math.round(Math.min(t/S.goal,1)*45);
      const crPts = S.creatineServings > 0 ? 20 : 0;
      const stPts = Math.min(str.w*2, 15);
      const wkPts = S.workoutDay ? 10 : 0;
      return `Your wellness score is <strong>${ws}/100</strong>. Here's the breakdown:<br><br>` +
        `• 💧 Hydration: <strong>${hyPts}/45</strong> pts (${pct}% of goal)<br>` +
        `• 💊 Creatine: <strong>${crPts}/20</strong> pts${crPts===0?" — log today to earn these":""}<br>` +
        `• 🔥 Streak: <strong>${stPts}/15</strong> pts (${str.w} days)<br>` +
        `• 🏋️ Workout: <strong>${wkPts}/10</strong> pts<br><br>` +
        (100-ws > 0 ? `Biggest quick win: ${crPts===0?"log creatine (+20pts)":pct<100?`drink ${remaining.toFixed(2)}L more (+${45-hyPts}pts)`:str.w<7?"maintain your streak daily":wkPts===0?"mark a workout day (+10pts)":"keep it up"}.` : `Perfect score today 🎯`);
    }

    case "improve": {
      const hyPts = Math.round(Math.min(t/S.goal,1)*45);
      const crPts = S.creatineServings > 0 ? 20 : 0;
      const stPts = Math.min(str.w*2,15);
      const wkPts = S.workoutDay ? 10 : 0;
      const gaps = [
        {label:"Drink more water", gain:45-hyPts, action:`${remaining.toFixed(2)}L left — drink 500ml right now`},
        {label:"Log creatine", gain:20-crPts, action:"Open Supps tab, takes 10 seconds"},
        {label:"Build your streak", gain:15-stPts, action:`Hit goal every day — you're at ${str.w} days`},
        {label:"Log a workout day", gain:10-wkPts, action:"Toggle it in Dashboard if you trained today"},
      ].filter(g=>g.gain>0).sort((a,b)=>b.gain-a.gain);
      if (!gaps.length) return `You're at <strong>${ws}/100</strong> — that's a perfect day. Just do the same thing tomorrow.`;
      const top = gaps[0];
      return `Biggest gain right now: <strong>${top.label}</strong> (+${top.gain} pts).<br><br>${top.action}.<br><br>` +
        (gaps.length > 1 ? `After that: ${gaps.slice(1).map(g=>`${g.label} (+${g.gain}pts)`).join(" → ")}.` : "");
    }

    case "next": {
      if (!crDone) return `Log your creatine first — you need ${(maxServ-S.creatineServings)*5}g. Open the <strong>Supps tab</strong> and tap the button. That's +20 wellness points.`;
      if (pct < 100) return `Drink <strong>${remaining > 0.5 ? "500ml" : Math.round(remaining*1000)+"ml"}</strong> right now. You're at ${pct}% — ${remaining.toFixed(2)}L short of goal.`;
      if (!S.workoutDay) return `If you trained today, toggle <strong>"Workout day"</strong> in the Dashboard — that's +10 wellness points.`;
      return `You've logged everything today 🎉 Wellness at ${ws}/100. Come back tomorrow and keep the streak alive.`;
    }

    case "plan": {
      const tasks = [];
      if (!crDone) tasks.push(`💊 Take ${(maxServ-S.creatineServings)*5}g creatine → Supps tab → +20pts`);
      if (pct < 100) tasks.push(`💧 Drink ${remaining.toFixed(2)}L water${hoursLeft > 1 ? ` (~${rateNeeded.toFixed(2)}L/hr)` : " before bed"}`);
      if (!S.workoutDay) tasks.push(`🏋️ Toggle workout day in Dashboard if you trained → +10pts`);
      tasks.push(`🔥 ${pct>=100&&crDone?"Maintain tomorrow's streak":"Hit today's goal to"} keep your ${str.w}d streak alive`);
      return `<strong>Your plan right now:</strong><br><br>` +
        tasks.map((t,i) => `${i+1}. ${t}`).join("<br>") +
        `<br><br>Score now: <strong>${ws}/100</strong>. ${tasks.length > 2 ? "Start with the top 2." : "Almost done."}`;
    }

    case "streak": {
      if (str.w === 0 && str.c === 0) return `No active streaks yet — start today. Hit your water goal and log creatine. Tomorrow you'll be at day 1. Consistency over 7 days is where it becomes automatic.`;
      return `<strong>Streak check:</strong><br>` +
        `🔥 Water: <strong>${str.w} days</strong>${str.w>=7?" — elite":str.w>=3?" — momentum building":""}<br>` +
        `💊 Creatine: <strong>${str.c} days</strong>${str.c>=7?" — muscles saturating nicely":""}<br><br>` +
        (pct < 100 ? `⚠️ Drink ${remaining.toFixed(2)}L more today to protect your water streak.` : `✅ Streak is safe for today. See you tomorrow.`);
    }

    case "body": {
      if (!S.weight) return `I don't have your weight yet. Add it in <strong>Settings</strong> and I'll calculate your exact protein target, water needs, and TDEE.`;
      return `Based on <strong>${S.weight}${S.weightUnit}</strong> at <strong>${S.activity}</strong> activity:<br><br>` +
        `• 💪 Protein: ~<strong>${protein}g/day</strong><br>` +
        `• 💧 Water minimum: <strong>${(kg*0.035).toFixed(1)}L/day</strong>${S.workoutDay ? ` +0.5L workout = ${(kg*0.035+0.5).toFixed(1)}L today` : ""}<br>` +
        `• 🔥 TDEE estimate: ~<strong>${tdee} kcal/day</strong><br>` +
        `• ⚡ Creatine saturation: ~<strong>${sat}%</strong><br><br>` +
        `Creatine + consistent protein + hydration = better muscle retention and performance. Log weight daily in the Supps tab to track body comp trends.`;
    }

    case "caffeine":
      return `Caffeine + creatine interaction to know:<br><br>` +
        `• High caffeine can partially reduce creatine uptake — space them <strong>1+ hour apart</strong><br>` +
        `• Coffee/tea counts ~80% toward hydration — still log extra water<br>` +
        `• Best pre-workout timing: 30–45 min before training<br>` +
        `• Cut off caffeine by 2–3pm for better sleep quality<br><br>` +
        `You're at ${pct}% hydration — account for caffeine's mild diuretic effect with an extra 250ml.`;

    case "sleep":
      return `Sleep is where most gains happen:<br><br>` +
        `• Aim for <strong>7–9 hours</strong> — below 6hrs reduces protein synthesis ~20%<br>` +
        `• Finish your water goal before bed, but stop 30–60 min before sleeping<br>` +
        `• Creatine timing doesn't affect sleep — just stay consistent daily<br>` +
        `• Poor sleep raises cortisol, making hydration goals harder to hit naturally<br><br>` +
        `You're at ${pct}% hydration today. Properly hydrated = noticeably better sleep.`;

    case "motivation": {
      if (newUser) return `Every habit starts at zero. The fact you're using Oasis means you're serious. Log water, log creatine, repeat. That's the whole system.`;
      if (ws >= 80) return `<strong>${ws}/100</strong> wellness, ${str.w}-day streak. That's not luck — that's a system working. Keep showing up.`;
      const wins = [];
      if (str.w >= 3) wins.push(`${str.w}-day hydration streak`);
      if (str.c >= 1) wins.push(`creatine logged ${str.c} day${str.c>1?"s":""} running`);
      if (pct >= 75) wins.push(`${pct}% of water goal already done`);
      return wins.length
        ? `Real wins today: ${wins.join(", ")}. ${remaining > 0 ? `Finish strong — ${remaining.toFixed(2)}L of water left.` : "Goal hit."} 💪`
        : `Start simple: drink 500ml right now and log it. One action, real momentum.`;
    }

    case "history": {
      if (!avgWater) return `You need at least 2 logged days to show trends. Start logging now — in 3 days you'll see your average, consistency, and patterns.`;
      const hitDays = S.history.slice(-7).filter(d => d.goalMet).length;
      const crPct = S.history.length > 0 ? Math.round(crDays/S.history.length*100) : 0;
      return `<strong>Your last 7 days:</strong><br><br>` +
        `💧 Avg water: <strong>${avgWater}L</strong>/day (goal: ${S.goal}L)<br>` +
        `🎯 Goal hit: <strong>${hitDays}/7 days</strong><br>` +
        `💊 Creatine consistency: <strong>${crPct}%</strong> of tracked days<br>` +
        `🔥 Current streak: ${str.w} days<br><br>` +
        (parseFloat(avgWater) < S.goal * 0.8 ? `Your average is below goal — try front-loading 500ml first thing every morning.` : `Consistency is solid. Keep the streak going.`);
    }

    case "apphelp":
      return `Quick Oasis guide:<br><br>` +
        `🏠 <strong>Dashboard</strong> — daily water + creatine log, streak, wellness score<br>` +
        `💧 <strong>Hydration</strong> — detailed drink log with types and amounts<br>` +
        `💊 <strong>Supps</strong> — creatine, loading phase toggle, weight tracking<br>` +
        `📊 <strong>Stats</strong> — trends, history, 30-day charts (Pro)<br>` +
        `⚙️ <strong>Settings</strong> — profile, goal, units, theme, AI Coach API key<br><br>` +
        `What specifically do you need help with?`;

    case "pro": {
      const proActive = typeof isPro === "function" && isPro();
      if (proActive) return `You're on Pro ✅ You have full access to: creatine saturation gauge, body composition, caffeine tracker, sleep tracker, 30-day analytics, and CSV export.`;
      return `<strong>Oasis Pro unlocks:</strong><br><br>` +
        `• ⚡ Creatine saturation gauge<br>` +
        `• 🧪 Body composition calculator<br>` +
        `• ☕ Caffeine & energy tracker<br>` +
        `• 😴 Sleep quality tracker<br>` +
        `• 📊 30-day advanced analytics<br>` +
        `• 📤 CSV/PDF export<br><br>` +
        `Tap any locked card to upgrade. $4.99/mo or $39.99/yr (saves 33%).`;
    }

    case "who":
      return `I'm <strong>Dima</strong> — your Oasis AI coach. DIMA stands for Daily Intelligence & Metrics Assistant 🤖<br><br>` +
        `I'm not a doctor or real human. I'm built to help you with hydration, creatine, supplements, body performance, and Oasis itself.<br><br>` +
        `For medical concerns, always see a healthcare professional. For everything performance-related — ask away.`;

    case "offtopic":
      return `I'm Dima, your Oasis performance coach — I stick to hydration, creatine, supplements, recovery, and body performance.<br><br>` +
        `You're at <strong>${pct}%</strong> on water today. Want me to help catch you up, or something else in Oasis?`;

    default:
      return `Not sure what you mean — I can help with:<br>` +
        `• Your hydration status and plan<br>` +
        `• Creatine timing and consistency<br>` +
        `• Understanding your wellness score<br>` +
        `• Today's action plan<br>` +
        `• Supplement advice<br><br>` +
        `Try: <em>"What should I do right now?"</em>`;
  }
}

function dimaEngine(msg) {
  const ctx = dimaCtx();
  const intent = dimaIntent(msg);
  return dimaReply(intent, ctx);
}

async function sendCoachMessage(text) {
  if (!text.trim()) return;
  const input = document.getElementById("coach-input");
  const sendBtn = document.getElementById("coach-send");
  if (input) input.value = "";
  if (sendBtn) sendBtn.disabled = true;

  addChatMsg(text.replace(/</g, "&lt;"), "user");
  showTyping();

  try {
    let reply;
    if (getApiKey()) {
      reply = await callClaudeCoach(text);
    } else {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      reply = dimaEngine(text);
    }
    removeTyping();
    addChatMsg(reply.replace(/\n/g, "<br>"), "bot");
  } catch (err) {
    removeTyping();
    const isAuthErr = err.message?.includes("401") || err.message?.toLowerCase().includes("auth");
    addChatMsg(isAuthErr
      ? "⚠️ API key error — check your key in Settings → AI Coach."
      : `⚠️ ${err.message || "Couldn't reach AI — check your connection."}`,
      "bot"
    );
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }
}

// Override openCoach with Dima welcome
function openCoach() {
  const panel = document.getElementById("coach-panel");
  if (!panel) return;
  panel.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const msgs = document.getElementById("coach-messages");
  if (msgs && msgs.children.length === 0) {
    chatHistory = [];
    const ctx = dimaCtx();
    const { pct, str, ws, crDone, remaining, newUser } = ctx;
    const n = S.name ? ` <strong>${S.name}</strong>` : "";
    let intro;
    if (newUser) {
      intro = `Hey${n}! I'm <strong>Dima</strong>, your Oasis performance coach. 👋<br><br>I analyze your hydration, creatine, and wellness data in real-time to give you personalized coaching.<br><br>Try asking: <em>"What should I do today?"</em>`;
    } else {
      intro = `Hey${n}! I'm <strong>Dima</strong> 👋<br><br>` +
        `💧 <strong>${pct}%</strong> hydrated today (${remaining > 0 ? remaining.toFixed(2)+"L left" : "goal hit ✅"})<br>` +
        `💊 Creatine: ${crDone ? "✅ Done" : "❌ Not logged yet"}<br>` +
        `🔥 Streak: ${str.w}d water · ${str.c}d creatine · Score: ${ws}/100<br><br>` +
        (pct < 50 ? `You're behind on water — ask me to <em>"build my hydration plan."</em>` :
         !crDone ? `Log creatine when you get a chance — that's 20 pts on your score.` :
         `Everything's on track. Ask me anything.`);
    }
    addChatMsg(intro, "bot");
  }
}

function setupApiKeyEvents() {
  const btn = document.getElementById("save-api-key-btn");
  const inp = document.getElementById("s-api-key");
  const status = document.getElementById("api-key-status");

  btn?.addEventListener("click", async () => {
    const key = inp?.value.trim();
    if (!key) { if (status) { status.textContent = "Enter a key first."; status.className = "api-status api-err"; } return; }
    if (status) { status.textContent = "Verifying..."; status.className = "api-status"; }
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
        body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:10, messages:[{role:"user",content:"hi"}] })
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok || d.error?.type !== "authentication_error") {
        localStorage.setItem("oasis_api_key", key);
        if (status) { status.textContent = "✅ API key saved — AI Coach enabled!"; status.className = "api-status api-ok"; }
        toast("🤖 AI Coach powered by Claude!", "success");
      } else { throw new Error("Invalid key"); }
    } catch {
      localStorage.setItem("oasis_api_key", key);
      if (status) { status.textContent = "Key saved (verify on first chat)"; status.className = "api-status"; }
    }
  });

  if (inp) { const k = getApiKey(); if (k) inp.value = k.slice(0,12) + "••••••••"; }
  if (status && getApiKey()) { status.textContent = "✅ API key active"; status.className = "api-status api-ok"; }
}

function setupChatEvents() {
  const inp = document.getElementById("coach-input");
  const btn = document.getElementById("coach-send");
  const send = () => sendCoachMessage(inp?.value || "");
  btn?.addEventListener("click", send);
  inp?.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });

  const topicMap = {
    hydration:  "How am I doing on hydration today and what should I do next?",
    creatine:   "Give me personalized creatine advice based on my current data.",
    body:       "What are my body composition targets based on my profile?",
    plan:       "Give me a complete action plan for the rest of today.",
    motivation: "I need motivation based on my actual progress.",
  };
  // Replace old static topic listeners with chat-sending ones
  document.querySelectorAll(".cp-action-btn").forEach(btn => {
    const nb = btn.cloneNode(true);
    btn.parentNode.replaceChild(nb, btn);
    nb.addEventListener("click", () => {
      const msg = topicMap[nb.dataset.topic];
      if (msg) sendCoachMessage(msg);
    });
  });
}

setupApiKeyEvents();
setupChatEvents();
