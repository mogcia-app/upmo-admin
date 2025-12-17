# upmo-demo側 共有事項

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

