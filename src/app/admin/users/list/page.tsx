import UserListComponent from '@/components/UserList';
import DashboardLayout from '@/components/DashboardLayout';

export default function UsersListPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">利用者一覧</h1>
            <p className="text-sm text-gray-600">
              登録されている利用者を確認できます
            </p>
          </div>
          <UserListComponent />
        </div>
      </div>
    </DashboardLayout>
  );
}




