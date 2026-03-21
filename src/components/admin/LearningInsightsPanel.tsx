'use client';

import { useState } from 'react';
import { getAuthToken } from '@/lib/auth';

interface LearningInsightsResponse {
  period: { from: string; to: string };
  metrics: {
    topKnowledge: Array<{ resourceId: string; name: string; views: number }>;
    stuckActions: Array<{ actionType: string; count: number }>;
    topKnowledgeUsers: Array<{ userId: string; documentIds: string[]; interactions: number }>;
  };
}

export default function LearningInsightsPanel() {
  const [orgId, setOrgId] = useState('');
  const [periodDays, setPeriodDays] = useState('14');
  const [limit, setLimit] = useState('300');
  const [data, setData] = useState<LearningInsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
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
        `/api/admin/organizations/${orgId.trim()}/learning-insights?periodDays=${periodDays}&limit=${limit}`,
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
          <button type="button" onClick={fetchInsights} disabled={loading} className="border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            {loading ? '取得中...' : '取得'}
          </button>
        </div>
      </section>

      {error ? <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {data ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="border border-slate-200 bg-white p-6">
            <div className="mb-4 text-sm font-medium text-slate-900">よく使われる資料</div>
            <div className="space-y-3">
              {data.metrics.topKnowledge.map((item) => (
                <div key={item.resourceId} className="border border-slate-200 px-4 py-3">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.resourceId}</div>
                  <div className="mt-2 text-sm text-slate-700">{item.views} views</div>
                </div>
              ))}
            </div>
          </section>
          <section className="border border-slate-200 bg-white p-6">
            <div className="mb-4 text-sm font-medium text-slate-900">利用頻度の高い行動</div>
            <div className="space-y-3">
              {data.metrics.stuckActions.map((item) => (
                <div key={item.actionType} className="border border-slate-200 px-4 py-3 text-sm text-slate-800">
                  {item.actionType}: {item.count}
                </div>
              ))}
            </div>
          </section>
          <section className="border border-slate-200 bg-white p-6">
            <div className="mb-4 text-sm font-medium text-slate-900">資料閲覧が多いユーザー</div>
            <div className="space-y-3">
              {data.metrics.topKnowledgeUsers.map((item) => (
                <div key={item.userId} className="border border-slate-200 px-4 py-3">
                  <div className="font-medium text-slate-900">{item.userId}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.documentIds.join(', ')}</div>
                  <div className="mt-2 text-sm text-slate-700">{item.interactions} interactions</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
