# Deploying Proxima free on an Oracle Cloud VM (HTTPS via Caddy + DuckDNS)

This runs the whole stack — Postgres/pgvector, Redis, the FastAPI backend, the
Celery worker, the nginx frontend, and a Caddy TLS front-end — on **one Oracle
Cloud "Always Free" ARM VM**, reachable at a free `*.duckdns.org` HTTPS URL.

No hosting cost. Oracle requires a card for identity verification at signup but
does not charge on the Always Free tier. Your Gemini free tier covers the AI
calls.

Everything here is copy-paste; the only judgement calls are your domain name and
secrets.

---

## 1. Create the VM (Oracle Cloud)

1. Sign up at cloud.oracle.com (card for verification only).
2. **Compute → Instances → Create instance:**
   - **Image:** Canonical **Ubuntu 22.04** (aarch64/ARM).
   - **Shape:** `VM.Standard.A1.Flex` (Ampere ARM). Set **2 OCPU / 12 GB** — well within the Always Free ceiling (4 OCPU / 24 GB) and plenty for this stack.
   - **Add your SSH public key** (you'll SSH in as user `ubuntu`).
   - Note the instance's **public IP**. (Optional but recommended: reserve the public IP so it survives a stop/start — *Networking → reserved public IPs*.)
3. **Open ports 80 and 443 to the internet** (VCN Security List):
   - Networking → Virtual Cloud Networks → your VCN → its **subnet** → **Security List** → **Add Ingress Rules**:
     - Source `0.0.0.0/0`, IP Protocol **TCP**, Destination port **80**
     - Source `0.0.0.0/0`, IP Protocol **TCP**, Destination port **443**
   - (Port 22/SSH is already allowed.)

> The `deploy.sh` script opens 80/443 in the instance's *OS* firewall too — both layers are required on Oracle.

---

## 2. Free HTTPS domain (DuckDNS)

1. Go to duckdns.org, sign in (GitHub/Google), create a subdomain, e.g. `proxima-you`.
2. Set its IP to your VM's public IP. Copy your DuckDNS **token**.
3. If you reserved a static public IP, you're done. If not, keep it current with a cron updater on the VM (replace the placeholders):

   ```bash
   ( crontab -l 2>/dev/null; echo '*/5 * * * * curl -s "https://www.duckdns.org/update?domains=proxima-you&token=YOUR_DUCKDNS_TOKEN&ip=" >/dev/null' ) | crontab -
   ```

Your public URL will be `https://proxima-you.duckdns.org`.

---

## 3. Google OAuth (login)

Proxima logs in with Google, so point your OAuth client at the public URL:

1. Google Cloud Console → **APIs & Services → Credentials** → your OAuth 2.0 Client.
2. **Authorized JavaScript origins:** `https://proxima-you.duckdns.org`
3. **Authorized redirect URIs:** `https://proxima-you.duckdns.org/api/auth/callback`
4. **OAuth consent screen:** to let *anyone* sign in, set publishing status to **In production** (the basic `email`/`profile`/`openid` scopes Proxima uses do **not** require Google's verification review). While testing, you can instead leave it in **Testing** and add specific Google accounts as test users.

> Reality check: every visitor must sign in with Google — there is no guest mode. That login wall, not hosting, is the main friction for a portfolio viewer.

---

## 4. Configure and deploy (on the VM)

SSH in and clone the repo (use the branch you deploy from, e.g. `main` after PR #4 merges):

```bash
ssh ubuntu@YOUR_VM_IP
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/ArnavGarg7/Proxima.git
cd Proxima
```

**Topology env (repo root `.env`):**

```bash
cp deploy/.env.example .env
nano .env
```
Set `SITE_ADDRESS`, `VITE_API_URL`, `CORS_ORIGINS` to your domain, and a strong `POSTGRES_PASSWORD`.

**Secrets (`backend/.env`):**

```bash
cp backend/.env.example backend/.env
nano backend/.env
```
Fill in (the file's comments include generation commands):
- `SESSION_SECRET` — `openssl rand -hex 32`
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` — generate a keypair:
  ```bash
  openssl genrsa -out private.pem 2048
  openssl rsa -in private.pem -pubout -out public.pem
  # paste the PEM contents (single line with \n escapes, or a quoted block)
  ```
- `GEMINI_API_KEY` — your Gemini key (embeddings + generation)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://proxima-you.duckdns.org/api/auth/callback`
- `ENVIRONMENT=production` (required — enables secure cookies and fail-fast config checks)

**Deploy:**

```bash
./deploy/deploy.sh
```

This installs Docker, opens the OS firewall, builds the images, runs
`alembic upgrade head` (via the one-shot `migrate` service), and starts
everything. Caddy then fetches a Let's Encrypt certificate automatically.

Watch it come up:

```bash
sudo docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml logs -f caddy backend migrate
```

When Caddy logs `certificate obtained`, open **https://proxima-you.duckdns.org**.

---

## 5. Verify

```bash
curl -s https://proxima-you.duckdns.org/api/health        # {"status":"ok","checks":{"database":"ok","redis":"ok"}}
curl -s -o /dev/null -w '%{http_code}\n' https://proxima-you.duckdns.org/   # 200 (SPA)
```

Then sign in with Google, upload a document, and try the Ask surface.

---

## Operating it

- **Logs:** `sudo docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml logs -f <service>`
- **Update to latest code:**
  ```bash
  git pull
  sudo docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml up -d --build
  ```
- **Stop / start:** `... down` / `... up -d` (data persists in named volumes: `proxima_pgdata`, `proxima_redisdata`, `proxima_storage`, `caddy_data`).
- **Back up the database:**
  ```bash
  sudo docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml exec db \
    pg_dump -U proxima proxima > proxima_backup_$(date +%F).sql
  ```

## Known limitations (fine for a portfolio demo)
- **Single VM** — no high availability; a reboot means a few minutes of downtime.
- **Google login required** for every visitor (no guest/demo mode).
- **Gemini free-tier quota** (~100 embeds/min) caps ingestion throughput; `EMBEDDING_RPM=90` keeps you under it.
- **No off-box backups** by default — the `pg_dump` above is manual.
- Uploaded files live on the VM's `proxima_storage` volume (single host).
