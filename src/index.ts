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
  RegisterRequest,
  Workspace,
  CreateWorkspaceRequest,
  WorkspaceMember,
  RateRequest,
  ShippingRate,
  CreateLabelRequest,
  Label,
  Address,
  Parcel,
  TrackingInfo,
  TrackingEvent,
  AddressValidationResult,
  BatchLabelRequest,
  BatchLabelJob,
  Order,
  OrderItem,
  WebhookSubscription,
  CreateWebhookRequest,
  WalletBalance,
  InsuranceQuote,
  InsurancePolicy,
  ReturnRequest,
  ReturnItem,
  ReturnAuthorization,
  ApiKeyInfo,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ShipmentsTrend,
  CarrierSummary,
  ShippingRule,
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
  OffsetResult,
  EmissionsEstimate,
  HsCodeResult,
  LandedCostRequest,
  CustomsItem,
  LandedCostEstimate,
  RecurringShipment,
  CreateRecurringShipmentRequest,
  UpdateRecurringShipmentRequest,
  EmailTemplate,
  CreateEmailTemplateRequest,
  UpdateEmailTemplateRequest,
  ReportSchedule,
  CreateReportScheduleRequest,
  UpdateReportScheduleRequest,
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
export { WebhooksResource } from './resources/webhooks.js';
export { WalletResource } from './resources/wallet.js';
export { InsuranceResource } from './resources/insurance.js';
export { ReturnsResource } from './resources/returns.js';
export { ApiKeysResource } from './resources/api-keys.js';
export { AnalyticsResource } from './resources/analytics.js';
export { OrdersResource } from './resources/orders.js';
export { InventoryResource } from './resources/inventory.js';
export { PickupsResource } from './resources/pickups.js';
export { ScanFormsResource } from './resources/scan-forms.js';
export { RulesResource } from './resources/rules.js';
export { OffsetResource } from './resources/offsets.js';
export { HsCodesResource } from './resources/hs-codes.js';
export { RecurringShipmentsResource } from './resources/recurring-shipments.js';
export { EmailTemplatesResource } from './resources/email-templates.js';
export { ReportsResource } from './resources/reports.js';
