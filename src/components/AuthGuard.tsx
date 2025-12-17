'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isEmailAllowed } from '@/lib/allowed-emails';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // メールアドレスが許可されているかチェック
        if (isEmailAllowed(user.email)) {
          setAuthenticated(true);
          setError(null);
        } else {
          // 許可されていないメールアドレスの場合
          setAuthenticated(false);
          setError('このメールアドレスはログインを許可されていません');
          // ログアウトしてログインページにリダイレクト
          auth.signOut().then(() => {
            router.push('/login');
          });
        }
      } else {
        setAuthenticated(false);
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            ログインページに戻る
          </button>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null; // リダイレクト中
  }

  return <>{children}</>;
}
