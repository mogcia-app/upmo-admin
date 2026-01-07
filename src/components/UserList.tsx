'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/auth';
import UserSidebarConfigModal from './UserSidebarConfigModal';
import UserEditModal from './UserEditModal';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string;
  subscriptionType?: 'trial' | 'contract';
  role: string;
  status?: string;
  department?: string;
  position?: string;
  createdAt?: any;
}

interface SidebarConfig {
  enabledMenuItems?: string[];
}

interface UserWithSidebar extends User {
  sidebarConfig?: SidebarConfig;
}

// 会社単位でグループ化されたユーザー
interface CompanyGroup {
  companyName: string;
  users: UserWithSidebar[];
  subscriptionType?: 'trial' | 'contract';
}

export default function UserListComponent() {
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

      // 3. 会社単位でユーザーをグループ化
      const allUsers: UserWithSidebar[] = (usersResult.users || []).map((user: User) => ({
        ...user,
        sidebarConfig: sidebarConfig || undefined,
      }));

      // 会社名でグループ化
      const companyMap = new Map<string, UserWithSidebar[]>();
      allUsers.forEach((user) => {
        const companyName = user.companyName || '（会社名未設定）';
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, []);
        }
        companyMap.get(companyName)!.push(user);
      });

      // 会社グループに変換
      const groups: CompanyGroup[] = Array.from(companyMap.entries()).map(([companyName, users]) => {
        // 最初のユーザーのsubscriptionTypeを代表として使用
        const subscriptionType = users[0]?.subscriptionType;
        return {
          companyName,
          users,
          subscriptionType,
        };
      });

      // 会社名でソート
      groups.sort((a, b) => a.companyName.localeCompare(b.companyName));

      setCompanyGroups(groups);
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

  const handleAddUser = () => {
    setEditUser(null);
    setIsAddModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`ユーザー「${user.displayName || user.email}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。ログインしてください。');
      }

      const response = await fetch(`/api/admin/users/${user.uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || 'ユーザー削除に失敗しました');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'ユーザー削除に失敗しました');
      }

      fetchUsers(); // 一覧を再取得
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(err.message || 'ユーザー削除に失敗しました');
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditUser(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
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

  if (companyGroups.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500 text-sm">
          利用者が登録されていません
        </div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理者';
      case 'manager':
        return 'マネージャー';
      case 'user':
        return 'ユーザー';
      default:
        return role;
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleAddUser}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          + ユーザー追加
        </button>
      </div>

      <div className="space-y-6">
        {companyGroups.map((group) => (
          <div key={group.companyName} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* 会社ヘッダー */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {group.companyName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {group.users.length}名のユーザー
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">期間</div>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {getSubscriptionTypeLabel(group.subscriptionType)}
                    </div>
                  </div>
                  {group.users.length > 0 && (
                    <button
                      onClick={() => handleEditSidebar(group.users[0].uid, group.companyName)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      サイドバー設定
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              {/* サイドバー情報 */}
              {group.users.length > 0 && group.users[0].sidebarConfig && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">サイドバー設定</div>
                  <div className="text-sm text-gray-600">
                    有効なメニュー項目: {getSidebarEnabledCount(group.users[0].sidebarConfig)}件
                  </div>
                </div>
              )}

              {/* ユーザー一覧 */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">ユーザー一覧 ({group.users.length}名)</div>
                <div className="space-y-2">
                  {group.users.map((user) => (
                    <div key={user.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || '（表示名未設定）'}
                          </div>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                            {getRoleLabel(user.role)}
                          </span>
                          {user.status && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.status === 'active' ? 'アクティブ' : user.status}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{user.email}</div>
                        {(user.department || user.position) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {user.department && <span>{user.department}</span>}
                            {user.department && user.position && <span> / </span>}
                            {user.position && <span>{user.position}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

      {/* ユーザー編集モーダル */}
      {isEditModalOpen && (
        <UserEditModal
          user={editUser}
          isOpen={isEditModalOpen}
          isEdit={true}
          onClose={handleCloseEditModal}
          onSave={handleSaveSuccess}
        />
      )}

      {/* ユーザー追加モーダル */}
      {isAddModalOpen && (
        <UserEditModal
          user={null}
          isOpen={isAddModalOpen}
          isEdit={false}
          onClose={handleCloseAddModal}
          onSave={handleSaveSuccess}
        />
      )}
    </>
  );
}
