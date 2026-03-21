'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getAuthToken } from '@/lib/auth';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ユーザー数の変更時にユーザー配列を更新
  useEffect(() => {
    const count = userCount === 'custom' ? customUserCount : userCount;
    setUsers((currentUsers) => {
      const nextUsers: UserInput[] = [];
      for (let i = 0; i < count; i++) {
        nextUsers.push(currentUsers[i] || { displayName: '', email: '' });
      }
      return nextUsers;
    });
  }, [userCount, customUserCount]);

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

      const successMessage = userResult.summary
        ? `${userResult.summary.success}名のユーザーが正常に登録されました`
        : 'ユーザーが正常に登録されました';
      setSuccess(successMessage);
      
      // エラーがあった場合は表示
      if (userResult.errors && userResult.errors.length > 0) {
        const errorMessages = userResult.errors.map((e: { email: string; error: string }) => 
          `${e.email}: ${e.error}`
        ).join('\n');
        setError(`一部のユーザー登録に失敗しました:\n${errorMessages}`);
      }
      
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const displayUserCount = userCount === 'custom' ? customUserCount : userCount;
  const filledUsersCount = users.filter((user) => user.email || user.displayName).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || success) && (
        <div className="space-y-3">
          {error && (
            <div className="border border-red-200 bg-red-50 px-5 py-4 whitespace-pre-line">
              <div className="text-sm font-medium text-red-900">{error}</div>
            </div>
          )}

          {success && (
            <div className="border border-emerald-200 bg-emerald-50 px-5 py-4">
              <div className="text-sm font-medium text-emerald-900">{success}</div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">基本設定</h2>
              <p className="mt-1 text-sm text-slate-500">会社情報と契約タイプを先に設定します。</p>
            </div>
        
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="companyName" className="mb-2 block text-sm font-medium text-slate-700">
                    会社名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="株式会社サンプル"
                  />
                </div>

                <div>
                  <label htmlFor="subscriptionType" className="mb-2 block text-sm font-medium text-slate-700">
                    利用期間 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subscriptionType"
                    name="subscriptionType"
                    required
                    value={subscriptionType}
                    onChange={(e) => setSubscriptionType(e.target.value as 'trial' | 'contract')}
                    className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="trial">お試し1ヶ月</option>
                    <option value="contract">本契約1年</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">登録ユーザー</h2>
                  <p className="mt-1 text-sm text-slate-500">表示名とメールアドレスが入力された行だけ登録されます。</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddUsers}
                  className="inline-flex items-center justify-center border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                >
                  +5人追加
                </button>
              </div>
            </div>
        
            <div className="p-6">
              <div className="mb-6 flex flex-wrap gap-2">
                {[5, 10, 25].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setUserCount(count)}
                    className={`border px-4 py-2 text-sm font-medium transition ${
                      userCount === count
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {count}人
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUserCount('custom')}
                  className={`border px-4 py-2 text-sm font-medium transition ${
                    userCount === 'custom'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
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
                    className="w-24 border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="人数"
                  />
                )}
              </div>

              <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
                {users.map((user, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">ユーザー {index + 1}</div>
                      {generatedPasswords[user.email] && (
                        <div className="border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
                          パスワード生成済み
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          表示名
                        </label>
                        <input
                          type="text"
                          value={user.displayName}
                          onChange={(e) => handleUserChange(index, 'displayName', e.target.value)}
                          className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="山田 太郎"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          メールアドレス
                        </label>
                        <input
                          type="email"
                          value={user.email}
                          onChange={(e) => handleUserChange(index, 'email', e.target.value)}
                          className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="user@example.com"
                        />
                      </div>
                    </div>

                    {generatedPasswords[user.email] && (
                      <div className="mt-3 border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                        <span className="font-medium text-blue-950">初期パスワード: </span>
                        <span className="font-mono text-blue-800">{generatedPasswords[user.email]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="border border-slate-200 bg-white p-6">
            <h3 className="text-base font-semibold text-slate-900">登録サマリー</h3>
            <div className="mt-4 space-y-3">
              <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">登録枠</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{displayUserCount}</div>
              </div>
              <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">入力済み</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{filledUsersCount}</div>
              </div>
              <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">契約タイプ</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {subscriptionType === 'trial' ? 'お試し1ヶ月' : '本契約1年'}
                </div>
              </div>
            </div>

            <div className="mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              パスワードは自動生成されます。登録後に各ユーザーの初期パスワードを確認してください。
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? '登録中...' : 'ユーザーを登録'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
