// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import { FlexOpsError } from '../types.js';
import type { HttpClient } from '../http.js';
import type {
  ApiResponse,
  RateRequest,
  ShippingRate,
  RateShoppingResponse,
  CreateLabelRequest,
  CanonicalLabelRequest,
  LabelPurchasePreview,
  LabelPurchaseApproval,
  Label,
  TrackingInfo,
  AddressValidationResult,
  Address,
  BatchLabelRequest,
  BatchLabelJob,
  CarrierRecommendationRequest,
  CarrierRecommendationResponse,
  DeliveryPredictionRequest,
  DeliveryPredictionResponse,
  CostSavingsSummary,
} from '../types.js';

export class ShippingResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/${suffix}`;
  }

  // -----------------------------------------------------------------------
  // Rate Shopping
  // -----------------------------------------------------------------------

  /** Get shipping rates from all configured carriers. */
  async getRates(request: RateRequest): Promise<RateShoppingResponse> {
    return this.http.post('/api/shipping/rates', request);
  }

  /** Get the single cheapest rate across all carriers. */
  async getCheapestRate(request: RateRequest): Promise<ShippingRate> {
    return this.http.post('/api/shipping/rates/cheapest', request);
  }

  /** Get the single fastest rate across all carriers. */
  async getFastestRate(request: RateRequest): Promise<ShippingRate> {
    return this.http.post('/api/shipping/rates/fastest', request);
  }

  // -----------------------------------------------------------------------
  // Labels
  // -----------------------------------------------------------------------

  /**
   * Create a shipping label. Supply a `CreateLabelRequest` with `orderId` set to buy against an
   * existing order — the order's ownership, status, ship-method and addresses are validated
   * server-side and postage is settled atomically. Returns the raw label (HTTP 201).
   */
  async createLabel(request: CreateLabelRequest | CanonicalLabelRequest): Promise<Label> {
    const result = await this.http.post<Label | LabelPurchasePreview>('/api/shipping/labels', request);
    if ('status' in result) throw new FlexOpsError('Approval required. Use prepareLabel, review its preview, then purchaseLabel.', 400, 'ApprovalRequired');
    return result;
  }

  /** Preview without approval. Keep the returned immutable operation for every purchase attempt. */
  async prepareLabel(request: CanonicalLabelRequest, maximumPostageAmount: number, idempotencyKey: string): Promise<LabelPurchaseApproval> {
    if (!idempotencyKey.trim() || !Number.isFinite(maximumPostageAmount) || maximumPostageAmount <= 0 || maximumPostageAmount > 1000000 ||
        Math.abs(maximumPostageAmount * 100 - Math.round(maximumPostageAmount * 100)) > 1e-7)
      throw new FlexOpsError('Supply a stable key and positive USD maximum with at most two decimal places.', 400, 'InvalidApproval');
    const body = JSON.parse(JSON.stringify(request)) as CanonicalLabelRequest;
    for (const key of Object.keys(body)) if (['confirmationtoken', 'maximumpostageamount'].includes(key.toLowerCase())) delete body[key];
    body.maximumPostageAmount = maximumPostageAmount;
    const result = await this.http.request<LabelPurchasePreview | Label>('POST', '/api/shipping/labels', {
      body, headers: { 'Idempotency-Key': idempotencyKey },
    });
    if ('isSandbox' in result && result.isSandbox === true)
      return Object.freeze({ idempotencyKey, requestJson: JSON.stringify(body), preview: null, sandboxLabel: result });
    if (!('status' in result) || result.status !== 'Preview' || !result.confirmationToken || result.currency !== 'USD' ||
        !Number.isFinite(result.quotedPostageAmount) || result.quotedPostageAmount <= 0 || result.quotedPostageAmount > maximumPostageAmount ||
        result.maximumPostageAmount !== maximumPostageAmount || !Number.isFinite(Date.parse(result.expiresAt)))
      throw new FlexOpsError('Gateway did not return a valid bounded preview.', 502, 'InvalidPreview');
    body.confirmationToken = result.confirmationToken;
    return Object.freeze({ idempotencyKey, requestJson: JSON.stringify(body), preview: Object.freeze(result) });
  }

  /** Call only after explicit approval. Same-key replay remains valid after token expiry. */
  async purchaseLabel(approval: LabelPurchaseApproval): Promise<Label> {
    if (approval.sandboxLabel) return approval.sandboxLabel;
    const result = await this.http.request<Label>('POST', '/api/shipping/labels', {
      body: JSON.parse(approval.requestJson), headers: { 'Idempotency-Key': approval.idempotencyKey },
    });
    if (!result.trackingNumber) throw new FlexOpsError('Unresolved purchase. Retain the operation and reconcile before creating another label.', 409, 'OutcomeUnknown');
    return result;
  }

  /** Cancel (void) a shipping label. `carrierCode` is required. */
  async cancelLabel(labelId: string, carrierCode: string): Promise<unknown> {
    return this.http.delete(
      `/api/shipping/labels/${labelId}?carrierCode=${encodeURIComponent(carrierCode)}`,
    );
  }

  // -----------------------------------------------------------------------
  // Tracking
  // -----------------------------------------------------------------------

  /** Track a shipment by tracking number. */
  async track(trackingNumber: string): Promise<TrackingInfo> {
    return this.http.get(`/api/shipping/track/${encodeURIComponent(trackingNumber)}`);
  }

  // -----------------------------------------------------------------------
  // Address Validation
  // -----------------------------------------------------------------------

  /** Validate and correct a shipping address. */
  async validateAddress(address: Address): Promise<AddressValidationResult> {
    return this.http.post('/api/shipping/addresses/validate', address);
  }

  // -----------------------------------------------------------------------
  // Batch Labels
  // -----------------------------------------------------------------------

  /** Create labels in batch. */
  async createBatch(request: BatchLabelRequest): Promise<ApiResponse<BatchLabelJob>> {
    return this.http.post(this.wsPath('labels/batch'), request);
  }

  /** Preview a batch without purchasing (dry-run). */
  async previewBatch(request: BatchLabelRequest): Promise<ApiResponse<BatchLabelJob>> {
    return this.http.post(this.wsPath('labels/batch/preview'), request);
  }

  /** Get batch job status. */
  async getBatchStatus(jobId: string): Promise<ApiResponse<BatchLabelJob>> {
    return this.http.get(this.wsPath(`labels/batch/${jobId}`));
  }

  /** Download a label from a batch job. */
  async downloadBatchLabel(jobId: string, itemId: string): Promise<Response> {
    return this.http.get(this.wsPath(`labels/batch/${jobId}/items/${itemId}/label`));
  }

  // -----------------------------------------------------------------------
  // Carriers
  // -----------------------------------------------------------------------

  /** List available carriers and their services. */
  async getCarriers(): Promise<unknown> {
    return this.http.get('/api/shipping/carriers');
  }

  // -----------------------------------------------------------------------
  // AI Shipping — requires Professional plan or higher
  // -----------------------------------------------------------------------

  /** Get AI-ranked carrier recommendations for a lane, scored by cost, speed, and reliability. */
  async getRecommendations(
    request: CarrierRecommendationRequest,
  ): Promise<CarrierRecommendationResponse> {
    return this.http.post('/api/shipping/recommendations', request);
  }

  /** Predict delivery dates (P25/P50/P75/P95) for a carrier/service/lane combination. */
  async predictDelivery(
    request: DeliveryPredictionRequest,
  ): Promise<DeliveryPredictionResponse> {
    return this.http.post('/api/shipping/predictions/delivery', request);
  }

  /** Get cost-saving opportunities: lanes where switching carriers saves money without sacrificing reliability. */
  async getSavings(): Promise<CostSavingsSummary> {
    return this.http.get('/api/shipping/savings');
  }
}
