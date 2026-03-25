#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Setting up Next.js + Supabase Starter App..."

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm is required but not found. Install Node.js first."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "❌ npx is required but not found. Install Node.js first."
  exit 1
fi

echo "📦 Installing npm dependencies..."
npm install

echo "📝 Ensuring .env.local exists..."
if [[ ! -f .env.local ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env.local
    echo "ℹ️ Created .env.local from .env.example"
  else
    touch .env.local
    echo "ℹ️ Created empty .env.local"
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "⚠️ Docker is not installed. Skipping Supabase startup and migration steps."
  echo "   Install Docker Desktop, start it, then rerun ./setup.sh"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "⚠️ Docker daemon is not running. Skipping Supabase startup and migration steps."
  echo "   Start Docker Desktop, then rerun ./setup.sh"
  exit 0
fi

print_port_conflict_help() {
  echo "⚠️ Port conflict detected: 54322 is already allocated."
  echo "🔎 Process using 54322:"
  lsof -nP -iTCP:54322 -sTCP:LISTEN || true
  echo "🔎 Docker containers publishing 54322:"
  docker ps --format '{{.Names}}\t{{.Ports}}' | grep '54322->' || echo "(none found)"
  echo "🛠️ Suggested fix commands:"
  echo "   npx supabase stop --all"
  echo "   docker ps --format '{{.Names}} {{.Ports}}' | grep 54322"
  echo "   docker stop <container_name>"
  echo "   ./setup.sh"
}

start_supabase_stack() {
  local start_output

  if start_output="$(npx supabase start 2>&1)"; then
    echo "$start_output"
    return 0
  fi

  echo "$start_output"

  if echo "$start_output" | grep -qi "port is already allocated"; then
    echo "⚠️ Attempting automatic recovery by stopping existing local Supabase stacks..."
    npx supabase stop --all >/dev/null 2>&1 || true

    if start_output="$(npx supabase start 2>&1)"; then
      echo "$start_output"
      return 0
    fi

    echo "$start_output"
    print_port_conflict_help
  fi

  return 1
}

echo "🏃 Ensuring local Supabase is running..."
if npx supabase status >/dev/null 2>&1; then
  echo "ℹ️ Supabase is already running."
else
  if ! start_supabase_stack; then
    echo "❌ Unable to start local Supabase."
    exit 1
  fi
fi

STATUS_OUTPUT="$(npx supabase status)"
SUPABASE_URL="$(echo "$STATUS_OUTPUT" | awk '/Project URL|API URL/ {for (i = 1; i <= NF; i++) if ($i ~ /^https?:\/\//) {print $i; exit}}')"
SUPABASE_ANON_KEY="$(echo "$STATUS_OUTPUT" | awk '/Publishable|anon key/ {for (i = 1; i <= NF; i++) if ($i ~ /^sb_publishable_/ || $i ~ /^eyJ/) {print $i; exit}}')"

if [[ -z "${SUPABASE_URL}" || -z "${SUPABASE_ANON_KEY}" ]]; then
  echo "❌ Could not extract Supabase URL and publishable/anon key from 'supabase status'."
  echo "Run 'npx supabase status' manually and verify your local stack."
  exit 1
fi

echo "📝 Creating/updating .env.local with Supabase credentials..."

upsert_env() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" .env.local; then
    perl -0pi -e "s|^${key}=.*$|${key}=${value}|m" .env.local
  else
    echo "${key}=${value}" >> .env.local
  fi
}

upsert_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
upsert_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
upsert_env "NEXT_PUBLIC_SITE_URL" "http://localhost:3000"

echo "🗄️ Running local migrations..."
npx supabase db reset --local --yes

echo "✅ Setup complete!"
echo "📖 Next steps:"
echo "   1. npm run dev"
echo "   2. Visit http://localhost:3000"
echo "   3. Sign up, then view /dashboard and /profile"
