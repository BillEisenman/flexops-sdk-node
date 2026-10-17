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
  /** HTTP status codes to retry on. Default: [429, 500, 502, 503, 504] */
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
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userId: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  planId: string;
  ownerId: string;
  isActive: boolean;
  monthlyLabelLimit: number;
  labelsUsedThisMonth: number;
  userLimit: number;
  createdAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  planId?: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Member' | 'Guest';
  joinedAt: string;
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

export interface AddressValidationResult {
  isValid: boolean;
  correctedAddress?: Address;
  messages?: string[];
}

// ---------------------------------------------------------------------------
// Batch Labels
// ---------------------------------------------------------------------------

export interface BatchLabelRequest {
  items: CreateLabelRequest[];
  idempotencyKey?: string;
}

export interface BatchLabelJob {
  jobId: string;
  status: 'Queued' | 'Processing' | 'Completed' | 'Failed';
  totalItems: number;
  completedItems: number;
  failedItems: number;
  createdAt: string;
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

export interface WalletBalance {
  balance: number;
  currency: string;
  autoReloadEnabled: boolean;
  autoReloadThreshold?: number;
  autoReloadAmount?: number;
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

export interface InsuranceQuote {
  provider: string;
  premium: number;
  coverage: number;
  currency: string;
}

export interface InsurancePolicy {
  policyId: string;
  provider: string;
  trackingNumber: string;
  coverage: number;
  premium: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Returns / RMA
// ---------------------------------------------------------------------------

export interface ReturnRequest {
  orderId: string;
  reason: string;
  items: ReturnItem[];
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
}

export interface ReturnAuthorization {
  rmaId: string;
  status: string;
  returnLabel?: Label;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  id: string;
  key: string;
  name: string;
  prefix: string;
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
// Carrier-Specific Types (VisionSuite passthrough)
// ---------------------------------------------------------------------------

export interface UspsLabelRequest {
  /** Full USPS label creation payload — passed through to VisionSuite */
  [key: string]: unknown;
}

export interface UpsLabelRequest {
  [key: string]: unknown;
}

export interface FedExShipmentRequest {
  [key: string]: unknown;
}

export interface DhlShipmentRequest {
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Automation Rules
// ---------------------------------------------------------------------------

export interface ShippingRule {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
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

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

export interface PickupRequest {
  carrier: string;
  pickupDate: string;
  readyTime: string;
  closeTime: string;
  address: Address;
  packageCount: number;
  totalWeight: number;
}

export interface PickupConfirmation {
  confirmationNumber: string;
  carrier: string;
  pickupDate: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Scan Forms
// ---------------------------------------------------------------------------

export interface ScanFormRequest {
  trackingNumbers: string[];
}

export interface ScanForm {
  scanFormId: string;
  formData: string;
  trackingNumbers: string[];
  createdAt: string;
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

export interface OffsetResult {
  labelId: string;
  offsetId: string;
  kgCo2e: number;
  cost: { amount: number; currency: string };
  provider: string;
  certificateUrl: string;
}

export interface EmissionsEstimate {
  labelId: string;
  kgCo2e: number;
  carrier: string;
  service: string;
  distanceMiles: number;
  model: string;
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
// Recurring Shipments
// ---------------------------------------------------------------------------

export interface RecurringShipment {
  id: string;
  name: string;
  isActive: boolean;
  scheduleExpression: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

export interface CreateRecurringShipmentRequest {
  name: string;
  scheduleExpression: string;
  labelRequest: CreateLabelRequest;
}

export interface UpdateRecurringShipmentRequest {
  name?: string;
  scheduleExpression?: string;
  labelRequest?: Partial<CreateLabelRequest>;
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  triggerEvent: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailTemplateRequest {
  name: string;
  subject: string;
  bodyHtml: string;
  triggerEvent: string;
  isActive?: boolean;
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  subject?: string;
  bodyHtml?: string;
  triggerEvent?: string;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Scheduled Reports
// ---------------------------------------------------------------------------

export interface ReportSchedule {
  id: string;
  name: string;
  reportType: string;
  recipientEmail: string;
  scheduleExpression: string;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

export interface CreateReportScheduleRequest {
  name: string;
  reportType: string;
  recipientEmail: string;
  scheduleExpression: string;
  isActive?: boolean;
}

export interface UpdateReportScheduleRequest {
  name?: string;
  reportType?: string;
  recipientEmail?: string;
  scheduleExpression?: string;
  isActive?: boolean;
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
