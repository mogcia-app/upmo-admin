import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { validateUserData } from '@/types/user';

interface CompanyRecord {
  id: string;
  name: string;
  ownerUid?: string;
  seatLimit?: number;
  seatsUsed?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface RequestError {
  code?: string;
  message?: string;
}

interface AuthenticatedUserContext {
  token: string;
  uid: string;
  companyId: string | null;
}

interface SingleUserCreationBody {
  email?: string;
  password?: string;
  displayName?: string;
  companyName?: string;
  companyId?: string | null;
  subscriptionType?: string | null;
  department?: string;
  position?: string;
  generatePassword?: boolean;
}

interface BulkUserInput {
  email?: string;
  displayName?: string;
}

interface BulkUserCreationBody {
  companyName?: string;
  companyId?: string | null;
  users?: BulkUserInput[];
  subscriptionType?: string | null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as RequestError;
    if (candidate.code === 'auth/email-already-exists') {
      return 'このメールアドレスは既に使用されています';
    }
    if (candidate.code === 'auth/invalid-email') {
      return 'メールアドレスの形式が正しくありません';
    }
    if (candidate.message) {
      return candidate.message;
    }
  }

  return fallback;
}

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

async function verifyAuthToken(request: NextRequest): Promise<AuthenticatedUserContext | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Authorization token is required' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User context not found' },
        { status: 403 }
      );
    }

    const userData = userDoc.data() as Record<string, unknown>;
    const companyId = typeof userData.companyId === 'string' ? userData.companyId : null;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company context is required' },
        { status: 403 }
      );
    }

    return {
      token,
      uid: decodedToken.uid,
      companyId,
    };
  } catch (authError) {
    console.error('Auth verification error:', authError);
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

async function findCompany(companyId?: string | null, companyName?: string | null): Promise<CompanyRecord | null> {
  if (companyId) {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (companyDoc.exists) {
      return {
        id: companyDoc.id,
        ...(companyDoc.data() as Omit<CompanyRecord, 'id'>),
      };
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
      return {
        id: companyDoc.id,
        ...(companyDoc.data() as Omit<CompanyRecord, 'id'>),
      };
    }
  }

  return null;
}

async function createUserDocumentWithSeatReservation(params: {
  uid: string;
  userData: Record<string, unknown>;
  company: CompanyRecord;
}) {
  const { uid, userData, company } = params;
  const userDocRef = adminDb.collection('users').doc(uid);
  const organizationMemberRef = adminDb
    .collection('organizations')
    .doc(company.id)
    .collection('members')
    .doc(uid);

  await adminDb.runTransaction(async (transaction) => {
    const companyRef = adminDb.collection('companies').doc(company.id);
    const companyDoc = await transaction.get(companyRef);

    if (!companyDoc.exists) {
      throw new Error('対象の企業情報が見つかりません');
    }

    const latestCompany = companyDoc.data() as CompanyRecord;
    const seatLimit = typeof latestCompany.seatLimit === 'number' ? latestCompany.seatLimit : null;
    const seatsUsed = typeof latestCompany.seatsUsed === 'number' ? latestCompany.seatsUsed : 0;

    if (seatLimit !== null && seatsUsed >= seatLimit) {
      throw new Error('この企業は利用可能な席数の上限に達しています');
    }

    transaction.set(userDocRef, userData);
    transaction.set(organizationMemberRef, {
      uid,
      email: userData.email,
      displayName: userData.displayName,
      companyId: company.id,
      status: userData.status,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    });
    transaction.update(companyRef, {
      seatsUsed: seatsUsed + 1,
      updatedAt: Timestamp.now(),
    });
  });
}

/**
 * GET: 利用者一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Firestoreからユーザー一覧を取得
    const [usersSnapshot, companiesSnapshot] = await Promise.all([
      adminDb.collection('users').where('companyId', '==', authResult.companyId).get(),
      adminDb.collection('companies').where(FieldPath.documentId(), '==', authResult.companyId).get(),
    ]);

    const users = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
    const companies = companiesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      users,
      companies,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, 'Failed to fetch users') },
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
    const authResult = await verifyAuthToken(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // リクエストボディを取得
    const body = await request.json();
    
    // 一括登録かどうかを判定
    if (body.users && Array.isArray(body.users)) {
      // 一括登録処理
      return await handleBulkUserCreation(body);
    } else {
      // 単一ユーザー登録処理（後方互換性のため維持）
      return await handleSingleUserCreation(body);
    }
  } catch (error) {
    console.error('Error creating user:', error);

    return NextResponse.json(
      { success: false, error: getErrorMessage(error, 'ユーザー作成に失敗しました') },
      { status: 500 }
    );
  }
}

/**
 * 単一ユーザー登録処理
 */
async function handleSingleUserCreation(body: SingleUserCreationBody) {
  const { 
    email, 
    password, 
    displayName, 
    companyName, 
    companyId,
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
  let finalPassword = password ?? '';
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

  const company = await findCompany(companyId, companyName);
  if (!company) {
    return NextResponse.json(
      { success: false, error: '有効な会社を指定してください' },
      { status: 400 }
    );
  }
  const normalizedCompanyName = company?.name || companyName || '';

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
    companyId: company.id,
    companyName: normalizedCompanyName,
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

  try {
    await createUserDocumentWithSeatReservation({
      uid: userRecord.uid,
      userData,
      company,
    });
  } catch (error) {
    await adminAuth.deleteUser(userRecord.uid);
    throw error;
  }

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
async function handleBulkUserCreation(body: BulkUserCreationBody) {
  const { companyName, companyId, users, subscriptionType } = body;

  if (!companyName || !users || !Array.isArray(users) || users.length === 0) {
    return NextResponse.json(
      { success: false, error: '会社名とユーザーリストは必須です' },
      { status: 400 }
    );
  }

  const results: Array<{ email: string; uid: string; password: string; success: boolean }> = [];
  const errors: Array<{ email: string; error: string }> = [];
  const company = await findCompany(companyId, companyName);
  if (!company) {
    return NextResponse.json(
      { success: false, error: '有効な会社を指定してください' },
      { status: 400 }
    );
  }
  const normalizedCompanyName = company?.name || companyName;

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
        companyId: company.id,
        companyName: normalizedCompanyName,
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

      try {
        await createUserDocumentWithSeatReservation({
          uid: userRecord.uid,
          userData,
          company,
        });
      } catch (reservationError) {
        await adminAuth.deleteUser(userRecord.uid);
        throw reservationError;
      }

      results.push({
        email,
        uid: userRecord.uid,
        password: finalPassword,
        success: true,
      });
    } catch (error) {
      console.error(`Error creating user ${email}:`, error);
      errors.push({ email: email || '(不明)', error: getErrorMessage(error, 'ユーザー作成に失敗しました') });
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
