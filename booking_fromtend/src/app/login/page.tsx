'use client';

import { useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">機器預約系統</h1>
          <p className="text-gray-600 mb-8">請登入以使用系統功能</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.447,1.722-1.498,3.478-3.076,4.623C13.713,19.764,12.177,20,11,20c-2.761,0-5-2.239-5-5s2.239-5,5-5c1.176,0,2.713,0.236,3.913,1.318c0.119,0.107,0.277,0.169,0.442,0.169h0.003c0.17,0,0.332-0.067,0.452-0.187l1.219-1.219c0.127-0.127,0.187-0.298,0.187-0.468c0-0.17-0.060-0.341-0.187-0.468C15.725,7.842,13.439,7,11,7c-4.418,0-8,3.582-8,8s3.582,8,8,8c4.418,0,8-3.582,8-8v-2.849c0-0.169-0.068-0.331-0.188-0.451l-0.451-0.451c0.127-0.127,0.298-0.187,0.468-0.187h4.847C13.4,11.062,12.545,11.917,12.545,12.151z"/>
          </svg>
          <span className="text-gray-700 font-medium">使用 Google 帳號登入</span>
        </button>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>登入即表示您同意我們的服務條款和隱私政策</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>載入中...</div>}>
      <LoginContent />
    </Suspense>
  );
} 