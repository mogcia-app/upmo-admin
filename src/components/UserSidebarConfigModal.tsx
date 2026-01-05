'use client';

import { useState, useEffect } from 'react';
import { getMenuItemsByCategoryOrdered, CATEGORY_NAMES, AVAILABLE_MENU_ITEMS, type MenuItem, type SidebarConfig } from '@/types/sidebar';
import { getAuthToken } from '@/lib/auth';

interface UserSidebarConfigModalProps {
  userId: string;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function UserSidebarConfigModal({
  userId,
  companyName,
  isOpen,
  onClose,
  onSave,
}: UserSidebarConfigModalProps) {
  const [config, setConfig] = useState<SidebarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen, userId]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。ログインしてください。');
      }

      // ユーザーごとのサイドバー設定を取得（存在しない場合は共通設定を取得）
      const response = await fetch(`/api/admin/users/${userId}/sidebar-config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // 個別設定がない場合は共通設定を取得
        const commonResponse = await fetch('/api/admin/sidebar-config', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!commonResponse.ok) {
          throw new Error(`Failed to fetch config: ${commonResponse.statusText}`);
        }
        const commonData = await commonResponse.json();
        const availableMenuItems = commonData.availableMenuItems || AVAILABLE_MENU_ITEMS;
        setConfig({
          ...commonData,
          availableMenuItems,
        });
      } else {
        const data = await response.json();
        const availableMenuItems = data.availableMenuItems || AVAILABLE_MENU_ITEMS;
        setConfig({
          ...data,
          availableMenuItems,
        });
      }
    } catch (err) {
      console.error('Error fetching config:', err);
      setError(err instanceof Error ? err.message : '設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (itemId: string) => {
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
  };

  const handleSave = async () => {
    if (!config) return;

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
          enabledMenuItems: config.enabledMenuItems || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || '設定の保存に失敗しました');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '設定の保存に失敗しました');
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving config:', err);
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const groupedItems = config ? getMenuItemsByCategoryOrdered(config.availableMenuItems || AVAILABLE_MENU_ITEMS) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">サイドバー設定</h2>
            <p className="text-sm text-gray-600 mt-1">{companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-8">読み込み中...</div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          ) : !config ? (
            <div className="text-center text-gray-500 text-sm py-8">設定の読み込みに失敗しました</div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  表示したい機能にチェックを付けてください
                </p>
              </div>

              {groupedItems.map(([category, items]) => (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
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
                              className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !config}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}


