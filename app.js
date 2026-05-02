const metrics = [
  { label: "Heart Rate", key: "hr", unit: "BPM" },
  { label: "Blood Pressure", key: "bp", unit: "" },
  { label: "SpO₂", key: "spo2", unit: "%" },
  { label: "Resp Rate", key: "resp", unit: "br/min" },
  { label: "BMI", key: "bmi", unit: "kg/m²" },
  { label: "Temperature", key: "temp", unit: "°C" }
];

const patientInputs = [
  ["Age", 45], ["Sex", "Male"], ["Fasting Glucose", "98 mg/dL"], ["HbA1c", "5.6 %"], ["LDL", "110 mg/dL"], ["HDL", "48 mg/dL"], ["Smoking", "Yes"], ["Physical Activity", "Low"], ["Sleep Duration", "5.5 hrs"], ["hs-CRP", "2.1 mg/L"]
];

const twinStats = ["Cardiac Output", "Stroke Volume", "Ejection Fraction"];
const metricGrid = document.getElementById("metricGrid");
const patientList = document.getElementById("patientInputs");
const twinStatsEl = document.getElementById("twinStats");
const riskItemsEl = document.getElementById("riskItems");
const riskPercentEl = document.getElementById("riskPercent");
const riskLevelEl = document.getElementById("riskLevel");
const heartEl = document.getElementById("heart");

function nowClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString();
}
setInterval(nowClock, 1000); nowClock();

const state = { hr: 78, bpSys: 120, bpDia: 80, spo2: 98, resp: 16, bmi: 25.5, temp: 36.7 };

function generateVitals() {
  state.hr = clamp(jitter(state.hr, 2), 58, 140);
  state.bpSys = clamp(jitter(state.bpSys, 2), 95, 150);
  state.bpDia = clamp(jitter(state.bpDia, 2), 60, 98);
  state.spo2 = clamp(jitter(state.spo2, 0.5), 90, 100);
  state.resp = clamp(jitter(state.resp, 0.4), 10, 25);
  state.bmi = clamp(jitter(state.bmi, 0.04), 18, 34);
  state.temp = clamp(jitter(state.temp, 0.05), 35.8, 38.8);
}

function jitter(value, by) { return +(value + (Math.random() - 0.5) * by).toFixed(1); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function renderMetrics() {
  const bp = `${Math.round(state.bpSys)}/${Math.round(state.bpDia)}`;
  const data = { ...state, bp };

  metricGrid.innerHTML = metrics.map((m) => {
    const val = m.key === "bp" ? data.bp : data[m.key];
    return `<article class="metric-card"><p>${m.label}</p><p class="v">${val} <small>${m.unit}</small></p><span class="tag">Normal</span></article>`;
  }).join("");
}

function renderInputs() {
  patientList.innerHTML = patientInputs.map(([k, v]) => `<div class="row"><span>${k}</span><strong>${v}</strong></div>`).join("");
}

function renderTwinStats() {
  const cardiac = (state.hr * 0.07).toFixed(1);
  const stroke = Math.round(55 + (state.hr - 60) * 0.33);
  const ef = Math.round(55 + (state.hr - 75) * 0.2);
  const vals = [`${cardiac} L/min`, `${stroke} mL`, `${clamp(ef, 45, 72)} %`];
  twinStatsEl.innerHTML = twinStats.map((name, i) => `<article><p>${name}</p><h3>${vals[i]}</h3></article>`).join("");
}

function renderRisk() {
  const risk = Math.round(clamp((state.hr - 60) * 0.8 + (state.bpSys - 110) * 0.6 + (100 - state.spo2) * 3 + (state.temp - 36.8) * 10, 8, 89));
  riskPercentEl.textContent = `${risk}%`;
  riskLevelEl.textContent = risk < 30 ? "Low Risk" : risk < 60 ? "Moderate Risk" : "High Risk";
  riskItemsEl.innerHTML = [
    ["Hypertension", state.bpSys > 135 ? "High" : "Normal"],
    ["Diabetes Risk", state.bmi > 29 ? "Moderate" : "Low"],
    ["Lipid Risk", state.hr > 105 ? "Moderate" : "Low"],
    ["Inflammation", state.temp > 37.8 ? "High" : "Normal"]
  ].map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join("");
}

function syncHeartAnimation() {
  const beatDuration = 60 / state.hr;
  heartEl.style.animationDuration = `${beatDuration.toFixed(2)}s`;
}

function drawECG() {
  const c = document.getElementById("ecgCanvas");
  const x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  x.strokeStyle = "#2ddf74"; x.lineWidth = 3; x.beginPath();
  const mid = c.height / 2;
  for (let i = 0; i < c.width; i++) {
    const t = i / 70;
    const pulse = Math.sin(t) * 8 + spike(i, 120) + spike(i, 290) + spike(i, 460) + spike(i, 640);
    x.lineTo(i, mid + pulse);
  }
  x.stroke();
}
function spike(i, center) {
  const d = Math.abs(i - center);
  if (d > 20) return 0;
  return d < 4 ? -65 + d * 14 : (20 - d) * 2.2;
}

const trend = { hr: Array.from({ length: 10 }, () => 78), bp: Array.from({ length: 10 }, () => 120) };
function drawTrend() {
  trend.hr.push(state.hr); trend.bp.push(state.bpSys); trend.hr.shift(); trend.bp.shift();
  const c = document.getElementById("trendCanvas");
  const x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height);
  plot(x, trend.hr, "#ff4d65", 55, 140, c.width, c.height);
  plot(x, trend.bp, "#2aa5ff", 95, 150, c.width, c.height);
}
function plot(ctx, arr, color, min, max, w, h) {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath();
  arr.forEach((v, i) => {
    const px = (i / (arr.length - 1)) * (w - 30) + 15;
    const py = h - ((v - min) / (max - min)) * (h - 30) - 15;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.stroke();
}

function tick() {
  generateVitals();
  renderMetrics();
  renderTwinStats();
  renderRisk();
  drawECG();
  drawTrend();
  syncHeartAnimation();
}
renderInputs();
tick();
setInterval(tick, 1000);
