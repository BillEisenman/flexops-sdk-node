// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

// ---------------------------------------------------------------------------
// Client Configuration
// ---------------------------------------------------------------------------

export interface FlexOpsConfig {
  /** Base URL of the FlexOps Gateway API. Default: https://gateway.flexops.io */
  baseUrl?: string;
  /** JWT access token (from login or API key auth) */
  accessToken?: string;
  /** Workspace API key for server-to-server authentication */
  apiKey?: string;
  /** Workspace ID to scope requests to */
  workspaceId?: string;
  /** Request timeout in milliseconds. Default: 30000 */
  timeout?: number;
  /** Custom fetch implementation (for Node 18+ or polyfills) */
  fetch?: typeof globalThis.fetch;
  /** Custom headers added to every request */
  headers?: Record<string, string>;
  /** Retry configuration */
  retry?: RetryConfig;
}

export interface RetryConfig {
  /** Maximum number of retries. Default: 3 */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff. Default: 1000 */
  baseDelay?: number;
  /**
   * HTTP status codes to retry on. Default: [429, 500, 502, 503, 504]. GETs use the whole list.
   * POST, PUT and PATCH always send an `Idempotency-Key` (yours, or one generated per call and
   * reused on every retry) and retry only on 429, 502, 503, 504, a dropped or timed-out request,
   * and a 409 `IDEMPOTENCY_CONFLICT`; never on 500. DELETE retries only on 429.
   */
  retryableStatusCodes?: number[];
}

// ---------------------------------------------------------------------------
// API Response Wrapper
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  /** The JWT access token. Absent while `requiresTwoFactor` is true. */
  token?: string;
  refreshToken?: string;
  expiresAt: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  customerId?: number;
  requiresTwoFactor: boolean;
  twoFactorToken?: string;
  twoFactorMethod?: string;
  requiresTermsAcceptance: boolean;
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

/** A workspace member's role, sent and returned as a number. */
export const WorkspaceRole = {
  Owner: 0,
  Admin: 1,
  Member: 2,
  Merchant: 3,
} as const;
export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

/** An entry of `GET /api/workspaces`: a workspace the caller belongs to. */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  myRole: WorkspaceRole;
  planId: string;
  memberCount: number;
  isCreator: boolean;
  productType?: string | null;
  entitlements: unknown[];
}

/** `GET /api/workspaces/{id}`. */
export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  planId: string;
  status: number;
  subscriptionStatus: string;
  userLimit: number;
  currentUserCount: number;
  monthlyLabelLimit: number;
  labelsUsedThisMonth: number;
  isTrialing: boolean;
  trialExpiresAt?: string | null;
  myRole: WorkspaceRole;
  canManageMembers: boolean;
  canManageBilling: boolean;
  createdAt: string;
  entitlements: unknown[];
}

export interface WorkspaceMember {
  membershipId: string;
  userId: string;
  email: string;
  name?: string | null;
  role: WorkspaceRole;
  status: number;
  joinedAt: string;
  isCreator: boolean;
  isDeactivated: boolean;
}

export interface PendingInvite {
  inviteId: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  invitedByName: string;
}

/** `GET /api/workspaces/{id}/members`. */
export interface WorkspaceMemberList {
  members: WorkspaceMember[];
  pendingInvites: PendingInvite[];
  userLimit: number;
  activeCount: number;
  canInviteMore: boolean;
}

// ---------------------------------------------------------------------------
// Shipping — Rate Shopping
// ---------------------------------------------------------------------------

/**
 * USPS HAZMAT classification, sent as the Gateway `HazmatClassification` number.
 * There is no default: omit it when you have no answer, send `HazmatClassification.None` (0)
 * to declare the parcel not hazardous.
 */
export const HazmatClassification = {
  None: 0,
  LimitedQuantity: 1,
  LithiumBatteryContainedInEquipment: 2,
  LithiumBatteryPackedWithEquipment: 3,
  LithiumBatteryStandalone: 4,
  OtherRestricted: 5,
  LithiumBatteryUsedDevice: 6,
} as const;
export type HazmatClassification = (typeof HazmatClassification)[keyof typeof HazmatClassification];

export type RateRequest = CanonicalRateRequest | LegacyRateRequest;

export interface CanonicalRateRequest {
  origin: ShippingAddress;
  destination: ShippingAddress;
  package: ShippingPackage;
  carriers?: string[];
  serviceLevels?: string[];
  shipDate?: string;
  includeInsurance?: boolean;
  declaredValue?: number;
  currency?: string;
  /** Declared HAZMAT class, so quotes match what the label route will accept. */
  hazmatClassification?: HazmatClassification;
}

/**
 * @deprecated The Gateway needs full origin and destination addresses; this zip-only shape is
 * refused client-side with `UnsupportedRequestShape`. Use CanonicalRateRequest.
 */
export interface LegacyRateRequest {
  fromZip: string;
  toZip: string;
  weight: number;
  weightUnit?: 'oz' | 'lb' | 'g' | 'kg';
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: 'in' | 'cm';
  packageType?: string;
  carriers?: string[];
}

export interface ShippingAddress {
  name?: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode?: string;
  phone?: string;
  email?: string;
  isResidential?: boolean;
}

export interface ShippingPackage {
  weight: number;
  weightUnit?: 'oz' | 'lb' | 'g' | 'kg';
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: 'in' | 'cm';
  predefinedPackage?: string;
}

export interface ShippingRate {
  rateIndicator?: string;
  uspsMailClass?: string;
  isInternational?: boolean;
  carrierCode: string;
  carrierName: string;
  serviceCode: string;
  serviceName: string;
  rate: number;
  currency: string;
  estimatedDays?: number;
  estimatedDeliveryDate?: string;
  trackingIncluded?: boolean;
}

/** Response from a rate-shopping request (raw Gateway `RateShoppingResponse`). */
export interface RateShoppingResponse {
  rates: ShippingRate[];
  currency: string;
}

// ---------------------------------------------------------------------------
// Shipping — Labels
// ---------------------------------------------------------------------------

/**
 * @deprecated Use CanonicalLabelRequest. This shape is translated to the Gateway wire format
 * (`carrierCode`, `serviceCode`, `origin`, `destination`, `package`); `idempotencyKey` is sent
 * as the `Idempotency-Key` header. `returnLabel: true` is refused; use the returns API.
 */
export interface CreateLabelRequest {
  carrier: string;
  service: string;
  fromAddress: Address;
  toAddress: Address;
  parcel: Parcel;
  returnLabel?: boolean;
  labelFormat?: 'PDF' | 'PNG' | 'ZPL';
  idempotencyKey?: string;
  orderId?: number;
  hazmatClassification?: HazmatClassification;
}

/** Normalized Gateway label request. Additional shipment options are preserved in the approval snapshot. */
export interface CanonicalLabelRequest {
  shipDate?: string;
  declaredValue?: number;
  customsDeclaration?: CustomsDeclaration;
  rateIndicator?: string;
  maximumPostageAmount?: number;
  confirmationToken?: string;
  origin: ShippingAddress;
  destination: ShippingAddress;
  package: ShippingPackage;
  carrierCode: string;
  serviceCode: string;
  orderId?: number;
  labelFormat?: 'PDF' | 'PNG' | 'ZPL';
  /**
   * Declared HAZMAT class. Labels without an `orderId` must declare one (send
   * `HazmatClassification.None` for an ordinary parcel); the SDK never fills it in.
   */
  hazmatClassification?: HazmatClassification;
  [option: string]: unknown;
}
export interface LabelPurchasePreview {
  status: 'Preview';
  quotedPostageAmount: number;
  maximumPostageAmount: number;
  currency: 'USD';
  expiresAt: string;
  confirmationToken: string;
}
/** Retain securely for retries; requestJson contains private shipment data and the approval token. */
export interface LabelPurchaseApproval {
  readonly idempotencyKey: string;
  readonly requestJson: string;
  readonly preview: LabelPurchasePreview | null;
  readonly sandboxLabel?: Label;
}

export interface Label {
  labelId: string;
  carrierCode: string;
  trackingNumber: string;
  labelData: string;
  labelFormat: string;
  rate: number;
  currency: string;
  returnLabelData?: string;
  orderId?: number;
  isSandbox: boolean;
  createdAt: string;
}

export interface Address {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface Parcel {
  weight: number;
  weightUnit?: 'oz' | 'lb' | 'g' | 'kg';
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: 'in' | 'cm';
}

// ---------------------------------------------------------------------------
// Shipping — Tracking
// ---------------------------------------------------------------------------

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  statusDetail: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

// ---------------------------------------------------------------------------
// Shipping — Address Validation
// ---------------------------------------------------------------------------

/** `POST /api/addresses/validate`. */
export interface AddressValidationResult {
  isValid: boolean;
  suggestedAddress?: SuggestedAddress | null;
  isResidential?: boolean | null;
  warnings: string[];
  validatedBy?: string | null;
  /** True when the validation service could not complete the check; `isValid` is then not a verdict. */
  validationUnavailable: boolean;
  checkedAt?: string | null;
}

export interface SuggestedAddress {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ---------------------------------------------------------------------------
// Batch Labels
// ---------------------------------------------------------------------------

/** One order in a batch: the Gateway `BatchLabelItemRequest`. Addresses come from the order. */
export interface BatchLabelItem {
  /** The order to ship. Required and positive. */
  orderId: number;
  orderNumber?: string;
  /** Package weight in ounces. The order does not store it. */
  packageWeightInOunces: number;
  packageLengthInInches: number;
  packageWidthInInches: number;
  packageHeightInInches: number;
  /** Leave out the carrier and service to let your shipping rules choose. */
  carrierCode?: string;
  serviceCode?: string;
  deliveryConfirmationRequired?: boolean;
  signatureConfirmationRequired?: boolean;
  insuranceCoverageRequested?: boolean;
  /** Coverage in USD. Needs `insuranceCoverageRequested: true`; left out, the order value is insured. */
  insuredValue?: number;
  labelFormat?: 'PDF' | 'PNG' | 'ZPL';
  shipDate?: string;
  /**
   * What the parcel holds. Batch labels accept only `HazmatClassification.None`; buy HAZMAT
   * labels one at a time with `createLabel`. The SDK never fills it in.
   */
  hazmatClassification?: HazmatClassification;
}

/** The Gateway `CreateBatchLabelRequest` for `shipping.createBatch` and `shipping.previewBatch`. */
export interface CreateBatchLabelRequest {
  /** 1 to 2000 orders. */
  items: BatchLabelItem[];
  /** Called when the job finishes. */
  callbackUrl?: string;
}

/**
 * @deprecated The Gateway refuses this shape: batch items are orders, not labels. Use
 * CreateBatchLabelRequest.
 */
export interface BatchLabelRequest {
  items: CreateLabelRequest[];
  idempotencyKey?: string;
}

export interface BatchLabelJob {
  jobId: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'CompletedWithErrors' | 'Failed';
  totalItems: number;
  completedItems: number;
  failedItems: number;
  isDryRun?: boolean;
  /** Total estimated cost; set on a preview. */
  totalEstimatedCost?: number | null;
  /** True when the job ran with a test key: no real labels and no wallet charge. */
  isSandbox?: boolean;
  createdAt: string;
  completedAt?: string | null;
  statusUrl?: string | null;
  /** One row per order on a preview. */
  previewItems?: BatchLabelItemResult[];
}

/** One order's outcome in a batch job. */
export interface BatchLabelItemResult {
  itemId: string;
  orderId: number;
  orderNumber?: string | null;
  carrierCode?: string | null;
  serviceCode?: string | null;
  status: 'Pending' | 'Completed' | 'Failed';
  trackingNumber?: string | null;
  labelUrl?: string | null;
  rate?: number | null;
  errorMessage?: string | null;
  /** Stable refusal code when the item failed, such as `SpendCapReached`. */
  errorCode?: string | null;
  /** True only when the label was clearly not bought, so sending the order again is safe. */
  canRetry?: boolean;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface Order {
  orderNumber: string;
  status: string;
  customerName?: string;
  items: OrderItem[];
  shippingAddress: Address;
  createdAt: string;
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

/**
 * Event names FlexOps sends in the `X-FlexOps-Event` header and matches subscriptions against.
 * Names are PascalCase and matched exactly: a dotted name such as `label.created` matches nothing.
 * `TrackingUpdated` and `TrackingDelivered` are sent only to workspaces in the USPS push-tracking pilot.
 */
export const WebhookEventType = {
  LabelCreated: 'LabelCreated',
  LabelCanceled: 'LabelCanceled',
  BatchCompleted: 'BatchCompleted',
  TrackingUpdated: 'TrackingUpdated',
  TrackingDelivered: 'TrackingDelivered',
} as const;
export type WebhookEventType = (typeof WebhookEventType)[keyof typeof WebhookEventType];

/** A webhook subscription as the Gateway returns it. */
export interface WebhookSubscription {
  id: string;
  url: string;
  description?: string | null;
  /** Subscribed event names, comma-separated, or `*` for every event. */
  eventTypes: string;
  /** `Active`, `Paused` or `Disabled`. */
  status: string;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt?: string | null;
  /** The `whsec_...` signing secret. Returned only when the subscription is created. */
  secret?: string;
}

export interface CreateWebhookRequest {
  url: string;
  description?: string;
  /** Events to receive. Omit it to receive every event. Sent as the Gateway's comma-separated `eventTypes`. */
  events?: WebhookEventType[];
}

export interface UpdateWebhookRequest {
  url?: string;
  description?: string;
  /** Replaces the subscribed events. Sent as the Gateway's comma-separated `eventTypes`. */
  events?: WebhookEventType[];
  status?: 'Active' | 'Paused' | 'Disabled';
}

// ---------------------------------------------------------------------------
// Wallet / Billing
// ---------------------------------------------------------------------------

/** `GET /api/wallet/my-balance` for the configured workspace. */
export interface WalletBalance {
  hasWallet: boolean;
  balanceCents: number;
  balance: number;
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

export interface InsuranceQuoteRequest {
  declaredValue: number;
  carrierCode: string;
  trackingNumber?: string;
  provider?: string;
}

export interface InsuranceQuote {
  declaredValue: number;
  coverageAmount: number;
  premium: number;
  coverageTier: string;
  carrierCode: string;
  coverageDays: number;
  provider: string;
}

export interface PurchaseInsuranceRequest {
  trackingNumber: string;
  carrierCode: string;
  declaredValue: number;
  coverageTier?: string;
  provider?: string;
}

export interface InsurancePolicy {
  policyId: string;
  trackingNumber: string;
  carrierCode: string;
  declaredValue: number;
  coverageAmount: number;
  premium: number;
  status: string;
  coverageTier?: string | null;
  purchasedAt: string;
  expiresAt: string;
  cancelledAt?: string | null;
  provider?: string | null;
  providerReference?: string | null;
  isSandbox: boolean;
}

export interface FileClaimRequest {
  policyId: string;
  claimReason: string;
  claimAmount: number;
  /** Optional evidence (photo URLs, notes) as a JSON string. */
  evidenceJson?: string;
}

export interface InsuranceClaim {
  claimId: string;
  policyId: string;
  claimReason: string;
  claimAmount: number;
  status: string;
  submittedAt: string;
  resolvedAt?: string | null;
  approvedAmount?: number | null;
  resolutionNotes?: string | null;
  isSandbox: boolean;
}

// ---------------------------------------------------------------------------
// Returns / RMA
// ---------------------------------------------------------------------------

/** Body of `POST /api/workspaces/{workspaceId}/returns/rma`. */
export interface ReturnRequest {
  /** The order's numeric id. */
  orderId: number;
  orderNumber?: string;
  reason: string;
  items: ReturnItem[];
  notes?: string;
  customerEmail?: string;
  reasonId?: number;
}

export interface ReturnItem {
  sku: string;
  quantity: number;
  reason?: string;
}

/**
 * Body of `POST /api/workspaces/{workspaceId}/returns/{rmaNumber}/label`.
 *
 * The carrier needs the package weight and all three dimensions. Send `weightOz`, `lengthIn`,
 * `widthIn` and `heightIn`; any you leave out come from the workspace's default shipping preset.
 * With no preset the Gateway refuses the call with a 400 (code `PackageMeasurementsRequired`)
 * that names the missing fields.
 */
export interface ReturnLabelRequest {
  /** Carrier for the return label. Defaults to `usps` on the Gateway (the only carrier supported). */
  carrierCode?: string;
  /** Carrier service for the return label. */
  serviceType?: string;
  /** Package weight in ounces. */
  weightOz?: number;
  /** Package length in inches. */
  lengthIn?: number;
  /** Package width in inches. */
  widthIn?: number;
  /** Package height in inches. */
  heightIn?: number;
  /** Set when the workspace return-cost policy is CustomerPays and the customer has paid. */
  paymentConfirmed?: boolean;
  /**
   * Declared HAZMAT class. Omit it for no answer, or send `HazmatClassification.None` (0).
   * Return labels cannot carry HAZMAT yet, so any other class is refused (400 `HazmatNotSupported`).
   */
  hazmatClassification?: HazmatClassification;
  /** USPS rate indicator for the return label's price tier. */
  rateIndicator?: string;
}

/** How a received item is dispositioned: 0 restock, 1 dispose, 2 forward. */
export type ReturnDisposition = 0 | 1 | 2;

/** Body of `POST /api/workspaces/{workspaceId}/returns/{rmaId}/receive`. */
export interface ReceiveReturnRequest {
  rmaNumber: string;
  warehouseId: number;
  inspectedItems: {
    partNumber: string;
    partDescription?: string;
    quantity: number;
    disposition: ReturnDisposition;
    inspectionNotes?: string;
  }[];
}

/**
 * @deprecated No Gateway route returns this shape. `returns.create()` and `returns.getRma()` return an
 * `Rma`, `returns.list()` returns `ReturnSummary` rows and `returns.get()` returns a `ReturnDetail`.
 */
export interface ReturnAuthorization {
  rmaId: string;
  status: string;
  returnLabel?: Label;
  createdAt: string;
}

/** One item on an RMA or a received return. */
export interface RmaItem {
  sku: string;
  description?: string | null;
  quantity: number;
  unitPrice?: number;
  extendedPrice?: number;
  reason?: string | null;
}

/** A return authorization (the Gateway `RmaDto`). `rmaNumber` names it in the label and RMA routes. */
export interface Rma {
  rmaNumber: string;
  /** Numeric RMA id, used by `returns.markReceived()`. */
  rmaId: number;
  orderId: number;
  orderNumber?: string | null;
  customerEmail?: string | null;
  status: string;
  reason?: string | null;
  createdAt: string;
  items: RmaItem[];
  itemCount: number;
  returnLabelTrackingNumber?: string | null;
  notes?: string | null;
  /** Numeric return id once the RMA has been received, used by `returns.get()`. */
  returnId?: number | null;
  dispositionStatus?: string | null;
  appliedRuleId?: string | null;
  appliedRuleName?: string | null;
  requirePhotos?: boolean;
  keepItem?: boolean;
  appliedFeeCents?: number;
}

/** A received return (the Gateway `ReturnDto`), as `returns.list()` lists it. */
export interface ReturnSummary {
  returnId: number;
  rmaNumber?: string | null;
  orderId: number;
  status: string;
  returnDate: string;
  dispositionType?: string | null;
}

/** A received return with its items (the Gateway `ReturnDetailDto`), from `returns.get()`. */
export interface ReturnDetail extends ReturnSummary {
  items: RmaItem[];
  reason?: string | null;
  notes?: string | null;
  trackingNumber?: string | null;
  carrierCode?: string | null;
}

/** A return label (the Gateway `ReturnLabelDto`), from `returns.generateLabel()`. */
export interface ReturnLabel {
  trackingNumber?: string | null;
  /** The label image, base64 encoded. */
  labelData?: string | null;
  carrierCode: string;
  rate?: number | null;
  success: boolean;
  errorMessage?: string | null;
  costPolicy?: number;
  deductedFromRefundCents?: number | null;
  customerPaymentRequired?: boolean;
}

// ---------------------------------------------------------------------------
// Multi-package labels
// ---------------------------------------------------------------------------

/** One box in a multi-package shipment (the Gateway `PackageDetail`). */
export interface MultiPackageDetail {
  /** Weight in ounces, 0.1 to 999999. */
  weightInOunces: number;
  /** Length in inches, 0.1 to 999. */
  lengthInInches: number;
  /** Width in inches, 0.1 to 999. */
  widthInInches: number;
  /** Height in inches, 0.1 to 999. */
  heightInInches: number;
  deliveryConfirmationRequired?: boolean;
  signatureConfirmationRequired?: boolean;
  insuranceCoverageRequested?: boolean;
  /** Coverage in USD. Needs `insuranceCoverageRequested: true`; left out, the order value is insured. */
  insuredValue?: number;
  /** Your label for the box, up to 100 characters (for example `Box 1 of 3`). */
  packageReference?: string;
}

/**
 * Body of `POST /api/shipping/multi-package` (the Gateway `MultiPackageShipmentRequest`): one order
 * shipped in several boxes with the same carrier and service. Addresses come from the order.
 */
export interface MultiPackageShipmentRequest {
  /** The order to ship. Required and positive. */
  orderId: number;
  /** Carrier for every box. */
  carrierCode: string;
  /** Service for every box. */
  serviceCode?: string;
  /** Defaults to `PDF` on the Gateway. */
  labelFormat?: 'PDF' | 'PNG' | 'ZPL';
  /** ISO 8601 date; defaults to today. */
  shipDate?: string;
  /**
   * What the shipment holds. Multi-package labels cannot carry HAZMAT yet: send `HazmatClassification.None`
   * (0) for no dangerous goods or leave it out for no answer. The Gateway refuses any other class
   * (400 `HazmatNotSupported`); buy those labels one at a time with `shipping.createLabel`.
   */
  hazmatClassification?: typeof HazmatClassification.None;
  /**
   * The most the whole shipment may cost, in USD: required, positive, with at most two decimals. It covers the
   * postage of every box. The Gateway refuses to buy a box that would take the total above it, so you never pay
   * more: a box priced above what is left reports `PriceCeilingExceeded`, and once the amount is used up the
   * remaining boxes report `PriceCeilingReached` and are not bought. Boxes already bought stay bought. A missing
   * or invalid value is 400 `ApprovalRequired`. It is part of the request the `Idempotency-Key` identifies.
   */
  maximumPostageAmount: number;
  /** 1 to 99 boxes. */
  packages: MultiPackageDetail[];
}

/** One box's outcome in a multi-package shipment (the Gateway `PackageLabelResult`). */
export interface MultiPackageLabelResult {
  /** Index of the box in the request, from 0. */
  packageIndex: number;
  packageReference?: string | null;
  trackingNumber?: string | null;
  rate?: number | null;
  success: boolean;
  errorMessage?: string | null;
  /** Stable refusal code when the box failed. `OutcomeUnknown` means a label may exist: check before retrying. */
  errorCode?: string | null;
}

/** The Gateway `MultiPackageShipmentResponse`. */
export interface MultiPackageShipmentResponse {
  orderId: number;
  carrierCode: string;
  totalPackages: number;
  successfulPackages: number;
  failedPackages: number;
  totalCost: number;
  labels: MultiPackageLabelResult[];
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface ShipmentsTrend {
  date: string;
  count: number;
  totalCost: number;
}

export interface CarrierSummary {
  carrier: string;
  labelCount: number;
  totalCost: number;
  averageCost: number;
}

// ---------------------------------------------------------------------------
// Automation Rules
// ---------------------------------------------------------------------------

export interface ShippingRule {
  id: string;
  name: string;
  priority: number;
  isEnabled: boolean;
  warehouseId?: string | null;
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdAt: string;
  updatedAt: string;
}

/** Body of a rule create or update. */
export interface ShippingRuleInput {
  name: string;
  priority: number;
  isEnabled: boolean;
  warehouseId?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: string;
  group?: number;
}

export interface RuleAction {
  type: string;
  value: string;
}

/** A sample shipment for `rules.test`. */
export interface ShippingRuleTestRequest {
  weightOz: number;
  declaredValue: number;
  destinationCountry: string;
  destinationState?: string;
  destinationPostalCode?: string;
  orderSource?: string;
  itemCount: number;
  shipMethod?: string;
  destinationZone?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

/** Body of `POST /api/workspaces/{workspaceId}/pickups`. Dates are ISO 8601. */
export interface PickupRequest {
  carrierCode: string;
  pickupDate: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  packageCount: number;
  totalWeightOz?: number;
  specialInstructions?: string;
  readyTime?: string;
  closeTime?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface PickupConfirmation {
  pickupId?: string | null;
  carrierCode: string;
  pickupDate: string;
  status: string;
  confirmationNumber?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  packageCount: number;
  createdAt?: string | null;
  message?: string | null;
  success: boolean;
  errorMessage?: string | null;
  isSandbox: boolean;
}

// ---------------------------------------------------------------------------
// Scan Forms
// ---------------------------------------------------------------------------

/** Body of `POST /api/workspaces/{workspaceId}/scan-forms`. */
export interface ScanFormRequest {
  /** Tracking numbers of the labels to put on the form: 1 to 1,000. */
  trackingNumbers: string[];
  /**
   * The labels' mailing date, `YYYY-MM-DD`. Live creation needs it: without it the Gateway answers
   * 400 `Choose the label mailing date.` The sandbox defaults to today (UTC). Optional here so code
   * written for the sandbox keeps compiling.
   */
  manifestDate?: string;
  /**
   * Identifies the operation (a UUID). Repeating a request with the same `requestId` returns the same
   * form instead of creating another; reusing it with different inputs is 409. Keep it with the request
   * to retry it yourself. When omitted, `scanForms.create` generates one per call and sends it on every
   * retry of that call.
   */
  requestId?: string;
  /** The origin ZIP group to manifest. Every selected package must ship from it. */
  originPostalCode?: string;
  /** Limits package selection to one warehouse. */
  warehouseId?: number;
}

/**
 * Where a SCAN form operation stands. `Created`: USPS returned the manifest, and the Gateway saved its number and
 * PDF. `OutcomeUnknown`: the carrier's answer was lost or did not match, so the packages stay reserved and must not
 * be submitted again until the outcome is resolved. Other values may be added; treat them like `OutcomeUnknown`.
 */
export type ScanFormState = 'Created' | 'OutcomeUnknown' | (string & {});

/**
 * A SCAN form (USPS PS Form 5630 manifest) as the Gateway returns it from `scanForms.create()`, `list()` and
 * `get()`. `create()` resolves only for a created form: an operation that needs review, a `requestId` reused with
 * different inputs, or packages already on another manifest reject with a 409 {@link FlexOpsError}.
 */
export interface ScanForm {
  /** The form's ID: 32 hexadecimal digits, no dashes. Pass it to `scanForms.get()`. */
  scanFormId: string;
  /** See {@link ScanFormState}. */
  state: ScanFormState;
  /** The origin ZIP the packages ship from, or null when none was recorded. */
  originPostalCode: string | null;
  /** The packages on the form, in ordinal order. */
  trackingNumbers: string[];
  /** When the operation was recorded, ISO 8601 in UTC (for example `2026-09-08T21:14:03.512Z`). */
  createdAtUtc: string;
  /**
   * The PS Form 5630 PDF, base64-encoded. Null when no PDF was saved: sandbox forms are never sent to USPS, and an
   * operation whose outcome is unknown has none.
   */
  scanFormImage: string | null;
  /** The USPS manifest number. `SBOX…` in the sandbox; empty while the outcome is unknown. */
  manifestNumber: string | null;
  /** The mailing date, as the Gateway writes a date without a zone (for example `2026-09-08T00:00:00`). */
  manifestDate: string | null;
  /** How many packages the form covers. */
  packageCount: number;
  /** A status line for people, for example `Created — USPS acceptance requires a carrier scan.` */
  statusMessage: string | null;
  /** True when `state` is `Created`. */
  success: boolean;
  /** Not set by the current Gateway; errors arrive as a rejected {@link FlexOpsError} instead. */
  errorMessage: string | null;
  /** True for a sandbox (test key) form, which is never transmitted to USPS. */
  isSandbox: boolean;
  /**
   * @deprecated The Gateway never sent `formData`. The SDK now copies `scanFormImage` into it so older code keeps
   * working; read `scanFormImage` instead.
   */
  formData?: string;
  /**
   * @deprecated The Gateway never sent `createdAt`. The SDK now copies `createdAtUtc` into it so older code keeps
   * working; read `createdAtUtc` instead.
   */
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// AI Shipping Recommendations — requires Professional plan or higher
// ---------------------------------------------------------------------------

export interface CarrierRecommendationRequest {
  originPostalCode: string;
  destinationPostalCode: string;
  weightOz?: number;
  /** Scoring bias: 'balanced' | 'cost' | 'speed' | 'reliability'. Default: 'balanced' */
  priority?: string;
}

export interface CarrierRecommendationResponse {
  lane: string;
  /**
   * Shipments analyzed: exact for the workspace's own data, a band floor
   * (5, 10, 25, 50, 100, 250, 500, 1000) for each carrier scored on FlexOps network data.
   */
  sampleSize: number;
  recommendations: CarrierRecommendation[];
}

export interface CarrierRecommendation {
  carrierCode: string;
  score: number;
  onTimePercent: number;
  avgTransitDays: number;
  /**
   * The workspace's own average label cost in USD. `0` when the carrier was scored on
   * FlexOps network data: network cost is not reported, so `0` does not mean free.
   * The API's `dataSource` field (`workspace` or `network`) says which; this type does not include it yet.
   */
  avgCost: number;
  /** Shipments analyzed for this carrier: exact for workspace data, a band floor for network data. */
  shipmentCount: number;
  exceptionRate: number;
  reason: string;
  seasonalAdjustment: string | null;
  seasonalScoreMultiplier: number;
}

export interface DeliveryPredictionRequest {
  carrierCode: string;
  serviceCode?: string;
  originPostalCode: string;
  destinationPostalCode: string;
  shipDate?: string;
}

export interface DeliveryPredictionResponse {
  carrierCode: string;
  predictedDeliveryDate: string;
  earliestDelivery: string;
  latestDelivery: string;
  worstCaseDelivery: string;
  predictedTransitDays: number;
  confidence: number;
  /** Shipments used: exact for the workspace's own data, a band floor for FlexOps network data. */
  sampleSize: number;
  onTimeRate: number;
}

export interface CostSavingsSummary {
  totalPotentialSavings: number;
  lanesAnalyzed: number;
  lanesWithSavings: number;
  topLanes: LaneSavingsOpportunity[];
}

export interface LaneSavingsOpportunity {
  lane: string;
  currentCarrier: string;
  recommendedCarrier: string;
  currentAvgCost: number;
  recommendedAvgCost: number;
  estimatedSavings: number;
  shipmentCount: number;
  currentOnTimeRate: number;
  recommendedOnTimeRate: number;
}

// ---------------------------------------------------------------------------
// Carbon Offsets
// ---------------------------------------------------------------------------

export interface CarbonOffsetQuoteRequest {
  weightLbs: number;
  distanceMiles: number;
}

export interface CarbonOffsetQuote {
  carbonKg: number;
  costUsd: number;
  equivalentTreesPlanted: number;
  provider: string;
}

export interface CarbonOffsetPurchaseRequest extends CarbonOffsetQuoteRequest {
  trackingNumber: string;
}

export interface CarbonOffset {
  offsetId: string;
  trackingNumber: string;
  carbonKg: number;
  costUsd: number;
  status: string;
  provider: string;
  providerReference?: string | null;
  isAutoOffset: boolean;
  purchasedAt: string;
}

export interface CarbonOffsetSummary {
  totalCarbonKg: number;
  totalCostUsd: number;
  totalOffsets: number;
  equivalentTreesPlanted: number;
}

export interface CarbonOffsetSettings {
  autoOffsetEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Recurring Shipments, Report Schedules, Email Templates
// ---------------------------------------------------------------------------

/** How often a recurring shipment runs, sent as a number. `Custom` uses `cronExpression`. */
export const RecurrenceInterval = {
  Daily: 0,
  Weekly: 1,
  Biweekly: 2,
  Monthly: 3,
  Custom: 4,
} as const;
export type RecurrenceInterval = (typeof RecurrenceInterval)[keyof typeof RecurrenceInterval];

export interface RecurringShipment {
  id: string;
  workspaceId: string;
  presetId?: string | null;
  presetName?: string | null;
  addressId?: string | null;
  addressSummary?: string | null;
  name: string;
  interval: RecurrenceInterval;
  intervalName: string;
  cronExpression?: string | null;
  nextRunUtc: string;
  lastRunUtc?: string | null;
  isActive: boolean;
  failureCount: number;
  maxFailures: number;
  lastError?: string | null;
  createdAt: string;
}

export interface CreateRecurringShipmentRequest {
  /** Up to 200 characters. */
  name: string;
  /** Shipping preset that supplies the package and service. */
  presetId?: string;
  /** Destination address; a run without one fails. */
  addressId?: string;
  interval: RecurrenceInterval;
  /** Up to 100 characters; used with `RecurrenceInterval.Custom`. */
  cronExpression?: string;
  /** ISO 8601 date-time of the first run. */
  firstRunUtc: string;
  /** Failed runs (1-100, default 3) before the schedule is paused. */
  maxFailures?: number;
}

export type UpdateRecurringShipmentRequest = Partial<Omit<CreateRecurringShipmentRequest, 'firstRunUtc'>>;

/** Report file format, sent as a number. */
export const ReportFormat = {
  Csv: 0,
  Json: 1,
} as const;
export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

/** How often a report is emailed, sent as a number. */
export const ReportFrequency = {
  Daily: 0,
  Weekly: 1,
  Monthly: 2,
} as const;
export type ReportFrequency = (typeof ReportFrequency)[keyof typeof ReportFrequency];

export interface ReportSchedule {
  id: string;
  workspaceId: string;
  reportType: string;
  format: ReportFormat;
  filterParametersJson?: string | null;
  frequencyType: ReportFrequency;
  frequencyName: string;
  /** 0 (Sunday) to 6, for weekly schedules. */
  dayOfWeek?: number | null;
  /** 1 to 28, for monthly schedules. */
  dayOfMonth?: number | null;
  /** UTC time of day, `"HH:mm:ss"`. */
  timeOfDayUtc: string;
  nextRunUtc: string;
  lastRunUtc?: string | null;
  isEnabled: boolean;
  /** Comma-separated recipient addresses. */
  recipientEmails: string;
  failureCount: number;
  maxFailures: number;
  lastError?: string | null;
  createdAt: string;
}

export interface CreateReportScheduleRequest {
  /** Report name, up to 50 characters, for example `"shipments"`. */
  reportType: string;
  format: ReportFormat;
  filterParametersJson?: string;
  frequencyType: ReportFrequency;
  /** 0 (Sunday) to 6, for weekly schedules. */
  dayOfWeek?: number;
  /** 1 to 28, for monthly schedules. */
  dayOfMonth?: number;
  /** UTC time of day, `"HH:mm:ss"`. */
  timeOfDayUtc: string;
  /** Comma-separated recipient addresses, up to 2000 characters. */
  recipientEmails: string;
  /** Failed runs (1-100, default 3) before the schedule is disabled. */
  maxFailures?: number;
}

export type UpdateReportScheduleRequest = Partial<CreateReportScheduleRequest>;

/** The tracking event an email template is sent for, sent as a number. */
export const TrackingEmailEvent = {
  LabelCreated: 0,
  InTransit: 1,
  OutForDelivery: 2,
  Delivered: 3,
  Exception: 4,
  ReturnToSender: 5,
} as const;
export type TrackingEmailEvent = (typeof TrackingEmailEvent)[keyof typeof TrackingEmailEvent];

export interface EmailTemplate {
  id: string;
  workspaceId: string;
  eventType: TrackingEmailEvent;
  eventTypeName: string;
  subjectTemplate: string;
  htmlBodyTemplate: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertEmailTemplateRequest {
  eventType: TrackingEmailEvent;
  /** Up to 500 characters. */
  subjectTemplate: string;
  htmlBodyTemplate: string;
  /** Default true. */
  isEnabled?: boolean;
}

export interface EmailTemplatePreviewRequest {
  subjectTemplate: string;
  htmlBodyTemplate: string;
}

export interface EmailTemplatePreview {
  renderedSubject: string;
  renderedHtmlBody: string;
}

// ---------------------------------------------------------------------------
// HS Codes & Landed Cost — requires Enterprise plan
// ---------------------------------------------------------------------------

export interface HsCodeResult {
  hsCode: string;
  description: string;
  chapter: string;
  chapterDescription: string;
  dutyRatePercent: number | null;
  notes: string | null;
}

export interface LandedCostRequest {
  destinationCountry: string;
  shippingCost?: number;
  items: CustomsItem[];
}

/** USPS label declaration. Item value and weight are per unit; server availability is gated. */
export interface CustomsDeclaration {
  contentsType: 'merchandise' | 'documents' | 'gift' | 'sample' | 'returned_goods' | 'other';
  contentsExplanation?: string;
  nonDeliveryOption: 'return' | 'abandon';
  currency: 'USD';
  declaredValue: number;
  aesItn: string;
  invoiceNumber?: string;
  licenseNumber?: string;
  certificateNumber?: string;
  restrictionType?: string;
  restrictionComments?: string;
  items: CustomsItem[];
}

export interface CustomsItem {
  description: string;
  quantity: number;
  value: number;
  weightOz?: number;
  hsCode?: string;
  originCountry?: string;
  skuOrProductId?: string;
}

export interface LandedCostEstimate {
  shippingCost: number;
  estimatedDuty: number;
  estimatedTax: number;
  totalLandedCost: number;
  currency: string;
  dutyRateApplied: string | null;
  isEstimate: boolean;
  disclaimer: string | null;
}

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export class FlexOpsError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly errors?: string[],
    /** The envelope's `data` on an error reply, when the Gateway sends one (for example a multi-package 409 or 422). */
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'FlexOpsError';
  }
}

export class FlexOpsRateLimitError extends FlexOpsError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message, 429, 'RATE_LIMITED');
    this.name = 'FlexOpsRateLimitError';
  }
}

export class FlexOpsAuthError extends FlexOpsError {
  constructor(message: string) {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'FlexOpsAuthError';
  }
}
