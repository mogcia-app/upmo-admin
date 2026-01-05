/**
 * ログインを許可するメールアドレスのリスト
 * 環境変数から取得、なければデフォルト値を使用
 */
export function getAllowedEmails(): string[] {
  const envEmails = process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
  
  if (envEmails) {
    // カンマ区切りの文字列を配列に変換
    return envEmails.split(',').map(email => email.trim()).filter(Boolean);
  }
  
  // デフォルト値（環境変数が設定されていない場合）
  // 実際のメールアドレスに置き換えてください
  return [];
}

/**
 * メールアドレスが許可されているかチェック
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const allowedEmails = getAllowedEmails();
  
  // 許可リストが空の場合は全員許可（開発環境など）
  if (allowedEmails.length === 0) {
    return true;
  }
  
  return allowedEmails.includes(email.toLowerCase());
}





