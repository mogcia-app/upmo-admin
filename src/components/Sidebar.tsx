'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: '新規ユーザー登録', href: '/admin/users', icon: '👤' },
  { name: '利用者一覧', href: '/admin/users/list', icon: '📋' },
  { name: '機能付与', href: '/admin/features', icon: '🧩' },
  { name: '資料閲覧制御', href: '/admin/documents', icon: '📄' },
  { name: '行動の可視化', href: '/admin/activities', icon: '🛰️' },
  { name: '学習支援', href: '/admin/learning-insights', icon: '📚' },
  { name: '組織運用', href: '/admin/org-dashboard', icon: '🏢' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen">
      <nav className="p-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
