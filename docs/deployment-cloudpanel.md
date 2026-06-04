# Deployment Guide — Shukhi Life (CloudPanel / Shared VPS)

**Stack:** Next.js 14 (web) + Express.js (api) — pnpm monorepo
**Server:** KVM 4 VPS, **CloudPanel** installed, **multiple sites hosted** (shared)
**Repo:** https://github.com/afnan-mahmud/sodai-kini (private)

> ⚠️ Ei VPS-e onno website-o ase. Tai **global Nginx config / `rm default` / `certbot --nginx`
> chalabe NA** — sob kaj CloudPanel-er per-site UI theke hobe. `docs/deployment.md` (purono,
> raw Nginx+PM2 Hostinger guide) ei setup-er jonno **PROJOJYO NOY** — ei file ta follow koro.

---

## 0. Architecture (kibhabe kaj kore)

Ei app-e **duto** process chole, duto **alada port**-e (onno site-er sathe conflict eraate
3000/4000 use kora hoy nai):

| Process | Port | Public URL |
|---------|------|------------|
| Web (Next.js) | **3030** | `https://shukhilife.com/` |
| API (Express) | **3031** | `https://shukhilife.com/api/...` |

CloudPanel-er Node.js site already `shukhilife.com → 3030` proxy korche. Amra Vhost-e ekta
location rule add korbo jate **`/api/` → 3031** (Express) jay.

**Ekta exception:** Next.js-er nijer ekta route ase — `/api/capi` (Meta Conversions API,
token hide kore). Tai routing eta:

```
/api/capi   → 3030  (Next.js — exact match, sob theke specific)
/api/...    → 3031  (Express API)
/ (baki sob) → 3030  (Next.js — CloudPanel default)
```

`NEXT_PUBLIC_API_URL=https://shukhilife.com` (same-origin) — tai cookie/CORS-e kono cross-site
jhamela nei, admin login cleanly kaj korbe.

---

## 1. Prerequisites (CloudPanel UI-te)

1. CloudPanel → **Sites → Add Site → Create a Node.js Site**
   - Domain: `shukhilife.com`
   - App Port: **3030**
   - Node.js version: **20** (ba 22)
   - (Eta CloudPanel ekta **site user** banabe, jemon `shukhilife-XXXX`, ar htdocs path
     `/home/<site-user>/htdocs/shukhilife.com`)
2. **DNS** (domain registrar / Cloudflare-e):
   - `shukhilife.com` → VPS IP (A record)
   - `www.shukhilife.com` → VPS IP (A record)
   - (api.* subdomain lagbe NA — same-origin setup)

> Site user / path ber korte, SSH kore: `whoami` ar `pwd` (htdocs-e thakle).
> Niche `<SITE_USER>` ar `<APP_DIR>` (= `/home/<SITE_USER>/htdocs/shukhilife.com`) bole reference korbo.

---

## 2. Code clone (site user hisebe)

CloudPanel site user hisebe SSH koro (root hole: `su - <SITE_USER>`). htdocs-e default
`index.html` thakle sorano lagbe.

```bash
cd /home/<SITE_USER>/htdocs/shukhilife.com
rm -f index.html

# Private repo — Personal Access Token (PAT) diye clone (repo scope)
git clone https://<GITHUB_TOKEN>@github.com/afnan-mahmud/shukhi-life.git .
# (sesher '.' = current dir-e clone, notun folder banabe na)
```

---

## 3. Node + pnpm

```bash
node -v          # v20.x ba v22.x dekhabe (CloudPanel-e site-er jonno set kora)
npm install -g pnpm
pnpm -v
```

> `EACCES`/permission error hole: `corepack enable && corepack prepare pnpm@latest --activate`.

---

## 4. Environment variables

### API (`apps/api/.env`)

```bash
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
```

Fill koro (`.env.example`-e production values already ase):

```env
NODE_ENV=production
PORT=3031
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/shukhilife?appName=Cluster0
JWT_ACCESS_SECRET=<32+ char random>
JWT_REFRESH_SECRET=<32+ char random>
ENCRYPTION_KEY=<64 char hex>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STEADFAST_BASE_URL=https://portal.packzy.com/api/v1
PUBLIC_API_URL=https://shukhilife.com
COOKIE_DOMAIN=shukhilife.com
CORS_ORIGIN=https://shukhilife.com
```

> Random secret banate: `openssl rand -hex 32` (secrets), `openssl rand -hex 32` (ENCRYPTION_KEY = 64 hex chars).

### Web (`apps/web/.env.local`)

```bash
cp apps/web/.env.example apps/web/.env.local
nano apps/web/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://shukhilife.com
NEXT_PUBLIC_SITE_URL=https://shukhilife.com
NEXT_PUBLIC_META_PIXEL_ID=<pixel id>
META_PIXEL_ID=<pixel id>
META_CAPI_TOKEN=<meta capi token>
META_TEST_EVENT_CODE=
NEXT_PUBLIC_GTM_ID=<gtm id>
```

---

## 5. Build + PM2 start

```bash
cd /home/<SITE_USER>/htdocs/shukhilife.com

pnpm install --frozen-lockfile

# Build (order: types → api → web)
pnpm --filter @shukhilife/types build 2>/dev/null || true
pnpm --filter @shukhilife/config build 2>/dev/null || true
pnpm --filter @shukhilife/api build
pnpm --filter @shukhilife/web build

# PM2 install (site user) + start
npm install -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Boot-e auto-start korte:

```bash
pm2 startup
# ↑ eta ekta 'sudo env PATH=... pm2 startup systemd -u <SITE_USER> --hp /home/<SITE_USER>'
#   command print korbe — seta ROOT hisebe ekbar run koro (sudo access lagbe).
```

Check:

```bash
pm2 status                      # shukhilife-api + shukhilife-web -> online thakbe
curl -I http://127.0.0.1:3030   # web (200)
curl  http://127.0.0.1:3031/api/health   # api (200 JSON)
```

> Memory build-e kom porle (Next.js OOM): `NODE_OPTIONS="--max-old-space-size=1536" pnpm --filter @shukhilife/web build`

---

## 6. CloudPanel Vhost — `/api` routing add koro

CloudPanel → **Sites → shukhilife.com → Vhost** tab. Default vhost-e `location / { proxy_pass
http://127.0.0.1:3030; ... }` ase. Tar **upore** ei duto block add koro:

```nginx
# Next.js-er nijer CAPI route — exact match, tai eta /api/ rule-er age priority pay
location = /api/capi {
    proxy_pass http://127.0.0.1:3030;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Express API — baki sob /api/...
location /api/ {
    proxy_pass http://127.0.0.1:3031;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25m;   # product image upload-er jonno
}

# Uploaded product images (Express serves apps/api/uploads at /uploads)
location /uploads/ {
    proxy_pass http://127.0.0.1:3031;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> `proxy_pass`-e trailing path (jemon `/api/`) **deba na** — URI ja ase tai Express-e pathate hobe
> (Express `/api` te mount kora). Save korle CloudPanel nije `nginx -t` + reload korbe.

---

## 7. SSL (HTTPS)

DNS propagate howar por (5–15 min): CloudPanel → **Sites → shukhilife.com → SSL/TLS →
Actions → New Let's Encrypt Certificate** (`shukhilife.com` + `www.shukhilife.com` select koro).
CloudPanel auto-renew korbe. **Manual `certbot` chalabe na.**

---

## 8. Verify (live)

```
https://shukhilife.com                 → homepage (Shukhi Life branding, logo)
https://shukhilife.com/api/health      → {"data":{"status":"ok"...}} (Express)
https://shukhilife.com/admin/login     → admin panel (admin@shukhilife.com / Admin@1234)
```

Browser DevTools → Network-e dekho: products/login call-gula `shukhilife.com/api/...` → 200.

> **Admin password** prothom login-er por obosshoi change koro (Users page theke).

---

## 9. Auto-deploy (GitHub Actions) — optional

`.github/workflows/deploy.yml` already ache. CI chालু korte repo → **Settings → Secrets and
variables → Actions**-e ei secrets add koro:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | VPS IP |
| `VPS_USER` | `<SITE_USER>` (root NOY — htdocs-er malik user) |
| `VPS_SSH_KEY` | private key (jar public key `<SITE_USER>`-er `~/.ssh/authorized_keys`-e ache) |
| `VPS_PORT` | `22` |
| `VPS_APP_DIR` | `/home/<SITE_USER>/htdocs/shukhilife.com` |

Deploy key banate (VPS-e, site user hisebe):

```bash
ssh-keygen -t ed25519 -C "gha-deploy" -f ~/.ssh/gha_deploy -N ""
cat ~/.ssh/gha_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/gha_deploy        # ei private key VPS_SSH_KEY secret-e dao
```

Erpor `git push origin main` korlei VPS-e `deploy.sh` cholbe (pull → build → `pm2 reload`).

**Manual deploy** (CI chara): `cd <APP_DIR> && bash deploy.sh`

---

## 10. Troubleshooting

| Somossa | Fix |
|---------|-----|
| `502 Bad Gateway` | `pm2 status` — app down? `pm2 restart all`. Port thik? `ss -tlnp \| grep -E '3030\|3031'` |
| Port 3031 already in use | Onno site use korche — ecosystem.config.cjs + apps/api/.env + Vhost-e notun free port dao (`ss -tlnp` diye free port khojo) |
| `/api/...` → Next 404 page | Vhost-e `/api/` block add hoy nai / `location /`-er niche chole geche. Block ta upore rakho, save koro |
| Meta CAPI kaj korche na | `location = /api/capi` block missing — eta `/api/` block-er age thakte hobe |
| Admin login cookie tikche na | `.env`-e `COOKIE_DOMAIN=shukhilife.com`, `CORS_ORIGIN=https://shukhilife.com`, SSL active ache check koro |
| PM2 boot-e start hoy na | `pm2 startup` je sudo command dey seta root hisebe run + `pm2 save` |
| Build OOM | `NODE_OPTIONS="--max-old-space-size=1536" pnpm --filter @shukhilife/web build` |

### Useful commands

```bash
pm2 status
pm2 logs shukhilife-api --lines 50
pm2 logs shukhilife-web --lines 50
pm2 reload ecosystem.config.cjs --env production
ss -tlnp | grep -E '3030|3031'      # port check
```
