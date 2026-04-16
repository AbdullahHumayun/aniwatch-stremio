# ── Stage: FlareSolverr base (Python + headless Chrome) ─────────────────────
FROM ghcr.io/flaresolverr/flaresolverr:latest

# ── Install Node.js 20 ───────────────────────────────────────────────────────
RUN apt-get update -qq \
 && apt-get install -y --no-install-recommends curl \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# ── Install the Node.js addon ────────────────────────────────────────────────
WORKDIR /addon
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# ── Startup script ───────────────────────────────────────────────────────────
RUN chmod +x /addon/start.sh

# Render assigns PORT; the addon listens on it.
# FlareSolverr listens on 8191 internally (set by start.sh).
EXPOSE 7000

CMD ["/addon/start.sh"]
