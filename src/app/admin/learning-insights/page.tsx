import DashboardLayout from '@/components/DashboardLayout';
import LearningInsightsPanel from '@/components/admin/LearningInsightsPanel';

export default function AdminLearningInsightsPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white px-4 py-6 md:px-6">
        <div className="mb-8 border border-slate-200 bg-white p-8">
          <p className="mb-3 inline-flex border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-blue-700">
            LEARNING INSIGHTS
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">学習支援</h1>
          <p className="mt-2 text-sm text-slate-600">資料利用傾向と暫定的な行動頻度指標を確認できます。</p>
        </div>
        <LearningInsightsPanel />
      </div>
    </DashboardLayout>
  );
}
