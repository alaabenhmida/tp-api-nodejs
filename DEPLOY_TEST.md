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
