// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-10-19
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type {
  ApiResponse,
  CarbonOffset,
  CarbonOffsetPurchaseRequest,
  CarbonOffsetQuote,
  CarbonOffsetQuoteRequest,
  CarbonOffsetSettings,
  CarbonOffsetSummary,
} from '../types.js';

/** Carbon offsets for shipments. Requires the Pro plan or above. */
export class CarbonOffsetsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix = ''): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/carbon-offsets${suffix ? `/${suffix}` : ''}`;
  }

  /** Quote an offset for a shipment without buying it. */
  async quote(request: CarbonOffsetQuoteRequest): Promise<ApiResponse<CarbonOffsetQuote>> {
    return this.http.post(this.wsPath('quote'), request);
  }

  /**
   * Buy an offset for a shipment. The cost is charged to the workspace wallet and refunded if the
   * offset provider fails.
   *
   * Pass an `idempotencyKey` you store with the purchase to make your own retry safe: after an error or
   * a timeout, retry with the same key and the Gateway returns the first result instead of buying again.
   * Without one, the SDK's own retries still share a key, but a new call gets a new key.
   */
  async purchase(request: CarbonOffsetPurchaseRequest, idempotencyKey?: string): Promise<ApiResponse<CarbonOffset>> {
    return this.http.request('POST', this.wsPath('purchase'), {
      body: request,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
  }

  /** List the workspace's offsets, newest first. */
  async list(query?: { page?: number; pageSize?: number }): Promise<ApiResponse<CarbonOffset[]>> {
    return this.http.get(this.wsPath(), query);
  }

  /** Get one offset. */
  async get(offsetId: string): Promise<ApiResponse<CarbonOffset>> {
    return this.http.get(this.wsPath(offsetId));
  }

  /** Totals across the workspace's offsets. */
  async getSummary(): Promise<ApiResponse<CarbonOffsetSummary>> {
    return this.http.get(this.wsPath('summary'));
  }

  /** Get the automatic-offset setting. */
  async getSettings(): Promise<ApiResponse<CarbonOffsetSettings>> {
    return this.http.get(this.wsPath('settings'));
  }

  /** Turn automatic offsets on or off. */
  async updateSettings(settings: CarbonOffsetSettings): Promise<ApiResponse<CarbonOffsetSettings>> {
    return this.http.put(this.wsPath('settings'), settings);
  }
}
