// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { ApiResponse } from '../types.js';

/**
 * Read-only inventory lookups through the legacy VisionSuite API proxy
 * (`/api/ApiProxy/api/v1/Inventory/...`).
 *
 * With an API key, every method requires the `inventory:read` permission; a key without it gets 403
 * `API_KEY_SCOPE_REQUIRED`. Keys created with the default permissions include `inventory:read`. The
 * proxy refuses writes from API keys.
 */
export class InventoryResource {
  constructor(private readonly http: HttpClient) {}

  /** Get a warehouse inventory snapshot. */
  async getWarehouseSnapshot(params?: Record<string, string>): Promise<ApiResponse<unknown>> {
    return this.http.get('/api/ApiProxy/api/v1/Inventory/getWarehouseInventorySnapshot', params);
  }

  /** Get a complete inventory snapshot across all warehouses. */
  async getCompleteSnapshot(params?: Record<string, string>): Promise<ApiResponse<unknown>> {
    return this.http.get('/api/ApiProxy/api/v1/Inventory/getCompleteInventorySnapshot', params);
  }

  /** Get the list of all part numbers. */
  async getPartNumbers(params?: Record<string, string>): Promise<ApiResponse<unknown>> {
    return this.http.get('/api/ApiProxy/api/v1/Inventory/getPartNumberList', params);
  }
}
