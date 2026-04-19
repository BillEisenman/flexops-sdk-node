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
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '../types.js';

export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  /** Authenticate with email and password. Returns JWT tokens. */
  async login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const result = await this.http.post<ApiResponse<LoginResponse>>(
      '/api/Account/login',
      request,
    );
    if (result.data?.accessToken) {
      this.http.setAccessToken(result.data.accessToken);
    }
    return result;
  }

  /** Register a new account. */
  async register(request: RegisterRequest): Promise<ApiResponse<unknown>> {
    return this.http.post('/api/Account/register', request);
  }

  /** Refresh an expired access token. */
  async refreshToken(refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    // The refresh token is sent via X-Current-Session-Token header
    const response = await this.http.request<ApiResponse<LoginResponse>>(
      'POST',
      '/api/Account/refresh-token',
      { headers: { 'X-Current-Session-Token': refreshToken } },
    );
    if (response.data?.accessToken) {
      this.http.setAccessToken(response.data.accessToken);
    }
    return response;
  }

  /** Log out and invalidate the current session. */
  async logout(): Promise<ApiResponse<unknown>> {
    return this.http.post('/api/Account/logout');
  }

  /** Get the current user's profile. */
  async getProfile(): Promise<ApiResponse<unknown>> {
    return this.http.get('/api/Account/profile');
  }

  /** Update the current user's profile. */
  async updateProfile(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return this.http.put('/api/Account/profile', data);
  }

  /** Change the current user's password. */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<unknown>> {
    return this.http.post('/api/Account/change-password', {
      currentPassword,
      newPassword,
    });
  }

  /** Request a password reset email. */
  async forgotPassword(email: string): Promise<ApiResponse<unknown>> {
    return this.http.post('/api/Account/forgot-password', { email });
  }

  /** Reset password using a reset token. */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<unknown>> {
    return this.http.post('/api/Account/reset-password', { token, newPassword });
  }

  /** Verify email with the verification token. */
  async verifyEmail(token: string): Promise<ApiResponse<unknown>> {
    return this.http.post('/api/Account/verify-email', { token });
  }
}
