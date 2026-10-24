// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import { randomUuid } from '../node-crypto.js';
import type { ApiResponse, ScanFormRequest, ScanForm } from '../types.js';

export class ScanFormsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/scan-forms${suffix ? `/${suffix}` : ''}`;
  }

  /**
   * Create a USPS scan form (SCAN/manifest). API keys need `shipping:write`; the public demo keys are refused.
   * Sends `request.requestId`, or a UUID generated for this call, on every attempt, so a retried call replays
   * the same operation instead of creating a second form.
   */
  async create(request: ScanFormRequest): Promise<ApiResponse<ScanForm>> {
    return this.http.post(this.wsPath(''), { ...request, requestId: request.requestId ?? randomUuid() });
  }

  /** List scan forms. */
  async list(): Promise<ApiResponse<ScanForm[]>> {
    return this.http.get(this.wsPath(''));
  }

  /** Get a scan form by ID. */
  async get(scanFormId: string): Promise<ApiResponse<ScanForm>> {
    return this.http.get(this.wsPath(scanFormId));
  }
}
