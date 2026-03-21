import { adminDb } from '@/lib/firebase-admin';
import {
  parseLimit,
  resolvePeriodRange,
  toIsoString,
  type PeriodRange,
} from '@/lib/server/org-admin';

interface ActivityRecord {
  id: string;
  userId: string | null;
  actionType: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string | null;
  createdAt: string | null;
}

export function sanitizeActivityRecord(
  id: string,
  data: Record<string, unknown>,
): ActivityRecord {
  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : null,
    actionType: typeof data.actionType === 'string' ? data.actionType : null,
    resourceType: typeof data.resourceType === 'string' ? data.resourceType : null,
    resourceId: typeof data.resourceId === 'string' ? data.resourceId : null,
    metadata: data.metadata && typeof data.metadata === 'object'
      ? (data.metadata as Record<string, unknown>)
      : {},
    occurredAt: toIsoString(data.occurredAt),
    createdAt: toIsoString(data.createdAt),
  };
}

export async function fetchOrganizationActivities(orgId: string, maxItems = 500) {
  const snapshot = await adminDb
    .collection('organizations')
    .doc(orgId)
    .collection('activities')
    .orderBy('occurredAt', 'desc')
    .limit(maxItems)
    .get();

  return snapshot.docs.map((doc) =>
    sanitizeActivityRecord(doc.id, (doc.data() || {}) as Record<string, unknown>),
  );
}

export function filterActivities(
  items: ActivityRecord[],
  filters: {
    userId?: string | null;
    actionType?: string | null;
    resourceType?: string | null;
    period?: PeriodRange | null;
  },
) {
  return items.filter((item) => {
    if (filters.userId && item.userId !== filters.userId) {
      return false;
    }
    if (filters.actionType && item.actionType !== filters.actionType) {
      return false;
    }
    if (filters.resourceType && item.resourceType !== filters.resourceType) {
      return false;
    }
    if (filters.period && item.occurredAt) {
      const occurredAt = new Date(item.occurredAt);
      if (occurredAt < filters.period.from || occurredAt > filters.period.to) {
        return false;
      }
    } else if (filters.period && !item.occurredAt) {
      return false;
    }
    return true;
  });
}

export function resolveActivityQuery(searchParams: URLSearchParams) {
  const limit = parseLimit(searchParams.get('limit'), 50, 100);
  if (!limit) {
    return { ok: false as const, error: 'INVALID_LIMIT' };
  }

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  let period: PeriodRange | null = null;

  if (from || to) {
    period = resolvePeriodRange({
      from,
      to,
      periodDays: null,
    });
    if (!period) {
      return { ok: false as const, error: 'INVALID_PERIOD' };
    }
  }

  return {
    ok: true as const,
    filters: {
      userId: searchParams.get('userId'),
      actionType: searchParams.get('actionType'),
      resourceType: searchParams.get('resourceType'),
      from: period?.from.toISOString() ?? null,
      to: period?.to.toISOString() ?? null,
      limit,
      period,
    },
  };
}

export async function fetchOrgMembers(orgId: string) {
  const membersSnapshot = await adminDb
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .get();

  if (!membersSnapshot.empty) {
    return membersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...(doc.data() as Record<string, unknown>),
    })) as Array<{ uid: string } & Record<string, unknown>>;
  }

  const usersSnapshot = await adminDb
    .collection('users')
    .where('companyId', '==', orgId)
    .get();

  return usersSnapshot.docs.map((doc) => ({
    uid: doc.id,
    ...(doc.data() as Record<string, unknown>),
  })) as Array<{ uid: string } & Record<string, unknown>>;
}
