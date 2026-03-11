'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/auth';
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

// 会社単位でグループ化されたユーザー
interface CompanyGroup {
  companyName: string;
  users: User[];
  subscriptionType?: 'trial' | 'contract';
}

export default function UserListComponent() {
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

      const allUsers: User[] = usersResult.users || [];

      // 会社名でグループ化
      const companyMap = new Map<string, User[]>();
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
      <div className="border border-slate-200 bg-white p-8">
        <div className="text-center text-sm text-slate-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 p-4">
        <div className="text-sm text-red-800">{error}</div>
      </div>
    );
  }

  if (companyGroups.length === 0) {
    return (
      <div className="border border-slate-200 bg-white p-8">
        <div className="text-center text-sm text-slate-500">
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
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleAddUser}
          className="border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + ユーザー追加
        </button>
      </div>

      <div className="space-y-6">
        {companyGroups.map((group) => (
          <div key={group.companyName} className="overflow-hidden border border-slate-200 bg-white">
            {/* 会社ヘッダー */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {group.companyName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {group.users.length}名のユーザー
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="min-w-40 border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">期間</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {getSubscriptionTypeLabel(group.subscriptionType)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              {/* ユーザー一覧 */}
              <div>
                <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="text-sm font-medium text-slate-700">ユーザー一覧</div>
                  <div className="text-sm text-slate-500">{group.users.length}名</div>
                </div>
                <div className="space-y-3">
                  {group.users.map((user) => (
                    <div key={user.uid} className="flex flex-col gap-4 border border-slate-200 bg-slate-50/70 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-medium text-slate-900">
                            {user.displayName || '（表示名未設定）'}
                          </div>
                          <span className="border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                            {getRoleLabel(user.role)}
                          </span>
                          {user.status && (
                            <span className={`border px-2 py-0.5 text-xs ${
                              user.status === 'active' 
                                ? 'border-green-200 bg-green-50 text-green-800' 
                                : 'border-slate-200 bg-slate-100 text-slate-700'
                            }`}>
                              {user.status === 'active' ? 'アクティブ' : user.status}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{user.email}</div>
                        {(user.department || user.position) && (
                          <div className="mt-1 text-xs text-slate-500">
                            {user.department && <span>{user.department}</span>}
                            {user.department && user.position && <span> / </span>}
                            {user.position && <span>{user.position}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
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
