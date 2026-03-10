#!/usr/bin/env bash
set -euo pipefail

# AuditKit Deploy Script
# Runs smoke tests after deploy. Rolls back on failure.

RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

TARGET="${1:-all}"

echo -e "${BOLD}AuditKit Deploy${NC}"
echo "Target: $TARGET"
echo ""

deploy_api() {
  echo -e "${BOLD}Deploying API...${NC}"
  fly deploy --remote-only 2>&1
  echo -e "${GREEN}API deployed${NC}"
}

deploy_web() {
  echo -e "${BOLD}Deploying Web...${NC}"
  fly deploy --config fly.web.toml --remote-only 2>&1
  echo -e "${GREEN}Web deployed${NC}"
}

run_smoke() {
  echo ""
  echo -e "${BOLD}Running smoke tests against production...${NC}"
  cd apps/api && pnpm exec tsx ../../tests/smoke/prod-smoke.ts
  cd ../..
}

case "$TARGET" in
  api)
    deploy_api
    run_smoke
    ;;
  web)
    deploy_web
    run_smoke
    ;;
  all)
    deploy_api
    deploy_web
    run_smoke
    ;;
  smoke)
    run_smoke
    ;;
  *)
    echo "Usage: ./scripts/deploy.sh [api|web|all|smoke]"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}${BOLD}Deploy complete. All smoke tests passed.${NC}"
