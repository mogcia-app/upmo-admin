import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  normalizeAllFeatureSettings,
  parseFeatureSettings,
  resolveUserOrganizationId,
  verifyOrganizationAdminAccess,
} from '@/lib/server/org-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const orgId = await resolveUserOrganizationId(userId);

  if (!orgId) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const authResult = await verifyOrganizationAdminAccess(request, orgId);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const memberDoc = await adminDb
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .doc(userId)
    .get();
  if (!memberDoc.exists) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json({
    uid: userId,
    orgId,
    features: normalizeAllFeatureSettings(memberDoc.data()?.features),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const orgId = await resolveUserOrganizationId(userId);

  if (!orgId) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const authResult = await verifyOrganizationAdminAccess(request, orgId);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const memberDoc = await adminDb
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .doc(userId)
    .get();
  if (!memberDoc.exists) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const features = parseFeatureSettings(body?.features);

  if (!body || !Array.isArray(body.features) || features.length !== body.features.length) {
    return NextResponse.json({ error: 'INVALID_FEATURE_PAYLOAD' }, { status: 400 });
  }

  const orgFeatures = new Map(
    normalizeAllFeatureSettings(authResult.organization.organizationData?.features).map((item) => [
      item.featureKey,
      item.enabled,
    ]),
  );

  for (const feature of features) {
    if (feature.enabled && orgFeatures.get(feature.featureKey) !== true) {
      return NextResponse.json({ error: 'INVALID_UNCONTRACTED_FEATURE' }, { status: 400 });
    }
  }

  const current = new Map(
    normalizeAllFeatureSettings(memberDoc.data()?.features).map((item) => [item.featureKey, item.enabled]),
  );

  for (const item of features) {
    current.set(item.featureKey, item.enabled);
  }

  const nextFeatures = Array.from(current.entries()).map(([featureKey, enabled]) => ({
    featureKey,
    enabled,
  }));

  await memberDoc.ref.set(
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
    uid: userId,
    orgId,
    features: nextFeatures,
  });
}
