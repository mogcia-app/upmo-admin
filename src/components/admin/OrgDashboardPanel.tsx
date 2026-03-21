'use client';

import { useState } from 'react';
import { getAuthToken } from '@/lib/auth';

interface OrgDashboardResponse {
  period: { from: string; to: string };
  metrics: {
    totalMembers: number;
    activeUsers: number;
    featureUsage: Array<{ featureKey: string; enabledUsers: number }>;
    roleBreakdown: Array<{ role: string; users: number }>;
    recentActions: Array<{ actionType: string; count: number }>;
  };
}

export default function OrgDashboardPanel() {
  const [orgId, setOrgId] = useState('');
  const [periodDays, setPeriodDays] = useState('30');
  const [limit, setLimit] = useState('500');
  const [data, setData] = useState<OrgDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できませんでした。');
      }
      if (!orgId.trim()) {
        throw new Error('orgId を入力してください。');
      }

      setLoading(true);

      const response = await fetch(
        `/api/admin/organizations/${orgId.trim()}/org-dashboard?periodDays=${periodDays}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || `Failed: ${response.status}`);
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="border border-slate-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <input value={orgId} onChange={(e) => setOrgId(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm" placeholder="orgId" />
          <input value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm" placeholder="periodDays" />
          <input value={limit} onChange={(e) => setLimit(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm" placeholder="limit" />
          <button type="button" onClick={fetchDashboard} disabled={loading} className="border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            {loading ? '取得中...' : '取得'}
          </button>
        </div>
      </section>

      {error ? <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {data ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-500">総メンバー数</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{data.metrics.totalMembers}</div>
            </div>
            <div className="border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-500">アクティブユーザー数</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{data.metrics.activeUsers}</div>
            </div>
          </section>
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="border border-slate-200 bg-white p-6">
              <div className="mb-4 text-sm font-medium text-slate-900">feature ごとの付与人数</div>
              <div className="space-y-3">
                {data.metrics.featureUsage.map((item) => (
                  <div key={item.featureKey} className="flex items-center justify-between border border-slate-200 px-4 py-3 text-sm">
                    <span>{item.featureKey}</span>
                    <span>{item.enabledUsers}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-slate-200 bg-white p-6">
              <div className="mb-4 text-sm font-medium text-slate-900">role ごとの人数</div>
              <div className="space-y-3">
                {data.metrics.roleBreakdown.map((item) => (
                  <div key={item.role} className="flex items-center justify-between border border-slate-200 px-4 py-3 text-sm">
                    <span>{item.role}</span>
                    <span>{item.users}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-slate-200 bg-white p-6">
              <div className="mb-4 text-sm font-medium text-slate-900">最近多い操作</div>
              <div className="space-y-3">
                {data.metrics.recentActions.map((item) => (
                  <div key={item.actionType} className="flex items-center justify-between border border-slate-200 px-4 py-3 text-sm">
                    <span>{item.actionType}</span>
                    <span>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
