import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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
    const body = await request.json();
    const { role, status, department, position, subscriptionType, displayName, companyName } = body;

    // 更新データを構築
    const updateData: any = {};

    if (role !== undefined) updateData.role = role;
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
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
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
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user' },
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

    // Firebase Authからユーザーを削除
    await adminAuth.deleteUser(userId);

    // Firestoreからユーザードキュメントを削除
    await userDocRef.delete();

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}


