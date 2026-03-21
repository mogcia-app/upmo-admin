import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface RequestError {
  message?: string;
}

interface UserUpdateBody {
  status?: string;
  department?: string;
  position?: string;
  subscriptionType?: string | null;
  displayName?: string;
  companyName?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as RequestError;
    if (candidate.message) {
      return candidate.message;
    }
  }

  return fallback;
}

async function findCompany(companyId?: string | null, companyName?: string | null) {
  if (companyId) {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (companyDoc.exists) {
      return { id: companyDoc.id, ...companyDoc.data() };
    }
  }

  if (companyName) {
    const snapshot = await adminDb
      .collection('companies')
      .where('name', '==', companyName)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const companyDoc = snapshot.docs[0];
      return { id: companyDoc.id, ...companyDoc.data() };
    }
  }

  return null;
}

/**
 * PUT: ユーザー情報を更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 認証トークンをリクエストヘッダーから取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Firebase認証トークンを検証
    try {
      await adminAuth.verifyIdToken(token);
    } catch (authError) {
      console.error('Auth verification error:', authError);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // パラメータを取得
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // リクエストボディを取得
    const body = (await request.json()) as UserUpdateBody;
    const { status, department, position, subscriptionType, displayName, companyName } = body;

    // 更新データを構築
    const updateData: Record<string, string | null | Timestamp> = {};

    if (status !== undefined) updateData.status = status;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (subscriptionType !== undefined) updateData.subscriptionType = subscriptionType;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (companyName !== undefined) updateData.companyName = companyName;
    
    // ✅ 統一スキーマに準拠: updatedAtをTimestamp.now()で設定
    updateData.updatedAt = Timestamp.now();

    // ユーザードキュメントが存在するか確認
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ユーザー情報を更新
    await userDocRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, 'Failed to update user') },
      { status: 500 }
    );
  }
}

/**
 * GET: 特定のユーザー情報を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 認証トークンをリクエストヘッダーから取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Firebase認証トークンを検証
    try {
      await adminAuth.verifyIdToken(token);
    } catch (authError) {
      console.error('Auth verification error:', authError);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // パラメータを取得
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // ユーザードキュメントを取得
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: userDoc.id,
        ...userDoc.data(),
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, 'Failed to fetch user') },
      { status: 500 }
    );
  }
}

/**
 * DELETE: ユーザーを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 認証トークンをリクエストヘッダーから取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Firebase認証トークンを検証
    try {
      await adminAuth.verifyIdToken(token);
    } catch (authError) {
      console.error('Auth verification error:', authError);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // パラメータを取得
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // ユーザードキュメントが存在するか確認
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const company = await findCompany(
      (userData?.companyId as string | undefined) || null,
      (userData?.companyName as string | undefined) || null
    );

    // Firebase Authからユーザーを削除
    await adminAuth.deleteUser(userId);

    if (company) {
      await adminDb.runTransaction(async (transaction) => {
        const companyRef = adminDb.collection('companies').doc(company.id);
        const latestCompanyDoc = await transaction.get(companyRef);
        const latestSeatsUsed = latestCompanyDoc.exists
          ? Math.max(0, (latestCompanyDoc.data()?.seatsUsed as number | undefined) || 0)
          : 0;

        transaction.delete(userDocRef);

        if (latestCompanyDoc.exists) {
          transaction.update(companyRef, {
            seatsUsed: Math.max(0, latestSeatsUsed - 1),
            updatedAt: Timestamp.now(),
          });
        }
      });
    } else {
      // Firestoreからユーザードキュメントを削除
      await userDocRef.delete();
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, 'Failed to delete user') },
      { status: 500 }
    );
  }
}
