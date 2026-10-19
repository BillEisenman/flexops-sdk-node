// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { HsCodeResult, LandedCostRequest, LandedCostEstimate } from '../types.js';

export class HsCodesResource {
  constructor(private readonly http: HttpClient) {}

  /** Search for HS codes by product description. Requires Enterprise plan. */
  async search(
    query: string,
    options?: { destinationCountry?: string; maxResults?: number },
  ): Promise<HsCodeResult[]> {
    return this.http.get('/api/shipping/hs-codes/search', { query, ...options });
  }

  /** Look up a specific HS code by its tariff number. Requires Enterprise plan. */
  async lookup(code: string): Promise<HsCodeResult> {
    return this.http.get(`/api/shipping/hs-codes/${encodeURIComponent(code)}`);
  }

  /** Estimate the total landed cost (duty + tax + shipping) for a shipment. Requires Enterprise plan. */
  async estimateLandedCost(request: LandedCostRequest): Promise<LandedCostEstimate> {
    return this.http.post('/api/shipping/landed-cost', request);
  }
}
