// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import type { ApiResponse, ShippingRule } from '../types.js';

export class RulesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required.');
    return `/api/workspaces/${id}/shipping-rules${suffix ? `/${suffix}` : ''}`;
  }

  /** List all shipping automation rules. Max 100 per workspace. */
  async list(): Promise<ApiResponse<ShippingRule[]>> {
    return this.http.get(this.wsPath(''));
  }

  /** Get a rule by ID. */
  async get(ruleId: string): Promise<ApiResponse<ShippingRule>> {
    return this.http.get(this.wsPath(ruleId));
  }

  /** Create a shipping rule. */
  async create(rule: Omit<ShippingRule, 'id'>): Promise<ApiResponse<ShippingRule>> {
    return this.http.post(this.wsPath(''), rule);
  }

  /** Update a shipping rule. */
  async update(ruleId: string, rule: Partial<ShippingRule>): Promise<ApiResponse<ShippingRule>> {
    return this.http.put(this.wsPath(ruleId), rule);
  }

  /** Delete a shipping rule. */
  async delete(ruleId: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(ruleId));
  }

  /** Reorder rules (set priority). */
  async reorder(ruleIds: string[]): Promise<ApiResponse<unknown>> {
    return this.http.put(this.wsPath('reorder'), { ruleIds });
  }
}
