import { auth } from './firebase';

/**
 * Firebase認証トークンを取得する
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * 認証済みユーザーがいるかチェック
 */
export function getCurrentUser() {
  return auth.currentUser;
}


