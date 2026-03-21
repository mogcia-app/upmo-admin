import DashboardLayout from '@/components/DashboardLayout';
import OrgDashboardPanel from '@/components/admin/OrgDashboardPanel';

export default function AdminOrgDashboardPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white px-4 py-6 md:px-6">
        <div className="mb-8 border border-slate-200 bg-white p-8">
          <p className="mb-3 inline-flex border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-blue-700">
            ORGANIZATION DASHBOARD
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">組織運用</h1>
          <p className="mt-2 text-sm text-slate-600">メンバー数、アクティブ状況、feature 付与数、role 内訳、最近の操作を確認します。</p>
        </div>
        <OrgDashboardPanel />
      </div>
    </DashboardLayout>
  );
}
