export interface MenuItem {
  id: string;
  name: string;
  icon: string;
  href: string;
  description?: string;
  category: string;
  enabled?: boolean;
  order?: number;
}

export interface SidebarConfig {
  companyName?: string;
  commonMenuItems: MenuItem[];
  adminMenuItems: MenuItem[];
  availableMenuItems?: MenuItem[];
  enabledMenuItems?: string[];
  updatedAt?: Date;
  updatedBy?: string;
}

// カテゴリ名のマッピング
export const CATEGORY_NAMES: Record<string, string> = {
  sales: '営業管理',
  customer: '顧客管理',
  document: 'ドキュメント管理',
};

// カテゴリの表示順序
export const CATEGORY_ORDER: string[] = [
  'sales',
  'customer',
  'document',
];

// 利用可能なメニュー項目の候補プール
export const AVAILABLE_MENU_ITEMS: MenuItem[] = [
  // 営業管理
  {
    id: 'sales-opportunity',
    name: '商談管理',
    icon: '🤝',
    href: '/sales/opportunities',
    description: '営業案件・商談の進捗管理',
    category: 'sales',
  },
  {
    id: 'sales-lead',
    name: '見込み客管理',
    icon: '🎯',
    href: '/sales/leads',
    description: 'リード・見込み客の管理',
    category: 'sales',
  },
  {
    id: 'sales-activity',
    name: '営業活動管理',
    icon: '📞',
    href: '/sales/activities',
    description: '訪問記録・営業活動の記録',
    category: 'sales',
  },
  // 顧客管理
  {
    id: 'customer-management',
    name: '顧客管理',
    icon: '👥',
    href: '/customers',
    description: '顧客情報・取引履歴の管理',
    category: 'customer',
  },
  {
    id: 'customer-list',
    name: 'リスト',
    icon: '📋',
    href: '/customers/list',
    description: '顧客リストの管理',
    category: 'customer',
  },
  // ドキュメント管理
  {
    id: 'template-management',
    name: 'テンプレート管理',
    icon: '📄',
    href: '/templates',
    description: '文書テンプレートの管理',
    category: 'document',
  },
  {
    id: 'minutes-management',
    name: '議事録管理',
    icon: '📝',
    href: '/minutes',
    description: '会議の議事録管理',
    category: 'document',
  },
  {
    id: 'document-management',
    name: 'ドキュメント管理',
    icon: '📚',
    href: '/documents',
    description: '各種ドキュメントの管理',
    category: 'document',
  },
];

// カテゴリごとにグループ化する関数
export function getMenuItemsByCategory(items: MenuItem[]): Record<string, MenuItem[]> {
  const grouped: Record<string, MenuItem[]> = {};
  
  items.forEach((item) => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });
  
  return grouped;
}

// カテゴリの順序に従ってグループ化されたメニュー項目を取得する関数
export function getMenuItemsByCategoryOrdered(items: MenuItem[]): Array<[string, MenuItem[]]> {
  const grouped = getMenuItemsByCategory(items);
  const ordered: Array<[string, MenuItem[]]> = [];
  
  CATEGORY_ORDER.forEach((category) => {
    if (grouped[category] && grouped[category].length > 0) {
      ordered.push([category, grouped[category]]);
    }
  });
  
  // カテゴリ順序に含まれていないカテゴリも追加
  Object.entries(grouped).forEach(([category, items]) => {
    if (!CATEGORY_ORDER.includes(category)) {
      ordered.push([category, items]);
    }
  });
  
  return ordered;
}


