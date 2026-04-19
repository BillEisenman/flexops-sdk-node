// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { ApiResponse, WalletBalance } from '../types.js';

export class WalletResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/wallet/${suffix}`;
  }

  /** Get the current wallet balance. */
  async getBalance(): Promise<ApiResponse<WalletBalance>> {
    return this.http.get(this.wsPath('balance'));
  }

  /** Add funds to the wallet. */
  async addFunds(amount: number): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath('add-funds'), { amount });
  }

  /** List wallet transactions. */
  async listTransactions(query?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.http.get(
      this.wsPath('transactions'),
      query as Record<string, string | number | boolean | undefined>,
    );
  }

  /** Configure auto-reload settings. */
  async configureAutoReload(config: {
    enabled: boolean;
    threshold?: number;
    amount?: number;
  }): Promise<ApiResponse<unknown>> {
    return this.http.put(this.wsPath('auto-reload'), config);
  }
}
