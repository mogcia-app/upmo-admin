'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMenuItemsByCategoryOrdered, CATEGORY_NAMES, AVAILABLE_MENU_ITEMS, type MenuItem, type SidebarConfig } from '@/types/sidebar';
import { getAuthToken } from '@/lib/auth';
import Link from 'next/link';

export default function UserSidebarConfigComponent() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [config, setConfig] = useState<SidebarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchUserInfo();
    fetchConfig();
  }, [userId]);

  const fetchUserInfo = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        const user = result.users?.find((u: any) => u.uid === userId);
        if (user) {
          setUserInfo(user);
        }
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。ログインしてください。');
      }

      const response = await fetch(`/api/admin/users/${userId}/sidebar-config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }
      
      const data = await response.json();
      const availableMenuItems = data.availableMenuItems || AVAILABLE_MENU_ITEMS;
      
      setConfig({
        ...data,
        availableMenuItems,
      });
    } catch (err) {
      console.error('Error fetching config:', err);
      setError(err instanceof Error ? err.message : '設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (itemId: string) => {
    if (!config) return;

    const enabledMenuItems = config.enabledMenuItems || [];
    const isEnabled = enabledMenuItems.includes(itemId);
    
    const updatedEnabledMenuItems = isEnabled
      ? enabledMenuItems.filter((id: string) => id !== itemId)
      : [...enabledMenuItems, itemId];

    setConfig({
      ...config,
      enabledMenuItems: updatedEnabledMenuItems,
    });

    try {
      setSaving(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。ログインしてください。');
      }

      const response = await fetch(`/api/admin/users/${userId}/sidebar-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabledMenuItems: updatedEnabledMenuItems,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || '設定の更新に失敗しました');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '設定の更新に失敗しました');
      }
    } catch (err) {
      console.error('Error updating config:', err);
      setError(err instanceof Error ? err.message : '設定の更新に失敗しました');
      fetchConfig();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (!config || !config.availableMenuItems) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-600">設定の読み込みに失敗しました</div>
      </div>
    );
  }

  const groupedItems = getMenuItemsByCategoryOrdered(config.availableMenuItems);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/users"
            className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← 利用者管理に戻る
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {userInfo?.displayName || userInfo?.email || 'ユーザー'} のサイドバー設定
          </h1>
          <p className="text-gray-600 text-sm">
            表示したい機能にチェックマークを付けてください
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {saving && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">保存中...</div>
          </div>
        )}

        <div className="space-y-6">
          {groupedItems.map(([category, items]) => (
            <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">
                  {CATEGORY_NAMES[category] || category}
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {items.map((item) => {
                    const isEnabled = config.enabledMenuItems?.includes(item.id) || false;
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start p-4 rounded-lg border transition-colors cursor-pointer ${
                          isEnabled
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggle(item.id)}
                          disabled={saving}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{item.icon}</span>
                            <span className={`font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-700'}`}>
                              {item.name}
                            </span>
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-500 mt-1 ml-7">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>注意:</strong> 設定を変更すると、upmo-demoアプリのサイドバーに数秒以内に反映されます。
          </p>
        </div>
      </div>
    </div>
  );
}


