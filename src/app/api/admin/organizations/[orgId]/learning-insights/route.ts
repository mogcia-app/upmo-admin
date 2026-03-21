import { NextRequest, NextResponse } from 'next/server';
import { fetchOrganizationActivities, filterActivities } from '@/lib/server/activity-analytics';
import {
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

  const featureError = requireOrganizationFeature(authResult, 'learning_insights');
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

  const limit = parseLimit(request.nextUrl.searchParams.get('limit'), 300, 1000);
  if (!limit) {
    return NextResponse.json({ error: 'INVALID_LIMIT' }, { status: 400 });
  }

  const items = filterActivities(await fetchOrganizationActivities(orgId, Math.max(limit, 500)), {
    period,
  }).slice(0, limit);

  const topKnowledgeCounts = new Map<string, { name: string; views: number }>();
  const stuckActionCounts = new Map<string, number>();
  const topKnowledgeUsers = new Map<string, { documentIds: Set<string>; interactions: number }>();

  for (const item of items) {
    if (item.actionType) {
      stuckActionCounts.set(item.actionType, (stuckActionCounts.get(item.actionType) ?? 0) + 1);
    }

    const isDocumentView =
      item.resourceType === 'document' &&
      typeof item.resourceId === 'string' &&
      (item.actionType === 'document_view' || item.actionType === 'document_open' || item.actionType === 'document_read');

    if (!isDocumentView) {
      continue;
    }

    if (typeof item.resourceId !== 'string') {
      continue;
    }

    const resourceId = item.resourceId;
    const metadataName = typeof item.metadata.name === 'string' ? item.metadata.name : resourceId;
    const currentKnowledge = topKnowledgeCounts.get(resourceId) ?? { name: metadataName, views: 0 };
    currentKnowledge.views += 1;
    topKnowledgeCounts.set(resourceId, currentKnowledge);

    if (item.userId) {
      const currentUser = topKnowledgeUsers.get(item.userId) ?? {
        documentIds: new Set<string>(),
        interactions: 0,
      };
      currentUser.documentIds.add(resourceId);
      currentUser.interactions += 1;
      topKnowledgeUsers.set(item.userId, currentUser);
    }
  }

  return NextResponse.json({
    period: {
      from: period.from.toISOString(),
      to: period.to.toISOString(),
    },
    metrics: {
      topKnowledge: Array.from(topKnowledgeCounts.entries())
        .map(([resourceId, value]) => ({
          resourceId,
          name: value.name,
          views: value.views,
        }))
        .sort((left, right) => right.views - left.views)
        .slice(0, 10),
      stuckActions: Array.from(stuckActionCounts.entries())
        .map(([actionType, count]) => ({ actionType, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 10),
      topKnowledgeUsers: Array.from(topKnowledgeUsers.entries())
        .map(([userId, value]) => ({
          userId,
          documentIds: Array.from(value.documentIds),
          interactions: value.interactions,
        }))
        .sort((left, right) => right.interactions - left.interactions)
        .slice(0, 10),
    },
  });
}
