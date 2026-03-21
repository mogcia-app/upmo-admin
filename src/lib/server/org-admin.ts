import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { ADMIN_FEATURE_KEYS, type AdminFeatureKey, type FeatureSetting } from '@/types/features';
import { type DocumentAccessRole } from '@/types/document-access';

interface OrganizationContext {
  orgId: string;
  organizationData: Record<string, unknown> | null;
  organizationMemberData: Record<string, unknown> | null;
}

export interface AuthenticatedOrganizationRequest {
  uid: string;
  role: DocumentAccessRole;
  organization: OrganizationContext;
  userData: Record<string, unknown> | null;
}

export interface PeriodRange {
  from: Date;
  to: Date;
}

function isFeatureKey(value: string): value is AdminFeatureKey {
  return ADMIN_FEATURE_KEYS.includes(value as AdminFeatureKey);
}

export function parseFeatureSettings(raw: unknown): FeatureSetting[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const deduped = new Map<AdminFeatureKey, FeatureSetting>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const featureKey = (item as { featureKey?: string }).featureKey;
    const enabled = (item as { enabled?: boolean }).enabled;

    if (typeof featureKey !== 'string' || !isFeatureKey(featureKey) || typeof enabled !== 'boolean') {
      continue;
    }

    deduped.set(featureKey, { featureKey, enabled });
  }

  return Array.from(deduped.values());
}

export function normalizeAllFeatureSettings(raw: unknown): FeatureSetting[] {
  const existing = new Map(parseFeatureSettings(raw).map((item) => [item.featureKey, item.enabled]));
  return ADMIN_FEATURE_KEYS.map((featureKey) => ({
    featureKey,
    enabled: existing.get(featureKey) ?? false,
  }));
}

export function getEnabledFeatureMap(raw: unknown): Map<AdminFeatureKey, boolean> {
  return new Map(normalizeAllFeatureSettings(raw).map((item) => [item.featureKey, item.enabled]));
}

export async function verifyOrganizationAdminAccess(
  request: NextRequest,
  orgId: string,
): Promise<AuthenticatedOrganizationRequest | NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const [organizationDoc, organizationMemberDoc, userDoc] = await Promise.all([
      adminDb.collection('organizations').doc(orgId).get(),
      adminDb.collection('organizations').doc(orgId).collection('members').doc(uid).get(),
      adminDb.collection('users').doc(uid).get(),
    ]);

    const organizationData = organizationDoc.exists
      ? (organizationDoc.data() as Record<string, unknown>)
      : null;
    const organizationMemberData = organizationMemberDoc.exists
      ? (organizationMemberDoc.data() as Record<string, unknown>)
      : null;
    const userData = userDoc.exists ? (userDoc.data() as Record<string, unknown>) : null;

    let resolvedRole: DocumentAccessRole | null = null;

    if (organizationData?.ownerUid === uid) {
      resolvedRole = 'owner';
    } else if (
      organizationMemberData &&
      typeof organizationMemberData.role === 'string' &&
      ['owner', 'admin', 'member'].includes(organizationMemberData.role)
    ) {
      resolvedRole = organizationMemberData.role as DocumentAccessRole;
    } else if (Array.isArray(organizationData?.adminUids) && organizationData.adminUids.includes(uid)) {
      resolvedRole = 'admin';
    }

    if (!resolvedRole || (resolvedRole !== 'owner' && resolvedRole !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return {
      uid,
      role: resolvedRole,
      organization: {
        orgId,
        organizationData,
        organizationMemberData,
      },
      userData,
    };
  } catch (error) {
    console.error('Organization access verification error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export function ensureFeatureEnabled(
  organizationData: Record<string, unknown> | null,
  featureKey: AdminFeatureKey,
) {
  const features = getEnabledFeatureMap(organizationData?.features);
  return features.get(featureKey) === true;
}

export function requireOrganizationFeature(
  auth: Pick<AuthenticatedOrganizationRequest, 'organization'>,
  featureKey: AdminFeatureKey,
) {
  if (!ensureFeatureEnabled(auth.organization.organizationData, featureKey)) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 });
  }

  if (!ensureFeatureEnabled(auth.organization.organizationMemberData, featureKey)) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 });
  }

  return null;
}

export function parseIsoDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function resolvePeriodRange(params: {
  from: string | null;
  to: string | null;
  periodDays: string | null;
}): PeriodRange | null {
  const from = parseIsoDate(params.from);
  const to = parseIsoDate(params.to);

  if ((params.from && !from) || (params.to && !to)) {
    return null;
  }

  if (from && to) {
    return { from, to };
  }

  const parsedPeriodDays = params.periodDays ? Number(params.periodDays) : NaN;
  const periodDays = Number.isFinite(parsedPeriodDays) && parsedPeriodDays > 0 ? parsedPeriodDays : 30;
  const resolvedTo = to ?? new Date();
  const resolvedFrom = from ?? new Date(resolvedTo.getTime() - periodDays * 24 * 60 * 60 * 1000);

  return {
    from: resolvedFrom,
    to: resolvedTo,
  };
}

export function parseLimit(value: string | null, defaultValue: number, maxValue: number) {
  const parsed = value ? Number(value) : defaultValue;

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxValue) {
    return null;
  }

  return parsed;
}

export async function resolveUserOrganizationId(uid: string): Promise<string | null> {
  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return null;
  }

  const userData = userDoc.data() as Record<string, unknown>;
  if (typeof userData.companyId === 'string' && userData.companyId.length > 0) {
    return userData.companyId;
  }
  if (typeof userData.orgId === 'string' && userData.orgId.length > 0) {
    return userData.orgId;
  }

  const ownedOrgSnapshot = await adminDb
    .collection('organizations')
    .where('ownerUid', '==', uid)
    .limit(1)
    .get();

  if (!ownedOrgSnapshot.empty) {
    return ownedOrgSnapshot.docs[0].id;
  }

  return null;
}

export function toIsoString(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}
