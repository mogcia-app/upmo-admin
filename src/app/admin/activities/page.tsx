import DashboardLayout from '@/components/DashboardLayout';
import ActivityAuditPanel from '@/components/admin/ActivityAuditPanel';

export default function AdminActivitiesPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white px-4 py-6 md:px-6">
        <div className="mb-8 border border-slate-200 bg-white p-8">
          <p className="mb-3 inline-flex border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-blue-700">
            ACTIVITY AUDIT
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">行動の可視化</h1>
          <p className="mt-2 text-sm text-slate-600">user / action / resource / 期間で絞り込み、組織内の行動ログを確認します。</p>
        </div>
        <ActivityAuditPanel />
      </div>
    </DashboardLayout>
  );
}
