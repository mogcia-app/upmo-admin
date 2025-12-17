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
  inventory: '在庫・発注管理',
  finance: '財務管理',
  pdca: 'PDCA管理',
  document: 'ドキュメント管理',
  other: 'その他',
};

// カテゴリの表示順序
export const CATEGORY_ORDER: string[] = [
  'inventory',
  'finance',
  'sales',
  'customer',
  'pdca',
  'document',
  'other',
];

// 利用可能なメニュー項目の候補プール
export const AVAILABLE_MENU_ITEMS: MenuItem[] = [
  // 在庫・発注管理
  {
    id: 'inventory-management',
    name: '在庫管理',
    icon: '📦',
    href: '/inventory',
    description: '在庫情報の管理',
    category: 'inventory',
  },
  {
    id: 'purchase-management',
    name: '発注管理',
    icon: '🛒',
    href: '/purchases',
    description: '発注情報の管理',
    category: 'inventory',
  },
  {
    id: 'sales-orders',
    name: '受注管理',
    icon: '📋',
    href: '/sales/orders',
    description: '受注情報の管理',
    category: 'inventory',
  },
  // 財務管理
  {
    id: 'billing-management',
    name: '請求管理',
    icon: '💳',
    href: '/billing',
    description: '請求書の作成・管理',
    category: 'finance',
  },
  {
    id: 'expense-management',
    name: '経費管理',
    icon: '📊',
    href: '/expenses',
    description: '経費の記録・管理',
    category: 'finance',
  },
  {
    id: 'sales-quotes',
    name: '見積管理',
    icon: '💰',
    href: '/sales/quotes',
    description: '見積書の作成・管理',
    category: 'finance',
  },
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
  // PDCA管理
  {
    id: 'pdca-plan',
    name: '計画管理',
    icon: '📝',
    href: '/pdca/plan',
    description: 'PDCAの計画フェーズ',
    category: 'pdca',
  },
  {
    id: 'pdca-do',
    name: '実行管理',
    icon: '⚡',
    href: '/pdca/do',
    description: 'PDCAの実行フェーズ',
    category: 'pdca',
  },
  {
    id: 'pdca-check',
    name: '評価管理',
    icon: '📈',
    href: '/pdca/check',
    description: 'PDCAの評価フェーズ',
    category: 'pdca',
  },
  {
    id: 'pdca-action',
    name: '改善管理',
    icon: '🔧',
    href: '/pdca/action',
    description: 'PDCAの改善フェーズ',
    category: 'pdca',
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
  // その他
  {
    id: 'calendar',
    name: 'カレンダー',
    icon: '📅',
    href: '/calendar',
    description: 'スケジュール管理',
    category: 'other',
  },
  {
    id: 'reports',
    name: 'レポート',
    icon: '📊',
    href: '/reports',
    description: '各種レポートの表示',
    category: 'other',
  },
  {
    id: 'analytics',
    name: '分析ダッシュボード',
    icon: '📈',
    href: '/analytics',
    description: 'データ分析と可視化',
    category: 'other',
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


