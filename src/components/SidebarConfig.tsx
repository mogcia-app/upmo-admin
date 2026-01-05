'use client';

import { useState, useEffect } from 'react';
import { getMenuItemsByCategoryOrdered, CATEGORY_NAMES, AVAILABLE_MENU_ITEMS, type MenuItem, type SidebarConfig } from '@/types/sidebar';
import { getAuthToken } from '@/lib/auth';

export default function SidebarConfigComponent() {
  const [config, setConfig] = useState<SidebarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 認証トークンを取得（オプション）
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/admin/sidebar-config', {
        headers,
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

      const response = await fetch('/api/admin/sidebar-config', {
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
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500 text-sm">読み込み中...</div>
      </div>
    );
  }

  if (!config || !config.availableMenuItems) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-red-600 text-sm">設定の読み込みに失敗しました</div>
      </div>
    );
  }

  const groupedItems = getMenuItemsByCategoryOrdered(config.availableMenuItems);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          表示したい機能にチェックを付けてください。この設定は全ユーザー（親・子）に適用されます。
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {saving && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">保存中...</div>
        </div>
      )}

      <div className="space-y-4">
        {groupedItems.map(([category, items]) => (
          <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                {CATEGORY_NAMES[category] || category}
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {items.map((item) => {
                  const isEnabled = config.enabledMenuItems?.includes(item.id) || false;
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start p-3 rounded-md border transition-colors cursor-pointer ${
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
                        className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{item.icon}</span>
                          <span className={`text-sm font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-700'}`}>
                            {item.name}
                          </span>
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-1 ml-6">
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

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-gray-700">
          <strong>注意:</strong> 設定を変更すると、upmo-demoアプリのサイドバーに数秒以内に反映されます。
        </p>
      </div>
    </div>
  );
}
