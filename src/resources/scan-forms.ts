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
   *
   * Resolves with the created form (200), also when the same `requestId` and inputs are sent again. Rejects with a
   * 409 {@link FlexOpsError} when the `requestId` was used with different inputs, when the packages already belong
   * to a manifest, or when this or an earlier operation needs review (its message names the operation; do not
   * resubmit those packages). 400 means the request or package selection was refused.
   */
  async create(request: ScanFormRequest): Promise<ApiResponse<ScanForm>> {
    const response = await this.http.post<ApiResponse<ScanForm>>(
      this.wsPath(''), { ...request, requestId: request.requestId ?? randomUuid() });
    return withAliases(response);
  }

  /** List the workspace's saved scan forms, newest mailing date first, including any whose outcome is unknown. */
  async list(): Promise<ApiResponse<ScanForm[]>> {
    return withAliases(await this.http.get<ApiResponse<ScanForm[]>>(this.wsPath('')));
  }

  /** Get a saved scan form by its `scanFormId`. A form that does not exist rejects with a 404 {@link FlexOpsError}. */
  async get(scanFormId: string): Promise<ApiResponse<ScanForm>> {
    return withAliases(await this.http.get<ApiResponse<ScanForm>>(this.wsPath(scanFormId)));
  }
}

/** Fills the deprecated `formData` and `createdAt` from the fields the Gateway sends. */
function withAliases<T extends ScanForm | ScanForm[]>(response: ApiResponse<T>): ApiResponse<T> {
  const forms = Array.isArray(response?.data) ? response.data : response?.data ? [response.data] : [];
  for (const form of forms as ScanForm[]) {
    if (form && typeof form === 'object') {
      if (form.formData === undefined && typeof form.scanFormImage === 'string') form.formData = form.scanFormImage;
      if (form.createdAt === undefined && typeof form.createdAtUtc === 'string') form.createdAt = form.createdAtUtc;
    }
  }
  return response;
}
