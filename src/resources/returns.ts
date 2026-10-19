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
  ReceiveReturnRequest,
  ReturnRequest,
  ReturnLabelRequest,
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
    return `/api/workspaces/${id}/returns${suffix ? `/${suffix}` : ''}`;
  }

  /** List return authorizations, optionally created between `startDate` and `endDate` (ISO 8601). */
  async list(query?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<ReturnAuthorization[]>> {
    return this.http.get(
      this.wsPath(''),
      query,
    );
  }

  /** Get a return authorization by ID. */
  async get(returnId: string): Promise<ApiResponse<ReturnAuthorization>> {
    return this.http.get(this.wsPath(returnId));
  }

  /** Create a return authorization (RMA) for an order. */
  async create(request: ReturnRequest): Promise<ApiResponse<ReturnAuthorization>> {
    return this.http.post(this.wsPath('rma'), request);
  }

  /**
   * Generate a return label for an approved RMA.
   *
   * The Gateway binds a required request body, so one is always sent (`{}` when `request` is
   * omitted). Pass `weightOz`, `lengthIn`, `widthIn` and `heightIn`: a workspace with no default
   * shipping preset has nothing else to take the package from and the call fails with a 400 that
   * names the missing fields.
   */
  async generateLabel(rmaNumber: string, request: ReturnLabelRequest = {}): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath(`${rmaNumber}/label`), request);
  }

  /** Record the inspected items of a returned package at a warehouse. */
  async markReceived(rmaId: string, request: ReceiveReturnRequest): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath(`${rmaId}/receive`), request);
  }
}
