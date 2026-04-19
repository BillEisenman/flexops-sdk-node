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
  ApiKeyInfo,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from '../types.js';

export class ApiKeysResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/api-keys${suffix ? `/${suffix}` : ''}`;
  }

  /** List all API keys for the workspace. */
  async list(): Promise<ApiResponse<ApiKeyInfo[]>> {
    return this.http.get(this.wsPath(''));
  }

  /** Create a new API key. The full key is only returned once. */
  async create(request: CreateApiKeyRequest): Promise<ApiResponse<CreateApiKeyResponse>> {
    return this.http.post(this.wsPath(''), request);
  }

  /** Revoke an API key. */
  async revoke(keyId: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(keyId));
  }

  /** Rotate an API key (revoke + create new). */
  async rotate(keyId: string): Promise<ApiResponse<CreateApiKeyResponse>> {
    return this.http.post(this.wsPath(`${keyId}/rotate`));
  }
}
