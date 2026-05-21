# Deployment Guide — Cholon Bil Organic

**Stack:** Next.js 14 + Express.js (pnpm monorepo)  
**Server:** Hostinger KVM2 VPS — Ubuntu 24 LTS  
**Repo:** https://github.com/afnan-mahmud/cholonbil-organic  
**CI/CD:** GitHub Actions → SSH deploy on push to `main`

---

## Table of Contents

1. [GitHub-এ প্রথমবার Code Push করা](#1-github-এ-প্রথমবার-code-push-করা)
2. [VPS Initial Setup](#2-vps-initial-setup)
3. [GitHub Actions CI/CD Setup](#3-github-actions-cicd-setup)
4. [প্রতিদিনের Workflow](#4-প্রতিদিনের-workflow)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. GitHub-এ প্রথমবার Code Push করা

### Step 1.1 — Local machine-এ Git initialize করো

Project folder-এ যাও এবং Git setup করো:

```bash
cd /path/to/cholonbil-organic

# Git initialize করো (যদি না থাকে)
git init

# .gitignore আছে কিনা চেক করো — না থাকলে নিচেরটা তৈরি করো
```

**`.gitignore`** (root-এ রাখো):
```
node_modules/
.next/
dist/
.env
.env.local
.env*.local
*.log
.DS_Store
apps/api/dist/
packages/*/dist/
```

### Step 1.2 — Remote repository যোগ করো

```bash
git remote add origin https://github.com/afnan-mahmud/cholonbil-organic.git

# verify করো
git remote -v
```

### Step 1.3 — প্রথম commit এবং push

```bash
git add .
git commit -m "initial commit"
git branch -M main
git push -u origin main
```

> **Note:** GitHub password দিয়ে push হয় না — Personal Access Token (PAT) লাগবে।  
> GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic)  
> Scope: `repo` চেক করো। Token টা password-এর জায়গায় ব্যবহার করো।

---

## 2. VPS Initial Setup

এটা **একবারই** করতে হবে।

### Step 2.1 — VPS-এ SSH করো

```bash
ssh root@YOUR_VPS_IP
```

Hostinger dashboard থেকে VPS IP এবং root password পাবে।

### Step 2.2 — System update ও basic tools install

```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx ufw
```

### Step 2.3 — Node.js 20 LTS install করো

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x.x দেখাবে
npm -v
```

### Step 2.4 — pnpm install করো

```bash
npm install -g pnpm
pnpm -v   # 9.x.x দেখাবে
```

### Step 2.5 — PM2 install করো

```bash
npm install -g pm2
pm2 -v
```

### Step 2.6 — Log directory তৈরি করো

```bash
mkdir -p /var/log/pm2
```

### Step 2.7 — Firewall configure করো

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

### Step 2.8 — GitHub থেকে Code Clone করো

```bash
mkdir -p /var/www
cd /var/www

# Private repo হওয়ায় deploy key দরকার (Step 3.1-এ বানাবো)
# এখন আপাতত Personal Access Token দিয়েও করা যাবে:
git clone https://YOUR_GITHUB_TOKEN@github.com/afnan-mahmud/cholonbil-organic.git cholonbil
cd cholonbil
```

### Step 2.9 — Environment variables সেট করো

```bash
# API-এর জন্য
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
```

নিচের values গুলো fill করো:
```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/cholonbil
JWT_ACCESS_SECRET=your_32_char_random_secret_here
JWT_REFRESH_SECRET=your_32_char_random_secret_here
ENCRYPTION_KEY=your_64_char_hex_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STEADFAST_BASE_URL=https://portal.packzy.com/api/v1
COOKIE_DOMAIN=.cholonbilorganic.com
CORS_ORIGIN=https://cholonbilorganic.com
```

```bash
# Web-এর জন্য
cp apps/web/.env.example apps/web/.env.local 2>/dev/null || touch apps/web/.env.local
nano apps/web/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.cholonbilorganic.com
NEXT_PUBLIC_SITE_URL=https://cholonbilorganic.com
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id_here
```

### Step 2.10 — প্রথমবার Build ও Start করো

```bash
cd /var/www/cholonbil

# Dependencies install
pnpm install --frozen-lockfile

# Build করো
pnpm --filter @cholonbil/types build 2>/dev/null || true
pnpm --filter @cholonbil/api build
pnpm --filter @cholonbil/web build

# PM2 দিয়ে start করো
pm2 start ecosystem.config.cjs --env production
pm2 save

# System restart-এও auto-start হওয়ার জন্য
pm2 startup
# (উপরের command যে systemctl command দেবে সেটা copy করে run করো)
```

### Step 2.11 — Nginx configure করো

```bash
# Nginx config copy করো
cp /var/www/cholonbil/nginx.conf /etc/nginx/sites-available/cholonbilorganic.com

# Enable করো
ln -s /etc/nginx/sites-available/cholonbilorganic.com /etc/nginx/sites-enabled/

# Default config disable করো
rm -f /etc/nginx/sites-enabled/default

# Syntax check
nginx -t

# Start করো
systemctl restart nginx
systemctl enable nginx
```

### Step 2.12 — SSL Certificate (HTTPS) নাও

**আগে** Hostinger DNS-এ A record set করো:
- `cholonbilorganic.com` → VPS IP
- `www.cholonbilorganic.com` → VPS IP
- `api.cholonbilorganic.com` → VPS IP

DNS propagate হওয়ার পর (5-15 মিনিট):

```bash
certbot --nginx \
  -d cholonbilorganic.com \
  -d www.cholonbilorganic.com \
  -d api.cholonbilorganic.com \
  --email afnanmahmud.afif@gmail.com \
  --agree-tos \
  --non-interactive

# Auto-renewal test
certbot renew --dry-run
```

---

## 3. GitHub Actions CI/CD Setup

এই setup-এর পরে `git push origin main` করলে **VPS-এ automatically deploy** হবে।

### Step 3.1 — VPS-এ Deploy Key তৈরি করো

VPS-এ (root হিসেবে):

```bash
# GitHub Actions-এর জন্য dedicated SSH key তৈরি করো
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /root/.ssh/github_actions -N ""

# Public key দেখো — এটা GitHub-এ দেবে
cat /root/.ssh/github_actions.pub

# Private key দেখো — এটা GitHub Secrets-এ দেবে
cat /root/.ssh/github_actions

# VPS-এ authorized করো
cat /root/.ssh/github_actions.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

### Step 3.2 — GitHub Secrets সেট করো

GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**

| Secret Name | Value |
|-------------|-------|
| `VPS_HOST` | তোমার VPS IP address |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | `/root/.ssh/github_actions` এর পুরো content (-----BEGIN থেকে শুরু) |
| `VPS_PORT` | `22` |

### Step 3.3 — GitHub Actions Workflow file তৈরি করো

Local machine-এ এই file টা তৈরি করো:

```bash
mkdir -p .github/workflows
```

**`.github/workflows/deploy.yml`**:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script_stop: true
          script: |
            cd /var/www/cholonbil
            bash deploy.sh
```

### Step 3.4 — Workflow file push করো

```bash
git add .github/workflows/deploy.yml
git commit -m "add GitHub Actions CI/CD workflow"
git push origin main
```

Push হওয়ার সাথে সাথে GitHub Actions run হবে। GitHub repo → **Actions** tab-এ progress দেখতে পাবে।

---

## 4. প্রতিদিনের Workflow

এখন থেকে কাজের flow হবে এটা:

```
Local machine-এ code change করো
        ↓
git add .
git commit -m "your message"
git push origin main
        ↓
GitHub Actions automatically trigger হবে (1-2 মিনিট লাগবে)
        ↓
VPS-এ deploy.sh run হবে
        ↓
PM2 zero-downtime reload হবে
        ↓
Live site update!
```

### Actions tab-এ deploy status check করো

```
https://github.com/afnan-mahmud/cholonbil-organic/actions
```

Green checkmark = সফল deploy  
Red cross = কোনো error হয়েছে, log দেখো

### VPS-এ manually check করতে হলে

```bash
ssh root@YOUR_VPS_IP

# PM2 status
pm2 status

# Logs দেখো
pm2 logs cholonbil-api --lines 50
pm2 logs cholonbil-web --lines 50

# Nginx status
systemctl status nginx
```

---

## 5. Troubleshooting

### Deploy fail হলে — GitHub Actions log

Actions tab → failed job → step-এ click করলে full error দেখাবে।

### PM2 app crash হলে

```bash
ssh root@YOUR_VPS_IP
pm2 logs cholonbil-api --err --lines 100
pm2 restart cholonbil-api
```

### Nginx 502 Bad Gateway

```bash
# PM2 app চলছে কিনা check করো
pm2 status

# না চললে start করো
pm2 start ecosystem.config.cjs --env production

# Nginx restart
systemctl restart nginx
```

### Build fail হলে (Next.js out of memory)

VPS-এ RAM কম থাকলে Next.js build-এ memory issue হতে পারে:

```bash
# deploy.sh-এ web build line টা এভাবে change করো:
NODE_OPTIONS="--max-old-space-size=1536" pnpm --filter @cholonbil/web build
```

### SSH Permission denied

```bash
# VPS-এ check করো
cat /root/.ssh/authorized_keys
# github_actions.pub এর content আছে কিনা দেখো

chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
```

### SSL Certificate renew

Certbot auto-renew করে, কিন্তু manually করতে চাইলে:

```bash
certbot renew
systemctl reload nginx
```

---

## Quick Reference

| Task | Command |
|------|---------|
| VPS-এ SSH | `ssh root@YOUR_VPS_IP` |
| PM2 status | `pm2 status` |
| API logs | `pm2 logs cholonbil-api` |
| Web logs | `pm2 logs cholonbil-web` |
| Manual deploy | `cd /var/www/cholonbil && bash deploy.sh` |
| Nginx reload | `systemctl reload nginx` |
| Nginx test | `nginx -t` |
| Deploy status | https://github.com/afnan-mahmud/cholonbil-organic/actions |
