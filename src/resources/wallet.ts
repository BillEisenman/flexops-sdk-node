// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { WalletBalance } from '../types.js';

/**
 * The workspace wallet, read-only. Funding, transactions and auto-reload are managed in the
 * FlexOps portals, not through the API.
 */
export class WalletResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  /** Get the configured workspace's wallet balance. */
  async getBalance(): Promise<WalletBalance> {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return this.http.request('GET', '/api/wallet/my-balance', { headers: { 'X-Workspace-Id': id } });
  }
}
