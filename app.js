import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  onValue,
  ref
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const els = {
  connectionBadge: document.getElementById("connectionBadge"),
  lastUpdated: document.getElementById("lastUpdated"),
  temperature: document.getElementById("temperature"),
  pressure: document.getElementById("pressure"),
  motorSpeed: document.getElementById("motorSpeed"),
  flowRate: document.getElementById("flowRate"),
  vibration: document.getElementById("vibration"),
  machineStatus: document.getElementById("machineStatus"),
  telemetryCards: document.getElementById("telemetryCards"),
  alarmsTableBody: document.getElementById("alarmsTableBody"),
  eventsList: document.getElementById("eventsList")
};

const NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0
});

const STALE_AFTER_MS = 10_000;
const paths = {
  connected: ".info/connected",
  telemetry: "plc/lineA/telemetry",
  alarms: "plc/lineA/alarms",
  events: "plc/lineA/events"
};

function formatNumber(value, fallback = "--") {
  return Number.isFinite(value) ? NUMBER_FORMAT.format(value) : fallback;
}

function formatDate(ts) {
  if (!Number.isFinite(ts)) {
    return "--";
  }

  return new Date(ts).toLocaleString();
}

function setStatusClass(statusValue) {
  const normalized = String(statusValue || "").toLowerCase();
  els.machineStatus.className = normalized;
}

function applyStaleStyling(lastTimestamp) {
  const isStale = Date.now() - lastTimestamp > STALE_AFTER_MS;
  const cards = els.telemetryCards.querySelectorAll(".card");
  cards.forEach((card) => {
    if (isStale) {
      card.classList.add("stale");
    } else {
      card.classList.remove("stale");
    }
  });
}

function renderTelemetry(data = {}) {
  const timestamp = Number(data.timestamp);

  els.temperature.textContent = `${formatNumber(Number(data.temperature))} °C`;
  els.pressure.textContent = `${formatNumber(Number(data.pressure))} bar`;
  els.motorSpeed.textContent = `${formatNumber(Number(data.motorSpeed))} RPM`;
  els.flowRate.textContent = `${formatNumber(Number(data.flowRate))} L/min`;
  els.vibration.textContent = `${formatNumber(Number(data.vibration))} mm/s`;
  els.machineStatus.textContent = (data.status || "UNKNOWN").toUpperCase();
  setStatusClass(data.status);

  els.lastUpdated.textContent = `Last update: ${formatDate(timestamp)}`;

  if (Number.isFinite(timestamp)) {
    applyStaleStyling(timestamp);
  }
}

function renderAlarms(alarms = {}) {
  const entries = Object.entries(alarms);

  if (!entries.length) {
    els.alarmsTableBody.innerHTML = '<tr><td colspan="4" class="muted">No alarm data yet</td></tr>';
    return;
  }

  els.alarmsTableBody.innerHTML = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, alarm]) => {
      const isActive = Boolean(alarm.active);
      return `
      <tr>
        <td>${name}</td>
        <td><span class="badge ${isActive ? "active" : "inactive"}">${isActive ? "ACTIVE" : "OK"}</span></td>
        <td>${alarm.threshold ?? "--"}</td>
        <td>${formatDate(Number(alarm.updatedAt))}</td>
      </tr>`;
    })
    .join("");
}

function renderEvents(events = {}) {
  const list = Object.values(events)
    .filter(Boolean)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 10);

  if (!list.length) {
    els.eventsList.innerHTML = '<li class="muted">No events yet</li>';
    return;
  }

  els.eventsList.innerHTML = list
    .map((evt) => {
      const severity = String(evt.severity || "info").toLowerCase();
      const message = evt.message || "Event";
      return `<li class="severity-${severity}"><strong>${severity.toUpperCase()}:</strong> ${message} <span class="muted">(${formatDate(
        Number(evt.timestamp)
      )})</span></li>`;
    })
    .join("");
}

function setConnectionStatus(isConnected) {
  els.connectionBadge.textContent = isConnected ? "Connected" : "Disconnected";
  els.connectionBadge.classList.toggle("online", isConnected);
  els.connectionBadge.classList.toggle("offline", !isConnected);
}

async function loadConfig() {
  try {
    const module = await import("./firebase-config.js");
    return module.firebaseConfig;
  } catch {
    throw new Error(
      "Missing firebase-config.js. Copy firebase-config.example.js to firebase-config.js and provide project credentials."
    );
  }
}

async function start() {
  try {
    const firebaseConfig = await loadConfig();
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    onValue(ref(db, paths.connected), (snapshot) => {
      setConnectionStatus(Boolean(snapshot.val()));
    });

    onValue(ref(db, paths.telemetry), (snapshot) => {
      renderTelemetry(snapshot.val());
    });

    onValue(ref(db, paths.alarms), (snapshot) => {
      renderAlarms(snapshot.val());
    });

    onValue(ref(db, paths.events), (snapshot) => {
      renderEvents(snapshot.val());
    });
  } catch (error) {
    console.error(error);
    setConnectionStatus(false);
    els.connectionBadge.textContent = "Configuration required";
    els.eventsList.innerHTML = `<li class="severity-error">${error.message}</li>`;
  }
}

start();
