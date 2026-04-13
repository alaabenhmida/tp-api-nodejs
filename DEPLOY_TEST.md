# Deploying the App for Testing (No MongoDB Required)

This guide explains how to run the API on any server without installing MongoDB.  
The app uses `mongodb-memory-server` to spin up a temporary, in-process MongoDB instance.

---

## How It Works

`config/database.js` checks for the environment variable `USE_MEMORY_DB`:

- `USE_MEMORY_DB=true` → starts an in-memory MongoDB automatically (no external DB needed)
- `MONGODB_URI` set + `USE_MEMORY_DB` not set → connects to a real MongoDB instance

Data stored in memory is **lost** when the server stops. This is intentional for testing.

---

## Running Locally Without MongoDB

**Step 1 — Install dependencies**

```bash
npm install
```

> `mongodb-memory-server` is now a regular dependency and will be installed automatically.
> On first run it downloads a MongoDB binary (~70 MB). Subsequent starts are instant.

**Step 2 — Start the server in memory mode**

```bash
USE_MEMORY_DB=true node server.js
```

On Windows (PowerShell):

```powershell
$env:USE_MEMORY_DB="true"; node server.js
```

**Step 3 — Verify the server is running**

```bash
curl http://localhost:3000/
# Expected: {"message":"API Gestion Étudiants v1.0"}
```

---

## Running in CI / GitHub Actions

The workflow (`.github/workflows/ci.yml`) already sets `USE_MEMORY_DB: true` in its environment block.  
No secrets or external services are needed — just push and let it run.

What the CI does:
1. Installs Node.js and dependencies (`npm ci`)
2. Runs the full Jest test suite (`npm test`) — each test file manages its own MongoMemoryServer
3. Starts the real server with `USE_MEMORY_DB=true` and hits `GET /` to confirm it boots correctly (smoke test)
4. Kills the server and exits

---

## Deploying on a Remote Server (Same Machine, No MongoDB)

**Step 1 — Clone and install**

```bash
git clone <your-repo-url>
cd tp-api-nodejs
npm install
```

**Step 2 — Create a `.env` file** *(optional — defaults work out of the box)*

```
PORT=3000
USE_MEMORY_DB=true
NODE_ENV=test
```

**Step 3 — Start the server**

```bash
node server.js
```

Or with a process manager like PM2:

```bash
npm install -g pm2
pm2 start server.js --name "tp-api" --env USE_MEMORY_DB=true
pm2 save
```

**Step 4 — Expose the port**

If running behind a firewall, open the port:

```bash
# Ubuntu/Debian
sudo ufw allow 3000
```

Or configure a reverse proxy (nginx, Caddy) to forward traffic to `localhost:3000`.

---

## Switching Back to a Real MongoDB

Remove `USE_MEMORY_DB=true` and set a proper URI instead:

```
MONGODB_URI=mongodb://localhost:27017/tp-api
```

No code changes are needed — just the environment variable.

---

## What Changed in the Codebase

| File | Change |
|------|--------|
| `config/database.js` | Added `USE_MEMORY_DB` check; starts `MongoMemoryServer` when set |
| `package.json` | Moved `mongodb-memory-server` from `devDependencies` → `dependencies` |
| `.github/workflows/ci.yml` | Added `USE_MEMORY_DB: true` env var + smoke test step |

---

## Steps to Apply These Changes on Another Project

Follow these steps to make any Node.js + Mongoose app run with an in-memory MongoDB instead of a real one.

### Step 1 — Install `mongodb-memory-server` as a production dependency

```bash
npm install mongodb-memory-server
```

> Do **not** use `--save-dev`. It must be a regular dependency so it is available on the server.

---

### Step 2 — Update your database connection file

Open the file where you call `mongoose.connect(...)` (e.g. `config/database.js`) and replace its content with a version that checks for the `USE_MEMORY_DB` environment variable:

```js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        let uri = process.env.MONGODB_URI;

        // If USE_MEMORY_DB=true or no URI is set, start an in-memory MongoDB
        if (!uri || process.env.USE_MEMORY_DB === 'true') {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            uri = mongod.getUri();
            console.log('⚡ In-memory MongoDB started (test mode)');
        }

        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
```

---

### Step 3 — Set the environment variable

Create or update your `.env` file in the project root:

```
PORT=3000
USE_MEMORY_DB=true
```

Do **not** commit `.env` to git. Add it to `.gitignore` if it isn't already.

---

### Step 4 — Update the CI workflow (GitHub Actions)

In your `.github/workflows/ci.yml`, add `USE_MEMORY_DB: true` to the `env` block of the job, and add a smoke-test step after your tests:

```yaml
env:
  NODE_ENV: test
  USE_MEMORY_DB: true   # ← add this line

steps:
  # ... your existing steps ...

  - name: 🚀 Smoke test — start server with in-memory MongoDB
    run: |
      node server.js &
      SERVER_PID=$!
      sleep 5
      curl --fail http://localhost:${PORT:-3000}/ || (kill $SERVER_PID && exit 1)
      echo "✅ Smoke test passed"
      kill $SERVER_PID
```

This removes any need for a MongoDB service in CI — no `services:` block, no credentials.

---

### Step 5 — Verify everything works

Run locally:

```bash
# Linux / macOS
USE_MEMORY_DB=true node server.js

# Windows PowerShell
$env:USE_MEMORY_DB="true"; node server.js
```

Expected output:

```
⚡ In-memory MongoDB started (test mode)
✅ MongoDB connected: 127.0.0.1
Server started on port 3000
```

> **First run only:** `mongodb-memory-server` downloads a MongoDB binary (~500 MB). Subsequent starts are instant.

---

### Step 6 — Commit and push

```bash
git add config/database.js package.json package-lock.json .github/workflows/ci.yml
git commit -m "feat: use in-memory MongoDB for test deployment"
git push origin main
```
