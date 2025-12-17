'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isEmailAllowed } from '@/lib/allowed-emails';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // メールアドレスが許可されているかチェック
        if (isEmailAllowed(user.email)) {
          router.push('/admin/users');
        } else {
          // 許可されていない場合はログアウトしてログインページへ
          auth.signOut().then(() => {
            router.push('/login');
          });
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-lg text-gray-600">リダイレクト中...</div>
    </div>
  );
}
