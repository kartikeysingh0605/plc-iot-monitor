# PLC IoT Monitor (Firebase Realtime Dashboard)

A lightweight IoT monitoring web app that streams PLC telemetry through **Firebase Realtime Database** and renders it in real time in the browser.

## Features

- Live connection status indicator
- Real-time gauges/cards for key PLC telemetry values:
  - Temperature (°C)
  - Pressure (bar)
  - Motor speed (RPM)
  - Flow rate (L/min)
  - Vibration (mm/s)
- Alarm table with active/inactive state and timestamps
- Event log list (latest first)
- Last update timestamp and stale-data highlighting
- Optional local PLC simulator script to publish test data to Firebase

## Project Structure

- `index.html` – dashboard UI markup
- `styles.css` – responsive dashboard styling
- `app.js` – Firebase client + real-time rendering logic
- `firebase-config.example.js` – template config file
- `plc-simulator.js` – optional Node.js simulator that writes demo PLC data

## Prerequisites

- A Firebase project
- Realtime Database enabled
- Node.js 18+ (only needed for simulator)

## 1) Configure Firebase

1. Create a web app in your Firebase project.
2. Enable **Realtime Database**.
3. Set database rules for development (tighten for production):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

4. Copy `firebase-config.example.js` to `firebase-config.js` and fill in your project values.

```bash
cp firebase-config.example.js firebase-config.js
```

## 2) Run the dashboard

You can use any static file server from this project directory:

```bash
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080`

## 3) (Optional) Run PLC simulator

The simulator publishes random but realistic PLC values every second.

1. Install dependencies:

```bash
npm init -y
npm install firebase
```

2. Export credentials using a Firebase service account (recommended for local script usage):

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

3. Set your database URL:

```bash
export FIREBASE_DATABASE_URL="https://<your-project-id>-default-rtdb.firebaseio.com"
```

4. Run the simulator:

```bash
node plc-simulator.js
```

## Firebase Realtime Database Schema

```json
{
  "plc": {
    "lineA": {
      "telemetry": {
        "temperature": 74.1,
        "pressure": 5.8,
        "motorSpeed": 1470,
        "flowRate": 62.4,
        "vibration": 0.9,
        "status": "RUNNING",
        "timestamp": 1710000000000
      },
      "alarms": {
        "highTemp": {
          "active": false,
          "threshold": 90,
          "updatedAt": 1710000000000
        },
        "highVibration": {
          "active": false,
          "threshold": 4,
          "updatedAt": 1710000000000
        }
      },
      "events": {
        "-Nabc123": {
          "message": "Line started",
          "severity": "info",
          "timestamp": 1710000000000
        }
      }
    }
  }
}
```

## Production Notes

- Restrict DB rules to authenticated users/devices.
- Separate write access for PLC publishers from read-only dashboard clients.
- Consider Cloud Functions / Pub/Sub / MQTT bridge for industrial connectors.
- Add historical storage (BigQuery/Timescale/etc.) for long-term trend analysis.
