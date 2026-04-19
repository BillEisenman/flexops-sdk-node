// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-31
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { ApiResponse, HsCodeResult, LandedCostRequest, LandedCostEstimate } from '../types.js';

export class HsCodesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/${suffix}`;
  }

  /** Search for HS codes by product description. Requires Enterprise plan. */
  async search(
    query: string,
    options?: { destinationCountry?: string; maxResults?: number },
  ): Promise<ApiResponse<HsCodeResult[]>> {
    return this.http.get(this.wsPath('shipping/hs-codes/search'), {
      query,
      ...options,
    });
  }

  /** Look up a specific HS code by its tariff number. Requires Enterprise plan. */
  async lookup(code: string): Promise<ApiResponse<HsCodeResult>> {
    return this.http.get(this.wsPath(`shipping/hs-codes/${code}`));
  }

  /** Estimate the total landed cost (duty + tax + shipping) for a shipment. Requires Enterprise plan. */
  async estimateLandedCost(request: LandedCostRequest): Promise<ApiResponse<LandedCostEstimate>> {
    return this.http.post(this.wsPath('shipping/landed-cost'), request);
  }
}
