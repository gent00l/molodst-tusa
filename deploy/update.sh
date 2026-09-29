#!/usr/bin/env bash
# Pulls the published image and restarts the service only if it actually changed.
# Cron on the node: */2 * * * * /home/mango/molodst-tusa-stack/update.sh >> /home/mango/molodst-tusa-stack/update.log 2>&1
set -uo pipefail
export PATH=/usr/bin:/bin:/usr/local/bin
cd "$(dirname "$0")"

# This node's containerd drops long layer downloads now and then; one failed pull is not news.
for i in $(seq 1 8); do
  docker compose pull molodst-tusa >/dev/null 2>&1 && break
  echo "$(date -Is) pull failed, retry $i"
  sleep 5
done

docker compose up -d molodst-tusa
docker image prune -f >/dev/null 2>&1
