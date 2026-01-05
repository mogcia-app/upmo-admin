# upmo-demo側 共有事項

# サイドバー設定機能

## 概要

upmo-adminプロジェクトからサイドバーの表示項目を動的に制御できる機能です。Firestoreを共有データベースとして使用し、upmo-admin側でチェックマークを付けたメニューアイテムのみがupmo-demo側のサイドバーに表示されます。

**重要**: サイドバー設定は**会社単位（companyName）**で管理されます。同じ会社のユーザーは同じサイドバー設定を共有します。

## アーキテクチャ

```
upmo-admin (管理画面)
    ↓ (API経由で設定を更新、認証トークンに基づいてcompanyNameを取得)
Firestore (sidebarConfig/{companyName})
    ↓ (リアルタイム同期)
upmo-demo (メインアプリ)
    ↓ (ユーザーのcompanyNameに基づいて設定を読み込み)
サイドバー (動的にメニューを表示)
```

### フォールバック機能

- 会社名のドキュメントが存在しない場合、または`enabledMenuItems`が空の場合、`sidebarConfig/default`ドキュメントから設定を取得します
- これにより、新規会社でも`default`ドキュメントに設定があれば、すぐに追加メニュー項目を利用できます

## データ構造

### Firestore: `sidebarConfig/{companyName}`

```typescript
{
  companyName: string,              // 会社名（ドキュメントIDと同じ）
  commonMenuItems: [                // 共通メニュー（固定、変更不可）
    {
      id: "todo",
      name: "TODOリスト",
      icon: "•",
      href: "/todo",
      enabled: true,
      order: 1
    },
    {
      id: "progress-notes",
      name: "進捗メモ",
      icon: "•",
      href: "/sales/progress-notes",
      enabled: true,
      order: 2
    },
    {
      id: "contracts",
      name: "契約書管理",
      icon: "•",
      href: "/admin/contracts",
      enabled: true,
      order: 3
    },
    {
      id: "users",
      name: "利用者招待",
      icon: "•",
      href: "/admin/users",
      enabled: true,
      order: 4
    }
  ],
  adminMenuItems: [],               // 管理者メニュー（現在は空）
  enabledMenuItems: [               // 有効化された追加メニュー項目のIDリスト
    "sales-quotes",
    "inventory-management",
    "billing-management",
    // ... 他の有効化された項目のID
  ],
  updatedAt: Timestamp,
  updatedBy: string                 // 更新者のユーザーID
}
```

### Firestore: `sidebarConfig/default`（フォールバック用）

新規会社や`enabledMenuItems`が空の会社は、このドキュメントから設定を取得します。

```typescript
{
  companyName: "default",
  commonMenuItems: [...],           // 共通メニュー（オプション）
  adminMenuItems: [...],            // 管理者メニュー（オプション）
  enabledMenuItems: [               // デフォルトで有効化する追加メニュー項目
    "sales-quotes",
    "inventory-management",
    // ...
  ],
  updatedAt: Timestamp,
  updatedBy: string
}
```

## upmo-admin側での実装方法

### 1. サイドバー設定を取得

**重要**: APIは認証トークンから`companyName`を自動取得し、その会社の設定を返します。

```typescript
// GET /api/admin/sidebar-config
const userToken = await getAuthToken(); // Firebase認証トークンを取得

const response = await fetch('https://upmo-demo.vercel.app/api/admin/sidebar-config', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`, // オプション（認証トークンがある場合、会社名を取得）
  },
});

const config = await response.json();
console.log(config.companyName);        // 会社名
console.log(config.commonMenuItems);    // 共通メニュー（固定）
console.log(config.adminMenuItems);     // 管理者メニュー（固定）
console.log(config.enabledMenuItems);   // 有効化された追加メニュー項目のIDリスト
console.log(config.availableMenuItems); // 利用可能なメニュー項目の候補プール
```

### 2. 利用可能なメニュー項目の候補を取得

```typescript
// GET /api/admin/sidebar-config
const response = await fetch('https://upmo-demo.vercel.app/api/admin/sidebar-config', {
  headers: {
    'Authorization': `Bearer ${userToken}`, // オプション
  },
});
const config = await response.json();

// 利用可能なメニュー項目の候補プール
console.log(config.availableMenuItems);
// [
//   { 
//     id: 'customer-management', 
//     name: '顧客管理', 
//     icon: '👥', 
//     href: '/customers', 
//     category: 'customer',
//     description: '顧客情報の管理',
//     order: 1
//   },
//   { 
//     id: 'sales-quotes', 
//     name: '見積管理', 
//     icon: '💰', 
//     href: '/sales/quotes', 
//     category: 'finance',
//     description: '見積書の作成と管理',
//     order: 1
//   },
//   // ... 他の候補項目
// ]

// 現在有効化されているメニュー項目のIDリスト
console.log(config.enabledMenuItems);
// ['customer-management', 'sales-quotes', 'inventory-management', ...]
```

### 3. サイドバー設定を更新（追加メニュー項目の有効化）

**重要**: 更新は認証トークンから取得した`companyName`のドキュメントに対して行われます。

```typescript
// POST /api/admin/sidebar-config
const userToken = await getAuthToken(); // Firebase認証トークンを取得

const response = await fetch('https://upmo-demo.vercel.app/api/admin/sidebar-config', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`, // 必須（認証トークンからcompanyNameを取得）
  },
  body: JSON.stringify({
    // 有効化したいメニュー項目のIDリストを指定
    enabledMenuItems: [
      'customer-management',    // 顧客管理
      'customer-list',          // リスト
      'sales-quotes',           // 見積管理
      'sales-orders',           // 受注管理
      'inventory-management',   // 在庫管理
      'purchase-management',    // 発注管理
      'billing-management',     // 請求管理
      'expense-management',     // 経費管理
      'pdca-plan',             // 計画管理
      'pdca-do',               // 実行管理
      'pdca-check',            // 評価管理
      'pdca-action',           // 改善管理
      'meeting-notes',         // 議事録管理
      'calendar',              // カレンダー
      'reports',               // レポート
      'analytics-dashboard',   // 分析ダッシュボード
      // ... 他の有効化したい項目のID
    ],
  }),
});

const result = await response.json();
console.log(result.message); // "Sidebar config updated successfully"
console.log(result.config.companyName); // 更新された会社名
```

### 4. upmo-admin側のUI実装例

```tsx
// upmo-admin側のコンポーネント例
import { useState, useEffect } from 'react';
import { getMenuItemsByCategory, CATEGORY_NAMES } from '@/types/sidebar';

const SidebarConfigPage = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);

  // 認証トークンを取得
  useEffect(() => {
    const fetchToken = async () => {
      const token = await getAuthToken();
      setUserToken(token);
    };
    fetchToken();
  }, []);

  // 設定を取得
  useEffect(() => {
    if (!userToken) return;

    const fetchConfig = async () => {
      const response = await fetch('https://upmo-demo.vercel.app/api/admin/sidebar-config', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
      const data = await response.json();
      setConfig(data);
      setLoading(false);
    };
    fetchConfig();
  }, [userToken]);

  // チェックボックスの変更を処理
  const handleToggle = async (itemId: string) => {
    if (!userToken) return;

    const enabledMenuItems = config.enabledMenuItems || [];
    const isEnabled = enabledMenuItems.includes(itemId);
    
    const updatedEnabledMenuItems = isEnabled
      ? enabledMenuItems.filter((id: string) => id !== itemId) // チェックを外す
      : [...enabledMenuItems, itemId]; // チェックを付ける

    // 更新を送信
    const response = await fetch('https://upmo-demo.vercel.app/api/admin/sidebar-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        enabledMenuItems: updatedEnabledMenuItems,
      }),
    });

    const result = await response.json();
    if (result.success) {
      setConfig({
        ...config,
        enabledMenuItems: updatedEnabledMenuItems,
      });
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (!config) return <div>設定を取得できませんでした</div>;

  // カテゴリごとにグループ化
  const groupedItems = getMenuItemsByCategory(config.availableMenuItems);

  return (
    <div>
      <h2>サイドバー設定</h2>
      <p>会社名: {config.companyName}</p>
      <p>表示したい機能にチェックマークを付けてください</p>
      
      {/* カテゴリごとに表示 */}
      {Object.entries(groupedItems).map(([category, items]) => (
        items.length > 0 && (
          <div key={category} className="mb-6">
            <h3>{CATEGORY_NAMES[category]}</h3>
            {items.map((item) => {
              const isEnabled = config.enabledMenuItems?.includes(item.id) || false;
              return (
                <label key={item.id} className="flex items-center p-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggle(item.id)}
                    className="mr-2"
                  />
                  <span className="mr-2">{item.icon}</span>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )
      ))}
    </div>
  );
};
```

## upmo-demo側の実装

### 自動的な動作

1. **useSidebarConfigフック**: 
   - ユーザーの`companyName`を取得
   - Firestoreの`sidebarConfig/{companyName}`から設定を読み込み
   - `enabledMenuItems`が空の場合、`sidebarConfig/default`から取得を試みる
   - リアルタイムで監視（`onSnapshot`）

2. **Sidebarコンポーネント**: 
   - `commonMenuItems`のうち`enabled: true`の項目を表示
   - `enabledMenuItems`に含まれるIDの`AvailableMenuItem`を表示
   - `adminMenuItems`のうち`enabled: true`の項目を表示（現在は空）

3. **自動更新**: Firestoreの変更がリアルタイムで反映される

### メニュー構造

サイドバーは以下の3つのセクションで構成されます：

1. **共通メニュー（固定）**: デフォルトで表示される基本機能（変更不可）
   - TODOリスト (`/todo`)
   - 進捗メモ (`/sales/progress-notes`)
   - 契約書管理 (`/admin/contracts`)
   - 利用者招待 (`/admin/users`)

2. **追加メニュー（admin側で選択可能）**: 利用可能な候補項目から必要なものだけを選択
   - **顧客管理**: 顧客管理、リスト
   - **在庫・発注管理**: 在庫管理、発注管理
   - **財務管理**: 見積管理、受注管理、請求管理、経費管理
   - **PDCA管理**: 計画管理、実行管理、評価管理、改善管理
   - **その他**: 議事録管理、カレンダー、レポート、分析ダッシュボード

3. **管理者メニュー（固定）**: 管理者のみに表示される機能（現在は空）

### 利用可能なメニュー項目の一覧

```typescript
// カテゴリ: customer（顧客管理）
- customer-management: 顧客管理
- customer-list: リスト

// カテゴリ: inventory（在庫・発注管理）
- inventory-management: 在庫管理
- purchase-management: 発注管理

// カテゴリ: finance（財務管理）
- sales-quotes: 見積管理
- sales-orders: 受注管理
- billing-management: 請求管理
- expense-management: 経費管理

// カテゴリ: pdca（PDCA管理）
- pdca-plan: 計画管理
- pdca-do: 実行管理
- pdca-check: 評価管理
- pdca-action: 改善管理

// カテゴリ: other（その他）
- meeting-notes: 議事録管理
- calendar: カレンダー
- reports: レポート

// カテゴリ: analytics（分析・レポート）
- analytics-dashboard: 分析ダッシュボード
```

## セキュリティ

- **読み取り**: 認証済みユーザー全員が読み取り可能（同じ会社の設定を共有）
- **書き込み**: 認証トークンが必要（Firebase Admin SDKで検証）
- **会社単位の分離**: 各会社の設定は独立して管理される

## 注意事項

1. **Firebase認証トークン**: 
   - upmo-admin側でFirebase認証トークンを取得し、APIリクエストの`Authorization`ヘッダーに含める必要があります
   - トークンから`companyName`が自動取得され、その会社の設定が更新されます

2. **リアルタイム更新**: 
   - upmo-demo側はFirestoreの変更をリアルタイムで監視しているため、upmo-admin側で設定を更新すると、数秒以内にupmo-demo側のサイドバーに反映されます

3. **デフォルト設定**: 
   - 共通メニュー（`commonMenuItems`）は固定で変更できません
   - 追加メニュー項目（`enabledMenuItems`）のみadmin側で選択可能です

4. **フォールバック機能**: 
   - 会社名のドキュメントが存在しない場合、または`enabledMenuItems`が空の場合、`sidebarConfig/default`ドキュメントから設定を取得します
   - 新規会社でも`default`ドキュメントに設定があれば、すぐに追加メニュー項目を利用できます

5. **会社単位の共有**: 
   - 同じ`companyName`を持つユーザーは、同じサイドバー設定を共有します
   - 一つの会社で設定を変更すると、その会社の全ユーザーに反映されます

## トラブルシューティング

### 設定が反映されない場合

1. **Firestoreルールが正しく設定されているか確認**
   ```javascript
   // Firestoreセキュリティルールの例
   match /sidebarConfig/{companyName} {
     allow read: if request.auth != null;
     allow write: if request.auth != null && request.auth.token.admin == true;
   }
   ```

2. **Firebase認証トークンが正しく送信されているか確認**
   - `Authorization: Bearer {token}`ヘッダーが含まれているか
   - トークンが有効期限内か

3. **ブラウザのコンソールでエラーを確認**
   - upmo-demo側のコンソールに`[useSidebarConfig]`で始まるデバッグログが出力されます
   - `companyName`、`enabledMenuItems`の値が正しいか確認

4. **Firestoreのドキュメントが正しく作成されているか確認**
   - `sidebarConfig/{companyName}`ドキュメントが存在するか
   - `enabledMenuItems`フィールドが配列形式で正しく設定されているか
   - `sidebarConfig/default`ドキュメントが存在するか（フォールバック用）

5. **会社名が正しく設定されているか確認**
   - ユーザーの`users/{userId}`ドキュメントに`companyName`フィールドが設定されているか
   - `companyName`が空の場合は`"default"`が使用されます

### APIエラーが発生する場合

- **`401 Unauthorized`**: 認証トークンが無効または欠落
  - トークンを再取得して再試行
  - トークンの有効期限を確認

- **`500 Internal Server Error`**: Firebase Admin SDKの初期化エラーまたはFirestore接続エラー
  - 環境変数（`FIREBASE_PROJECT_ID`、`FIREBASE_CLIENT_EMAIL`、`FIREBASE_PRIVATE_KEY`）が正しく設定されているか確認
  - サーバーログで詳細なエラーメッセージを確認

### デバッグログの確認

upmo-demo側のブラウザコンソールに以下のようなログが出力されます：

```
[useSidebarConfig] Setting up snapshot for companyName: {companyName} docId: {docId}
[useSidebarConfig] Firestore data (company): { id: "...", enabledMenuItems: [...], ... }
[useSidebarConfig] Setting config: { enabledMenuItems: [...], enabledMenuItemsLength: N }
[useSidebarConfig] Fallback to default enabledMenuItems: [...]
```

これらのログを確認することで、設定の取得状況を把握できます。

---

## 概要

upmo-admin側でサイドバー設定に新しいメニュー項目を追加しました。upmo-demo側でこれらのメニュー項目に対応するページを実装する必要があります。

## 追加されたメニュー項目

### 営業管理カテゴリ（sales）

以下の3つのメニュー項目が追加されました：

#### 1. 商談管理
- **ID**: `sales-opportunity`
- **名前**: 商談管理
- **アイコン**: 🤝
- **ルート**: `/sales/opportunities`
- **説明**: 営業案件・商談の進捗管理
- **カテゴリ**: `sales`

#### 2. 見込み客管理
- **ID**: `sales-lead`
- **名前**: 見込み客管理
- **アイコン**: 🎯
- **ルート**: `/sales/leads`
- **説明**: リード・見込み客の管理
- **カテゴリ**: `sales`

#### 3. 営業活動管理
- **ID**: `sales-activity`
- **名前**: 営業活動管理
- **アイコン**: 📞
- **ルート**: `/sales/activities`
- **説明**: 訪問記録・営業活動の記録
- **カテゴリ**: `sales`

## カテゴリの違い

### 営業管理（sales）と顧客管理（customer）の違い

- **営業管理（sales）**: 営業活動そのものの管理
  - 商談の進捗管理
  - 見込み客（リード）の管理
  - 営業活動（訪問、電話、メールなど）の記録
  - 営業プロセスの管理

- **顧客管理（customer）**: 顧客情報の管理
  - 顧客マスタ情報
  - 取引履歴
  - 連絡先情報
  - 顧客との関係性管理

## メニュー項目のデータ構造

各メニュー項目は以下の型で定義されています：

```typescript
interface MenuItem {
  id: string;              // メニュー項目の一意ID
  name: string;            // 表示名
  icon: string;            // アイコン（絵文字）
  href: string;            // ルートパス
  description?: string;    // 説明文
  category: string;        // カテゴリ（sales, customer, inventory, finance, etc.）
  enabled?: boolean;       // 有効/無効フラグ
  order?: number;          // 表示順序
}
```

## upmo-demo側での実装要件

### 1. サイドバー設定の取得・更新

upmo-demo側のAPIエンドポイント `/api/admin/sidebar-config` が、`availableMenuItems` 配列に以下の項目を含める必要があります：

```json
{
  "availableMenuItems": [
    {
      "id": "sales-opportunity",
      "name": "商談管理",
      "icon": "🤝",
      "href": "/sales/opportunities",
      "description": "営業案件・商談の進捗管理",
      "category": "sales"
    },
    {
      "id": "sales-lead",
      "name": "見込み客管理",
      "icon": "🎯",
      "href": "/sales/leads",
      "description": "リード・見込み客の管理",
      "category": "sales"
    },
    {
      "id": "sales-activity",
      "name": "営業活動管理",
      "icon": "📞",
      "href": "/sales/activities",
      "description": "訪問記録・営業活動の記録",
      "category": "sales"
    }
  ]
}
```

### 2. ページルートの実装

以下のページルートを実装する必要があります：

- `/sales/opportunities` - 商談管理ページ
- `/sales/leads` - 見込み客管理ページ
- `/sales/activities` - 営業活動管理ページ

### 3. カテゴリ名のマッピング

カテゴリ名のマッピングに `sales: '営業管理'` が含まれていることを確認してください：

```typescript
const CATEGORY_NAMES: Record<string, string> = {
  sales: '営業管理',
  customer: '顧客管理',
  inventory: '在庫・発注管理',
  finance: '財務管理',
  // ... その他
};
```

## カテゴリの表示順序

サイドバー設定画面では、以下の順序でカテゴリが表示されます：

1. 在庫・発注管理（inventory）
2. 財務管理（finance）
3. 営業管理（sales）← **新規項目が含まれる**
4. 顧客管理（customer）
5. PDCA管理（pdca）
6. ドキュメント管理（document）
7. その他（other）

## API連携

upmo-admin側から以下のAPIエンドポイントにリクエストが送信されます：

- **GET** `/api/admin/sidebar-config`
  - サイドバー設定を取得
  - レスポンスに `availableMenuItems` を含める必要があります

- **POST** `/api/admin/sidebar-config`
  - サイドバー設定を更新
  - リクエストボディに `enabledMenuItems`（string[]）が含まれます
  - 認証トークンは `Authorization: Bearer <token>` ヘッダーで送信されます

## 注意事項

1. メニュー項目のIDは変更しないでください（`sales-opportunity`, `sales-lead`, `sales-activity`）
2. ルートパス（href）は指定されたものを使用してください
3. カテゴリ名（category）は `sales` を使用してください
4. アイコンは絵文字（🤝, 🎯, 📞）を使用してください

## 更新日

2024年（メニュー項目追加時点）

