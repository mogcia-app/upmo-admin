'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getAuthToken } from '@/lib/auth';
import { getMenuItemsByCategory, CATEGORY_NAMES, AVAILABLE_MENU_ITEMS, type MenuItem, type SidebarConfig } from '@/types/sidebar';

export default function UserRegistrationWithSidebarComponent() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    companyName: '',
    subscriptionType: 'trial' as 'trial' | 'contract',
  });
  const [config, setConfig] = useState<SidebarConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // サイドバー設定を取得
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setConfigLoading(true);
        const response = await fetch('/api/admin/sidebar-config');
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
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, []);

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。ログインしてください。');
      }

      // 1. ユーザーを登録
      const userResponse = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          companyName: formData.companyName,
          subscriptionType: formData.subscriptionType,
        }),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({ error: userResponse.statusText }));
        throw new Error(errorData.error || 'ユーザー登録に失敗しました');
      }

      const userResult = await userResponse.json();
      
      if (!userResult.success) {
        throw new Error(userResult.error || 'ユーザー登録に失敗しました');
      }

      // 2. サイドバー設定を保存
      if (config) {
        const configResponse = await fetch('/api/admin/sidebar-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            enabledMenuItems: config.enabledMenuItems || [],
          }),
        });

        if (!configResponse.ok) {
          const errorData = await configResponse.json().catch(() => ({ error: configResponse.statusText }));
          throw new Error(errorData.error || 'サイドバー設定の保存に失敗しました');
        }

        const configResult = await configResponse.json();
        if (!configResult.success) {
          throw new Error(configResult.error || 'サイドバー設定の保存に失敗しました');
        }
      }

      setSuccess('ユーザーとサイドバー設定が正常に登録されました');
      
      // フォームをリセット
      setFormData({
        email: '',
        password: '',
        displayName: '',
        companyName: '',
        subscriptionType: 'trial',
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      let errorMessage = '登録に失敗しました';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const groupedItems = config ? getMenuItemsByCategory(config.availableMenuItems || AVAILABLE_MENU_ITEMS) : {};

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ユーザー情報 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">ユーザー情報</h2>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">{success}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1.5">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="株式会社サンプル"
              />
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1.5">
                表示名 <span className="text-red-500">*</span>
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500">6文字以上</p>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="subscriptionType" className="block text-sm font-medium text-gray-700 mb-1.5">
                利用期間 <span className="text-red-500">*</span>
              </label>
              <select
                id="subscriptionType"
                name="subscriptionType"
                required
                value={formData.subscriptionType}
                onChange={(e) => setFormData({ ...formData, subscriptionType: e.target.value as 'trial' | 'contract' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="trial">お試し1ヶ月</option>
                <option value="contract">本契約1年</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* サイドバー設定 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">サイドバー設定</h2>
          <p className="text-sm text-gray-600 mt-1">
            表示したい機能にチェックを付けてください
          </p>
        </div>
        
        <div className="p-6">
          {configLoading ? (
            <div className="text-center text-gray-500 text-sm py-8">読み込み中...</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {CATEGORY_NAMES[category] || category}
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {items.map((item) => {
                        const isEnabled = config?.enabledMenuItems?.includes(item.id) || false;
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
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || configLoading}
          className="px-6 py-2.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}

