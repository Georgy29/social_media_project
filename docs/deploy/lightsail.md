# Lightsail Deploy Guide (Backend + Postgres) — Release 1

This guide deploys the FastAPI backend + Postgres on a single **AWS Lightsail** instance and serves the API over **HTTPS** (required if your frontend is hosted on Vercel/Netlify).

## 0) Prereqs
- A domain you control (recommended): use `api.<your-domain>` for the backend.
- Local repo is already working via `docker compose up`.

## 1) Create the Lightsail instance
1. Lightsail → **Create instance**
   - Platform: Linux/Unix
   - Blueprint: Ubuntu 22.04 (or latest LTS)
   - Plan: $5/mo
2. Networking (Lightsail “Networking” tab):
   - Open: `22` (SSH), `80` (HTTP), `443` (HTTPS)
   - Do **not** open `5432` (Postgres)
   - Optional (temporary): open `8000` only for initial smoke tests, then close it after HTTPS works.

## 2) Point DNS to the server
1. Note the instance **public IP**.
2. In your DNS provider:
   - Create `A` record: `api.<your-domain>` → `<LIGHTSAIL_PUBLIC_IP>`
3. Wait for DNS propagation (often 1–10 minutes).

## 3) SSH into the server
From your machine:
```bash
ssh ubuntu@<LIGHTSAIL_PUBLIC_IP>
```

## 4) Install Docker + Compose plugin
On the server:
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

Verify:
```bash
docker --version
docker compose version
```

## 5) Clone the repo on the server
```bash
git clone <YOUR_REPO_GIT_URL> posts_fastapi
cd posts_fastapi
```

## 6) Create the production `.env`
```bash
cp .env.example .env
nano .env
```

Minimum things to edit:
- `SECRET_KEY` (set a real random string)
- `CORS_ORIGINS` (include your frontend domain, e.g. `https://<frontend-domain>`)
- S3 vars (if you use uploads in prod): `AWS_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`
- Rate limiting (keep memory for now): `RATE_LIMIT_ENABLED=true`, `RATE_LIMIT_STORAGE_URI=memory://`

## 7) Bring up the stack
```bash
docker compose up -d --build
docker compose ps
```

Note: this repo installs only production dependencies in the API container to keep memory usage low on small instances (tests/lint deps are excluded from the production image).

Check logs if needed:
```bash
docker compose logs -f api
docker compose logs -f db
```

Quick health check from the server:
```bash
curl -i http://localhost:8000/docs
```

## 8) Put the API behind HTTPS (Caddy)
Browsers will block calling `http://...` APIs from a `https://...` frontend, so this step is required for Vercel/Netlify.

### Option A (recommended): install Caddy on the host
```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

Create `/etc/caddy/Caddyfile`:
```caddy
api.<your-domain> {
  reverse_proxy 127.0.0.1:8000
}
```

Reload:
```bash
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Now verify from your machine:
- `https://api.<your-domain>/docs`

After HTTPS works, go back to Lightsail networking and **close port 8000** (keep 80/443 only).

## 9) Deploy the frontend (Vercel/Netlify)
Set:
- `VITE_API_URL=https://api.<your-domain>`

Redeploy and smoke test from the public URL:
- login/register
- feed loads
- create post / like / repost
- uploads (if in scope)

## 10) Production notes (quick wins)
- Do not open Postgres to the internet (`5432`) in Lightsail networking.
- Consider removing `ports: "5432:5432"` from `docker-compose.yml` for production (defense in depth).
- With `RATE_LIMIT_STORAGE_URI=memory://`, limits are **per-process**; if you scale to multiple workers/instances, switch to Redis.
