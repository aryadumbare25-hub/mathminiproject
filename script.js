const sectionOrder = ["home","aim","theory","pretest","simulation","posttest","contributors","faculty","feedback","thankyou"];
const quizData = {
  pretest: [
    {q:"What does Fourier’s Law describe?",opts:["Radiation from a hot body","Heat transfer due to temperature gradient","Convection coefficient","Specific heat"],ans:1,exp:"Fourier’s Law relates heat flux to temperature gradient."},
    {q:"In Q = -kA(dT/dx), k is:",opts:["Thermal diffusivity","Thermal conductivity","Density","Latent heat"],ans:1,exp:"k is thermal conductivity."},
    {q:"The negative sign means heat flows:",opts:["Cold to hot","Hot to cold","Only upward","Randomly"],ans:1,exp:"Heat naturally flows from high to low temperature."},
    {q:"Which has the highest thermal conductivity?",opts:["Steel","Aluminium","Copper","Silver"],ans:3,exp:"Silver is the best conductor among common metals."},
    {q:"At steady state, temperature profile is:",opts:["Linear","Sinusoidal","Exponential","Constant everywhere"],ans:0,exp:"Steady-state 1D conduction gives a linear profile."}
  ],
  posttest: [
    {q:"Increasing conductivity k makes heat spread:",opts:["Slower","Faster","Unchanged","Backward"],ans:1,exp:"Higher conductivity increases diffusion speed."},
    {q:"Thermal diffusivity tells us:",opts:["How fast temperature changes propagate","How much heat is stored","How heavy the rod is","The boiling point"],ans:0,exp:"It measures how quickly a material responds to thermal change."},
    {q:"The explicit finite difference method is stable when r = αΔt/Δx²:",opts:["r > 1","r ≤ 0.5","r = 2","r = 0"],ans:1,exp:"For stability, r must be 0.5 or less."},
    {q:"If hot end is 300°C and cold end is 20°C, midpoint steady temp is:",opts:["300°C","20°C","160°C","100°C"],ans:2,exp:"A linear profile gives midpoint 160°C."},
    {q:"At steady state, ∂T/∂t equals:",opts:["1","0","∞","k"],ans:1,exp:"Temperature no longer changes with time."}
  ]
};
const userAnswers = { pretest: [], posttest: [] };
let currentMaterial = "Copper";
let running = false;
let simFrame = null;
let simTime = 0;
let steadyReached = false;
const N = 100;
let T = new Float64Array(N);
let Tprev = new Float64Array(N);
let rodCanvas, rodCtx, graphCanvas, graphCtx, canvasInited = false, hoverX = -1;

function showSection(id){
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  const idx = sectionOrder.indexOf(id);
  document.querySelectorAll(".tab")[idx]?.classList.add("active");
  document.getElementById("nav-" + id)?.classList.add("active");
  if(id === "simulation") initCanvas();
  if(id === "pretest") buildQuiz("pretest");
  if(id === "posttest") buildQuiz("posttest");
  window.scrollTo({top:0, behavior:"smooth"});
}

function buildQuiz(type){
  const container = document.getElementById(type + "-questions");
  if(!container || container.innerHTML.trim() !== "") return;
  const letters = ["A","B","C","D"];
  let html = "";
  quizData[type].forEach((item, i) => {
    html += `<div class="quiz-question" id="${type}-q${i}">
      <div class="q-num">QUESTION ${String(i+1).padStart(2,"0")}</div>
      <div class="q-text">${item.q}</div>
      <div class="options">`;
    item.opts.forEach((opt, j) => {
      html += `<div class="opt" id="${type}-q${i}-o${j}" onclick="selectOpt('${type}',${i},${j})"><span class="opt-letter">${letters[j]}</span>${opt}</div>`;
    });
    html += `</div><div class="explanation" id="${type}-exp${i}">${item.exp}</div></div>`;
  });
  container.innerHTML = html;
}

function selectOpt(type, qIdx, oIdx){
  quizData[type][qIdx].opts.forEach((_, j) => document.getElementById(`${type}-q${qIdx}-o${j}`)?.classList.remove("selected"));
  document.getElementById(`${type}-q${qIdx}-o${oIdx}`)?.classList.add("selected");
  userAnswers[type][qIdx] = oIdx;
}

function submitQuiz(type){
  const data = quizData[type];
  let score = 0;
  data.forEach((item, i) => {
    const selected = userAnswers[type][i];
    const qEl = document.getElementById(`${type}-q${i}`);
    const expEl = document.getElementById(`${type}-exp${i}`);
    if(!qEl || !expEl) return;
    qEl.classList.remove("correct","wrong");
    item.opts.forEach((_,j) => document.getElementById(`${type}-q${i}-o${j}`)?.classList.remove("correct-opt","wrong-opt","selected"));
    if(selected === undefined) return;
    if(selected === item.ans){
      score++;
      qEl.classList.add("correct");
      document.getElementById(`${type}-q${i}-o${selected}`)?.classList.add("correct-opt");
    } else {
      qEl.classList.add("wrong");
      document.getElementById(`${type}-q${i}-o${selected}`)?.classList.add("wrong-opt");
      document.getElementById(`${type}-q${i}-o${item.ans}`)?.classList.add("correct-opt");
    }
    expEl.style.display = "block";
  });
  const pct = Math.round((score / data.length) * 100);
  const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--accent)" : "var(--red)";
  const msg = pct === 100 ? "Perfect Score!" : pct >= 80 ? "Excellent Work!" : pct >= 50 ? "Good Effort!" : "Review Theory";
  const resultEl = document.getElementById(type + "-result");
  resultEl.style.display = "block";
  resultEl.innerHTML = `<div class="score-ring" style="border:4px solid ${color};color:${color}">${pct}%</div>
    <div class="result-msg" style="color:${color}">${msg}</div>
    <div class="result-sub">${score}/${data.length} correct</div>`;
}

function resetQuiz(type){
  userAnswers[type] = [];
  const q = document.getElementById(type + "-questions");
  const r = document.getElementById(type + "-result");
  if(q) q.innerHTML = "";
  if(r) r.style.display = "none";
  buildQuiz(type);
}

const matInfo = {
  Copper:{use:"Best for electronics heat sinks"},
  Silver:{use:"Precision electronics"},
  Aluminium:{use:"Aerospace and cookware"},
  Steel:{use:"Structural applications"},
  Glass:{use:"Thermal insulation"},
  Custom:{use:"Adjust the k slider"}
};

function selectMaterial(el, name, k){
  document.querySelectorAll(".mat-btn").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  currentMaterial = name;
  document.getElementById("sl-k").value = k;
  updateSim();
  document.getElementById("mat-info-name").textContent = name;
  document.getElementById("mat-info-use").textContent = matInfo[name].use;
}

const facts = [
  "Copper conducts heat much faster than Steel.",
  "Silver is the best metal conductor of heat.",
  "At steady state, the temperature profile becomes linear.",
  "Fourier published his heat equation in 1822.",
  "Heat always flows from hot to cold unless work is done.",
  "Higher thermal conductivity means faster diffusion.",
  "Finite difference methods approximate a continuous rod using nodes."
];
let factIdx = 0;
setInterval(() => {
  factIdx = (factIdx + 1) % facts.length;
  const el = document.getElementById("fact-text");
  if(el){
    el.style.animation = "none";
    el.offsetHeight;
    el.textContent = facts[factIdx];
    el.style.animation = "";
  }
}, 6000);

function initCanvas(){
  if(canvasInited) return;
  canvasInited = true;
  rodCanvas = document.getElementById("rod-canvas");
  rodCtx = rodCanvas.getContext("2d");
  graphCanvas = document.getElementById("temp-graph");
  graphCtx = graphCanvas.getContext("2d");
  rodCanvas.addEventListener("mousemove", e => {
    const rect = rodCanvas.getBoundingClientRect();
    hoverX = (e.clientX - rect.left) / rect.width;
    drawRod();
  });
  rodCanvas.addEventListener("mouseleave", () => { hoverX = -1; drawRod(); });
  rodCanvas.addEventListener("click", e => {
    const rect = rodCanvas.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(N - 1, Math.floor(fx * N));
    const p = getParams();
    const pulse = (p.Th - p.Tc) * 0.3;
    for(let i=Math.max(1, idx-3); i<Math.min(N-2, idx+3); i++) {
      T[i] = Math.min(p.Th, T[i] + pulse * Math.exp(-((i-idx)**2)/5));
    }
    steadyReached = false;
    document.getElementById("steady-badge").classList.remove("show");
    drawRod(); drawGraph();
  });
  window.addEventListener("resize", () => { if(canvasInited){ drawRod(); drawGraph(); }});
  resetSim();
}

function getParams(){
  return {
    k: parseFloat(document.getElementById("sl-k").value),
    Th: parseFloat(document.getElementById("sl-th").value),
    Tc: parseFloat(document.getElementById("sl-tc").value),
    sp: parseFloat(document.getElementById("sl-sp").value)
  };
}

function updateSim(){
  const p = getParams();
  document.getElementById("lbl-k").textContent = p.k;
  document.getElementById("lbl-th").textContent = p.Th;
  document.getElementById("lbl-tc").textContent = p.Tc;
  document.getElementById("lbl-sp").textContent = p.sp;
  document.getElementById("mat-info-k").textContent = p.k.toFixed(0);
  resetSim(false);
}

function resetSim(){
  const p = getParams();
  T = new Float64Array(N);
  Tprev = new Float64Array(N);
  for(let i=0;i<N;i++) T[i] = p.Tc + (p.Th - p.Tc) * (1 - i/(N-1));
  simTime = 0;
  steadyReached = false;
  document.getElementById("steady-badge").classList.remove("show");
  document.getElementById("stat-state").textContent = running ? "Running" : "Paused";
  document.getElementById("btn-play").textContent = running ? "Pause" : "Play";
  document.getElementById("btn-play").classList.toggle("paused", !running);
  drawRod(); drawGraph(); updateStats();
}

function stepSim(){
  const p = getParams();
  const alpha = Math.min(0.45, p.k / 1200);
  const dt = 0.08;
  Tprev = T.slice();
  for(let i=1;i<N-1;i++){
    T[i] = Tprev[i] + alpha * (Tprev[i-1] - 2*Tprev[i] + Tprev[i+1]);
  }
  T[0] = p.Th;
  T[N-1] = p.Tc;
  simTime += dt;
  updateStats();
  drawRod();
  drawGraph();
  const mid = T[Math.floor(N/2)];
  const linearMid = (p.Th + p.Tc) / 2;
  const err = Math.abs(mid - linearMid);
  const spread = Math.max(1, p.Th - p.Tc);
  const pct = Math.max(0, Math.min(100, 100 - (err / spread) * 100));
  document.getElementById("equil-pct").textContent = `${pct.toFixed(0)}%`;
  document.getElementById("equil-bar").style.width = `${pct}%`;
  if(pct > 96 && !steadyReached){
    steadyReached = true;
    document.getElementById("steady-badge").classList.add("show");
  }
}

function updateStats(){
  const p = getParams();
  const mid = T[Math.floor(N/2)];
  const gradient = T[1] - T[0];
  const q = -p.k * gradient;
  document.getElementById("lbl-hot").textContent = p.Th.toFixed(0);
  document.getElementById("lbl-cold").textContent = p.Tc.toFixed(0);
  document.getElementById("stat-t").textContent = simTime.toFixed(3) + " s";
  document.getElementById("stat-mid").textContent = mid.toFixed(1) + " °C";
  document.getElementById("stat-q").textContent = q.toFixed(2) + " W/m²";
  document.getElementById("meter-needle").style.left = `${((mid - p.Tc) / Math.max(1, p.Th - p.Tc)) * 100}%`;
  document.getElementById("stat-state").textContent = running ? "Running" : "Paused";
  document.getElementById("btn-play").textContent = running ? "Pause" : "Play";
  document.getElementById("btn-play").classList.toggle("paused", !running);
}

function drawRod(){
  if(!rodCtx) return;
  const w = rodCanvas.width = rodCanvas.clientWidth * devicePixelRatio;
  const h = rodCanvas.height = 90 * devicePixelRatio;
  rodCtx.clearRect(0,0,w,h);
  const blockW = w / N;
  for(let i=0;i<N;i++){
    const t = T[i];
    const hue = 240 - (Math.max(0, Math.min(100, t / 4)) * 2.4);
    rodCtx.fillStyle = `hsl(${hue},90%,55%)`;
    rodCtx.fillRect(i*blockW, 0, blockW + 1, h);
    rodCtx.strokeStyle = "rgba(255,255,255,.07)";
    rodCtx.strokeRect(i*blockW, 0, blockW + 1, h);
  }
  if(hoverX >= 0){
    const idx = Math.min(N-1, Math.floor(hoverX * N));
    rodCtx.fillStyle = "rgba(255,255,255,.18)";
    rodCtx.fillRect(idx*blockW, 0, blockW, h);
    rodCtx.fillStyle = "#fff";
    rodCtx.font = `${14*devicePixelRatio}px Outfit`;
    rodCtx.fillText(`${T[idx].toFixed(1)}°C`, idx*blockW + 6, 20*devicePixelRatio);
  }
}

function drawGraph(){
  if(!graphCtx) return;
  const w = graphCanvas.width = graphCanvas.clientWidth * devicePixelRatio;
  const h = graphCanvas.height = 120 * devicePixelRatio;
  graphCtx.clearRect(0,0,w,h);
  graphCtx.strokeStyle = "rgba(255,255,255,.08)";
  for(let i=0;i<5;i++){
    const y = (h/5)*i;
    graphCtx.beginPath(); graphCtx.moveTo(0,y); graphCtx.lineTo(w,y); graphCtx.stroke();
  }
  const maxT = Math.max(...T), minT = Math.min(...T);
  graphCtx.beginPath();
  T.forEach((t,i) => {
    const x = (i/(N-1))*w;
    const y = h - ((t - minT) / Math.max(1, maxT - minT)) * (h - 20) - 10;
    if(i===0) graphCtx.moveTo(x,y); else graphCtx.lineTo(x,y);
  });
  graphCtx.strokeStyle = "#60a5fa";
  graphCtx.lineWidth = 3 * devicePixelRatio;
  graphCtx.stroke();
}

function toggleSim(){
  const btn = document.getElementById("btn-play");
  running = !running;
  btn.textContent = running ? "Pause" : "Play";
  btn.classList.toggle("paused", !running);
  document.getElementById("stat-state").textContent = running ? "Running" : "Paused";
  if(running) loop();
  else cancelAnimationFrame(simFrame);
}

function loop(){
  if(!running) return;
  const p = getParams();
  for(let i=0;i<p.sp;i++) stepSim();
  simFrame = requestAnimationFrame(loop);
}

function exportData(){
  let csv = "index,temperature\n";
  T.forEach((t,i)=> csv += `${i},${t.toFixed(3)}\n`);
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "heat_conduction_data.csv";
  a.click();
}

function submitFeedback(){
  const name = document.getElementById("fb-name").value.trim();
  const rating = document.getElementById("fb-rating").value;
  const msg = document.getElementById("fb-msg").value.trim();
  document.getElementById("fb-status").textContent = name && msg ? `Thank you, ${name}! Your feedback has been recorded.` : "Please enter your name and feedback.";
}

window.addEventListener("resize", () => { if(canvasInited){ drawRod(); drawGraph(); }});
document.addEventListener("DOMContentLoaded", () => { buildQuiz("pretest"); buildQuiz("posttest"); });
