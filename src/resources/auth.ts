// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import { FlexOpsAuthError } from '../types.js';
import type { ApiResponse, LoginRequest, LoginResponse } from '../types.js';

/**
 * Token acquisition for user-token calls. Account management (sign-up, profile, passwords, email
 * verification) lives in the FlexOps portals; integrations normally use an API key instead.
 */
export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Authenticate with email and password. On success the returned access token (`data.token`) is
   * used for later requests. When `data.requiresTwoFactor` is true no token is issued yet.
   */
  async login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const result = await this.http.post<ApiResponse<LoginResponse>>(
      '/api/Account/login',
      request,
    );
    if (result.data?.token) {
      this.http.setAccessToken(result.data.token);
    }
    return result;
  }

  /**
   * Exchange a refresh token for a new access token. The Gateway needs the expired access token
   * too; it defaults to the one this client holds.
   */
  async refreshToken(
    refreshToken: string,
    accessToken: string | undefined = this.http.getAccessToken(),
  ): Promise<ApiResponse<LoginResponse>> {
    if (!accessToken) {
      throw new FlexOpsAuthError('refreshToken needs the expired access token; log in first or pass it.');
    }
    const response = await this.http.post<ApiResponse<LoginResponse>>(
      '/api/Account/refresh-token',
      { token: accessToken, refreshToken },
    );
    if (response.data?.token) {
      this.http.setAccessToken(response.data.token);
    }
    return response;
  }

  /** Log out and invalidate the current session. */
  async logout(): Promise<ApiResponse<unknown>> {
    return this.http.post('/api/Account/logout');
  }
}
