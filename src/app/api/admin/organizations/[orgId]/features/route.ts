import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  normalizeAllFeatureSettings,
  parseFeatureSettings,
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

  return NextResponse.json({
    orgId,
    features: normalizeAllFeatureSettings(authResult.organization.organizationData?.features),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const authResult = await verifyOrganizationAdminAccess(request, orgId);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const body = await request.json().catch(() => null);
  const features = parseFeatureSettings(body?.features);

  if (!body || !Array.isArray(body.features) || features.length !== body.features.length) {
    return NextResponse.json({ error: 'INVALID_FEATURE_PAYLOAD' }, { status: 400 });
  }

  const current = new Map(
    normalizeAllFeatureSettings(authResult.organization.organizationData?.features).map((item) => [
      item.featureKey,
      item.enabled,
    ]),
  );

  for (const item of features) {
    current.set(item.featureKey, item.enabled);
  }

  const nextFeatures = Array.from(current.entries()).map(([featureKey, enabled]) => ({
    featureKey,
    enabled,
  }));

  await adminDb.collection('organizations').doc(orgId).set(
    {
      features: nextFeatures,
      updatedAt: Timestamp.now(),
      featureConfigUpdatedAt: Timestamp.now(),
      featureConfigUpdatedBy: authResult.uid,
    },
    { merge: true },
  );

  return NextResponse.json({
    updated: true,
    orgId,
    features: nextFeatures,
  });
}
