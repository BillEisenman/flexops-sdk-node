// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
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

  /** Create a USPS scan form (SCAN/manifest). */
  async create(request: ScanFormRequest): Promise<ApiResponse<ScanForm>> {
    return this.http.post(this.wsPath(''), request);
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
