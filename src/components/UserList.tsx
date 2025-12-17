'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/auth';
import UserSidebarConfigModal from './UserSidebarConfigModal';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string;
  subscriptionType?: 'trial' | 'contract';
  role: string;
  parentId?: string; // 親ユーザーのUID
  createdAt?: any;
}

interface SidebarConfig {
  enabledMenuItems?: string[];
}

interface UserWithSidebar extends User {
  sidebarConfig?: SidebarConfig;
}

interface UserWithChildren {
  parent: UserWithSidebar;
  children: UserWithSidebar[];
}

export default function UserListComponent() {
  const [users, setUsers] = useState<UserWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。ログインしてください。');
      }

      // 1. ユーザー一覧を取得
      const usersResponse = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!usersResponse.ok) {
        throw new Error('利用者一覧の取得に失敗しました');
      }

      const usersResult = await usersResponse.json();
      if (!usersResult.success) {
        throw new Error(usersResult.error || '利用者一覧の取得に失敗しました');
      }

      // 2. サイドバー設定を取得（共通設定として）
      let sidebarConfig: SidebarConfig | null = null;
      try {
        const sidebarResponse = await fetch('/api/admin/sidebar-config');
        if (sidebarResponse.ok) {
          const sidebarData = await sidebarResponse.json();
          sidebarConfig = {
            enabledMenuItems: sidebarData.enabledMenuItems || [],
          };
        }
      } catch (err) {
        console.error('Error fetching sidebar config:', err);
      }

      // 3. 親ユーザー（代表者）と子ユーザーを分ける
      const allUsers: UserWithSidebar[] = (usersResult.users || []).map((user: User) => ({
        ...user,
        sidebarConfig: sidebarConfig || undefined,
      }));

      // 親ユーザー（roleがuserでparentIdがないもの、かつcompanyNameがあるもの = /admin/usersで登録されたもの）
      const parentUsers = allUsers.filter((user) => 
        !user.parentId && 
        user.role === 'user' && 
        user.companyName // 会社名がある = /admin/usersで登録された親ユーザー
      );
      
      // 各親ユーザーに子ユーザーを紐付け
      const usersWithChildren = parentUsers.map((parent) => {
        const children = allUsers.filter((user) => user.parentId === parent.uid);
        return { parent, children };
      });

      setUsers(usersWithChildren);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : '利用者一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionTypeLabel = (type?: string) => {
    switch (type) {
      case 'trial':
        return 'お試し1ヶ月';
      case 'contract':
        return '本契約1年';
      default:
        return '-';
    }
  };

  const getSidebarEnabledCount = (sidebarConfig?: SidebarConfig) => {
    return sidebarConfig?.enabledMenuItems?.length || 0;
  };

  const handleEditSidebar = (userId: string, companyName: string) => {
    setSelectedUserId(userId);
    setSelectedCompanyName(companyName);
  };

  const handleCloseModal = () => {
    setSelectedUserId(null);
    setSelectedCompanyName('');
  };

  const handleSaveSuccess = () => {
    fetchUsers(); // 一覧を再取得
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500 text-sm">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-sm text-red-800">{error}</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500 text-sm">
          利用者が登録されていません
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {users.map(({ parent, children }) => (
          <div key={parent.uid} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* 親ユーザー（代表者）の情報 */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {parent.companyName || '（会社名未設定）'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    代表者: {parent.displayName || parent.email}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">期間</div>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {getSubscriptionTypeLabel(parent.subscriptionType)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditSidebar(parent.uid, parent.companyName || '')}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    サイドバー設定
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              {/* サイドバー情報 */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">サイドバー設定</div>
                <div className="text-sm text-gray-600">
                  有効なメニュー項目: {getSidebarEnabledCount(parent.sidebarConfig)}件
                </div>
              </div>

              {/* 子ユーザー一覧 */}
              {children.length > 0 ? (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">子ユーザー ({children.length}名)</div>
                  <div className="space-y-2">
                    {children.map((child) => (
                      <div key={child.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {child.displayName || '（表示名未設定）'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{child.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">子ユーザーはまだ招待されていません</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* サイドバー設定モーダル */}
      {selectedUserId && (
        <UserSidebarConfigModal
          userId={selectedUserId}
          companyName={selectedCompanyName}
          isOpen={!!selectedUserId}
          onClose={handleCloseModal}
          onSave={handleSaveSuccess}
        />
      )}
    </>
  );
}
