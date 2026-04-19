// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-31
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type {
  ApiResponse,
  RecurringShipment,
  CreateRecurringShipmentRequest,
  UpdateRecurringShipmentRequest,
} from '../types.js';

export class RecurringShipmentsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/recurring-shipments/${suffix}`;
  }

  /** List all recurring shipment schedules. */
  async list(query?: {
    page?: number;
    pageSize?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<RecurringShipment[]>> {
    return this.http.get(
      this.wsPath(''),
      query as Record<string, string | number | boolean | undefined>,
    );
  }

  /** Get a recurring shipment schedule by ID. */
  async get(id: string): Promise<ApiResponse<RecurringShipment>> {
    return this.http.get(this.wsPath(id));
  }

  /** Create a recurring shipment schedule. */
  async create(request: CreateRecurringShipmentRequest): Promise<ApiResponse<RecurringShipment>> {
    return this.http.post(this.wsPath(''), request);
  }

  /** Update a recurring shipment schedule. */
  async update(
    id: string,
    request: UpdateRecurringShipmentRequest,
  ): Promise<ApiResponse<RecurringShipment>> {
    return this.http.put(this.wsPath(id), request);
  }

  /** Delete a recurring shipment schedule. */
  async delete(id: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(id));
  }

  /** Pause a recurring shipment (stops automatic execution without deleting). */
  async pause(id: string): Promise<ApiResponse<RecurringShipment>> {
    return this.http.post(this.wsPath(`${id}/pause`));
  }

  /** Resume a paused recurring shipment. */
  async resume(id: string): Promise<ApiResponse<RecurringShipment>> {
    return this.http.post(this.wsPath(`${id}/resume`));
  }

  /** Trigger an immediate execution outside the normal schedule. */
  async trigger(id: string): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath(`${id}/trigger`));
  }
}
