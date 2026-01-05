# ユーザーデータ統一スキーマ実装変更点

## 概要

`upmo-admin`プロジェクトにユーザーデータ構造の統一スキーマを実装しました。この変更により、`upmo-demo`プロジェクトと統一されたユーザーデータ構造を使用できるようになります。

## 実装日

2024年（実装日時を記載）

## 変更内容

### 1. 型定義ファイルの作成

**新規ファイル:** `src/types/user.ts`

統一スキーマに準拠した型定義を追加しました。

#### 追加された型定義

- `UserRole`: `'admin' | 'manager' | 'user'`
- `UserStatus`: `'active' | 'inactive' | 'suspended'`
- `User`: 統一スキーマに準拠したユーザーデータインターフェース

#### 追加された関数

- `validateUserData(data: Partial<User>): ValidationResult`: ユーザーデータのバリデーション
- `normalizeUserData(data: any): Partial<User>`: 既存データのマイグレーション用正規化関数
- `DEFAULT_USER_VALUES`: デフォルト値の定義

#### 必須フィールド

- `email`: string（必須）
- `displayName`: string（必須）
- `companyName`: string（必須）
- `role`: 'admin' | 'manager' | 'user'（必須、デフォルト: 'user'）
- `status`: 'active' | 'inactive' | 'suspended'（必須、デフォルト: 'active'）
- `createdAt`: Timestamp（必須）

#### 推奨フィールド

- `createdBy`: string | null（オプション、admin側から作成した場合はnull）
- `updatedAt`: Timestamp（推奨、更新時に設定）
- `department`: string（オプション、デフォルト: ''）
- `position`: string（オプション、デフォルト: ''）

#### オプションフィールド

- `photoURL`: string（オプション）
- `subscriptionType`: string（オプション、admin側で設定）
- `lastLoginAt`: Timestamp（オプション）

---

### 2. ユーザー作成APIの修正

**変更ファイル:** `src/app/api/admin/users/route.ts`

#### 変更内容

1. **インポートの変更**
   - `FieldValue`を削除
   - `Timestamp`を追加
   - `validateUserData`を追加

2. **ユーザーデータ構造の変更**

   **変更前:**
   ```typescript
   await userDocRef.set({
     email,
     displayName: displayName || null,
     companyName: companyName || null,
     subscriptionType: subscriptionType || 'trial',
     role: 'user',
     createdAt: FieldValue.serverTimestamp(),
     updatedAt: FieldValue.serverTimestamp(),
   });
   ```

   **変更後:**
   ```typescript
   const userData = {
     email,
     displayName: displayName || email.split('@')[0],
     companyName: companyName || '',
     role: 'user' as const,
     status: 'active' as const,                    // ✅ 追加（必須）
     department: department || '',                  // ✅ 追加（オプション、デフォルト: ''）
     position: position || '',                     // ✅ 追加（オプション、デフォルト: ''）
     createdAt: Timestamp.now(),                   // ✅ FieldValue.serverTimestamp()から変更
     createdBy: null,                             // ✅ 追加（admin側から作成した場合はnull）
     updatedAt: Timestamp.now(),                   // ✅ FieldValue.serverTimestamp()から変更
     subscriptionType: subscriptionType || null,
   };
   ```

3. **バリデーションの追加**
   - `validateUserData()`関数を使用してバリデーションを実行
   - バリデーションエラーの場合、Firebase Authのユーザーを削除してエラーを返す

4. **リクエストボディの拡張**
   - `department`と`position`フィールドを追加（オプション）

#### 追加されたフィールド

- `status: 'active'`: ユーザーのステータス（必須）
- `department: ''`: 部署名（オプション、デフォルト: 空文字列）
- `position: ''`: 役職（オプション、デフォルト: 空文字列）
- `createdBy: null`: 作成者のUID（admin側から作成した場合はnull）

#### 変更されたフィールド

- `createdAt`: `FieldValue.serverTimestamp()` → `Timestamp.now()`
- `updatedAt`: `FieldValue.serverTimestamp()` → `Timestamp.now()`
- `companyName`: `null` → `''`（空文字列）

---

### 3. ユーザー更新APIの作成

**新規ファイル:** `src/app/api/admin/users/[userId]/route.ts`

ユーザー情報を更新・取得するAPIエンドポイントを追加しました。

#### PUT `/api/admin/users/[userId]`

ユーザー情報を更新します。

**実装内容:**

- 認証トークンの検証
- リクエストボディから更新データを取得
- `updatedAt: Timestamp.now()`を自動設定（統一スキーマに準拠）
- ユーザードキュメントの存在確認
- ユーザー情報の更新

**更新可能なフィールド:**

- `role`: ユーザーの役割
- `status`: ユーザーのステータス
- `department`: 部署名
- `position`: 役職
- `subscriptionType`: サブスクリプションタイプ
- `displayName`: 表示名
- `companyName`: 会社名
- `updatedAt`: 自動設定（`Timestamp.now()`）

#### GET `/api/admin/users/[userId]`

特定のユーザー情報を取得します。

**実装内容:**

- 認証トークンの検証
- ユーザーIDによるドキュメント取得
- ユーザー情報の返却

---

## 後方互換性への対応

### Timestampの使用

- `FieldValue.serverTimestamp()`を`Timestamp.now()`に変更
- すべてのタイムスタンプフィールドで`Timestamp`オブジェクトを使用

### デフォルト値の設定

- `status`のデフォルト値: `'active'`
- `department`と`position`のデフォルト値: 空文字列`''`
- `createdBy`はadmin側から作成した場合は`null`

---

## 影響範囲

### 変更されたAPI

- `POST /api/admin/users`: ユーザー作成API
- `GET /api/admin/users`: ユーザー一覧取得API（変更なし、ただしレスポンスに新しいフィールドが含まれる可能性）

### 新規追加されたAPI

- `PUT /api/admin/users/[userId]`: ユーザー更新API
- `GET /api/admin/users/[userId]`: ユーザー取得API

### 影響を受けるコンポーネント

現在、フロントエンドコンポーネントへの変更はありませんが、将来的に以下のコンポーネントが新しいフィールドを使用する可能性があります：

- `src/components/UserRegistrationWithSidebar.tsx`: ユーザー登録フォーム（`department`と`position`フィールドの追加が可能）
- `src/components/UserList.tsx`: ユーザー一覧表示（新しいフィールドの表示が可能）

---

## テスト

### ビルドテスト

```bash
npm run build
```

✅ **結果**: ビルド成功（エラーなし）

### リンターテスト

✅ **結果**: リンターエラーなし

---

## マイグレーション

既存のユーザーデータについては、`upmo-demo`側のマイグレーションスクリプトで統一スキーマに移行されます。

新規ユーザーを作成する際は、統一スキーマに準拠したデータが自動的に保存されます。

---

## 参考資料

- `upmo-demo/src/types/user.ts`: 統一スキーマの型定義（参照用）
- `upmo-demo/src/app/api/admin/users/route.ts`: 実装例（利用者招待API）
- `upmo-demo/USER-SCHEMA-PROPOSAL.md`: 詳細な提案ドキュメント（参照用）

---

## 今後の対応

### 推奨事項

1. **フロントエンドコンポーネントの更新**
   - `UserRegistrationWithSidebar.tsx`に`department`と`position`フィールドを追加（オプション）
   - `UserList.tsx`で新しいフィールドを表示（オプション）

2. **バリデーションの強化**
   - クライアント側でもバリデーション関数を使用する

3. **ドキュメントの更新**
   - APIドキュメントに新しいエンドポイントを追加
   - フロントエンド開発者向けのガイドを更新

---

## 実装チェックリスト

### ✅ 完了項目

- [x] 型定義ファイル（`src/types/user.ts`）の作成
- [x] ユーザー作成APIの修正
  - [x] `status: 'active'`を追加
  - [x] `department: ''`を追加
  - [x] `position: ''`を追加
  - [x] `createdBy: null`を追加
  - [x] `FieldValue.serverTimestamp()`を`Timestamp.now()`に変更
  - [x] バリデーション関数を使用
- [x] ユーザー更新APIの作成
  - [x] `PUT /api/admin/users/[userId]`エンドポイント
  - [x] `GET /api/admin/users/[userId]`エンドポイント
  - [x] `updatedAt: Timestamp.now()`を使用
- [x] ビルドテスト
- [x] リンターテスト

### 📋 未完了項目（推奨）

- [ ] フロントエンドコンポーネントの更新（`department`と`position`フィールドの追加）
- [ ] APIドキュメントの更新
- [ ] エラーハンドリングの改善
- [ ] ユニットテストの追加

---

## 注意事項

1. **Timestampの使用**
   - Firestoreでは`Timestamp`オブジェクトを使用します
   - `new Date()`ではなく`Timestamp.now()`を使用してください

2. **デフォルト値**
   - `status`のデフォルト値は`'active'`
   - `department`と`position`のデフォルト値は空文字列`''`
   - `createdBy`はadmin側から作成した場合は`null`

3. **バリデーション**
   - ユーザー作成時は`validateUserData()`関数を使用してバリデーションを実行
   - バリデーションエラーの場合、Firebase Authのユーザーを削除してエラーを返す

4. **後方互換性**
   - 既存のコードが`lastUpdated`フィールドを参照している場合は、`updatedAt`に変更する必要があります
   - 既存のユーザーデータは、`upmo-demo`側のマイグレーションスクリプトで統一スキーマに移行されます

