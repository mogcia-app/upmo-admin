import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  DOCUMENT_ACCESS_PERMISSION,
  DOCUMENT_ACCESS_ROLES,
  DOCUMENT_ACCESS_SCOPE_TYPES,
  DOCUMENT_VISIBILITY_MODES,
  type DocumentAccessPolicy,
  type DocumentAccessPolicyInput,
  type DocumentAccessPolicyResponse,
  type DocumentAccessRole,
  type DocumentVisibilityMode,
} from '@/types/document-access';
import { verifyOrganizationAdminAccess as verifyAccessBase } from '@/lib/server/org-admin';

type PolicyValidationResult =
  | { ok: true; visibilityMode: DocumentVisibilityMode; policies: DocumentAccessPolicy[] }
  | { ok: false; error: 'INVALID_POLICY_PAYLOAD' | 'INVALID_POLICY_ROLE' };

function buildPolicyId(scopeType: 'user' | 'role', scopeId: string) {
  return `${scopeType}_${scopeId}`;
}

function normalizePolicies(
  policies: DocumentAccessPolicyInput[],
): PolicyValidationResult {
  const normalized = new Map<string, DocumentAccessPolicy>();

  for (const policy of policies) {
    if (!policy || typeof policy !== 'object') {
      return { ok: false, error: 'INVALID_POLICY_PAYLOAD' };
    }

    if (!DOCUMENT_ACCESS_SCOPE_TYPES.includes(policy.scopeType)) {
      return { ok: false, error: 'INVALID_POLICY_PAYLOAD' };
    }

    if (typeof policy.scopeId !== 'string' || policy.scopeId.trim().length === 0) {
      return { ok: false, error: 'INVALID_POLICY_PAYLOAD' };
    }

    if (policy.permission !== DOCUMENT_ACCESS_PERMISSION) {
      return { ok: false, error: 'INVALID_POLICY_PAYLOAD' };
    }

    const scopeId = policy.scopeId.trim();

    if (
      policy.scopeType === 'role' &&
      !DOCUMENT_ACCESS_ROLES.includes(scopeId as DocumentAccessRole)
    ) {
      return { ok: false, error: 'INVALID_POLICY_ROLE' };
    }

    const id = buildPolicyId(policy.scopeType, scopeId);
    normalized.set(id, {
      id,
      scopeType: policy.scopeType,
      scopeId,
      permission: DOCUMENT_ACCESS_PERMISSION,
    });
  }

  return { ok: true, visibilityMode: 'policy', policies: Array.from(normalized.values()) };
}

function parsePolicyPayload(body: unknown): PolicyValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'INVALID_POLICY_PAYLOAD' };
  }

  const { visibilityMode, policies } = body as {
    visibilityMode?: DocumentVisibilityMode;
    policies?: DocumentAccessPolicyInput[];
  };

  if (!DOCUMENT_VISIBILITY_MODES.includes(visibilityMode as DocumentVisibilityMode)) {
    return { ok: false, error: 'INVALID_POLICY_PAYLOAD' };
  }

  if (!Array.isArray(policies)) {
    return { ok: false, error: 'INVALID_POLICY_PAYLOAD' };
  }

  if (visibilityMode === 'org') {
    return { ok: true, visibilityMode, policies: [] };
  }

  return normalizePolicies(policies);
}

function extractPoliciesFromDocument(data: Record<string, unknown>): DocumentAccessPolicy[] {
  const rawPolicies = Array.isArray(data.policies)
    ? data.policies
    : Array.isArray(data.accessPolicies)
      ? data.accessPolicies
      : [];

  const normalized: DocumentAccessPolicy[] = [];

  for (const rawPolicy of rawPolicies) {
    if (!rawPolicy || typeof rawPolicy !== 'object') {
      continue;
    }

    const scopeType = (rawPolicy as { scopeType?: string }).scopeType;
    const scopeId = (rawPolicy as { scopeId?: string }).scopeId;
    const permission = (rawPolicy as { permission?: string }).permission;

    if (
      (scopeType === 'user' || scopeType === 'role') &&
      typeof scopeId === 'string' &&
      scopeId.trim().length > 0 &&
      permission === DOCUMENT_ACCESS_PERMISSION
    ) {
      normalized.push({
        id: buildPolicyId(scopeType, scopeId.trim()),
        scopeType,
        scopeId: scopeId.trim(),
        permission: DOCUMENT_ACCESS_PERMISSION,
      });
    }
  }

  return normalized;
}

export async function verifyOrganizationAdminAccess(
  ...args: Parameters<typeof verifyAccessBase>
) {
  return verifyAccessBase(...args);
}

export async function getDocumentAccessPolicyResponse(
  orgId: string,
  documentId: string,
): Promise<DocumentAccessPolicyResponse | null> {
  const documentRef = adminDb
    .collection('organizations')
    .doc(orgId)
    .collection('documents')
    .doc(documentId);
  const snapshot = await documentRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = (snapshot.data() || {}) as Record<string, unknown>;
  const visibilityMode =
    data.visibilityMode === 'policy'
      ? 'policy'
      : 'org';

  return {
    documentId,
    orgId,
    visibilityMode,
    policies: visibilityMode === 'policy' ? extractPoliciesFromDocument(data) : [],
  };
}

export async function updateDocumentAccessPolicies(params: {
  orgId: string;
  documentId: string;
  payload: unknown;
  updatedBy: string;
}) {
  const parsed = parsePolicyPayload(params.payload);
  if (!parsed.ok) {
    return parsed;
  }

  const documentRef = adminDb
    .collection('organizations')
    .doc(params.orgId)
    .collection('documents')
    .doc(params.documentId);
  const snapshot = await documentRef.get();

  if (!snapshot.exists) {
    return { ok: false as const, status: 404 };
  }

  await documentRef.update({
    visibilityMode: parsed.visibilityMode,
    policies: parsed.policies,
    accessPolicies: parsed.policies,
    accessPoliciesUpdatedAt: Timestamp.now(),
    accessPoliciesUpdatedBy: params.updatedBy,
    updatedAt: Timestamp.now(),
  });

  return { ok: true as const };
}
