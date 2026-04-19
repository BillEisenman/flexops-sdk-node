// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { FlexOpsConfig, RetryConfig } from './types.js';
import { FlexOpsError, FlexOpsRateLimitError, FlexOpsAuthError } from './types.js';

const DEFAULT_BASE_URL = 'https://gateway.flexops.io';
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retry: Required<RetryConfig>;
  private readonly customHeaders: Record<string, string>;
  private readonly fetchFn: typeof globalThis.fetch;

  private accessToken?: string;
  private apiKey?: string;

  constructor(config: FlexOpsConfig) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retry = { ...DEFAULT_RETRY, ...config.retry };
    this.customHeaders = config.headers ?? {};
    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.accessToken = config.accessToken;
    this.apiKey = config.apiKey;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
      timeout?: number;
    },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.query);
    const headers = this.buildHeaders(options?.headers);
    const body = options?.body ? JSON.stringify(options.body) : undefined;
    const timeout = options?.timeout ?? this.timeout;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retry.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.calculateBackoff(attempt);
        await sleep(delay);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await this.fetchFn(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) {
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            return (await response.json()) as T;
          }
          // For binary responses (labels, etc.), return the response as-is
          return response as unknown as T;
        }

        // Rate limited
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') ?? '0', 10);
          lastError = new FlexOpsRateLimitError(
            `Rate limited. Retry after ${retryAfter}s`,
            retryAfter,
          );
          if (this.retry.retryableStatusCodes.includes(429)) continue;
          throw lastError;
        }

        // Auth errors — don't retry
        if (response.status === 401) {
          throw new FlexOpsAuthError('Authentication required. Check your access token or API key.');
        }
        if (response.status === 403) {
          throw new FlexOpsError('Access denied. Check your plan tier and feature entitlements.', 403, 'FORBIDDEN');
        }

        // Parse error body
        let errorBody: { message?: string; errors?: string[] } = {};
        try {
          errorBody = (await response.json()) as typeof errorBody;
        } catch {
          // Response body isn't JSON
        }

        const error = new FlexOpsError(
          errorBody.message ?? `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          undefined,
          errorBody.errors,
        );

        if (this.retry.retryableStatusCodes.includes(response.status)) {
          lastError = error;
          continue;
        }

        throw error;
      } catch (err) {
        clearTimeout(timer);

        if (err instanceof FlexOpsError) {
          if (err instanceof FlexOpsRateLimitError && attempt < this.retry.maxRetries) continue;
          throw err;
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new FlexOpsError(`Request timed out after ${timeout}ms`, 0, 'TIMEOUT');
          continue;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.retry.maxRetries) continue;
      }
    }

    throw lastError ?? new FlexOpsError('Request failed after retries', 0, 'RETRY_EXHAUSTED');
  }

  async get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  async post<T>(path: string, body?: unknown, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('POST', path, { body, query });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.customHeaders,
      ...extra,
    };

    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    } else if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private calculateBackoff(attempt: number): number {
    const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15x
    return Math.min(this.retry.baseDelay * Math.pow(2, attempt - 1) * jitter, 30_000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
