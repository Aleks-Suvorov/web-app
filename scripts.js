// === OASIS v2 ===

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
  const sw=document.getElementById("sb-water");if(sw)sw.textContent=str.w;
  const sc=document.getElementById("sb-creatine");if(sc)sc.textContent=str.c;
  const sd=document.getElementById("sb-days");if(sd)sd.textContent=S.history.length;
  const hs=document.getElementById("hdr-streak-num");if(hs)hs.textContent=Math.max(str.w,str.c);
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
}

function renderTimeline(){
  const el=document.getElementById("timeline");if(!el)return;
  if(S.waterLogs.length===0){el.innerHTML='<div class="empty-msg">No drinks logged yet today.</div>';return;}
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
  if(!S.weightLog||S.weightLog.length===0){el.innerHTML='<p class="empty-msg">No weight logged yet.</p>';return;}
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
    if(h.length===0){hl.innerHTML='<p class="empty-msg">No history yet.</p>';}
    else{hl.innerHTML=[...h].reverse().slice(0,30).map(d=>{
      return`<div class="hist-item"><div class="hist-date">${d.date}</div><div class="hist-row"><span class="${d.goalMet?"hist-met":"hist-miss"}">${d.goalMet?"✅":"⚠️"} ${d.w.toFixed(1)}L</span><span class="hist-c">${d.c>0?`💊 ${d.c} serving(s)`:"No creatine"}</span></div></div>`;
    }).join("");}
  }
}

function drawBars(id,data,labels,goal,H,c1,c2){
  const svg=document.getElementById(id);if(!svg)return;
  const ns="http://www.w3.org/2000/svg";
  svg.innerHTML=`<defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}" stop-opacity=".7"/></linearGradient></defs>`;
  if(data.length===0){const t=document.createElementNS(ns,"text");t.setAttribute("x","160");t.setAttribute("y",H/2);t.setAttribute("text-anchor","middle");t.setAttribute("fill","#6b86a8");t.setAttribute("font-size","12");t.textContent="No data yet";svg.appendChild(t);return;}
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
