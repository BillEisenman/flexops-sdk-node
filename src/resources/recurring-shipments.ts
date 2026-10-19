// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-31
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type {
  CreateRecurringShipmentRequest,
  RecurringShipment,
  UpdateRecurringShipmentRequest,
} from '../types.js';

/**
 * Recurring shipments: a saved destination address and shipping preset that create an order on a
 * schedule. Requires the Pro plan or above.
 *
 * Reads work with any API key. Writes need a user token (`auth.login`) or an API key granted
 * `recurring-shipments:write`; any other key gets 403 `API_KEY_SCOPE_REQUIRED`. Responses are the
 * bare objects, not the `{ success, data }` envelope.
 */
export class RecurringShipmentsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix = ''): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/recurring-shipments${suffix ? `/${suffix}` : ''}`;
  }

  /** List the workspace's recurring shipments. */
  async list(): Promise<RecurringShipment[]> {
    return this.http.get(this.wsPath());
  }

  /** Get one recurring shipment. */
  async get(id: string): Promise<RecurringShipment> {
    return this.http.get(this.wsPath(id));
  }

  /** Create a recurring shipment. The first run is at `firstRunUtc`. */
  async create(request: CreateRecurringShipmentRequest): Promise<RecurringShipment> {
    return this.http.post(this.wsPath(), request);
  }

  /** Change a recurring shipment. Fields left out stay as they are. */
  async update(id: string, request: UpdateRecurringShipmentRequest): Promise<RecurringShipment> {
    return this.http.put(this.wsPath(id), request);
  }

  /** Delete a recurring shipment. */
  async delete(id: string): Promise<void> {
    await this.http.delete(this.wsPath(id));
  }

  /** Stop scheduled runs until `resume` is called. */
  async pause(id: string): Promise<void> {
    await this.http.post(this.wsPath(`${id}/pause`));
  }

  /** Restart scheduled runs. */
  async resume(id: string): Promise<void> {
    await this.http.post(this.wsPath(`${id}/resume`));
  }

  /**
   * Run a recurring shipment now, which creates an order. Pass your own `idempotencyKey` to make a
   * retry from your side safe too; the SDK's own retries always reuse one key.
   */
  async trigger(id: string, idempotencyKey?: string): Promise<void> {
    await this.http.request('POST', this.wsPath(`${id}/trigger`), {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
  }
}
