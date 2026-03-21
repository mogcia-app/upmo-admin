import { NextRequest, NextResponse } from 'next/server';
import {
  fetchOrgMembers,
  fetchOrganizationActivities,
  filterActivities,
} from '@/lib/server/activity-analytics';
import {
  getEnabledFeatureMap,
  parseLimit,
  requireOrganizationFeature,
  resolvePeriodRange,
  verifyOrganizationAdminAccess,
} from '@/lib/server/org-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const authResult = await verifyOrganizationAdminAccess(request, orgId);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const featureError = requireOrganizationFeature(authResult, 'org_dashboard');
  if (featureError) {
    return featureError;
  }

  const period = resolvePeriodRange({
    from: request.nextUrl.searchParams.get('from'),
    to: request.nextUrl.searchParams.get('to'),
    periodDays: request.nextUrl.searchParams.get('periodDays'),
  });
  if (!period) {
    return NextResponse.json({ error: 'INVALID_PERIOD' }, { status: 400 });
  }

  const limit = parseLimit(request.nextUrl.searchParams.get('limit'), 500, 1000);
  if (!limit) {
    return NextResponse.json({ error: 'INVALID_LIMIT' }, { status: 400 });
  }

  const [members, activities] = await Promise.all([
    fetchOrgMembers(orgId),
    fetchOrganizationActivities(orgId, Math.max(limit, 500)),
  ]);

  const filteredActivities = filterActivities(activities, { period }).slice(0, limit);
  const activeUsers = new Set(filteredActivities.map((item) => item.userId).filter(Boolean));
  const roleCounts = new Map<'owner' | 'admin' | 'member', number>([
    ['owner', 0],
    ['admin', 0],
    ['member', 0],
  ]);
  const featureUsage = new Map<string, number>();
  const recentActions = new Map<string, number>();
  const orgFeatures = getEnabledFeatureMap(authResult.organization.organizationData?.features);

  for (const member of members) {
    let role: 'owner' | 'admin' | 'member' = 'member';
    if (authResult.organization.organizationData?.ownerUid === member.uid) {
      role = 'owner';
    } else if (member.role === 'owner' || member.role === 'admin' || member.role === 'member') {
      role = member.role;
    } else if (member.role === 'admin') {
      role = 'admin';
    }

    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);

    const memberFeatures = getEnabledFeatureMap(member.features);
    for (const [featureKey, enabled] of orgFeatures.entries()) {
      if (enabled && memberFeatures.get(featureKey) === true) {
        featureUsage.set(featureKey, (featureUsage.get(featureKey) ?? 0) + 1);
      }
    }
  }

  for (const item of filteredActivities) {
    if (!item.actionType) {
      continue;
    }
    recentActions.set(item.actionType, (recentActions.get(item.actionType) ?? 0) + 1);
  }

  return NextResponse.json({
    period: {
      from: period.from.toISOString(),
      to: period.to.toISOString(),
    },
    metrics: {
      totalMembers: members.length,
      activeUsers: activeUsers.size,
      featureUsage: Array.from(orgFeatures.entries()).map(([featureKey]) => ({
        featureKey,
        enabledUsers: featureUsage.get(featureKey) ?? 0,
      })),
      roleBreakdown: Array.from(roleCounts.entries()).map(([role, users]) => ({ role, users })),
      recentActions: Array.from(recentActions.entries())
        .map(([actionType, count]) => ({ actionType, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 10),
    },
  });
}
