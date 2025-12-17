import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const UPMO_DEMO_API_BASE = process.env.NEXT_PUBLIC_UPMO_DEMO_API_BASE || 'https://upmo-demo.vercel.app';

/**
 * GET: 特定ユーザーのサイドバー設定を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      await adminAuth.verifyIdToken(token);
    } catch (authError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { userId } = await params;

    // upmo-demo側のAPIを呼び出してユーザーごとの設定を取得
    // ここでは一旦、デフォルト設定を返す（upmo-demo側で実装が必要な場合もある）
    const response = await fetch(`${UPMO_DEMO_API_BASE}/api/admin/sidebar-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sidebar config: ${response.statusText}`);
    }

    const data = await response.json();
    
    // ユーザー固有の設定があれば取得（将来的な拡張のため）
    // 現在は共通設定を返す
    return NextResponse.json({
      ...data,
      userId,
    });
  } catch (error) {
    console.error('Error fetching user sidebar config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sidebar config', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST: 特定ユーザーのサイドバー設定を更新
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      await adminAuth.verifyIdToken(token);
    } catch (authError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const { enabledMenuItems } = body;

    if (!Array.isArray(enabledMenuItems)) {
      return NextResponse.json(
        { error: 'enabledMenuItems must be an array' },
        { status: 400 }
      );
    }

    // upmo-demo側のAPIを呼び出して設定を更新
    // 将来的にはユーザー固有の設定として保存する場合もある
    const response = await fetch(`${UPMO_DEMO_API_BASE}/api/admin/sidebar-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ enabledMenuItems, userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to update sidebar config: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating user sidebar config:', error);
    return NextResponse.json(
      { error: 'Failed to update sidebar config', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

