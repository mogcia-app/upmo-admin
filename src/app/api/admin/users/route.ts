import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { validateUserData } from '@/types/user';

/**
 * ランダムな仮パスワードを生成
 */
function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

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
 * 
 * 設計方針:
 * - validateUserDataに寄せ切る（唯一の「憲法」として正しさを定義）
 * - API側で事前ifを増やさない（正しさの定義がズレる）
 * - 統一スキーマに準拠したデータを保存
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
      await adminAuth.verifyIdToken(token);
    } catch (authError) {
      console.error('Auth verification error:', authError);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    
    // 一括登録かどうかを判定
    if (body.users && Array.isArray(body.users)) {
      // 一括登録処理
      return await handleBulkUserCreation(body, token);
    } else {
      // 単一ユーザー登録処理（後方互換性のため維持）
      return await handleSingleUserCreation(body, token);
    }
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    let errorMessage = 'ユーザー作成に失敗しました';
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

/**
 * 単一ユーザー登録処理
 */
async function handleSingleUserCreation(body: any, token: string) {
  const { 
    email, 
    password, 
    displayName, 
    companyName, 
    role,
    subscriptionType, 
    department, 
    position,
    generatePassword
  } = body;

  // 基本的なチェック（emailのみ必須、passwordは自動生成の場合は不要）
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'メールアドレスは必須です' },
      { status: 400 }
    );
  }

  // パスワードの処理: 自動生成が指定されている場合、またはパスワードが提供されていない場合
  let finalPassword = password;
  if (generatePassword || !password) {
    finalPassword = generateRandomPassword();
  }

  // パスワードの最小長チェック（Firebase Authの要件）
  if (finalPassword.length < 6) {
    return NextResponse.json(
      { success: false, error: 'パスワードは6文字以上である必要があります' },
      { status: 400 }
    );
  }

  // 1. Firebase Authenticationでユーザーを作成
  const userRecord = await adminAuth.createUser({
    email,
    password: finalPassword,
    displayName: displayName || undefined,
  });

  // 2. Firestoreにユーザー情報を保存（統一スキーマに準拠）
  const userData = {
    email,
    displayName: displayName || email.split('@')[0],
    companyName: companyName || '',
    role: (role || 'user') as 'admin' | 'manager' | 'user',
    status: 'active' as const,
    department: department || '',
    position: position || '',
    createdAt: Timestamp.now(),
    createdBy: null,
    updatedAt: Timestamp.now(),
    subscriptionType: subscriptionType || null,
  };

  // バリデーション（必須）: validateUserDataに寄せ切る
  const validation = validateUserData(userData);
  if (!validation.valid) {
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
    password: generatePassword || !password ? finalPassword : undefined,
  });
}

/**
 * 一括ユーザー登録処理
 */
async function handleBulkUserCreation(body: any, token: string) {
  const { companyName, users, subscriptionType } = body;

  if (!companyName || !users || !Array.isArray(users) || users.length === 0) {
    return NextResponse.json(
      { success: false, error: '会社名とユーザーリストは必須です' },
      { status: 400 }
    );
  }

  const results: Array<{ email: string; uid: string; password: string; success: boolean }> = [];
  const errors: Array<{ email: string; error: string }> = [];

  for (const userInput of users) {
    const { email, displayName } = userInput;

    try {
      // メールアドレスのチェック
      if (!email) {
        errors.push({ email: email || '(不明)', error: 'メールアドレスは必須です' });
        continue;
      }

      // パスワードは常に自動生成
      const finalPassword = generateRandomPassword();

      // 1. Firebase Authenticationでユーザーを作成
      const userRecord = await adminAuth.createUser({
        email,
        password: finalPassword,
        displayName: displayName || undefined,
      });

      // 2. Firestoreにユーザー情報を保存（統一スキーマに準拠）
      const userData = {
        email,
        displayName: displayName || email.split('@')[0],
        companyName: companyName,
        role: 'user' as const, // デフォルトでuser
        status: 'active' as const,
        department: '',
        position: '',
        createdAt: Timestamp.now(),
        createdBy: null,
        updatedAt: Timestamp.now(),
        subscriptionType: subscriptionType || null,
      };

      // バリデーション（必須）: validateUserDataに寄せ切る
      const validation = validateUserData(userData);
      if (!validation.valid) {
        await adminAuth.deleteUser(userRecord.uid);
        errors.push({
          email,
          error: `バリデーションエラー: ${validation.errors.join(', ')}`
        });
        continue;
      }

      const userDocRef = adminDb.collection('users').doc(userRecord.uid);
      await userDocRef.set(userData);

      results.push({
        email,
        uid: userRecord.uid,
        password: finalPassword,
        success: true,
      });
    } catch (error: any) {
      console.error(`Error creating user ${email}:`, error);
      let errorMessage = 'ユーザー作成に失敗しました';
      if (error.code === 'auth/email-already-exists') {
        errorMessage = 'このメールアドレスは既に使用されています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (error.message) {
        errorMessage = error.message;
      }
      errors.push({ email, error: errorMessage });
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Bulk user creation completed',
    results,
    errors,
    summary: {
      total: users.length,
      success: results.length,
      failed: errors.length,
    },
  });
}
