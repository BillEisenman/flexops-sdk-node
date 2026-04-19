#!/usr/bin/env bash
#
# Exports the Gateway API OpenAPI spec from the running Aspire orchestrator.
#
# Prerequisites:
#   1. Start the Aspire AppHost:
#      dotnet run --project FlexOps.Platform.AppHost
#   2. Find the Gateway URL on the Aspire Dashboard (https://localhost:17225)
#
# Usage:
#   ./scripts/export-gateway-spec.sh [GATEWAY_URL]
#
# Default: http://localhost:5000
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GATEWAY_URL="${1:-http://localhost:5000}"
OUTPUT="$SDK_ROOT/specs/raw/gateway-v1.json"

echo "Fetching OpenAPI spec from $GATEWAY_URL/swagger/v1/swagger.json ..."

if ! curl -sf "$GATEWAY_URL/swagger/v1/swagger.json" -o "$OUTPUT"; then
  echo ""
  echo "ERROR: Could not reach the Gateway API."
  echo ""
  echo "Make sure the Aspire orchestrator is running:"
  echo "  dotnet run --project FlexOps.Platform.AppHost"
  echo ""
  echo "Then find the Gateway URL on the Aspire Dashboard:"
  echo "  https://localhost:17225"
  echo ""
  echo "Pass the URL as an argument:"
  echo "  ./scripts/export-gateway-spec.sh http://localhost:XXXX"
  exit 1
fi

echo "Saved to: $OUTPUT"
echo "Paths: $(node -e "console.log(Object.keys(require('$OUTPUT').paths).length)")"
echo ""
echo "Now run: npm run preprocess -- --gateway specs/raw/gateway-v1.json"
