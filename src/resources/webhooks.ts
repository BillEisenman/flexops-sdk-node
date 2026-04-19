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
  WebhookSubscription,
  CreateWebhookRequest,
} from '../types.js';

export class WebhooksResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/webhooks${suffix ? `/${suffix}` : ''}`;
  }

  /** List all webhook subscriptions for the workspace. */
  async list(): Promise<ApiResponse<WebhookSubscription[]>> {
    return this.http.get(this.wsPath(''));
  }

  /** Get a webhook subscription by ID. */
  async get(webhookId: string): Promise<ApiResponse<WebhookSubscription>> {
    return this.http.get(this.wsPath(webhookId));
  }

  /** Create a webhook subscription. */
  async create(request: CreateWebhookRequest): Promise<ApiResponse<WebhookSubscription>> {
    return this.http.post(this.wsPath(''), request);
  }

  /** Update a webhook subscription. */
  async update(webhookId: string, data: Partial<CreateWebhookRequest>): Promise<ApiResponse<WebhookSubscription>> {
    return this.http.put(this.wsPath(webhookId), data);
  }

  /** Delete a webhook subscription. */
  async delete(webhookId: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(webhookId));
  }

  /** Rotate the signing secret for a webhook. */
  async rotateSecret(webhookId: string): Promise<ApiResponse<{ secret: string }>> {
    return this.http.post(this.wsPath(`${webhookId}/rotate-secret`));
  }

  /** List delivery logs for a webhook. */
  async listDeliveryLogs(webhookId: string): Promise<ApiResponse<unknown[]>> {
    return this.http.get(this.wsPath(`${webhookId}/deliveries`));
  }

  /**
   * Verify a webhook signature from an incoming request.
   * Use this in your webhook handler to validate authenticity.
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    // HMAC-SHA256 verification — works in Node.js
    try {
      // Dynamic import to avoid bundling crypto for browser use
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('node:crypto');
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf-8')
        .digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
