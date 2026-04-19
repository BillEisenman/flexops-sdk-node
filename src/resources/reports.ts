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
  ReportSchedule,
  CreateReportScheduleRequest,
  UpdateReportScheduleRequest,
} from '../types.js';

export class ReportsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/report-schedules/${suffix}`;
  }

  /** List all scheduled report configurations. */
  async list(): Promise<ApiResponse<ReportSchedule[]>> {
    return this.http.get(this.wsPath(''));
  }

  /** Get a report schedule by ID. */
  async get(id: string): Promise<ApiResponse<ReportSchedule>> {
    return this.http.get(this.wsPath(id));
  }

  /** Create a scheduled report. */
  async create(request: CreateReportScheduleRequest): Promise<ApiResponse<ReportSchedule>> {
    return this.http.post(this.wsPath(''), request);
  }

  /** Update a scheduled report. */
  async update(
    id: string,
    request: UpdateReportScheduleRequest,
  ): Promise<ApiResponse<ReportSchedule>> {
    return this.http.put(this.wsPath(id), request);
  }

  /** Delete a scheduled report. */
  async delete(id: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(id));
  }
}
