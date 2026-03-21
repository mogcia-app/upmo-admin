import { NextRequest, NextResponse } from 'next/server';
import {
  fetchOrganizationActivities,
  filterActivities,
  resolveActivityQuery,
} from '@/lib/server/activity-analytics';
import {
  requireOrganizationFeature,
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

  const featureError = requireOrganizationFeature(authResult, 'activity_audit');
  if (featureError) {
    return featureError;
  }

  const query = resolveActivityQuery(request.nextUrl.searchParams);
  if (!query.ok) {
    return NextResponse.json({ error: query.error }, { status: 400 });
  }

  const items = filterActivities(await fetchOrganizationActivities(orgId), {
    userId: query.filters.userId,
    actionType: query.filters.actionType,
    resourceType: query.filters.resourceType,
    period: query.filters.period,
  }).slice(0, query.filters.limit);

  return NextResponse.json({
    orgId,
    filters: {
      userId: query.filters.userId,
      actionType: query.filters.actionType,
      resourceType: query.filters.resourceType,
      from: query.filters.from,
      to: query.filters.to,
      limit: query.filters.limit,
    },
    items,
    pageInfo: {
      nextCursor: null,
    },
  });
}
