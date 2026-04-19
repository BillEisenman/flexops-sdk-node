#!/usr/bin/env node

/**
 * FlexOps SDK — OpenAPI Spec Pre-processor
 *
 * Reads the raw Gateway API spec and VisionSuite Core Services specs (V1–V5),
 * cleans up .NET-generated schema names, adds deterministic operationIds,
 * prefixes VisionSuite paths for the Gateway ApiProxy route, and writes
 * a single unified spec to specs/processed/flexops-unified.json.
 *
 * Usage:
 *   node scripts/preprocess-specs.mjs [--gateway path/to/gateway-spec.json]
 *
 * If --gateway is omitted, only VisionSuite specs are merged.
 * Run `scripts/export-gateway-spec.sh` first to fetch the live Gateway spec.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const RAW = resolve(ROOT, 'specs/raw');
const OUT = resolve(ROOT, 'specs/processed');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clean .NET fully-qualified schema names to simple PascalCase. */
function cleanSchemaName(name) {
  // "Shared.Models.DTOs.ApiResponse`1[[System.Object, ...]]" → "ApiResponseOfObject"
  // "Shared.Models.DTOs.ChangePasswordRequest" → "ChangePasswordRequest"
  // "Shared.Data.Entities.Workspace" → "Workspace"

  // Strip namespace prefixes
  let clean = name.replace(/^[A-Za-z]+(\.[A-Za-z]+)*\./g, '');

  // Handle generic types: ApiResponse`1[[System.Object, ...]] → ApiResponseOfObject
  const genericMatch = clean.match(/^(.+?)`\d+\[\[(.+?),/);
  if (genericMatch) {
    const baseName = genericMatch[1];
    let typeArg = genericMatch[2];
    // Extract just the type name from "System.Object" etc.
    typeArg = typeArg.replace(/^.*\./, '');
    // Special cases
    if (typeArg === 'Object') typeArg = 'Object';
    if (typeArg === 'String') typeArg = 'String';
    clean = `${baseName}Of${typeArg}`;
  }

  // Remove any remaining backticks or brackets
  clean = clean.replace(/[`\[\],\s]/g, '');

  return clean;
}

/** Generate a deterministic operationId from HTTP method, tag, and path. */
function generateOperationId(method, path, tag) {
  // /api/v3/Shipping/postUspsGenerateDomesticShippingLabel → postUspsGenerateDomesticShippingLabel
  // /api/Account/login → Account_login
  const segments = path.split('/').filter(Boolean);

  // For VisionSuite paths, the last segment is usually the method name
  const lastSegment = segments[segments.length - 1] ?? '';

  // If the last segment starts with a verb prefix, use it directly
  const verbPrefixes = ['get', 'post', 'put', 'patch', 'delete', 'cancel'];
  if (verbPrefixes.some(v => lastSegment.startsWith(v))) {
    return lastSegment;
  }

  // For Gateway paths, use Tag_MethodName pattern
  if (tag) {
    // /api/Account/change-password POST → Account_changePassword
    const methodName = lastSegment
      .replace(/{.*}/g, 'ById')
      .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return `${tag}_${method}${methodName.charAt(0).toUpperCase()}${methodName.slice(1)}`;
  }

  return `${method}_${lastSegment}`;
}

/** Rewrite all $ref values in an object tree. */
function rewriteRefs(obj, nameMap) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => rewriteRefs(item, nameMap));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string') {
      const prefix = '#/components/schemas/';
      if (value.startsWith(prefix)) {
        const oldName = value.slice(prefix.length);
        const newName = nameMap.get(oldName) ?? oldName;
        result[key] = `${prefix}${newName}`;
      } else {
        result[key] = value;
      }
    } else {
      result[key] = rewriteRefs(value, nameMap);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const gatewayIdx = args.indexOf('--gateway');
  const gatewaySpecPath = gatewayIdx !== -1 ? resolve(args[gatewayIdx + 1]) : null;

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  // Unified spec skeleton
  const unified = {
    openapi: '3.0.3',
    info: {
      title: 'FlexOps Platform API',
      description:
        'Unified API for the FlexOps multi-carrier shipping platform. ' +
        'Includes Gateway endpoints (auth, workspaces, billing, webhooks) ' +
        'and Core Services endpoints (USPS, UPS, FedEx, DHL carrier operations).',
      version: '1.0.0',
      contact: { name: 'FlexOps', url: 'https://flexops.io' },
      license: { name: 'Proprietary' },
    },
    servers: [
      { url: 'https://gateway.flexops.io', description: 'Production' },
      { url: 'http://localhost:5000', description: 'Local development' },
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from POST /api/Account/login',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Api-Key',
          description: 'Workspace API key from the API Keys management endpoint',
        },
      },
    },
    security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
    tags: [],
  };

  const schemaNameMap = new Map();
  const seenTags = new Set();
  const seenOperationIds = new Set();

  // ------- 1. Process Gateway spec (if available) -------
  if (gatewaySpecPath && existsSync(gatewaySpecPath)) {
    console.log(`Processing Gateway spec: ${gatewaySpecPath}`);
    const gw = JSON.parse(readFileSync(gatewaySpecPath, 'utf-8'));

    // Collect and rename schemas
    if (gw.components?.schemas) {
      for (const [oldName, schema] of Object.entries(gw.components.schemas)) {
        const newName = cleanSchemaName(oldName);
        schemaNameMap.set(oldName, newName);
        unified.components.schemas[newName] = schema;
      }
    }

    // Rewrite refs in schemas
    for (const [name, schema] of Object.entries(unified.components.schemas)) {
      unified.components.schemas[name] = rewriteRefs(schema, schemaNameMap);
    }

    // Process paths
    for (const [path, methods] of Object.entries(gw.paths)) {
      const cleanedMethods = {};
      for (const [method, operation] of Object.entries(methods)) {
        if (method === 'parameters') {
          cleanedMethods[method] = operation;
          continue;
        }

        const tag = operation.tags?.[0] ?? 'Gateway';
        if (!seenTags.has(tag)) {
          seenTags.add(tag);
          unified.tags.push({ name: tag, description: `${tag} operations` });
        }

        // Add operationId if missing
        if (!operation.operationId) {
          let opId = generateOperationId(method, path, tag);
          // Deduplicate
          let suffix = 1;
          const baseOpId = opId;
          while (seenOperationIds.has(opId)) {
            opId = `${baseOpId}_${suffix++}`;
          }
          seenOperationIds.add(opId);
          operation.operationId = opId;
        } else {
          seenOperationIds.add(operation.operationId);
        }

        // Rewrite $refs
        cleanedMethods[method] = rewriteRefs(operation, schemaNameMap);
      }
      unified.paths[path] = cleanedMethods;
    }

    console.log(`  Gateway: ${Object.keys(gw.paths).length} paths, ${schemaNameMap.size} schemas`);
  } else {
    console.log('No Gateway spec provided (use --gateway path/to/spec.json)');
  }

  // ------- 2. Process VisionSuite Core Services specs (V1–V5) -------
  const coreVersions = [1, 2, 3, 4, 5];
  const tagDescriptions = {
    // V1
    Inventory: 'Warehouse inventory management',
    Order: 'Order lifecycle management',
    Return: 'Returns processing',
    Rma: 'RMA (Return Merchandise Authorization) management',
    Serial: 'Serial number scanning operations',
    Shipping: 'Shipping and label operations',
    // V2
    ShippingLabel: 'Carrier-specific shipping label operations (DHL, UPS)',
    Files: 'File download operations',
    // V3
    AddressValidation: 'Address validation and correction (FedEx, USPS)',
    CarrierPickup: 'Carrier pickup scheduling (FedEx, USPS)',
    Freight: 'Freight shipping operations (FedEx)',
    GroundClose: 'FedEx Ground close/manifest operations',
    LocationSearch: 'Carrier location search (FedEx, USPS)',
    OpenShip: 'FedEx Open Ship multi-package operations',
    RateCalculator: 'Rate calculation and pricing (FedEx, USPS)',
    ServiceStandards: 'Service standards and transit times',
    ScanForm: 'USPS scan form / manifest creation',
    Subscription: 'USPS tracking subscriptions',
    Tracking: 'Package tracking (FedEx, USPS)',
    Trade: 'International trade documents (FedEx)',
    UspsContainers: 'USPS container/manifest management',
    // V4
    Analytics: 'Shipping, order, and performance analytics',
    Observability: 'System observability and health status',
    // V5
    LabelUsage: 'Label usage metering and overage tracking',
  };

  for (const version of coreVersions) {
    const specPath = resolve(RAW, `swagger_V${version}.json`);
    if (!existsSync(specPath)) {
      console.log(`  V${version}: not found, skipping`);
      continue;
    }

    const spec = JSON.parse(readFileSync(specPath, 'utf-8'));
    console.log(`Processing VisionSuite V${version}: ${Object.keys(spec.paths).length} paths`);

    // Collect schemas (with version prefix to avoid collisions)
    if (spec.components?.schemas) {
      for (const [oldName, schema] of Object.entries(spec.components.schemas)) {
        let newName = cleanSchemaName(oldName);
        // Add version prefix if collision
        if (unified.components.schemas[newName] && !schemaNameMap.has(oldName)) {
          newName = `V${version}${newName}`;
        }
        schemaNameMap.set(oldName, newName);
        unified.components.schemas[newName] = rewriteRefs(schema, schemaNameMap);
      }
    }

    // Process paths — prefix with /api/ApiProxy to match Gateway proxy route
    for (const [path, methods] of Object.entries(spec.paths)) {
      // The Gateway proxies these at /api/ApiProxy/{original-path-without-leading-slash}
      const proxyPath = `/api/ApiProxy${path}`;

      const cleanedMethods = {};
      for (const [method, operation] of Object.entries(methods)) {
        if (method === 'parameters') {
          cleanedMethods[method] = operation;
          continue;
        }

        const tag = operation.tags?.[0] ?? `CoreV${version}`;
        if (!seenTags.has(tag)) {
          seenTags.add(tag);
          unified.tags.push({
            name: tag,
            description: tagDescriptions[tag] ?? `${tag} operations (V${version})`,
          });
        }

        // Generate operationId from the endpoint name
        let opId = generateOperationId(method, path, tag);
        let suffix = 1;
        const baseOpId = opId;
        while (seenOperationIds.has(opId)) {
          opId = `${baseOpId}_${suffix++}`;
        }
        seenOperationIds.add(opId);
        operation.operationId = opId;

        // Add version info
        operation['x-api-version'] = version;

        // Rewrite $refs
        cleanedMethods[method] = rewriteRefs(operation, schemaNameMap);
      }
      unified.paths[proxyPath] = cleanedMethods;
    }
  }

  // ------- 3. Sort tags alphabetically -------
  unified.tags.sort((a, b) => a.name.localeCompare(b.name));

  // ------- 4. Write output -------
  const outputPath = resolve(OUT, 'flexops-unified.json');
  writeFileSync(outputPath, JSON.stringify(unified, null, 2), 'utf-8');

  const pathCount = Object.keys(unified.paths).length;
  const schemaCount = Object.keys(unified.components.schemas).length;
  const tagCount = unified.tags.length;

  console.log(`\nUnified spec written to: ${outputPath}`);
  console.log(`  Paths: ${pathCount}`);
  console.log(`  Schemas: ${schemaCount}`);
  console.log(`  Tags: ${tagCount}`);
  console.log(`  Operation IDs: ${seenOperationIds.size}`);
}

main();
