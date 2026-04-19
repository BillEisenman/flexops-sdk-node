#!/usr/bin/env bash
#
# Full SDK generation pipeline:
#   1. Pre-process specs (merge + clean)
#   2. Generate TypeScript client from unified spec
#   3. Build the SDK
#
# Usage:
#   ./scripts/generate.sh [--gateway path/to/gateway-spec.json]
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SDK_ROOT"

GATEWAY_ARG=""
if [[ "${1:-}" == "--gateway" && -n "${2:-}" ]]; then
  GATEWAY_ARG="--gateway $2"
fi

echo "=== Step 1: Pre-process specs ==="
node scripts/preprocess-specs.mjs $GATEWAY_ARG

echo ""
echo "=== Step 2: Generate TypeScript client ==="
npx @openapitools/openapi-generator-cli generate \
  -i specs/processed/flexops-unified.json \
  -g typescript-fetch \
  -o src/generated \
  --additional-properties=supportsES6=true,typescriptThreePlus=true,enumPropertyNaming=UPPERCASE,modelPropertyNaming=camelCase,prefixParameterInterfaces=true,withInterfaces=true \
  --type-mappings=DateTime=string \
  --skip-validate-spec \
  --global-property=skipFormModel=true

echo ""
echo "=== Step 3: Build SDK ==="
npm run build

echo ""
echo "=== Done ==="
echo "SDK built successfully. Output in dist/"
