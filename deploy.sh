#!/bin/bash
# ══════════════════════════════════════════════════════════
#  Freebuff Music Player — One-Click VPS Deploy
#  Target: 40.82.129.6
#  Stack:  Docker + Nginx + Next.js
# ══════════════════════════════════════════════════════════

set -e

echo ""
echo "🎵 Freebuff Music Player — VPS Deployment"
echo "==========================================="
echo ""

# ── 1. Update system ─────────────────────────────────────
echo "📦 [1/6] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq > /dev/null 2>&1
echo "   ✅ System updated"

# ── 2. Install Docker ────────────────────────────────────
echo "🐳 [2/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
    systemctl enable docker
    systemctl start docker
    echo "   ✅ Docker installed"
else
    echo "   ✅ Docker already installed"
fi

# ── 3. Install Docker Compose ────────────────────────────
echo "🔧 [3/6] Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1
    echo "   ✅ Docker Compose installed"
else
    echo "   ✅ Docker Compose already installed"
fi

# ── 4. Install Nginx (host level) ────────────────────────
echo "🌐 [4/6] Installing Nginx on host..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y -qq nginx > /dev/null 2>&1
    systemctl enable nginx
    echo "   ✅ Nginx installed"
else
    echo "   ✅ Nginx already installed"
fi

# ── 5. Configure host Nginx ──────────────────────────────
echo "⚙️  [5/6] Configuring host Nginx..."
cat > /etc/nginx/sites-available/musicplayer << 'NGINX_HOST'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_HOST

# Enable the site
ln -sf /etc/nginx/sites-available/musicplayer /etc/nginx/sites-enabled/musicplayer
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx > /dev/null 2>&1
echo "   ✅ Host Nginx configured"

# ── 6. Deploy with Docker ────────────────────────────────
echo "🚀 [6/6] Building and deploying with Docker..."
cd /root/musicplayer 2>/dev/null || cd /opt/musicplayer 2>/dev/null || cd "$(dirname "$0")"

# Stop old containers
docker compose down 2>/dev/null || true

# Build and start
docker compose up -d --build 2>&1 | tail -5
echo "   ✅ Containers started"

# ── Done ─────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🌐 Website:  http://40.82.129.6"
echo "📡 Appwrite: http://40.82.129.6/v1"
echo ""
echo "📋 Container status:"
docker compose ps
echo ""
echo "📊 To view logs:     docker compose logs -f"
echo "🔄 To restart:       docker compose restart"
echo "🛑 To stop:          docker compose down"
echo ""
