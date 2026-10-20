// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-10-19
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type {
  ApiResponse,
  CreateReportScheduleRequest,
  ReportSchedule,
  UpdateReportScheduleRequest,
} from '../types.js';

/**
 * Scheduled report emails (2.x called this resource `reports`).
 *
 * Reads work with any API key. Writes need a user token (`auth.login`) or an API key granted
 * `report-schedules:write`; any other key gets 403 `API_KEY_SCOPE_REQUIRED`.
 */
export class ReportSchedulesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix = ''): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/report-schedules${suffix ? `/${suffix}` : ''}`;
  }

  /** List the workspace's report schedules. */
  async list(): Promise<ApiResponse<ReportSchedule[]>> {
    return this.http.get(this.wsPath());
  }

  /** Get one report schedule. */
  async get(id: string): Promise<ApiResponse<ReportSchedule>> {
    return this.http.get(this.wsPath(id));
  }

  /** Create a report schedule. */
  async create(request: CreateReportScheduleRequest): Promise<ApiResponse<ReportSchedule>> {
    return this.http.post(this.wsPath(), request);
  }

  /** Change a report schedule. Fields left out stay as they are. */
  async update(id: string, request: UpdateReportScheduleRequest): Promise<ApiResponse<ReportSchedule>> {
    return this.http.put(this.wsPath(id), request);
  }

  /** Delete a report schedule. */
  async delete(id: string): Promise<void> {
    await this.http.delete(this.wsPath(id));
  }

  /** Turn a schedule on or off (flips `isEnabled`). */
  async toggle(id: string): Promise<ApiResponse<null>> {
    return this.http.post(this.wsPath(`${id}/toggle`));
  }
}
