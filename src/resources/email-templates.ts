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
  EmailTemplate,
  CreateEmailTemplateRequest,
  UpdateEmailTemplateRequest,
} from '../types.js';

export class EmailTemplatesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/shipment-email-templates/${suffix}`;
  }

  /** List all email templates. */
  async list(): Promise<ApiResponse<EmailTemplate[]>> {
    return this.http.get(this.wsPath(''));
  }

  /** Get an email template by ID. */
  async get(id: string): Promise<ApiResponse<EmailTemplate>> {
    return this.http.get(this.wsPath(id));
  }

  /** Create an email template. */
  async create(request: CreateEmailTemplateRequest): Promise<ApiResponse<EmailTemplate>> {
    return this.http.post(this.wsPath(''), request);
  }

  /** Update an email template. */
  async update(
    id: string,
    request: UpdateEmailTemplateRequest,
  ): Promise<ApiResponse<EmailTemplate>> {
    return this.http.put(this.wsPath(id), request);
  }

  /** Delete an email template. */
  async delete(id: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(id));
  }

  /** Preview a rendered email template with optional sample data. */
  async preview(
    id: string,
    context?: Record<string, unknown>,
  ): Promise<ApiResponse<{ html: string; subject: string }>> {
    return this.http.post(this.wsPath(`${id}/preview`), context ?? {});
  }
}
