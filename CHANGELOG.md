# Changelog

All notable changes to the FlexOps Node.js/TypeScript SDK are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `ScanFormRequest` takes `manifestDate` (`YYYY-MM-DD`), `requestId`, `originPostalCode` and `warehouseId`, the
  fields of the Gateway's SCAN form request. Live creation needs `manifestDate`: without it the Gateway answers
  400 `Choose the label mailing date.` It stays optional in the type because the sandbox defaults it to today.

### Changed
- Docs: `pickups.schedule()`/`cancel()` and `scanForms.create()` need `shipping:write` with an API key, and the
  public demo keys cannot use them. `rules.test()` needs `shipping:read`. Shipping rule changes (`rules.create()`,
  `update()`, `delete()`, `reorder()`) and member changes (`workspaces.inviteMember()`, `removeMember()`,
  `updateMemberRole()`) are for signed-in users only: API keys get 403 `SIGNED_IN_USER_REQUIRED`.

### Fixed
- `scanForms.create()` sends a `requestId`: yours, or a UUID generated for the call and sent on every retry of it.
  Before, it sent none, so the Gateway gave each attempt a new ID and a retry after a lost response could create a
  second form. Repeating a request with the same `requestId` returns the same form; reusing it with different
  inputs is 409.

## [3.3.0] - 2026-10-22

3.3.0 requires a maximum total price on multi-package labels: the Gateway refuses to buy a box that would take the shipment above it. It changes only the multi-package call released earlier today.

### Changed
- `MultiPackageShipmentRequest.maximumPostageAmount` is required: the most the whole shipment may cost, in USD
  (positive, at most two decimals). The Gateway refuses to buy a box that would take the total above it, so a
  shipment never costs more. A box priced above what is left reports `PriceCeilingExceeded`; once the amount is
  used up the remaining boxes report `PriceCeilingReached` and are not bought. Boxes already bought stay bought.
  The Gateway requires it from the release that ships this change (a request without it is 400 `ApprovalRequired`),
  so this is breaking only for a `createMultiPackage` call written against 3.2.0, released 2026-10-22.

## [3.2.0] - 2026-10-22

3.2.0 adds multi-package labels and RMA reads, and types the returns calls with the shapes the Gateway sends. Code that used `ReturnAuthorization` fields from a returns call should switch to the new types.

### Added
- `shipping.createMultiPackage(request, idempotencyKey?)` buys labels for one order shipped in 1 to 99 boxes
  (`POST /api/shipping/multi-package`), typed with `MultiPackageShipmentRequest`, `MultiPackageDetail`,
  `MultiPackageShipmentResponse` and `MultiPackageLabelResult`. `hazmatClassification` is typed to accept only
  `HazmatClassification.None`, the one class the Gateway takes on this route (anything else is 400 `HazmatNotSupported`).
- `returns.getRma(rmaNumber)` and `returns.listRmas()` read return authorizations (`GET .../returns/rma/{rmaNumber}` and
  `GET .../returns/rma`). There was no way to read an RMA back after creating it.
- `FlexOpsError.data` carries the envelope's `data` on an error reply. A multi-package 422 `AllPackagesFailed` or 409
  `OutcomeUnknown` puts the per-box results there.
- `Rma`, `RmaItem`, `ReturnSummary`, `ReturnDetail` and `ReturnLabel`, the shapes the returns routes send.

### Fixed
- `returns.create()` is typed `ApiResponse<Rma>`, `list()` `ApiResponse<ReturnSummary[]>`, `get()`
  `ApiResponse<ReturnDetail>` and `generateLabel()` `ApiResponse<ReturnLabel>`. They were typed with
  `ReturnAuthorization` (`rmaId: string`, `returnLabel`), a shape no route sends; `ReturnAuthorization` is deprecated.
- `returns.get()` and `markReceived()` take a numeric id (`number | string`). `get()` reads a received return by its
  return id: an RMA number such as `RMA-1001` matched no Gateway route. Use `getRma()` for an RMA.
- `ReturnDisposition` is documented as the Gateway reads it: 0 restock, 1 dispose, 2 forward (it said 1 refurbish, 2 dispose).

## [3.1.0] - 2026-10-22

3.1.0 types batch labels with the Gateway's order-based request. Existing code keeps compiling.

### Added
- `CreateBatchLabelRequest` and `BatchLabelItem`, the Gateway batch body: each item is an order (`orderId`) with the
  package weight in ounces and size in inches. `BatchLabelItemResult` types the per-order rows on a job.

### Fixed
- `shipping.createBatch()` and `previewBatch()` are typed with `CreateBatchLabelRequest`. They were typed with
  `BatchLabelRequest`, whose items are label requests, and the Gateway refuses those with 400
  ("OrderId must be a positive number"). `BatchLabelRequest` still compiles but is deprecated.
- `BatchLabelJob.status` lists the statuses the Gateway sends (`Pending`, `Processing`, `Completed`,
  `CompletedWithErrors`, `Failed`); it listed `Queued`, which the Gateway never sends. The job also types
  `isDryRun`, `totalEstimatedCost`, `isSandbox`, `completedAt`, `statusUrl` and `previewItems`.
- `webhooks.delete()` and `rules.delete()` are typed `Promise<void>`. The Gateway answers both with 204 No Content,
  so they always resolved to `undefined`, but were typed as the `{ success, data }` envelope, which let code such as
  `(await client.webhooks.delete(id)).success` compile and then throw a `TypeError`.

## [3.0.0] - 2026-10-19

3.0.0 limits the SDK to the documented FlexOps API (the published Gateway OpenAPI) and makes retries safe
for purchases. A contract test now fails the build if any SDK method calls an undocumented operation.
The changes made since 2.0.0 and listed further down also ship in this release.

### Removed (breaking)
- Resources that are not part of the public API: `apiKeys` (keys are managed in the portal) and `offsets`
  (replaced by `carbonOffsets`).
- `wallet.addFunds()`, `wallet.listTransactions()` and `wallet.configureAutoReload()`. Funding is managed in the portal.
- `auth.register()`, `getProfile()`, `updateProfile()`, `changePassword()`, `forgotPassword()`, `resetPassword()` and
  `verifyEmail()`. Account management lives in the portals.
- `workspaces.create()` and `workspaces.update()`.
- `returns.approve()`, `reject()`, `cancel()` and `processRefund()`. They are done in the portal.
- `webhooks.get()`, `orders.create()`, `orders.cancel()`, `inventory.postAsnReceipt()` and `inventory.updateInventory()`.
- Carrier label purchases through the legacy `/api/ApiProxy` pass-through, which the Gateway closes (410 Gone):
  `carriers.usps.createReturnLabel()`, `carriers.usps.createInternationalLabel()`, `carriers.ups.createLabel()`,
  `carriers.fedex.createShipment()`, `carriers.fedex.createReturnShipment()` and `carriers.dhl.createShipment()`.
  Buy labels with `client.shipping.createLabel()`.
- `carriers.dhl.updatePickup()`: it sent a PATCH, which the pass-through has no route for.

### Changed (breaking)
- Retries: every `POST`, `PUT` and `PATCH` sends an `Idempotency-Key` (yours, or one generated per call and reused on
  every retry). Writes retry only on a network error, a timeout, 429, 502, 503, 504 and 409
  `IDEMPOTENCY_CONFLICT`, never on 500. `DELETE` retries only on 429. Before, a timed-out purchase was retried
  without a key and could be charged twice. A key reused with a different request gets 422
  `IDEMPOTENCY_KEY_REUSED`, which is not retried.
- `recurringShipments`, `reportSchedules` (2.x `reports`) and `emailTemplates` call the documented Gateway routes;
  the 2.x paths and shapes never worked. Recurring shipments and email templates return the bare objects;
  report schedules return the `{ success, data }` envelope; deletes, pause, resume and trigger return `undefined`.
  Email templates are saved with `upsert()` by tracking event (`TrackingEmailEvent`) instead of `create()`/`update()`,
  and `preview()` renders a subject and body you pass. New `RecurrenceInterval`, `ReportFormat` and `ReportFrequency`
  values. Writes need a user token or an API key granted `recurring-shipments:write`, `report-schedules:write` or
  `email-templates:write`.
- The carrier writes through the legacy `/api/ApiProxy` pass-through (USPS rates, prices, cancels, pickups and scan
  forms; UPS address, rate, pickup, transit, landed-cost, location, document and freight calls; all non-label FedEx
  calls; DHL multi-piece rates, pickups, landed cost, screening and invoices) are marked `@deprecated`: they need a
  user token, because the Gateway refuses API-key writes there with 403 `API_KEY_SCOPE_REQUIRED`, and they stop
  working when the pass-through is retired on 2027-06-30. Move to `client.shipping`, `client.pickups` and
  `client.scanForms`.
- A `204` or empty response returns `undefined` instead of throwing a JSON parse error.
- `auth.login()` stores the access token from `data.token`, which the Gateway returns; it read `data.accessToken`,
  which the Gateway never sends, so a login never authenticated later calls. `LoginResponse` now describes the
  Gateway response (`token`, `refreshToken`, `expiresAt`, user fields, `requiresTwoFactor`).
- `auth.refreshToken(refreshToken, accessToken?)` sends the Gateway's `{ token, refreshToken }` body. The expired
  access token defaults to the one the client holds; without one it throws `FlexOpsAuthError` and sends nothing.
- `shipping.validateAddress()` calls the documented `POST /api/addresses/validate` with its flat body and returns the
  Gateway `AddressValidationResult` (`isValid`, `suggestedAddress`, `isResidential`, `warnings`,
  `validationUnavailable`).
- `wallet.getBalance()` reads `GET /api/wallet/my-balance` for the configured workspace and returns
  `{ hasWallet, balanceCents, balance }`.
- `hsCodes` calls `/api/shipping/hs-codes/search`, `/api/shipping/hs-codes/{code}` and `/api/shipping/landed-cost`,
  and its constructor no longer takes a workspace.
- `insurance.purchase()` posts to `insurance/policies` (it called a route that does not exist), `fileClaim()` posts
  the policy id in the body to `insurance/claims`, and `void(policyId)` cancels a policy. A shipment that is
  already insured is refused with 409 `ALREADY_EXISTS`.
- `returns.create()` posts to `returns/rma` with a numeric `orderId`; `generateLabel(rmaNumber, ...)` takes the RMA
  number and an optional `rateIndicator`; `markReceived(rmaId, { rmaNumber, warehouseId, inspectedItems })`
  records the inspected items. `returns.list()` filters by `startDate`, `endDate`, `page` and `pageSize`; the
  `status` filter, which the Gateway ignored, is gone.
- `rules.create()` and `update()` take `ShippingRuleInput` (`isEnabled`, not `isActive`); `reorder(ids)` posts
  `{ rules: [{ ruleId, priority }] }`.
- `pickups.list()` reads the scheduled pickups; `get()` takes an optional `carrierCode`. `PickupRequest` and
  `PickupConfirmation` use the Gateway field names.
- Workspace roles are numbers on the wire: use the new `WorkspaceRole` (`Owner`, `Admin`, `Member`, `Merchant`).
  `inviteMember(email, role = WorkspaceRole.Member)` and `updateMemberRole()` send them. `workspaces.get()`
  returns `WorkspaceDetail` and `listMembers()` returns `{ members, pendingInvites, userLimit, ... }`.

### Added
- `client.carbonOffsets`: `quote`, `purchase`, `list`, `get`, `getSummary`, `getSettings`, `updateSettings`.
- `insurance.purchase(request, idempotencyKey?)` and `carbonOffsets.purchase(request, idempotencyKey?)` accept your own
  `Idempotency-Key`. Store it with the purchase and reuse it when your app retries, so the Gateway returns the first
  result instead of charging again.
- `rules.test()` dry-runs the rules against a sample shipment; `webhooks.test()` sends a test delivery.

### Since 2.0.0 (also in 3.0.0)

### Changed (breaking)
- Webhook subscriptions use the event names and fields the Gateway actually reads and returns. `CreateWebhookRequest.events` (now optional) and the new `UpdateWebhookRequest.events` take `WebhookEventType` values and are sent as the Gateway's comma-separated `eventTypes`; before, the Gateway ignored the `events` field and subscribed to every event. `create()` and `update()` throw `FlexOpsError` with code `UnknownWebhookEvent`, without calling the API, for an empty list or a name FlexOps never sends (such as `label.created`). `WebhookSubscription` now describes the Gateway response: `eventTypes` (string), `status`, `description`, `consecutiveFailures`, `updatedAt`, and `secret` only on create; the never-populated `events` and `isActive` are removed.
- `WebhooksResource.verifySignature(payload, signature, secret)` is now `verifySignature(payload, signature, secret, timestamp, options?)`. Pass the `X-FlexOps-Timestamp` header as the new fourth argument. The old helper never matched a real delivery: it signed the body alone and compared against bare hex, while the Gateway signs `{timestamp}.{raw body}` and sends `sha256=<hex>` (#41). Three-argument calls no longer compile; plain-JavaScript three-argument calls return `false`.

### Fixed
- `webhooks.create()` returned `data: undefined` against the real Gateway, losing the signing secret: the create route answers `201` with the bare subscription, not the `{ success, data }` envelope the other webhook routes use. `create()` now wraps a bare body as `{ success: true, data: <subscription> }` and passes an envelope through unchanged, so the return type stays `ApiResponse<WebhookSubscription>` and `data.secret` holds the secret. Plain-JavaScript code that read the bare fields (`result.id`, `result.secret`) must read `result.data.id` and `result.data.secret`.
- README webhook sample subscribed to `label.created`, `tracking.updated` and `shipment.delivered`, which FlexOps never sends. It now uses `WebhookEventType` and lists the events FlexOps sends: `LabelCreated`, `LabelCanceled`, `BatchCompleted`, and, for USPS push-tracking pilot workspaces, `TrackingUpdated` and `TrackingDelivered`.
- `WebhooksResource.verifySignature` verifies the Gateway signature: HMAC-SHA256 over `{X-FlexOps-Timestamp}.{raw body}` keyed with the `whsec_...` secret, accepting `sha256=<hex>` or bare hex, compared in constant time. It rejects missing or non-numeric timestamps and timestamps more than `toleranceSeconds` (default 300) from now; `options.now` overrides the clock for tests. `payload` may be a string or the raw body bytes. An empty secret throws `TypeError` (#41).
- `WebhooksResource.verifySignature` returned `false` for every input when the SDK was loaded as an ES module: the bundled `require` shim threw inside its `try`. It now loads `node:crypto` through `process.getBuiltinModule` (falling back to `require` in CommonJS) (#41).
- README webhook sample: verifies the raw body with the timestamp header, and reads the event name from `X-FlexOps-Event`; the body is the event data with no `{ type, data }` envelope (#41).
- `shipping.createLabel()` translates the deprecated `CreateLabelRequest` (`carrier`, `fromAddress`, `parcel`, ...) to the Gateway wire shape and sends `idempotencyKey` as the `Idempotency-Key` header; `returnLabel: true` is refused with `UnsupportedRequestShape` instead of buying an outbound label (#6).
- `shipping.validateAddress()` accepts `ShippingAddress` as well as `Address` (#6).
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
