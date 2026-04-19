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
  async getRates(request: RateRequest): Promise<ApiResponse<ShippingRate[]>> {
    return this.http.post(this.wsPath('shipping/rates'), request);
  }

  /** Get the single cheapest rate across all carriers. */
  async getCheapestRate(request: RateRequest): Promise<ApiResponse<ShippingRate>> {
    return this.http.post(this.wsPath('shipping/rates/cheapest'), request);
  }

  /** Get the single fastest rate across all carriers. */
  async getFastestRate(request: RateRequest): Promise<ApiResponse<ShippingRate>> {
    return this.http.post(this.wsPath('shipping/rates/fastest'), request);
  }

  // -----------------------------------------------------------------------
  // Labels
  // -----------------------------------------------------------------------

  /** Create a shipping label. */
  async createLabel(request: CreateLabelRequest): Promise<ApiResponse<Label>> {
    return this.http.post(this.wsPath('shipping/labels'), request, undefined);
  }

  /** Cancel (void) a shipping label. */
  async cancelLabel(labelId: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(`shipping/labels/${labelId}`));
  }

  // -----------------------------------------------------------------------
  // Tracking
  // -----------------------------------------------------------------------

  /** Track a shipment by tracking number. */
  async track(trackingNumber: string): Promise<ApiResponse<TrackingInfo>> {
    return this.http.get(this.wsPath(`shipping/track/${trackingNumber}`));
  }

  // -----------------------------------------------------------------------
  // Address Validation
  // -----------------------------------------------------------------------

  /** Validate and correct a shipping address. */
  async validateAddress(address: Address): Promise<ApiResponse<AddressValidationResult>> {
    return this.http.post(this.wsPath('shipping/addresses/validate'), address);
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
  async getCarriers(): Promise<ApiResponse<unknown>> {
    return this.http.get(this.wsPath('shipping/carriers'));
  }

  // -----------------------------------------------------------------------
  // AI Shipping — requires Professional plan or higher
  // -----------------------------------------------------------------------

  /** Get AI-ranked carrier recommendations for a lane, scored by cost, speed, and reliability. */
  async getRecommendations(
    request: CarrierRecommendationRequest,
  ): Promise<ApiResponse<CarrierRecommendationResponse>> {
    return this.http.post(this.wsPath('shipping/recommendations'), request);
  }

  /** Predict delivery dates (P25/P50/P75/P95) for a carrier/service/lane combination. */
  async predictDelivery(
    request: DeliveryPredictionRequest,
  ): Promise<ApiResponse<DeliveryPredictionResponse>> {
    return this.http.post(this.wsPath('shipping/predictions/delivery'), request);
  }

  /** Get cost-saving opportunities: lanes where switching carriers saves money without sacrificing reliability. */
  async getSavings(): Promise<ApiResponse<CostSavingsSummary>> {
    return this.http.get(this.wsPath('shipping/savings'));
  }
}
