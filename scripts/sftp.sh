#!/bin/bash
# Load credentials from .env (NOT in git) and exec ssh-mcp on stdio.
# .env must live at the repo root and contain: SSH_HOST, SSH_PORT, SSH_USER, SSH_PASSWORD
set -a
scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "${scriptDir}/.." || exit 1
source "./.env"
set +a

exec npx sftp-ssh-mcp \
        -- \
        --host="$SSH_HOST" \
        --port="$SSH_PORT" \
        --user="$SSH_USER" \
        --password="$SSH_PASSWORD" \
        --timeout=300000 \
        --maxChars=none
