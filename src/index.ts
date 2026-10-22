// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

// Main client
export { FlexOps } from './client.js';

// Types
export type {
  FlexOpsConfig,
  RetryConfig,
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  Workspace,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceMemberList,
  PendingInvite,
  RateRequest,
  CanonicalRateRequest,
  LegacyRateRequest,
  ShippingAddress,
  ShippingPackage,
  ShippingRate,
  CreateLabelRequest,
  CanonicalLabelRequest,
  LabelPurchasePreview,
  LabelPurchaseApproval,
  Label,
  Address,
  Parcel,
  TrackingInfo,
  TrackingEvent,
  AddressValidationResult,
  SuggestedAddress,
  BatchLabelItem,
  CreateBatchLabelRequest,
  BatchLabelRequest,
  BatchLabelJob,
  BatchLabelItemResult,
  Order,
  OrderItem,
  WebhookSubscription,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WalletBalance,
  InsuranceQuoteRequest,
  InsuranceQuote,
  PurchaseInsuranceRequest,
  InsurancePolicy,
  FileClaimRequest,
  InsuranceClaim,
  ReturnRequest,
  ReturnItem,
  ReturnLabelRequest,
  ReturnAuthorization,
  ReceiveReturnRequest,
  ReturnDisposition,
  ShipmentsTrend,
  CarrierSummary,
  ShippingRule,
  ShippingRuleInput,
  ShippingRuleTestRequest,
  RuleCondition,
  RuleAction,
  PickupRequest,
  PickupConfirmation,
  ScanFormRequest,
  ScanForm,
  CarrierRecommendationRequest,
  CarrierRecommendationResponse,
  CarrierRecommendation,
  DeliveryPredictionRequest,
  DeliveryPredictionResponse,
  CostSavingsSummary,
  LaneSavingsOpportunity,
  CarbonOffsetQuoteRequest,
  CarbonOffsetQuote,
  CarbonOffsetPurchaseRequest,
  CarbonOffset,
  CarbonOffsetSummary,
  CarbonOffsetSettings,
  RecurringShipment,
  CreateRecurringShipmentRequest,
  UpdateRecurringShipmentRequest,
  ReportSchedule,
  CreateReportScheduleRequest,
  UpdateReportScheduleRequest,
  EmailTemplate,
  UpsertEmailTemplateRequest,
  EmailTemplatePreviewRequest,
  EmailTemplatePreview,
  HsCodeResult,
  LandedCostRequest,
  CustomsItem,
  LandedCostEstimate,
} from './types.js';

// Values
export {
  HazmatClassification,
  WebhookEventType,
  WorkspaceRole,
  RecurrenceInterval,
  ReportFormat,
  ReportFrequency,
  TrackingEmailEvent,
} from './types.js';

// Errors
export {
  FlexOpsError,
  FlexOpsRateLimitError,
  FlexOpsAuthError,
} from './types.js';

// Resource classes (for advanced usage / extension)
export { AuthResource } from './resources/auth.js';
export { WorkspacesResource } from './resources/workspaces.js';
export { ShippingResource } from './resources/shipping.js';
export { CarriersResource } from './resources/carriers.js';
export { WebhooksResource, type VerifySignatureOptions } from './resources/webhooks.js';
export { WalletResource } from './resources/wallet.js';
export { InsuranceResource } from './resources/insurance.js';
export { ReturnsResource } from './resources/returns.js';
export { AnalyticsResource } from './resources/analytics.js';
export { OrdersResource } from './resources/orders.js';
export { InventoryResource } from './resources/inventory.js';
export { PickupsResource } from './resources/pickups.js';
export { ScanFormsResource } from './resources/scan-forms.js';
export { RulesResource } from './resources/rules.js';
export { CarbonOffsetsResource } from './resources/carbon-offsets.js';
export { RecurringShipmentsResource } from './resources/recurring-shipments.js';
export { ReportSchedulesResource } from './resources/report-schedules.js';
export { EmailTemplatesResource } from './resources/email-templates.js';
export { HsCodesResource } from './resources/hs-codes.js';
