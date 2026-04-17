#!/usr/bin/env node
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const databaseURL = process.env.FIREBASE_DATABASE_URL;
if (!databaseURL) {
  console.error("Missing FIREBASE_DATABASE_URL environment variable.");
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  databaseURL
});

const db = getDatabase();
const telemetryRef = db.ref("plc/lineA/telemetry");
const alarmsRef = db.ref("plc/lineA/alarms");
const eventsRef = db.ref("plc/lineA/events");

const randomBetween = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));

function generateTelemetry() {
  const temperature = randomBetween(58, 97);
  const pressure = randomBetween(3.5, 8.5);
  const vibration = randomBetween(0.3, 5.2);

  let status = "RUNNING";
  if (temperature > 92 || vibration > 4.8) {
    status = "FAULT";
  } else if (Math.random() < 0.08) {
    status = "IDLE";
  }

  return {
    temperature: Number(temperature.toFixed(1)),
    pressure: Number(pressure.toFixed(1)),
    motorSpeed: randomInt(1200, 1825),
    flowRate: Number(randomBetween(38, 85).toFixed(1)),
    vibration: Number(vibration.toFixed(2)),
    status,
    timestamp: Date.now()
  };
}

function evaluateAlarms(telemetry) {
  return {
    highTemp: {
      active: telemetry.temperature >= 90,
      threshold: 90,
      updatedAt: telemetry.timestamp
    },
    highVibration: {
      active: telemetry.vibration >= 4,
      threshold: 4,
      updatedAt: telemetry.timestamp
    },
    lowPressure: {
      active: telemetry.pressure <= 4,
      threshold: 4,
      updatedAt: telemetry.timestamp
    }
  };
}

function generateEvent(telemetry, alarms) {
  const activeAlarm = Object.entries(alarms).find(([, value]) => value.active);
  if (activeAlarm) {
    return {
      message: `${activeAlarm[0]} triggered at ${telemetry.status}`,
      severity: "error",
      timestamp: telemetry.timestamp
    };
  }

  if (telemetry.status === "IDLE") {
    return {
      message: "Line idling due to low throughput",
      severity: "warning",
      timestamp: telemetry.timestamp
    };
  }

  if (Math.random() < 0.2) {
    return {
      message: "Normal cycle completed",
      severity: "info",
      timestamp: telemetry.timestamp
    };
  }

  return null;
}

async function publishCycle() {
  const telemetry = generateTelemetry();
  const alarms = evaluateAlarms(telemetry);
  const event = generateEvent(telemetry, alarms);

  await telemetryRef.set(telemetry);
  await alarmsRef.set(alarms);

  if (event) {
    await eventsRef.push(event);
  }

  console.log(`[${new Date().toISOString()}] Published`, telemetry.status, telemetry);
}

console.log("PLC simulator started. Publishing every 1s...");
await publishCycle();
setInterval(() => {
  publishCycle().catch((error) => {
    console.error("Publish failure:", error.message);
  });
}, 1000);
