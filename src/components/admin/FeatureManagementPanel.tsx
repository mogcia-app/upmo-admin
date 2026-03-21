'use client';

import { useState } from 'react';
import { getAuthToken } from '@/lib/auth';
import { ADMIN_FEATURE_KEYS, type AdminFeatureKey, type FeatureSetting } from '@/types/features';

function normalizeFeatures(raw?: FeatureSetting[]) {
  const existing = new Map((raw ?? []).map((item) => [item.featureKey, item.enabled]));
  return ADMIN_FEATURE_KEYS.map((featureKey) => ({
    featureKey,
    enabled: existing.get(featureKey) ?? false,
  }));
}

export default function FeatureManagementPanel() {
  const [orgId, setOrgId] = useState('');
  const [userId, setUserId] = useState('');
  const [orgFeatures, setOrgFeatures] = useState<FeatureSetting[]>(normalizeFeatures());
  const [userFeatures, setUserFeatures] = useState<FeatureSetting[]>(normalizeFeatures());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const updateFeature = (
    target: 'org' | 'user',
    featureKey: AdminFeatureKey,
    enabled: boolean,
  ) => {
    const setter = target === 'org' ? setOrgFeatures : setUserFeatures;
    setter((current) =>
      current.map((item) => (item.featureKey === featureKey ? { ...item, enabled } : item)),
    );
  };

  const fetchFeatures = async (target: 'org' | 'user') => {
    setStatus(null);
    setError(null);

    const token = await getAuthToken();
    if (!token) {
      setError('認証トークンが取得できませんでした。');
      return;
    }

    try {
      if (target === 'org') {
        if (!orgId.trim()) {
          throw new Error('orgId を入力してください。');
        }
        setLoadingOrg(true);
      } else {
        if (!userId.trim()) {
          throw new Error('userId を入力してください。');
        }
        setLoadingUser(true);
      }

      const endpoint =
        target === 'org'
          ? `/api/admin/organizations/${orgId.trim()}/features`
          : `/api/admin/users/${userId.trim()}/features`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || `Failed: ${response.status}`);
      }

      if (target === 'org') {
        setOrgFeatures(normalizeFeatures(result.features));
      } else {
        if (result.orgId && !orgId.trim()) {
          setOrgId(result.orgId);
        }
        setUserFeatures(normalizeFeatures(result.features));
      }
      setStatus(`${target === 'org' ? '組織' : 'ユーザー'}設定を取得しました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取得に失敗しました。');
    } finally {
      if (target === 'org') {
        setLoadingOrg(false);
      } else {
        setLoadingUser(false);
      }
    }
  };

  const saveFeatures = async (target: 'org' | 'user') => {
    setStatus(null);
    setError(null);

    const token = await getAuthToken();
    if (!token) {
      setError('認証トークンが取得できませんでした。');
      return;
    }

    try {
      if (target === 'org') {
        if (!orgId.trim()) {
          throw new Error('orgId を入力してください。');
        }
        setSavingOrg(true);
      } else {
        if (!userId.trim()) {
          throw new Error('userId を入力してください。');
        }
        setSavingUser(true);
      }

      const endpoint =
        target === 'org'
          ? `/api/admin/organizations/${orgId.trim()}/features`
          : `/api/admin/users/${userId.trim()}/features`;
      const features = target === 'org' ? orgFeatures : userFeatures;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ features }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || `Failed: ${response.status}`);
      }

      setStatus(`${target === 'org' ? '組織' : 'ユーザー'}設定を更新しました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました。');
    } finally {
      if (target === 'org') {
        setSavingOrg(false);
      } else {
        setSavingUser(false);
      }
    }
  };

  const renderFeatureTable = (target: 'org' | 'user', features: FeatureSetting[]) => (
    <div className="space-y-3">
      {features.map((feature) => (
        <label
          key={`${target}-${feature.featureKey}`}
          className="flex items-center justify-between border border-slate-200 px-4 py-3"
        >
          <div>
            <div className="text-sm font-medium text-slate-900">{feature.featureKey}</div>
            <div className="mt-1 text-xs text-slate-500">
              {target === 'org' ? '組織契約機能' : 'ユーザー付与機能'}
            </div>
          </div>
          <input
            type="checkbox"
            checked={feature.enabled}
            onChange={(event) => updateFeature(target, feature.featureKey, event.target.checked)}
          />
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {error ? <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {status ? <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-end gap-3">
            <label className="flex-1">
              <div className="mb-2 text-sm font-medium text-slate-700">orgId</div>
              <input
                value={orgId}
                onChange={(event) => setOrgId(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
                placeholder="org_001"
              />
            </label>
            <button
              type="button"
              onClick={() => fetchFeatures('org')}
              disabled={loadingOrg}
              className="h-10 border border-slate-300 px-4 text-sm"
            >
              {loadingOrg ? '取得中...' : '取得'}
            </button>
          </div>
          <div className="mb-4 text-sm font-medium text-slate-900">組織単位の機能設定</div>
          {renderFeatureTable('org', orgFeatures)}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => saveFeatures('org')}
              disabled={savingOrg}
              className="border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              {savingOrg ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-end gap-3">
            <label className="flex-1">
              <div className="mb-2 text-sm font-medium text-slate-700">userId</div>
              <input
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
                placeholder="uid_123"
              />
            </label>
            <button
              type="button"
              onClick={() => fetchFeatures('user')}
              disabled={loadingUser}
              className="h-10 border border-slate-300 px-4 text-sm"
            >
              {loadingUser ? '取得中...' : '取得'}
            </button>
          </div>
          <div className="mb-4 text-sm font-medium text-slate-900">ユーザー単位の機能付与</div>
          {renderFeatureTable('user', userFeatures)}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => saveFeatures('user')}
              disabled={savingUser}
              className="border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              {savingUser ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
