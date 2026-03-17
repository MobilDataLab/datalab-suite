#!/bin/bash
# DATALAB SUITE — Backup manual
# Uso: bash scripts/backup.sh "descripcion"

set -e
DESCRIPTION=${1:-"manual-backup"}
DATE=$(date +'%Y-%m-%d_%H-%M')
BRANCH="backup/${DATE}-${DESCRIPTION// /-}"
echo "Creando backup: $BRANCH"
git checkout -b "$BRANCH"
git push origin "$BRANCH"
git checkout main
echo "Backup completado en rama: $BRANCH"
