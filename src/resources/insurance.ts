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
  FileClaimRequest,
  InsuranceClaim,
  InsurancePolicy,
  InsuranceQuote,
  InsuranceQuoteRequest,
  PurchaseInsuranceRequest,
} from '../types.js';

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
  async getQuote(request: InsuranceQuoteRequest): Promise<ApiResponse<InsuranceQuote>> {
    return this.http.post(this.wsPath('quote'), request);
  }

  /**
   * Purchase insurance for a shipment. The premium is charged to the workspace wallet. A shipment
   * that already has a policy in force is refused with 409 `ALREADY_EXISTS`.
   */
  async purchase(request: PurchaseInsuranceRequest): Promise<ApiResponse<InsurancePolicy>> {
    return this.http.post(this.wsPath('policies'), request);
  }

  /** Void (cancel) an insurance policy. */
  async void(policyId: string): Promise<ApiResponse<InsurancePolicy>> {
    return this.http.delete(this.wsPath(`policies/${policyId}`));
  }

  /** File a claim against a policy. */
  async fileClaim(claim: FileClaimRequest): Promise<ApiResponse<InsuranceClaim>> {
    return this.http.post(this.wsPath('claims'), claim);
  }
}
