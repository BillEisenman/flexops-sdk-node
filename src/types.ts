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

export interface RateRequest {
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

export interface ShippingRate {
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  estimatedDays: number;
  deliveryDate?: string;
}

// ---------------------------------------------------------------------------
// Shipping — Labels
// ---------------------------------------------------------------------------

export interface CreateLabelRequest {
  carrier: string;
  service: string;
  fromAddress: Address;
  toAddress: Address;
  parcel: Parcel;
  returnLabel?: boolean;
  labelFormat?: 'PDF' | 'PNG' | 'ZPL';
  idempotencyKey?: string;
}

export interface Label {
  labelId: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  labelData: string;
  labelFormat: string;
  rate: number;
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

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  createdAt: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
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
  sampleSize: number;
  recommendations: CarrierRecommendation[];
}

export interface CarrierRecommendation {
  carrierCode: string;
  score: number;
  onTimePercent: number;
  avgTransitDays: number;
  avgCost: number;
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
