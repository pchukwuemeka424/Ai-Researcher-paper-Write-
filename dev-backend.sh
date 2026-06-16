#!/usr/bin/env bash
# Start the backend with Node.js 25 (see backend/scripts/with-node.sh).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$ROOT/backend/scripts/with-node.sh" npx tsx src/index.ts
