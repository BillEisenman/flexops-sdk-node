// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-31
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type {
  EmailTemplate,
  EmailTemplatePreview,
  EmailTemplatePreviewRequest,
  UpsertEmailTemplateRequest,
} from '../types.js';

/**
 * Tracking email templates: one per tracking event (`TrackingEmailEvent`), sent to the recipient
 * when that event happens.
 *
 * Reads work with any API key. Writes, including `preview`, need a user token (`auth.login`) or an
 * API key granted `email-templates:write`; any other key gets 403 `API_KEY_SCOPE_REQUIRED`.
 * Responses are the bare objects, not the `{ success, data }` envelope.
 */
export class EmailTemplatesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix = ''): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/email-templates${suffix ? `/${suffix}` : ''}`;
  }

  /** List the workspace's templates. */
  async list(): Promise<EmailTemplate[]> {
    return this.http.get(this.wsPath());
  }

  /** Get one template. */
  async get(templateId: string): Promise<EmailTemplate> {
    return this.http.get(this.wsPath(templateId));
  }

  /** Create or replace the template for `request.eventType`. */
  async upsert(request: UpsertEmailTemplateRequest): Promise<EmailTemplate> {
    return this.http.put(this.wsPath(), request);
  }

  /** Delete a template; that event then uses the FlexOps default email. */
  async delete(templateId: string): Promise<void> {
    await this.http.delete(this.wsPath(templateId));
  }

  /** Render a subject and body with sample shipment data, without saving anything. */
  async preview(request: EmailTemplatePreviewRequest): Promise<EmailTemplatePreview> {
    return this.http.post(this.wsPath('preview'), request);
  }
}
