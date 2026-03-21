'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getAuthToken } from '@/lib/auth';

interface User {
  uid: string;
  email: string;
  companyId?: string | null;
  displayName?: string;
  companyName?: string;
  status?: string;
  department?: string;
  position?: string;
  subscriptionType?: 'trial' | 'contract';
}

interface PresetCompany {
  companyId?: string | null;
  companyName: string;
  subscriptionType?: 'trial' | 'contract';
  seatLimit?: number;
  seatsUsed?: number;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

interface UserEditModalProps {
  user: User | null;
  isOpen: boolean;
  isEdit: boolean; // true: 編集, false: 新規追加
  presetCompany?: PresetCompany | null;
  onClose: () => void;
  onSave: () => void;
}

export default function UserEditModal({
  user,
  isOpen,
  isEdit,
  presetCompany,
  onClose,
  onSave,
}: UserEditModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    companyId: null as string | null,
    companyName: '',
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
        companyId: user.companyId || null,
        companyName: user.companyName || '',
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
        companyId: presetCompany?.companyId || null,
        companyName: presetCompany?.companyName || '',
        status: 'active',
        department: '',
        position: '',
        subscriptionType: presetCompany?.subscriptionType || 'trial',
        password: '',
        generatePassword: true,
      });
      setGeneratedPassword(null);
    }
    setError(null);
  }, [isOpen, isEdit, presetCompany, user]);

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
            companyId: formData.companyId,
            companyName: formData.companyName,
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
          onSave();
        } else {
          onSave();
          onClose();
        }
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setError(getErrorMessage(err, '保存に失敗しました'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const seatSummary = presetCompany && typeof presetCompany.seatLimit === 'number'
    ? `${presetCompany.seatsUsed || 0} / ${presetCompany.seatLimit}`
    : null;

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

          {!isEdit && presetCompany && (
            <div className="mb-4 border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">追加先企業</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{presetCompany.companyName}</div>
              {seatSummary && (
                <div className="mt-2 text-xs text-slate-500">Seats: {seatSummary}</div>
              )}
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
                  disabled={!isEdit && !!presetCompany}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="株式会社サンプル"
                />
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
                  disabled={!isEdit && !!presetCompany}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500"
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
            {generatedPassword ? '閉じる' : 'キャンセル'}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={loading || !!generatedPassword}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '保存中...' : generatedPassword ? '保存済み' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
