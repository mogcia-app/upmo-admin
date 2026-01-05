import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { validateUserData } from '@/types/user';

/**
 * GET: 利用者一覧を取得
 */
export async function GET(request: NextRequest) {
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

    // Firestoreからユーザー一覧を取得
    const usersSnapshot = await adminDb.collection('users').get();
    const users = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST: 新しいユーザーを登録
 */
export async function POST(request: NextRequest) {
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
      const decodedToken = await adminAuth.verifyIdToken(token);
      const user = await adminAuth.getUser(decodedToken.uid);
      
      // 管理者権限をチェック（必要に応じて）
      // ここでは認証済みユーザーならOKとする
    } catch (authError) {
      console.error('Auth verification error:', authError);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { email, password, displayName, companyName, subscriptionType, department, position } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // 1. Firebase Authenticationでユーザーを作成
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || undefined,
    });

    // 2. Firestoreにユーザー情報を保存（統一スキーマに準拠）
    const userData = {
      email,
      displayName: displayName || email.split('@')[0],
      companyName: companyName || '',
      role: 'user' as const, // 親ユーザーは固定でuser
      status: 'active' as const, // ✅ 追加（必須）
      department: department || '', // ✅ 追加（オプション、デフォルト: ''）
      position: position || '', // ✅ 追加（オプション、デフォルト: ''）
      createdAt: Timestamp.now(), // ✅ FieldValue.serverTimestamp()から変更
      createdBy: null, // ✅ 追加（admin側から作成した場合はnull）
      updatedAt: Timestamp.now(), // ✅ FieldValue.serverTimestamp()から変更
      subscriptionType: subscriptionType || null,
    };

    // バリデーション（オプション）
    const validation = validateUserData(userData);
    if (!validation.valid) {
      // バリデーションエラーの場合、Firebase Authのユーザーを削除
      await adminAuth.deleteUser(userRecord.uid);
      return NextResponse.json(
        { success: false, error: `バリデーションエラー: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    const userDocRef = adminDb.collection('users').doc(userRecord.uid);
    await userDocRef.set(userData);

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      uid: userRecord.uid,
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    let errorMessage = 'Failed to create user';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'このメールアドレスは既に使用されています';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'メールアドレスの形式が正しくありません';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
