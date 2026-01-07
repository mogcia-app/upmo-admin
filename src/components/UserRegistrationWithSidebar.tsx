'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getAuthToken } from '@/lib/auth';
import { getMenuItemsByCategoryOrdered, CATEGORY_NAMES, AVAILABLE_MENU_ITEMS, type MenuItem, type SidebarConfig } from '@/types/sidebar';

interface UserInput {
  displayName: string;
  email: string;
}

export default function UserRegistrationWithSidebarComponent() {
  const [companyName, setCompanyName] = useState('');
  const [subscriptionType, setSubscriptionType] = useState<'trial' | 'contract'>('trial');
  const [userCount, setUserCount] = useState<number | 'custom'>(5);
  const [customUserCount, setCustomUserCount] = useState<number>(5);
  const [users, setUsers] = useState<UserInput[]>([]);
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<string, string>>({});
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
        // 新規ユーザー登録時は、既存の設定を引き継がず空の状態から始める
        // 常に最新のAVAILABLE_MENU_ITEMSを使用
        setConfig({
          ...data,
          availableMenuItems: AVAILABLE_MENU_ITEMS, // 常に最新のメニュー項目を使用
          enabledMenuItems: [], // 新規登録時はチェックなしで開始
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

  // ユーザー数の変更時にユーザー配列を更新
  useEffect(() => {
    const count = userCount === 'custom' ? customUserCount : userCount;
    const newUsers: UserInput[] = [];
    for (let i = 0; i < count; i++) {
      newUsers.push(users[i] || { displayName: '', email: '' });
    }
    setUsers(newUsers);
  }, [userCount, customUserCount]);

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

  const handleUserChange = (index: number, field: keyof UserInput, value: string) => {
    const newUsers = [...users];
    newUsers[index] = { ...newUsers[index], [field]: value };
    setUsers(newUsers);
  };

  const handleAddUsers = () => {
    const additionalCount = 5;
    const newUsers = [...users];
    for (let i = 0; i < additionalCount; i++) {
      newUsers.push({ displayName: '', email: '' });
    }
    setUsers(newUsers);
    if (userCount === 'custom') {
      setCustomUserCount(newUsers.length);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setGeneratedPasswords({});

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。ログインしてください。');
      }

      // バリデーション: メールアドレスと表示名が入力されているユーザーのみを送信
      const validUsers = users.filter(u => u.email && u.displayName);
      
      if (validUsers.length === 0) {
        throw new Error('少なくとも1人のユーザー情報を入力してください');
      }

      // 1. ユーザーを一括登録
      const userResponse = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName,
          subscriptionType,
          users: validUsers,
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

      // 生成されたパスワードを保存
      if (userResult.results) {
        const passwords: Record<string, string> = {};
        userResult.results.forEach((result: { email: string; password: string }) => {
          passwords[result.email] = result.password;
        });
        setGeneratedPasswords(passwords);
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

      const successMessage = userResult.summary
        ? `${userResult.summary.success}名のユーザーとサイドバー設定が正常に登録されました`
        : 'ユーザーとサイドバー設定が正常に登録されました';
      setSuccess(successMessage);
      
      // エラーがあった場合は表示
      if (userResult.errors && userResult.errors.length > 0) {
        const errorMessages = userResult.errors.map((e: { email: string; error: string }) => 
          `${e.email}: ${e.error}`
        ).join('\n');
        setError(`一部のユーザー登録に失敗しました:\n${errorMessages}`);
      }
      
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

  const groupedItems = config ? getMenuItemsByCategoryOrdered(config.availableMenuItems || AVAILABLE_MENU_ITEMS) : [];
  const displayUserCount = userCount === 'custom' ? customUserCount : userCount;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ユーザー情報 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">ユーザー情報</h2>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg whitespace-pre-line">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">{success}</div>
            </div>
          )}

          <div className="space-y-4">
            {/* 会社名と利用期間 */}
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
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="株式会社サンプル"
                />
              </div>

              <div>
                <label htmlFor="subscriptionType" className="block text-sm font-medium text-gray-700 mb-1.5">
                  利用期間 <span className="text-red-500">*</span>
                </label>
                <select
                  id="subscriptionType"
                  name="subscriptionType"
                  required
                  value={subscriptionType}
                  onChange={(e) => setSubscriptionType(e.target.value as 'trial' | 'contract')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="trial">お試し1ヶ月</option>
                  <option value="contract">本契約1年</option>
                </select>
              </div>
            </div>

            {/* 人数選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                登録人数 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 25].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setUserCount(count)}
                    className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                      userCount === count
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {count}人
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUserCount('custom')}
                  className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                    userCount === 'custom'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  カスタム
                </button>
                {userCount === 'custom' && (
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customUserCount}
                    onChange={(e) => setCustomUserCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="人数"
                  />
                )}
              </div>
            </div>

            {/* ユーザー入力欄 */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  ユーザー情報 ({displayUserCount}人分)
                </h3>
                <button
                  type="button"
                  onClick={handleAddUsers}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  +5人追加
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {users.map((user, index) => (
                  <div key={index} className="bg-white p-3 rounded-md border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          表示名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={user.displayName}
                          onChange={(e) => handleUserChange(index, 'displayName', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="山田 太郎"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          メールアドレス <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={user.email}
                          onChange={(e) => handleUserChange(index, 'email', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="user@example.com"
                        />
                      </div>
                    </div>
                    {generatedPasswords[user.email] && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <span className="font-medium text-blue-900">パスワード: </span>
                        <span className="font-mono text-blue-800">{generatedPasswords[user.email]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500">
                <p>※ パスワードは自動生成されます</p>
                <p>※ 表示名とメールアドレスが入力されているユーザーのみ登録されます</p>
              </div>
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
