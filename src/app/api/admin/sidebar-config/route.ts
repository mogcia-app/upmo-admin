import { NextRequest, NextResponse } from 'next/server';

// upmo-demo側のAPIベースURL（環境変数から取得、デフォルト値も設定）
const UPMO_DEMO_API_BASE = process.env.NEXT_PUBLIC_UPMO_DEMO_API_BASE || 'https://upmo-demo.vercel.app';

/**
 * GET: サイドバー設定を取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証トークンをリクエストヘッダーから取得（オプション）
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      headers['Authorization'] = authHeader;
    }

    // upmo-demo側のAPIを直接呼び出す
    const response = await fetch(`${UPMO_DEMO_API_BASE}/api/admin/sidebar-config`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sidebar config: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sidebar config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sidebar config', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST: サイドバー設定を更新
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    const { enabledMenuItems } = body;

    if (!Array.isArray(enabledMenuItems)) {
      return NextResponse.json(
        { error: 'enabledMenuItems must be an array' },
        { status: 400 }
      );
    }

    // 認証トークンをリクエストヘッダーから取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // トークンの検証はupmo-demo側で行うため、ここではそのまま転送

    // upmo-demo側のAPIを呼び出して設定を更新
    const response = await fetch(`${UPMO_DEMO_API_BASE}/api/admin/sidebar-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ enabledMenuItems }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Failed to update sidebar config: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating sidebar config:', error);
    return NextResponse.json(
      { error: 'Failed to update sidebar config', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

