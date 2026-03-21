import { NextRequest, NextResponse } from 'next/server';
import {
  getDocumentAccessPolicyResponse,
  updateDocumentAccessPolicies,
  verifyOrganizationAdminAccess,
} from '@/lib/server/document-access';
import { requireOrganizationFeature } from '@/lib/server/org-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; documentId: string }> },
) {
  const { orgId, documentId } = await params;
  const authResult = await verifyOrganizationAdminAccess(request, orgId);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const featureError = requireOrganizationFeature(authResult, 'restricted_doc_access');
  if (featureError) {
    return featureError;
  }

  const response = await getDocumentAccessPolicyResponse(orgId, documentId);
  if (!response) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json(response);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; documentId: string }> },
) {
  const { orgId, documentId } = await params;
  const authResult = await verifyOrganizationAdminAccess(request, orgId);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const featureError = requireOrganizationFeature(authResult, 'restricted_doc_access');
  if (featureError) {
    return featureError;
  }

  const body = await request.json().catch(() => null);
  const result = await updateDocumentAccessPolicies({
    orgId,
    documentId,
    payload: body,
    updatedBy: authResult.uid,
  });

  if (!result.ok) {
    if ('status' in result && result.status === 404) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'error' in result ? result.error : 'INVALID_POLICY_PAYLOAD' },
      { status: 400 },
    );
  }

  return NextResponse.json({ updated: true });
}
