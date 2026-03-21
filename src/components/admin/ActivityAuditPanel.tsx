'use client';

import { useState } from 'react';
import { getAuthToken } from '@/lib/auth';

interface ActivityItem {
  id: string;
  userId: string | null;
  actionType: string | null;
  resourceType: string | null;
  resourceId: string | null;
  occurredAt: string | null;
  createdAt: string | null;
}

export default function ActivityAuditPanel() {
  const [orgId, setOrgId] = useState('');
  const [userId, setUserId] = useState('');
  const [actionType, setActionType] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState('50');
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
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

      const searchParams = new URLSearchParams();
      if (userId.trim()) searchParams.set('userId', userId.trim());
      if (actionType.trim()) searchParams.set('actionType', actionType.trim());
      if (resourceType.trim()) searchParams.set('resourceType', resourceType.trim());
      if (from) searchParams.set('from', new Date(from).toISOString());
      if (to) searchParams.set('to', new Date(to).toISOString());
      if (limit) searchParams.set('limit', limit);

      const response = await fetch(
        `/api/admin/organizations/${orgId.trim()}/activities?${searchParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || `Failed: ${response.status}`);
      }

      setItems(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="border border-slate-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input value={orgId} onChange={(e) => setOrgId(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm" placeholder="orgId" />
          <input value={userId} onChange={(e) => setUserId(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm" placeholder="userId" />
          <input value={actionType} onChange={(e) => setActionType(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm" placeholder="actionType" />
          <input value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm" placeholder="resourceType" />
          <input value={from} onChange={(e) => setFrom(e.target.value)} type="datetime-local" className="border border-slate-300 px-3 py-2 text-sm" />
          <input value={to} onChange={(e) => setTo(e.target.value)} type="datetime-local" className="border border-slate-300 px-3 py-2 text-sm" />
          <input value={limit} onChange={(e) => setLimit(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm" placeholder="limit" />
          <button type="button" onClick={fetchItems} disabled={loading} className="border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            {loading ? '取得中...' : '検索'}
          </button>
        </div>
      </section>

      {error ? <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4 text-sm font-medium text-slate-900">行動ログ一覧</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">occurredAt</th>
                <th className="px-4 py-3">userId</th>
                <th className="px-4 py-3">actionType</th>
                <th className="px-4 py-3">resourceType</th>
                <th className="px-4 py-3">resourceId</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{item.occurredAt ?? '-'}</td>
                  <td className="px-4 py-3">{item.userId ?? '-'}</td>
                  <td className="px-4 py-3">{item.actionType ?? '-'}</td>
                  <td className="px-4 py-3">{item.resourceType ?? '-'}</td>
                  <td className="px-4 py-3">{item.resourceId ?? '-'}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">データがありません</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
