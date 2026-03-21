import DashboardLayout from '@/components/DashboardLayout';
import DocumentAccessPolicyManager from '@/components/documents/DocumentAccessPolicyManager';

export default function AdminDocumentsPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white px-4 py-6 md:px-6">
        <div className="w-full">
          <div className="mb-8 border border-slate-200 bg-white p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-3 inline-flex border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-blue-700">
                  DOCUMENT ACCESS CONTROL
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">資料閲覧制御</h1>
                <p className="mt-2 text-sm text-slate-600">
                  資料ごとの公開範囲を `org` / `policy` で切り替え、role または uid 単位で閲覧権限を管理します。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm md:min-w-72">
                <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-slate-500">操作単位</div>
                  <div className="mt-1 font-semibold text-slate-900">orgId + documentId</div>
                </div>
                <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-slate-500">更新方式</div>
                  <div className="mt-1 font-semibold text-slate-900">PUT 全置換</div>
                </div>
              </div>
            </div>
          </div>
          <DocumentAccessPolicyManager />
        </div>
      </div>
    </DashboardLayout>
  );
}
