#!/usr/bin/env bash
# Monitora o ambiente Docker de desenvolvimento (docker-compose.dev.yml).
#
# Uso:
#   ./scripts/docker-monitor.sh           # status + logs da API em tempo real
#   ./scripts/docker-monitor.sh status    # só o painel de status
#   ./scripts/docker-monitor.sh logs      # só os logs da API em tempo real
#   ./scripts/docker-monitor.sh errors    # logs em tempo real filtrando erros/warnings

set -uo pipefail

cd "$(dirname "$0")/.."

API=letscom-api-dev
DB=letscom-bd-dev
REDIS=letscom-redis-dev

## lê variáveis do .env sem expor nada além do necessário
APP_PORT=$(grep -E '^APP_PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '"' || true)
APP_CONTEXT=$(grep -E '^APP_CONTEXT=' .env 2>/dev/null | cut -d= -f2 | tr -d '"' || true)
APP_PORT=${APP_PORT:-8000}
API_URL="http://localhost:${APP_PORT}/${APP_CONTEXT}/docs"

GREEN='\033[32m'; RED='\033[31m'; YELLOW='\033[33m'; BOLD='\033[1m'; RESET='\033[0m'

container_status() {
  local name=$1 state health
  state=$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null) || { echo -e "${RED}não existe${RESET}"; return; }
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$name" 2>/dev/null)
  case "$state/$health" in
    running/healthy|running/) echo -e "${GREEN}${state}${health:+ ($health)}${RESET}" ;;
    running/*)                echo -e "${YELLOW}${state} ($health)${RESET}" ;;
    *)                        echo -e "${RED}${state}${RESET}" ;;
  esac
}

status() {
  echo -e "${BOLD}== Containers ==${RESET}"
  for c in "$API" "$DB" "$REDIS"; do
    printf "  %-20s %b\n" "$c" "$(container_status "$c")"
  done

  echo -e "\n${BOLD}== API ==${RESET}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$API_URL" || echo 000)
  if [ "$code" = "200" ]; then
    echo -e "  ${API_URL}  ${GREEN}HTTP ${code}${RESET}"
  else
    echo -e "  ${API_URL}  ${RED}HTTP ${code}${RESET}"
  fi

  echo -e "\n${BOLD}== Recursos ==${RESET}"
  docker stats --no-stream --format '{{.Name}}\tCPU {{.CPUPerc}}\tRAM {{.MemUsage}}' "$API" "$DB" "$REDIS" 2>/dev/null \
    | sed 's/^/  /' || echo "  (containers parados)"
  echo
}

logs() {
  echo -e "${BOLD}== Logs de ${API} (Ctrl+C para sair) ==${RESET}"
  docker logs -f --tail 50 "$API"
}

errors() {
  echo -e "${BOLD}== Erros/warnings de ${API} (Ctrl+C para sair) ==${RESET}"
  docker logs -f --tail 200 "$API" 2>&1 | grep --line-buffered -iE 'error|warn|exception|fail'
}

case "${1:-all}" in
  status) status ;;
  logs)   logs ;;
  errors) errors ;;
  all)    status; logs ;;
  *) echo "uso: $0 [status|logs|errors]"; exit 1 ;;
esac
