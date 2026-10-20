// ***********************************************************************
// Package          : @flexops/sdk
// Author           : FlexOps, LLC
// Created          : 2026-03-04
//
// Copyright (c) 2021-2026 by FlexOps, LLC. All rights reserved.
// ***********************************************************************

import type { HttpClient } from '../http.js';
import { WorkspaceRole } from '../types.js';
import type { ApiResponse, Workspace, WorkspaceDetail, WorkspaceMemberList } from '../types.js';

export class WorkspacesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly getWorkspaceId: () => string | undefined,
  ) {}

  private wsPath(suffix?: string): string {
    const id = this.getWorkspaceId();
    if (!id) throw new Error('workspaceId is required. Set it via client.workspaceId or config.');
    return suffix ? `/api/workspaces/${id}/${suffix}` : `/api/workspaces/${id}`;
  }

  /** List all workspaces the current user belongs to. */
  async list(): Promise<ApiResponse<Workspace[]>> {
    return this.http.get('/api/workspaces');
  }

  /** Get details for a specific workspace. */
  async get(workspaceId?: string): Promise<ApiResponse<WorkspaceDetail>> {
    const id = workspaceId ?? this.getWorkspaceId();
    return this.http.get(`/api/workspaces/${id}`);
  }

  /** List the current workspace's members and pending invites. */
  async listMembers(): Promise<ApiResponse<WorkspaceMemberList>> {
    return this.http.get(this.wsPath('members'));
  }

  /** Invite a user to the workspace. */
  async inviteMember(email: string, role: WorkspaceRole = WorkspaceRole.Member): Promise<ApiResponse<unknown>> {
    return this.http.post(this.wsPath('members/invite'), { email, role });
  }

  /** Remove a member from the workspace. */
  async removeMember(userId: string): Promise<ApiResponse<unknown>> {
    return this.http.delete(this.wsPath(`members/${userId}`));
  }

  /** Change a member's role. */
  async updateMemberRole(userId: string, role: WorkspaceRole): Promise<ApiResponse<unknown>> {
    return this.http.put(this.wsPath(`members/${userId}/role`), { newRole: role });
  }
}
