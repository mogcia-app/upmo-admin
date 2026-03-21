export const DOCUMENT_VISIBILITY_MODES = ['org', 'policy'] as const;
export const DOCUMENT_ACCESS_SCOPE_TYPES = ['user', 'role'] as const;
export const DOCUMENT_ACCESS_ROLES = ['owner', 'admin', 'member'] as const;
export const DOCUMENT_ACCESS_PERMISSION = 'view' as const;

export type DocumentVisibilityMode = (typeof DOCUMENT_VISIBILITY_MODES)[number];
export type DocumentAccessScopeType = (typeof DOCUMENT_ACCESS_SCOPE_TYPES)[number];
export type DocumentAccessRole = (typeof DOCUMENT_ACCESS_ROLES)[number];
export type DocumentAccessPermission = typeof DOCUMENT_ACCESS_PERMISSION;

export interface DocumentAccessPolicy {
  id: string;
  scopeType: DocumentAccessScopeType;
  scopeId: string;
  permission: DocumentAccessPermission;
}

export interface DocumentAccessPolicyInput {
  scopeType: DocumentAccessScopeType;
  scopeId: string;
  permission: DocumentAccessPermission;
}

export interface DocumentAccessPolicyResponse {
  documentId: string;
  orgId: string;
  visibilityMode: DocumentVisibilityMode;
  policies: DocumentAccessPolicy[];
}
