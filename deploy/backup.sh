#!/usr/bin/env bash
# Nightly backup of the AuditKit container's /data. Keeps 14 local snapshots. Off-site copy is [OWNER: pick rclone remote].
# Cron on the VPS:  15 4 * * * /opt/auditkit/src/deploy/backup.sh >> /var/log/auditkit-backup.log 2>&1
set -euo pipefail
OUT=/opt/auditkit/backups
mkdir -p "$OUT"
docker exec auditkit node scripts/backup.mjs /data /tmp/backup
docker cp auditkit:/tmp/backup/. "$OUT/"
docker exec auditkit rm -rf /tmp/backup
ls -1dt "$OUT"/*/ | tail -n +15 | xargs -r rm -rf
# [OWNER] off-site: rclone sync "$OUT" b2:auditkit-backups --fast-list
echo "ok $(date -Is) $(du -sh "$OUT" | cut -f1)"
