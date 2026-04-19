// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { ApiResponse, InsuranceQuote, InsurancePolicy } from '../types.js';

export class InsuranceResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/insurance/${suffix}`;
  }

  /** Get available insurance providers for this workspace. */
  async getProviders(): Promise<ApiResponse<string[]>> {
    return this.http.get(this.wsPath('providers'));
  }

  /** Get an insurance quote. */
  async getQuote(request: {
    carrier: string;
    declaredValue: number;
    provider?: string;
  }): Promise<ApiResponse<InsuranceQuote>> {
    return this.http.post(this.wsPath('quote'), request);
  }

  /** Purchase insurance for a shipment. */
  async purchase(request: {
    trackingNumber: string;
    carrier: string;
    declaredValue: number;
    provider?: string;
  }): Promise<ApiResponse<InsurancePolicy>> {
    return this.http.post(this.wsPath('purchase'), request);
  }

  /** Void an insurance policy. */
  async void(policyId: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(`policies/${policyId}`));
  }

  /** File an insurance claim. */
  async fileClaim(policyId: string, claim: {
    description: string;
    claimAmount: number;
  }): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath(`policies/${policyId}/claims`), claim);
  }
}
