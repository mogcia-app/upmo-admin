'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getAuthToken } from '@/lib/auth';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string;
  role: string;
  status?: string;
  department?: string;
  position?: string;
  subscriptionType?: 'trial' | 'contract';
}

interface UserEditModalProps {
  user: User | null;
  isOpen: boolean;
  isEdit: boolean; // true: 編集, false: 新規追加
  onClose: () => void;
  onSave: () => void;
}

export default function UserEditModal({
  user,
  isOpen,
  isEdit,
  onClose,
  onSave,
}: UserEditModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    companyName: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    department: '',
    position: '',
    subscriptionType: 'trial' as 'trial' | 'contract',
    password: '',
    generatePassword: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // 編集モードの場合、ユーザー情報をフォームに設定
  useEffect(() => {
    if (isOpen && isEdit && user) {
      setFormData({
        email: user.email || '',
        displayName: user.displayName || '',
        companyName: user.companyName || '',
        role: (user.role as 'admin' | 'manager' | 'user') || 'user',
        status: (user.status as 'active' | 'inactive' | 'suspended') || 'active',
        department: user.department || '',
        position: user.position || '',
        subscriptionType: user.subscriptionType || 'trial',
        password: '',
        generatePassword: true,
      });
      setGeneratedPassword(null);
    } else if (isOpen && !isEdit) {
      // 新規追加モードの場合、フォームをリセット
      setFormData({
        email: '',
        displayName: '',
        companyName: '',
        role: 'user',
        status: 'active',
        department: '',
        position: '',
        subscriptionType: 'trial',
        password: '',
        generatePassword: true,
      });
      setGeneratedPassword(null);
    }
    setError(null);
  }, [isOpen, isEdit, user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。ログインしてください。');
      }

      if (isEdit && user) {
        // 編集モード
        const response = await fetch(`/api/admin/users/${user.uid}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            displayName: formData.displayName,
            companyName: formData.companyName,
            role: formData.role,
            status: formData.status,
            department: formData.department,
            position: formData.position,
            subscriptionType: formData.subscriptionType,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || 'ユーザー更新に失敗しました');
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'ユーザー更新に失敗しました');
        }

        onSave();
        onClose();
      } else {
        // 新規追加モード
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.generatePassword ? undefined : formData.password,
            displayName: formData.displayName,
            companyName: formData.companyName,
            role: formData.role,
            department: formData.department,
            position: formData.position,
            subscriptionType: formData.subscriptionType,
            generatePassword: formData.generatePassword,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || 'ユーザー登録に失敗しました');
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'ユーザー登録に失敗しました');
        }

        // パスワードが自動生成された場合は表示
        if (result.password) {
          setGeneratedPassword(result.password);
          // パスワードを表示した後、少し待ってから閉じる
          setTimeout(() => {
            onSave();
            onClose();
          }, 2000);
        } else {
          onSave();
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'ユーザー編集' : 'ユーザー追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {generatedPassword && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">生成されたパスワード:</p>
              <p className="text-sm font-mono text-blue-800 break-all">{generatedPassword}</p>
              <p className="text-xs text-blue-600 mt-1">このパスワードをユーザーに共有してください</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isEdit && (
                <div className="md:col-span-2">
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
              )}

              {!isEdit && (
                <div className="md:col-span-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    パスワード <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.generatePassword}
                        onChange={(e) => setFormData({ ...formData, generatePassword: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">自動生成（推奨）</span>
                    </label>
                    {!formData.generatePassword && (
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
                    )}
                    {!formData.generatePassword && (
                      <p className="text-xs text-gray-500">6文字以上</p>
                    )}
                  </div>
                </div>
              )}

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
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                  ロール <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'user' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="user">ユーザー</option>
                  <option value="manager">マネージャー</option>
                  <option value="admin">管理者</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1.5">
                  ステータス <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="active">アクティブ</option>
                  <option value="inactive">非アクティブ</option>
                  <option value="suspended">停止</option>
                </select>
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1.5">
                  部署
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="営業部"
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1.5">
                  役職
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="営業"
                />
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
          </form>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

