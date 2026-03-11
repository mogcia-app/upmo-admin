'use client';

import UserRegistrationWithSidebarComponent from '@/components/UserRegistrationWithSidebar';
import DashboardLayout from '@/components/DashboardLayout';

export default function UsersPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white px-4 py-6 md:px-6">
        <div className="w-full">
          <div className="mb-8 border border-slate-200 bg-white p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-3 inline-flex border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-blue-700">
                  ADMIN USER SETUP
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">新規ユーザー登録</h1>
                <p className="mt-2 text-sm text-slate-600">
                  会社情報と対象ユーザーをまとめて登録します。生成された初期パスワードは登録後に確認できます。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm md:min-w-72">
                <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-slate-500">対象</div>
                  <div className="mt-1 font-semibold text-slate-900">管理画面ユーザー</div>
                </div>
                <div className="border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-slate-500">作成方式</div>
                  <div className="mt-1 font-semibold text-slate-900">一括登録</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              ユーザー情報を登録します
            </p>
          </div>
          <UserRegistrationWithSidebarComponent />
        </div>
      </div>
    </DashboardLayout>
  );
}
