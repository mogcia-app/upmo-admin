import UserListComponent from '@/components/UserList';
import DashboardLayout from '@/components/DashboardLayout';

export default function UsersListPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white px-4 py-6 md:px-6">
        <div className="w-full">
          <div className="mb-8 border border-slate-200 bg-white p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-3 inline-flex border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-blue-700">
                  ADMIN USER DIRECTORY
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">利用者一覧</h1>
                <p className="mt-2 text-sm text-slate-600">
                  登録されている利用者を会社単位で確認、編集、削除できます。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm md:min-w-72">
                <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-slate-500">表示単位</div>
                  <div className="mt-1 font-semibold text-slate-900">会社別</div>
                </div>
                <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-slate-500">管理操作</div>
                  <div className="mt-1 font-semibold text-slate-900">編集 / 削除</div>
                </div>
              </div>
            </div>
          </div>
          <UserListComponent />
        </div>
      </div>
    </DashboardLayout>
  );
}



