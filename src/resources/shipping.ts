// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type {
  ApiResponse,
  RateRequest,
  ShippingRate,
  RateShoppingResponse,
  CreateLabelRequest,
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
  async createLabel(request: CreateLabelRequest): Promise<Label> {
    return this.http.post('/api/shipping/labels', request, undefined);
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
