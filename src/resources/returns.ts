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
  ReturnRequest,
  ReturnAuthorization,
} from '../types.js';

export class ReturnsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/returns/${suffix}`;
  }

  /** List all return authorizations. */
  async list(query?: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<ApiResponse<ReturnAuthorization[]>> {
    return this.http.get(
      this.wsPath(''),
      query as Record<string, string | number | boolean | undefined>,
    );
  }

  /** Get a return authorization by ID. */
  async get(returnId: string): Promise<ApiResponse<ReturnAuthorization>> {
    return this.http.get(this.wsPath(returnId));
  }

  /** Create a return authorization (RMA). */
  async create(request: ReturnRequest): Promise<ApiResponse<ReturnAuthorization>> {
    return this.http.post(this.wsPath(''), request);
  }

  /** Approve a return authorization. */
  async approve(returnId: string): Promise<ApiResponse<ReturnAuthorization>> {
    return this.http.post(this.wsPath(`${returnId}/approve`));
  }

  /** Reject a return authorization. */
  async reject(returnId: string, reason: string): Promise<ApiResponse<ReturnAuthorization>> {
    return this.http.post(this.wsPath(`${returnId}/reject`), { reason });
  }

  /** Cancel a return authorization. */
  async cancel(returnId: string): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath(`${returnId}/cancel`));
  }

  /** Generate a return label for an approved RMA. */
  async generateLabel(returnId: string): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath(`${returnId}/label`));
  }

  /** Mark items as received. */
  async markReceived(returnId: string, items: { sku: string; quantity: number; condition: string }[]): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath(`${returnId}/receive`), { items });
  }

  /** Process refund for a return. */
  async processRefund(returnId: string): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath(`${returnId}/refund`));
  }
}
