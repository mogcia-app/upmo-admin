'use client';

import UserRegistrationWithSidebarComponent from '@/components/UserRegistrationWithSidebar';
import DashboardLayout from '@/components/DashboardLayout';

export default function UsersPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">新規ユーザー登録</h1>
            <p className="text-sm text-gray-600">
              ユーザー情報とサイドバー設定を登録します
            </p>
          </div>
          <UserRegistrationWithSidebarComponent />
        </div>
      </div>
    </DashboardLayout>
  );
}
