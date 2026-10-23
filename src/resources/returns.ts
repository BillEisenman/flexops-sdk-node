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
  ReturnLabel,
  ReturnSummary,
  ReturnDetail,
  Rma,
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

  /**
   * List received returns, optionally between `startDate` and `endDate` (ISO 8601). The Gateway
   * defaults to the last 30 days. To list return authorizations, use `listRmas()`.
   */
  async list(query?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<ReturnSummary[]>> {
    return this.http.get(
      this.wsPath(''),
      query,
    );
  }

  /**
   * Get a received return by its numeric return id (`ReturnSummary.returnId` or `Rma.returnId`).
   * An RMA number is not a return id: the Gateway has no route for it here. Use `getRma()`.
   */
  async get(returnId: number | string): Promise<ApiResponse<ReturnDetail>> {
    return this.http.get(this.wsPath(String(returnId)));
  }

  /** List return authorizations (RMAs), one page at a time. */
  async listRmas(query?: { page?: number; pageSize?: number }): Promise<ApiResponse<Rma[]>> {
    return this.http.get(this.wsPath('rma'), query);
  }

  /** Get a return authorization by its RMA number, for example `RMA-1001`. */
  async getRma(rmaNumber: string): Promise<ApiResponse<Rma>> {
    return this.http.get(this.wsPath(`rma/${encodeURIComponent(rmaNumber)}`));
  }

  /** Create a return authorization (RMA) for an order. The Gateway answers 201 with the RMA. */
  async create(request: ReturnRequest): Promise<ApiResponse<Rma>> {
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
  async generateLabel(rmaNumber: string, request: ReturnLabelRequest = {}): Promise<ApiResponse<ReturnLabel>> {
    return this.http.post(this.wsPath(`${rmaNumber}/label`), request);
  }

  /** Record the inspected items of a returned package at a warehouse. `rmaId` is the numeric `Rma.rmaId`. */
  async markReceived(rmaId: number | string, request: ReceiveReturnRequest): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath(`${rmaId}/receive`), request);
  }
}
