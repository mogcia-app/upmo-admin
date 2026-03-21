import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { type OrganizationRole } from '@/types/organization-role';

interface OrganizationContext {
  orgId: string;
  organizationData: Record<string, unknown> | null;
  organizationMemberData: Record<string, unknown> | null;
}

export interface AuthenticatedOrganizationRequest {
  uid: string;
  role: OrganizationRole;
  organization: OrganizationContext;
  userData: Record<string, unknown> | null;
}

export interface PeriodRange {
  from: Date;
  to: Date;
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

    let resolvedRole: OrganizationRole | null = null;

    if (organizationData?.ownerUid === uid) {
      resolvedRole = 'owner';
    } else if (
      organizationMemberData &&
      typeof organizationMemberData.role === 'string' &&
      ['owner', 'admin', 'member'].includes(organizationMemberData.role)
    ) {
      resolvedRole = organizationMemberData.role as OrganizationRole;
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
