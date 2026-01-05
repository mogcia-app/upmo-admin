import { Timestamp } from 'firebase-admin/firestore';

/**
 * ユーザーの役割
 */
export type UserRole = 'admin' | 'manager' | 'user';

/**
 * ユーザーのステータス
 */
export type UserStatus = 'active' | 'inactive' | 'suspended';

/**
 * 統一スキーマに準拠したユーザーデータ型
 */
export interface User {
  // 必須フィールド
  email: string;
  displayName: string;
  companyName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Timestamp;

  // 推奨フィールド
  createdBy?: string | null;
  updatedAt?: Timestamp;
  department?: string;
  position?: string;

  // オプションフィールド
  photoURL?: string;
  subscriptionType?: string | null;
  lastLoginAt?: Timestamp;
}

/**
 * デフォルト値
 */
export const DEFAULT_USER_VALUES: Partial<User> = {
  role: 'user',
  status: 'active',
  department: '',
  position: '',
  createdBy: null,
};

/**
 * ユーザーデータのバリデーション結果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * ユーザーデータをバリデーション
 */
export function validateUserData(data: Partial<User>): ValidationResult {
  const errors: string[] = [];

  // 必須フィールドのチェック
  if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
    errors.push('emailは有効なメールアドレスである必要があります');
  }

  if (!data.displayName || typeof data.displayName !== 'string' || data.displayName.trim().length === 0) {
    errors.push('displayNameは必須です');
  }

  if (!data.companyName || typeof data.companyName !== 'string' || data.companyName.trim().length === 0) {
    errors.push('companyNameは必須です');
  }

  if (!data.role || !['admin', 'manager', 'user'].includes(data.role)) {
    errors.push('roleは"admin", "manager", "user"のいずれかである必要があります');
  }

  if (!data.status || !['active', 'inactive', 'suspended'].includes(data.status)) {
    errors.push('statusは"active", "inactive", "suspended"のいずれかである必要があります');
  }

  if (!data.createdAt || !(data.createdAt instanceof Timestamp)) {
    errors.push('createdAtはTimestampである必要があります');
  }

  // オプションフィールドの型チェック
  if (data.department !== undefined && typeof data.department !== 'string') {
    errors.push('departmentは文字列である必要があります');
  }

  if (data.position !== undefined && typeof data.position !== 'string') {
    errors.push('positionは文字列である必要があります');
  }

  if (data.createdBy !== undefined && data.createdBy !== null && typeof data.createdBy !== 'string') {
    errors.push('createdByは文字列またはnullである必要があります');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ユーザーデータを正規化（既存データのマイグレーション用）
 */
export function normalizeUserData(data: any): Partial<User> {
  const normalized: Partial<User> = {
    ...data,
  };

  // デフォルト値の適用
  if (!normalized.role) {
    normalized.role = DEFAULT_USER_VALUES.role as UserRole;
  }

  if (!normalized.status) {
    normalized.status = DEFAULT_USER_VALUES.status as UserStatus;
  }

  if (normalized.department === undefined) {
    normalized.department = DEFAULT_USER_VALUES.department as string;
  }

  if (normalized.position === undefined) {
    normalized.position = DEFAULT_USER_VALUES.position as string;
  }

  if (normalized.createdBy === undefined) {
    normalized.createdBy = DEFAULT_USER_VALUES.createdBy;
  }

  // lastUpdatedをupdatedAtに変換（後方互換性）
  if (data.lastUpdated && !normalized.updatedAt) {
    if (data.lastUpdated instanceof Timestamp) {
      normalized.updatedAt = data.lastUpdated;
    } else if (data.lastUpdated instanceof Date) {
      normalized.updatedAt = Timestamp.fromDate(data.lastUpdated);
    }
  }

  return normalized;
}

