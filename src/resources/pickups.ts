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
  PickupRequest,
  PickupConfirmation,
} from '../types.js';

export class PickupsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/pickups${suffix ? `/${suffix}` : ''}`;
  }

  /** Schedule a carrier pickup. */
  async schedule(request: PickupRequest): Promise<ApiResponse<PickupConfirmation>> {
    return this.http.post(this.wsPath(''), request);
  }

  /** List scheduled pickups. */
  async list(): Promise<ApiResponse<PickupConfirmation[]>> {
    return this.http.get(this.wsPath(''));
  }

  /** Get pickup details. */
  async get(pickupId: string): Promise<ApiResponse<PickupConfirmation>> {
    return this.http.get(this.wsPath(pickupId));
  }

  /** Cancel a scheduled pickup. */
  async cancel(pickupId: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(pickupId));
  }
}
