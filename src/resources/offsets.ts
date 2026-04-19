// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-31
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { ApiResponse, OffsetResult, EmissionsEstimate } from '../types.js';

export class OffsetResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/${suffix}`;
  }

  /** Purchase a certified carbon offset for a label. */
  async offset(labelId: string): Promise<ApiResponse<OffsetResult>> {
    return this.http.post(this.wsPath(`shipping/labels/${labelId}/offset`));
  }

  /** Get the estimated CO2 emissions for a label before purchasing an offset. */
  async getEmissions(labelId: string): Promise<ApiResponse<EmissionsEstimate>> {
    return this.http.get(this.wsPath(`shipping/labels/${labelId}/emissions`));
  }

  /** Purchase carbon offsets for multiple labels in a single request. */
  async batchOffset(labelIds: string[]): Promise<ApiResponse<OffsetResult[]>> {
    return this.http.post(this.wsPath('shipping/labels/offset/batch'), { labelIds });
  }
}
