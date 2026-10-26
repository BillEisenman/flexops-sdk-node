# @flexops/sdk

Official Node.js/TypeScript SDK for the [FlexOps](https://flexops.io) multi-carrier shipping platform.

## Features

- Full TypeScript support with complete type definitions
- All 4 carriers: **USPS**, **UPS**, **FedEx**, **DHL**
- High-level shipping operations (rate shopping, labels, tracking)
- The documented FlexOps API only: every method is checked against the published OpenAPI in CI
- Retries that cannot buy twice: writes carry an `Idempotency-Key` (see [Retries](#retries))
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
import { FlexOps, HazmatClassification } from '@flexops/sdk';

const client = new FlexOps({
  apiKey: 'live_...',
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
const rateRequest = {
  origin: { addressLine1: '123 Main St', city: 'New York', stateProvince: 'NY', postalCode: '10001' },
  destination: { addressLine1: '456 Oak Ave', city: 'Los Angeles', stateProvince: 'CA', postalCode: '90210' },
  package: { weight: 16, weightUnit: 'oz' },
};

// Get all available rates
const rates = await client.shipping.getRates(rateRequest);

// Get the single cheapest rate
const cheapest = await client.shipping.getCheapestRate(rateRequest);

// Get the single fastest rate
const fastest = await client.shipping.getFastestRate(rateRequest);
```

### Create a Shipping Label

```typescript
const operation = await client.shipping.prepareLabel({
  ...rateRequest, carrierCode: 'USPS', serviceCode: 'PRIORITY',
  // Required without an orderId. The SDK never fills it in; None = not hazardous.
  hazmatClassification: HazmatClassification.None,
}, 10.00, crypto.randomUUID());
if (operation.preview) console.log({ quote: operation.preview.quotedPostageAmount,
  maximum: operation.preview.maximumPostageAmount, currency: operation.preview.currency,
  expiresAt: operation.preview.expiresAt }); // omit the signed token from display/logs
// Keep operation securely with the original Gateway and API-key identity.

// In a terminal example, ask explicitly before any live purchase:
const { createInterface } = await import('node:readline/promises');
const prompt = createInterface({ input: process.stdin, output: process.stdout });
try {
  const approved = operation.sandboxLabel || await prompt.question('Type approve to buy at the displayed maximum (later adjustments/fees excluded): ') === 'approve';
  if (approved) {
    const label = await client.shipping.purchaseLabel(operation);
    console.log(label.trackingNumber);
  }
} finally { prompt.close(); }
```

### Tracking

```typescript
const tracking = await client.shipping.track('9400111899223456789012');

for (const event of tracking.events) {
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

if (result.validationUnavailable) {
  console.log('Validation is unavailable right now; isValid is not a verdict.');
} else if (!result.isValid) {
  console.log('Suggested:', result.suggestedAddress, result.warnings);
}
```

### Batch Labels

Each item is an order you already have in FlexOps; the addresses come from the order. Leave out
`carrierCode` and `serviceCode` to let your shipping rules choose.

```typescript
import { HazmatClassification, type CreateBatchLabelRequest } from '@flexops/sdk';

const request: CreateBatchLabelRequest = {
  items: [
    {
      orderId: 12345,
      packageWeightInOunces: 12,
      packageLengthInInches: 10,
      packageWidthInInches: 8,
      packageHeightInInches: 4,
      carrierCode: 'USPS',
      serviceCode: 'PRIORITY',
      hazmatClassification: HazmatClassification.None,
    },
  ],
};

// Preview (dry-run): per-order rates and the total, nothing bought
const preview = await client.shipping.previewBatch(request);

// Create the batch; it runs in the background
const batch = await client.shipping.createBatch(request);

// Check status
const status = await client.shipping.getBatchStatus(batch.data!.jobId);
```

### Multi-Package Labels

One order shipped in several boxes with the same carrier and service. Each box gets its own label;
a box that fails does not stop the others. Multi-package labels cannot carry HAZMAT: send
`HazmatClassification.None` or leave `hazmatClassification` out. `maximumPostageAmount` is required: the most the
whole shipment may cost in USD (positive, at most two decimals). The Gateway refuses to buy a box that would take the
total above it (`PriceCeilingExceeded`; once the amount is used up the remaining boxes report `PriceCeilingReached`),
and a request without a valid ceiling is 400 `ApprovalRequired`.

```typescript
import { FlexOpsError, HazmatClassification } from '@flexops/sdk';

try {
  const shipment = await client.shipping.createMultiPackage(
    {
      orderId: 12345,
      carrierCode: 'USPS',
      serviceCode: 'PRIORITY',
      hazmatClassification: HazmatClassification.None,
      maximumPostageAmount: 25, // required: the most the whole shipment may cost, in USD
      packages: [
        { weightInOunces: 16, lengthInInches: 10, widthInInches: 8, heightInInches: 4, packageReference: 'Box 1 of 2' },
        { weightInOunces: 8, lengthInInches: 6, widthInInches: 6, heightInInches: 6, packageReference: 'Box 2 of 2' },
      ],
    },
    'order-12345-boxes', // optional Idempotency-Key, reuse it when you retry
  );
  // At least one label was bought; check each box
  for (const box of shipment.data!.labels) console.log(box.packageIndex, box.success, box.trackingNumber ?? box.errorMessage);
} catch (error) {
  // No label was bought: 422 AllPackagesFailed, or 409 OutcomeUnknown when a label may exist (check the order first).
  if (error instanceof FlexOpsError) console.log(error.code, error.data);
}
```

## Carrier-Specific Calls

Rates, labels, voids, pickups and scan forms go through `client.shipping`, `client.pickups` and
`client.scanForms`, which work for every carrier and with API keys. `client.carriers` reaches
carrier-specific endpoints through the Gateway's legacy pass-through, which is deprecated and
retired on 2027-06-30:

- **Lookups (GET)** work with API keys that have the permission for the data: `shipping:read` for
  address, ZIP, city, location, service point and reference lookups; `tracking:read` for tracking
  and proof of delivery; `rates:read` for delivery standards, rates and products. Without it the
  Gateway returns 403 `API_KEY_SCOPE_REQUIRED`.
- **Writes** (for example `carriers.usps.getDomesticRates`, `carriers.fedex.createPickup`) are marked
  `@deprecated`. They need a user token (`auth.login`): the Gateway answers an API key with 403
  `API_KEY_SCOPE_REQUIRED`. Move them to the native resources above.
- **Label purchases** through the pass-through are closed by the Gateway (410), so the SDK has no
  carrier-specific label methods; buy labels with `client.shipping.createLabel`.

```typescript
const city = await client.carriers.usps.cityStateLookup('10001');
const locations = await client.carriers.usps.findDropOffLocations({ zipCode: '10001' });
const upsTracking = await client.carriers.ups.track({ trackingNumber: '1Z...' });
const dhlRates = await client.carriers.dhl.getRates({ countryCode: 'US', weight: '1' });
```

## Workspace Management

```typescript
import { WorkspaceRole } from '@flexops/sdk';

// List workspaces
const workspaces = await client.workspaces.list();

// Switch workspace
client.workspaceId = 'different-workspace-id';

// Members and pending invites
const { data } = await client.workspaces.listMembers();
console.log(data.members.length, data.pendingInvites.length);

// Invite a member (roles are numbers on the wire; use WorkspaceRole)
await client.workspaces.inviteMember('newuser@company.com', WorkspaceRole.Member);
```

## Webhooks

Managing webhooks needs a signed-in user's access token. The Gateway refuses API keys on every webhook
route, reads included (`list()` and `listDeliveryLogs()` as well as create, update, delete, `rotateSecret()`
and `test()`), with `403` `SIGNED_IN_USER_REQUIRED`, whatever the key's scopes. Reads are refused too because
webhook delivery logs carry each delivery's payload (order and customer data). A client with an API key
sends the key even when an access token is also set, so use a client configured without `apiKey`.
Verifying deliveries (below) makes no request and needs no credentials.

```typescript
import { FlexOps, WebhookEventType } from '@flexops/sdk';

// Sign in as a user (or pass `accessToken`); an API key gets 403 SIGNED_IN_USER_REQUIRED here.
const client = new FlexOps({ workspaceId: 'your-workspace-id' });
await client.auth.login({ email: 'user@company.com', password: 'your-password' });

// Create a subscription. Omit `events` to receive every event.
const webhook = await client.webhooks.create({
  url: 'https://your-app.com/webhooks/flexops',
  events: [WebhookEventType.LabelCreated, WebhookEventType.LabelCanceled, WebhookEventType.BatchCompleted],
});
const signingSecret = webhook.data.secret; // returned only on create; store it

// Rotate the signing secret
await client.webhooks.rotateSecret(webhook.data.id);
```

FlexOps sends these events, named exactly as below. Names are PascalCase and matched exactly, so a
name like `label.created` would never match; the SDK refuses unknown names with an
`UnknownWebhookEvent` error.

| Event | Sent when |
|---|---|
| `LabelCreated` | A live label is purchased (sandbox labels send nothing) |
| `LabelCanceled` | A live label is voided |
| `BatchCompleted` | A batch label job finishes |
| `TrackingUpdated` | A USPS tracking scan arrives (USPS push-tracking pilot workspaces only) |
| `TrackingDelivered` | A USPS package is delivered (USPS push-tracking pilot workspaces only) |

### Verifying deliveries

Each delivery is a `POST` whose body is the event data itself (there is no `{ type, data }`
envelope). The headers carry the rest:

| Header | Value |
|---|---|
| `X-FlexOps-Event` | Event name, e.g. `LabelCreated`; `test` for a test delivery |
| `X-FlexOps-Event-Id` | Event ID; use it to ignore retried duplicates |
| `X-FlexOps-Timestamp` | Unix seconds when the delivery was signed |
| `X-FlexOps-Signature` | `sha256=` + hex HMAC-SHA256 of `{timestamp}.{raw body}`, keyed with your `whsec_...` secret |
| `X-FlexOps-Delivery` | Delivery attempt ID |

Verify against the raw body bytes. Re-serializing parsed JSON (`JSON.stringify(req.body)`) does not
reproduce what was signed.

```typescript
import express from 'express';
import { WebhooksResource } from '@flexops/sdk';

app.post('/webhooks/flexops', express.raw({ type: 'application/json' }), (req, res) => {
  const isValid = WebhooksResource.verifySignature(
    req.body, // raw Buffer from express.raw()
    req.header('x-flexops-signature'),
    process.env.FLEXOPS_WEBHOOK_SECRET!,
    req.header('x-flexops-timestamp'), // rejected if more than 300 s from now
  );
  if (!isValid) return res.status(401).send('Invalid signature');

  const eventType = req.header('x-flexops-event'); // 'LabelCreated', 'TrackingUpdated', 'test', ...
  const data = JSON.parse(req.body.toString('utf8')); // the event data; no envelope
  // Process the event...
  res.sendStatus(200);
});
```

Pass `{ toleranceSeconds }` as a fifth argument to change the 300 second timestamp window.

## Curl Quickstart

Every SDK method is a thin wrapper around the FlexOps REST API. If you want to verify the API before committing to the SDK — or you're integrating from a language we don't ship a SDK for — these curl invocations hit the same endpoints:

```bash
# Shop rates across all connected carriers
curl -X POST https://gateway.flexops.io/api/shipping/rates \
  -H "X-API-Key: live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"addressLine1": "123 Main St", "city": "New York", "stateProvince": "NY", "postalCode": "10001", "countryCode": "US"},
    "destination": {"addressLine1": "456 Oak Ave", "city": "Los Angeles", "stateProvince": "CA", "postalCode": "90210", "countryCode": "US"},
    "package": {"weight": 16, "weightUnit": "oz"}
  }'

# Create a label (hazmatClassification 0 = not hazardous; required when there is no orderId)
curl -X POST https://gateway.flexops.io/api/shipping/labels \
  -H "X-API-Key: live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "carrierCode": "USPS",
    "serviceCode": "PRIORITY",
    "origin":      {"name": "Warehouse", "addressLine1": "123 Main St", "city": "New York", "stateProvince": "NY", "postalCode": "10001", "countryCode": "US"},
    "destination": {"name": "Customer",  "addressLine1": "456 Oak Ave", "city": "Los Angeles", "stateProvince": "CA", "postalCode": "90210", "countryCode": "US"},
    "package":     {"weight": 16, "weightUnit": "oz"},
    "hazmatClassification": 0
  }'

# Track a shipment
curl https://gateway.flexops.io/api/shipping/track/9400111899223456789012 \
  -H "X-API-Key: live_..."

# Cancel (void) a label
curl -X DELETE "https://gateway.flexops.io/api/shipping/labels/{labelId}?carrierCode=usps" \
  -H "X-API-Key: live_..."
```

Use a `test_...` key instead of `live_...` to hit the sandbox environment; mock carriers respond, no real charges, no real labels.

## Wallet

The balance is read-only here; funding and auto-reload are managed in the FlexOps portal.

```typescript
const balance = await client.wallet.getBalance(); // for client.workspaceId
console.log(`Balance: $${balance.balance}`);
```

## Insurance

```typescript
// Check available providers
const providers = await client.insurance.getProviders();
// Returns ["FlexOps"] or ["FlexOps", "U-PIC"]

// Get a quote
const quote = await client.insurance.getQuote({ carrierCode: 'usps', declaredValue: 500.00 });

// Purchase insurance (premium charged to the wallet). A shipment already insured is refused
// with 409 ALREADY_EXISTS.
const policy = await client.insurance.purchase({
  trackingNumber: '9400111899223456789012',
  carrierCode: 'usps',
  declaredValue: 500.00,
});

// File a claim
await client.insurance.fileClaim({ policyId: policy.data.policyId, claimReason: 'Lost in transit', claimAmount: 500.00 });
```

## Carbon Offsets

```typescript
const quote = await client.carbonOffsets.quote({ weightLbs: 2, distanceMiles: 800 });
const offset = await client.carbonOffsets.purchase({ trackingNumber: '9400...', weightLbs: 2, distanceMiles: 800 });
const summary = await client.carbonOffsets.getSummary();
```

## Returns & RMA

```typescript
// Create a return authorization for an order (numeric order id)
const rma = await client.returns.create({
  orderId: 12345,
  reason: 'Defective product',
  items: [{ sku: 'WIDGET-001', quantity: 1 }],
});
const { rmaNumber, rmaId } = rma.data!;

// Read it back by RMA number, or page through all RMAs
const current = await client.returns.getRma(rmaNumber);
const rmas = await client.returns.listRmas({ page: 1, pageSize: 25 });

// Generate the return label. Send the package weight and size. Anything left out comes from the
// workspace's default shipping preset; with no preset the API answers 400 PackageMeasurementsRequired.
await client.returns.generateLabel(rmaNumber, {
  weightOz: 16,
  lengthIn: 10,
  widthIn: 8,
  heightIn: 4,
});

// Record the inspected items at a warehouse (disposition 0 restock, 1 dispose, 2 forward)
await client.returns.markReceived(rmaId, {
  rmaNumber,
  warehouseId: 1,
  inspectedItems: [{ partNumber: 'WIDGET-001', quantity: 1, disposition: 0 }],
});

// Received returns: list them, then read one by its numeric return id
const received = await client.returns.list({ startDate: '2026-10-01' });
const detail = await client.returns.get(received.data![0].returnId);
```

Approving, rejecting, cancelling and refunding returns are done in the FlexOps portal.

## Recurring Shipments, Report Schedules and Email Templates

Reads work with any API key. Writes need a user token (`auth.login`) or an API key granted the
resource's write permission: `recurring-shipments:write`, `report-schedules:write` or
`email-templates:write`. Other keys get 403 `API_KEY_SCOPE_REQUIRED`.

```typescript
import { RecurrenceInterval, ReportFormat, ReportFrequency, TrackingEmailEvent } from '@flexops/sdk';

// Ship the same package to a saved address every week
const recurring = await client.recurringShipments.create({
  name: 'Weekly refill',
  addressId: 'address-guid',
  presetId: 'preset-guid',
  interval: RecurrenceInterval.Weekly,
  firstRunUtc: '2026-11-02T15:00:00Z',
});
await client.recurringShipments.trigger(recurring.id); // run now (creates an order)

// Email a shipments report every Monday at 08:00 UTC
await client.reportSchedules.create({
  reportType: 'shipments',
  format: ReportFormat.Csv,
  frequencyType: ReportFrequency.Weekly,
  dayOfWeek: 1,
  timeOfDayUtc: '08:00:00',
  recipientEmails: 'ops@example.com',
});

// Customize the "delivered" tracking email
await client.emailTemplates.upsert({
  eventType: TrackingEmailEvent.Delivered,
  subjectTemplate: 'Your order has arrived',
  htmlBodyTemplate: '<p>Delivered.</p>',
});
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

`client.analytics`, `client.orders` and `client.inventory` read through the legacy pass-through. With
an API key they need the permission for the data they read: `orders:read` for `client.orders`,
`inventory:read` for `client.inventory`, and for `client.analytics` the permission named on each
method (`shipping:read`, `inventory:read`, `orders:read` or `returns:read`). A key without it gets
403 `API_KEY_SCOPE_REQUIRED`. Keys created with the default permissions have all of these.

## Automation Rules

```typescript
// Create a shipping rule
await client.rules.create({
  name: 'Route light packages via USPS',
  isEnabled: true,
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

// Dry-run the rules against a sample shipment
const result = await client.rules.test({ weightOz: 12, declaredValue: 25, destinationCountry: 'US', itemCount: 1 });
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
  apiKey: 'live_...',
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

## Retries

Requests that fail with a network error, a timeout or a 429/502/503/504 are retried with
exponential backoff (`retry.maxRetries`, default 3). Retries are safe for purchases:

- Every `POST`, `PUT` and `PATCH` sends an `Idempotency-Key`: yours if you pass one, otherwise one
  generated per call and reused on every retry of that call. The Gateway answers a repeated key with
  the first result instead of running the request again. Pass your own key to purchases
  (`insurance.purchase(request, key)`, `carbonOffsets.purchase(request, key)`) and store it, so a retry
  your app makes after an error or a timeout reuses it and cannot buy twice.
- A write is never retried after a `500`, whose result the Gateway does not replay. A `409
  IDEMPOTENCY_CONFLICT` (the first attempt is still running) is retried. A key reused with a different
  request gets `422 IDEMPOTENCY_KEY_REUSED`, which is not retried: use a new key for a new request.
- `DELETE` is retried only on `429`. `GET` is retried on every status in `retryableStatusCodes`.

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

### Approval and retries

Use these methods only with Gateway's bounded approval contract; coordinate client/Gateway activation. Preparation does not automatically approve. The ceiling covers pre-dispatch postage, excluding later carrier adjustments and separate fees. Persist the operation securely if it must survive process restart. Retry the same request/key after response loss; OutcomeUnknown requires reconciliation, never a new purchase key. Completed replay remains possible after token expiry. Sandbox operations return a synthetic label without real postage. The legacy createLabel and USPS domestic wrapper reject preview responses; use shipping.prepareLabel/purchaseLabel for live purchases.

## Guarded label release compatibility

This release requires a Gateway deployment with the bounded label preview/approval contract (Gateway PR #509 or later). Do not use its live label preparation against an older Gateway: older servers may purchase immediately. Upgrade the Gateway and affected callers together during a purchase maintenance window.

Live label creation now requires a USD maximum, preview, explicit approval, and replay of the saved request with its original idempotency key. Never retry an uncertain purchase with a new key. Sandbox results do not certify production postage.
