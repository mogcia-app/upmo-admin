import DashboardLayout from '@/components/DashboardLayout';
import FeatureManagementPanel from '@/components/admin/FeatureManagementPanel';

export default function AdminFeaturesPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white px-4 py-6 md:px-6">
        <div className="mb-8 border border-slate-200 bg-white p-8">
          <p className="mb-3 inline-flex border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-blue-700">
            FEATURE MANAGEMENT
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">機能付与</h1>
          <p className="mt-2 text-sm text-slate-600">組織単位の契約機能と、ユーザー単位の付与状態を管理します。</p>
        </div>
        <FeatureManagementPanel />
      </div>
    </DashboardLayout>
  );
}
