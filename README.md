# @flexops/sdk

Official Node.js/TypeScript SDK for the [FlexOps](https://flexops.io) multi-carrier shipping platform.

## Features

- Full TypeScript support with complete type definitions
- All 4 carriers: **USPS**, **UPS**, **FedEx**, **DHL**
- High-level shipping operations (rate shopping, labels, tracking)
- Direct carrier-specific endpoint access (214 VisionSuite endpoints)
- Automatic retry with exponential backoff
- JWT and API key authentication
- Webhook signature verification (HMAC-SHA256)
- ESM and CommonJS support
- Zero external runtime dependencies

## Installation

```bash
npm install @flexops/sdk
```

## Quick Start

### API Key Authentication (server-to-server)

```typescript
import { FlexOps } from '@flexops/sdk';

const client = new FlexOps({
  apiKey: 'fxk_live_...',
  workspaceId: 'your-workspace-id',
});
```

### Email/Password Authentication

```typescript
const client = new FlexOps({
  baseUrl: 'https://gateway.flexops.io',
});

await client.auth.login({
  email: 'user@company.com',
  password: 'your-password',
});
// Token is automatically stored for subsequent requests
```

## Shipping Operations

### Rate Shopping

```typescript
// Get all available rates
const rates = await client.shipping.getRates({
  fromZip: '10001',
  toZip: '90210',
  weight: 16,
  weightUnit: 'oz',
});

// Get the single cheapest rate
const cheapest = await client.shipping.getCheapestRate({
  fromZip: '10001',
  toZip: '90210',
  weight: 16,
});

// Get the single fastest rate
const fastest = await client.shipping.getFastestRate({
  fromZip: '10001',
  toZip: '90210',
  weight: 16,
});
```

### Create a Shipping Label

```typescript
const label = await client.shipping.createLabel({
  carrier: 'USPS',
  service: 'Priority Mail',
  fromAddress: {
    name: 'Warehouse A',
    street1: '123 Ship Lane',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'US',
  },
  toAddress: {
    name: 'Jane Customer',
    street1: '456 Oak Ave',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90210',
    country: 'US',
  },
  parcel: {
    weight: 16,
    weightUnit: 'oz',
    length: 10,
    width: 8,
    height: 4,
    dimensionUnit: 'in',
  },
});

console.log(label.data.trackingNumber);
console.log(label.data.labelData); // Base64 PDF
```

### Tracking

```typescript
const tracking = await client.shipping.track('9400111899223456789012');

for (const event of tracking.data.events) {
  console.log(`${event.timestamp}: ${event.description}`);
}
```

### Address Validation

```typescript
const result = await client.shipping.validateAddress({
  name: 'John Doe',
  street1: '123 Main St',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  country: 'US',
});

if (!result.data.isValid) {
  console.log('Corrected:', result.data.correctedAddress);
}
```

### Batch Labels

```typescript
// Preview (dry-run) before purchasing
const preview = await client.shipping.previewBatch({
  items: [/* array of CreateLabelRequest */],
});

// Create the batch
const batch = await client.shipping.createBatch({
  items: [/* array of CreateLabelRequest */],
});

// Check status
const status = await client.shipping.getBatchStatus(batch.data.jobId);
```

## Direct Carrier Access

For full control, use carrier-specific endpoints:

### USPS

```typescript
// Domestic label with full USPS payload
const label = await client.carriers.usps.createDomesticLabel({
  imageType: 'PDF',
  mailClass: 'PRIORITY_MAIL',
  weightInOunces: 16,
  // ... full USPS API payload
});

// Rate calculation
const rates = await client.carriers.usps.getDomesticRates({
  originZIPCode: '10001',
  destinationZIPCode: '90210',
  weight: 1.0,
});

// Find drop-off locations
const locations = await client.carriers.usps.findDropOffLocations({
  zipCode: '10001',
});
```

### UPS

```typescript
const label = await client.carriers.ups.createLabel({ /* UPS payload */ });
const rates = await client.carriers.ups.getRates({ /* UPS payload */ });
const tracking = await client.carriers.ups.track({ trackingNumber: '1Z...' });
const transitTimes = await client.carriers.ups.getTransitTimes({ /* payload */ });
```

### FedEx

```typescript
const shipment = await client.carriers.fedex.createShipment({ /* FedEx payload */ });
const rates = await client.carriers.fedex.getRates({ /* FedEx payload */ });
const tracking = await client.carriers.fedex.track({ /* payload */ });

// Multi-package (Open Ship)
await client.carriers.fedex.createOpenShipment({ /* payload */ });
await client.carriers.fedex.addPackagesToOpenShipment({ /* payload */ });
await client.carriers.fedex.confirmOpenShipment({ /* payload */ });
```

### DHL

```typescript
const shipment = await client.carriers.dhl.createShipment({ /* DHL payload */ });
const rates = await client.carriers.dhl.getRates({ countryCode: 'US', weight: '1' });
const tracking = await client.carriers.dhl.track({ shipmentTrackingNumber: '123456' });
const landedCost = await client.carriers.dhl.calculateLandedCost({ /* payload */ });
```

## Workspace Management

```typescript
// List workspaces
const workspaces = await client.workspaces.list();

// Switch workspace
client.workspaceId = 'different-workspace-id';

// Invite a member
await client.workspaces.inviteMember('newuser@company.com', 'Member');
```

## Webhooks

```typescript
// Create a subscription
const webhook = await client.webhooks.create({
  url: 'https://your-app.com/webhooks/flexops',
  events: ['label.created', 'tracking.updated', 'shipment.delivered'],
});

// Rotate the signing secret
await client.webhooks.rotateSecret(webhook.data.id);

// Verify incoming webhook signatures in your handler
import { WebhooksResource } from '@flexops/sdk';

app.post('/webhooks/flexops', (req, res) => {
  const signature = req.headers['x-flexops-signature'];
  const isValid = WebhooksResource.verifySignature(
    JSON.stringify(req.body),
    signature,
    process.env.FLEXOPS_WEBHOOK_SECRET,
  );

  if (!isValid) return res.status(401).send('Invalid signature');
  // Process webhook...
});
```

## Curl Quickstart

Every SDK method is a thin wrapper around the FlexOps REST API. If you want to verify the API before committing to the SDK — or you're integrating from a language we don't ship a SDK for — these curl invocations hit the same endpoints:

```bash
# Shop rates across all connected carriers
curl -X POST https://gateway.flexops.io/api/workspaces/ws_abc123/shipping/rates \
  -H "X-API-Key: fxk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": {"street1": "123 Main St", "city": "New York", "state": "NY", "zip": "10001", "country": "US"},
    "toAddress":   {"street1": "456 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90210", "country": "US"},
    "parcel":      {"weight": 16, "weightUnit": "oz"}
  }'

# Create a label
curl -X POST https://gateway.flexops.io/api/workspaces/ws_abc123/shipping/labels \
  -H "X-API-Key: fxk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "carrier":  "USPS",
    "service":  "PRIORITY_MAIL",
    "fromAddress": {"name": "Warehouse", "street1": "123 Main St", "city": "New York", "state": "NY", "zip": "10001", "country": "US"},
    "toAddress":   {"name": "Customer",  "street1": "456 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90210", "country": "US"},
    "parcel":   {"weight": 16, "weightUnit": "oz"}
  }'

# Track a shipment
curl https://gateway.flexops.io/api/workspaces/ws_abc123/shipping/track/9400111899223456789012 \
  -H "X-API-Key: fxk_live_..."

# Cancel a label (via the unified carrier-agnostic endpoint)
curl -X DELETE https://gateway.flexops.io/api/v3.0/shipping/Usps/cancel/9400111899223456789012 \
  -H "X-API-Key: fxk_live_..."
```

Use an `fxk_test_...` key instead of `fxk_live_...` to hit the sandbox environment; mock carriers respond, no real charges, no real labels.

## Wallet & Billing

```typescript
const balance = await client.wallet.getBalance();
console.log(`Balance: $${balance.data.balance}`);

// Add funds
await client.wallet.addFunds(100.00);

// Configure auto-reload
await client.wallet.configureAutoReload({
  enabled: true,
  threshold: 25.00,
  amount: 100.00,
});
```

## Insurance

```typescript
// Check available providers
const providers = await client.insurance.getProviders();
// Returns ["FlexOps"] or ["FlexOps", "U-PIC"]

// Get a quote
const quote = await client.insurance.getQuote({
  carrier: 'USPS',
  declaredValue: 500.00,
  provider: 'FlexOps',
});

// Purchase insurance
const policy = await client.insurance.purchase({
  trackingNumber: '9400111899223456789012',
  carrier: 'USPS',
  declaredValue: 500.00,
});
```

## Returns & RMA

```typescript
// Create a return authorization
const rma = await client.returns.create({
  orderId: 'ORD-12345',
  reason: 'Defective product',
  items: [{ sku: 'WIDGET-001', quantity: 1 }],
});

// Approve and generate return label
await client.returns.approve(rma.data.rmaId);
await client.returns.generateLabel(rma.data.rmaId);

// Mark items as received
await client.returns.markReceived(rma.data.rmaId, [
  { sku: 'WIDGET-001', quantity: 1, condition: 'damaged' },
]);
```

## Analytics

```typescript
const trend = await client.analytics.shipmentsTrend({
  startDate: '2026-01-01',
  endDate: '2026-03-01',
  period: 'week',
});

const carriers = await client.analytics.carrierSummary();
const returns = await client.analytics.returnsMetrics();
const performance = await client.analytics.deliveryPerformance();
```

## Automation Rules

```typescript
// Create a shipping rule
await client.rules.create({
  name: 'Route light packages via USPS',
  isActive: true,
  priority: 1,
  conditions: [
    { field: 'Weight', operator: 'LessThan', value: '16' },
    { field: 'DestinationCountry', operator: 'Equals', value: 'US' },
  ],
  actions: [
    { type: 'SetCarrier', value: 'USPS' },
    { type: 'SetService', value: 'GROUND_ADVANTAGE' },
  ],
});
```

## Error Handling

```typescript
import { FlexOpsError, FlexOpsAuthError, FlexOpsRateLimitError } from '@flexops/sdk';

try {
  await client.shipping.createLabel({ /* ... */ });
} catch (error) {
  if (error instanceof FlexOpsRateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof FlexOpsAuthError) {
    console.log('Re-authenticate and try again');
  } else if (error instanceof FlexOpsError) {
    console.log(`API error ${error.status}: ${error.message}`);
    console.log('Validation errors:', error.errors);
  }
}
```

## Configuration

```typescript
const client = new FlexOps({
  baseUrl: 'https://gateway.flexops.io',  // Default
  apiKey: 'fxk_live_...',
  workspaceId: 'ws-abc123',
  timeout: 30000,                      // 30s default
  retry: {
    maxRetries: 3,                     // Default
    baseDelay: 1000,                   // 1s, exponential backoff
    retryableStatusCodes: [429, 500, 502, 503, 504],
  },
  headers: {
    'X-Custom-Header': 'value',        // Added to every request
  },
});
```

## OpenAPI Spec Generation

The SDK includes tooling to generate TypeScript types from the live API spec:

```bash
# 1. Start the FlexOps platform (Aspire orchestrator)
dotnet run --project FlexOps.Platform.AppHost

# 2. Export the Gateway API spec
./scripts/export-gateway-spec.sh http://localhost:XXXX

# 3. Pre-process and merge all specs
npm run preprocess -- --gateway specs/raw/gateway-v1.json

# 4. Generate TypeScript client (optional — for full auto-generated client)
npm run generate

# 5. Build the SDK
npm run build
```

## License

MIT © FlexOps, LLC. See [LICENSE](LICENSE) for full text.
