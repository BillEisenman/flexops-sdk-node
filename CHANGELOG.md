# Changelog

All notable changes to the FlexOps Node.js/TypeScript SDK are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed (breaking)
- `WebhooksResource.verifySignature(payload, signature, secret)` is now `verifySignature(payload, signature, secret, timestamp, options?)`. Pass the `X-FlexOps-Timestamp` header as the new fourth argument. The old helper never matched a real delivery: it signed the body alone and compared against bare hex, while the Gateway signs `{timestamp}.{raw body}` and sends `sha256=<hex>` (#41). Three-argument calls no longer compile; plain-JavaScript three-argument calls return `false`.

### Fixed
- `WebhooksResource.verifySignature` verifies the Gateway signature: HMAC-SHA256 over `{X-FlexOps-Timestamp}.{raw body}` keyed with the `whsec_...` secret, accepting `sha256=<hex>` or bare hex, compared in constant time. It rejects missing or non-numeric timestamps and timestamps more than `toleranceSeconds` (default 300) from now; `options.now` overrides the clock for tests. `payload` may be a string or the raw body bytes. An empty secret throws `TypeError` (#41).
- `WebhooksResource.verifySignature` returned `false` for every input when the SDK was loaded as an ES module: the bundled `require` shim threw inside its `try`. It now loads `node:crypto` through `process.getBuiltinModule` (falling back to `require` in CommonJS) (#41).
- README webhook sample: verifies the raw body with the timestamp header, and reads the event name from `X-FlexOps-Event`; the body is the event data with no `{ type, data }` envelope (#41).
- `shipping.createLabel()` translates the deprecated `CreateLabelRequest` (`carrier`, `fromAddress`, `parcel`, ...) to the Gateway wire shape and sends `idempotencyKey` as the `Idempotency-Key` header; `returnLabel: true` is refused with `UnsupportedRequestShape` instead of buying an outbound label (#6).
- `shipping.validateAddress()` sends the Gateway `{ address }` request and accepts `ShippingAddress` as well as `Address` (#6).
- Zip-only `LegacyRateRequest` is refused client-side with `UnsupportedRequestShape`; the Gateway needs full addresses (#6).

### Fixed
- `returns.generateLabel()` sent no body, which the Gateway refuses. It now always sends a JSON object and takes an optional `ReturnLabelRequest` (`weightOz`, `lengthIn`, `widthIn`, `heightIn`, `carrierCode`, `serviceType`, `paymentConfirmed`, `hazmatClassification`). Send the weight and size: a workspace with no default shipping preset gets a 400 (`PackageMeasurementsRequired`) naming the missing fields (Gateway #672).

### Added
- `HazmatClassification` and an optional `hazmatClassification` on label and rate requests. It is sent only when set; the SDK never defaults it. Labels without an `orderId` must declare it (`HazmatClassification.None` for an ordinary parcel).

### Changed
- README: added a curl quickstart section so developers can verify the FlexOps API before committing to the SDK.
- Retargeted repository URL references to `github.com/BillEisenman/flexops-sdk-node` (organization migration from `FlexOps/`).

## [1.0.0] - 2026-03-08

### Added
- Initial public release.
- High-level shipping operations: rate shopping, label creation, tracking, batch labels, cancel.
- Full TypeScript type definitions, ESM and CommonJS support, zero external runtime dependencies.
- Direct carrier access for USPS, UPS, FedEx, and DHL (214 VisionSuite endpoints proxied).
- JWT and API key authentication.
- Webhook signature verification (HMAC-SHA256).
- Automatic retry with exponential backoff.
- 20 resource services covering auth, workspaces, shipping, carriers, webhooks, wallet, insurance, returns, api keys, analytics, orders, inventory, pickups, scan forms, rules, offsets, HS codes, recurring shipments, email templates, and reports.
