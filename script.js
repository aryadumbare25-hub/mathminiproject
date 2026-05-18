const sectionOrder = ["aim","theory","pretest","simulation","posttest","references"];
const quizData = {
  pretest: [
    {q:"What does Fourier’s Law of Heat Conduction describe?",opts:["The rate of radiation emitted by a body","The rate of heat transfer due to a temperature gradient","The convective heat transfer coefficient","The specific heat of a material"],ans:1,exp:"Fourier’s Law relates heat flux to the temperature gradient."},
    {q:"In Q = -kA(dT/dx), what does k represent?",opts:["Thermal diffusivity","Boltzmann constant","Thermal conductivity","Specific heat capacity"],ans:2,exp:"k is the thermal conductivity in W/mK."},
    {q:"Why is there a negative sign in Fourier’s Law?",opts:["Because heat loss always occurs","To indicate heat flows from cold to hot","To show heat flows in the direction of decreasing temperature","It is a convention with no physical meaning"],ans:2,exp:"Heat flows from hot to cold, i.e. along decreasing temperature."},
    {q:"Which metal has the highest thermal conductivity?",opts:["Steel","Aluminium","Copper","Silver"],ans:3,exp:"Silver has the highest thermal conductivity among common metals."},
    {q:"In steady-state 1D heat conduction with no generation, the temperature profile is:",opts:["Exponential","Parabolic","Linear","Sinusoidal"],ans:2,exp:"At steady state, the profile becomes linear."}
  ],
  posttest: [
    {q:"Increasing thermal conductivity k causes steady state to be reached:",opts:["Slower","Faster","At the same rate","k has no effect"],ans:1,exp:"Higher k means heat diffuses faster."},
    {q:"Thermal diffusivity physically represents:",opts:["The total heat stored per unit volume","How quickly a material responds to temperature changes","The maximum temperature a material can withstand","The ratio of hot to cold temperature"],ans:1,exp:"Thermal diffusivity measures how fast temperature changes propagate."},
    {q:"The explicit finite-difference scheme is stable when r = αΔt/Δx² satisfies:",opts:["r > 1","r < 0.5","r = 1 exactly","r = 2"],ans:1,exp:"Stability requires r ≤ 0.5."},
    {q:"If the hot end is 300°C and cold end is 20°C, the steady-state midpoint temperature is:",opts:["300°C","20°C","160°C","280°C"],ans:2,exp:"The linear midpoint is 160°C."},
    {q:"At steady state, the heat equation reduces to:",opts:["∂T/∂t = 0","∂T/∂x = 0 at all points","T is constant everywhere","Only boundary temperatures matter"],ans:0,exp:"At steady state, temperature no longer changes with time."}
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
  document.getElementById(id).classList.add("active");
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
  if(container.innerHTML.trim() !== "") return;
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
  quizData[type][qIdx].opts.forEach((_, j) => document.getElementById(`${type}-q${qIdx}-o${j}`).classList.remove("selected"));
  document.getElementById(`${type}-q${qIdx}-o${oIdx}`).classList.add("selected");
  userAnswers[type][qIdx] = oIdx;
}

function submitQuiz(type){
  const data = quizData[type];
  let score = 0;
  data.forEach((item, i) => {
    const selected = userAnswers[type][i];
    const qEl = document.getElementById(`${type}-q${i}`);
    const expEl = document.getElementById(`${type}-exp${i}`);
    qEl.classList.remove("correct","wrong");
    item.opts.forEach((_,j) => {
      const o = document.getElementById(`${type}-q${i}-o${j}`);
      o.classList.remove("correct-opt","wrong-opt","selected");
    });
    if(selected === undefined) return;
    if(selected === item.ans){
      score++;
      qEl.classList.add("correct");
      document.getElementById(`${type}-q${i}-o${selected}`).classList.add("correct-opt");
    } else {
      qEl.classList.add("wrong");
      document.getElementById(`${type}-q${i}-o${selected}`).classList.add("wrong-opt");
      document.getElementById(`${type}-q${i}-o${item.ans}`).classList.add("correct-opt");
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
  document.getElementById(type + "-questions").innerHTML = "";
  document.getElementById(type + "-result").style.display = "none";
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
  document.getElementById("lbl-k").textContent = k;
  document.getElementById("mat-info-name").textContent = name;
  document.getElementById("mat-info-k").textContent = k;
  document.getElementById("mat-info-use").textContent = matInfo[name].use;
  resetSim();
}

const facts = [
  "Copper conducts heat 8x faster than Steel — that’s why pans often have copper bottoms!",
  "Silver is the best metal conductor of heat.",
  "The Sun’s core reaches 15 million °C; conduction alone would take a long time outward.",
  "Diamond has a thermal conductivity higher than most metals.",
  "Fourier published his heat equation in 1822.",
  "NASA uses special materials to manage heat in spacecraft.",
  "At steady state, heat flux is identical across every cross-section of the rod."
];
let factIdx = 0;
setInterval(() => {
  factIdx = (factIdx + 1) % facts.length;
  const el = document.getElementById("fact-text");
  if(el){ el.style.animation = "none"; el.offsetHeight; el.textContent = facts[factIdx]; el.style.animation = ""; }
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
  window.addEventListener("resize", () => { drawRod(); drawGraph(); });
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

function resetSim(reinit=true){
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
  const dx = 1;
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
  const spread = p.Th - p.Tc;
  const pct = Math.max(0, Math.min(100, 100 - (err / Math.max(1, spread)) * 100));
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
  document.getElementById("meter-needle").style.left = `${(mid - p.Tc) / Math.max(1, p.Th - p.Tc) * 100}%`;
  const maxIdx = Math.floor((hoverX >= 0 ? hoverX : 0.5) * (N - 1));
  if(hoverX >= 0){
    document.getElementById("click-hint")?.textContent;
  }
}

function drawRod(){
  if(!rodCtx) return;
  const w = rodCanvas.width = rodCanvas.clientWidth * devicePixelRatio;
  const h = rodCanvas.height = 90 * devicePixelRatio;
  rodCtx.clearRect(0,0,w,h);
  const blockW = w / N;
  for(let i=0;i<N;i++){
    const t = T[i];
    const hue = 240 - (Math.max(0, Math.min(100, (t - 0) / 4)) * 2.4);
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
  const p = getParams();
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

window.addEventListener("resize", () => { if(canvasInited){ drawRod(); drawGraph(); } });
document.addEventListener("DOMContentLoaded", () => { buildQuiz("pretest"); buildQuiz("posttest"); });
