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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/30 relative overflow-hidden">
      {/* 背景裝飾元素 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 網格背景 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 dark:opacity-5"></div>
        
        {/* 漂浮的幾何圖形 */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200/30 dark:bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-purple-200/30 dark:bg-purple-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-indigo-200/30 dark:bg-indigo-500/20 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 bg-cyan-200/30 dark:bg-cyan-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
        
        {/* 電路板線條 */}
        <svg className="absolute inset-0 w-full h-full opacity-5 dark:opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M10 10h80v80h-80z" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              <circle cx="20" cy="20" r="2" fill="currentColor"/>
              <circle cx="80" cy="20" r="2" fill="currentColor"/>
              <circle cx="20" cy="80" r="2" fill="currentColor"/>
              <circle cx="80" cy="80" r="2" fill="currentColor"/>
              <path d="M20 20h60M20 80h60M20 20v60M80 20v60" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)" className="text-blue-500 dark:text-blue-400"/>
        </svg>
      </div>

      {/* 主要內容 */}
      <div className="relative z-10 max-w-md w-full mx-4">
        {/* 玻璃效果卡片 */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 space-y-8">
          {/* 標題區域 */}
          <div className="text-center space-y-4">
            {/* GPU圖標 */}
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16v2H4zm0 5h16v6H4zm2 2h12v2H6z"/>
                <path d="M2 4h20v1H2zm0 15h20v1H2z"/>
              </svg>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent mb-2">
                資研所 GPU 預約
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                高效能運算資源預約平台
                <br />
                {/* <span className="text-xs text-gray-500 dark:text-gray-400">
                  專為北商大師生提供 GPU 運算服務
                </span> */}
              </p>
            </div>
          </div>

          {/* 登入按鈕 */}
          <button
            onClick={handleGoogleSignIn}
            className="group w-full flex items-center justify-center space-x-3 px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm hover:shadow-md dark:hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 transform hover:scale-[1.02]"
          >
            {/* Google圖標 */}
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            
            <span className="text-gray-700 dark:text-gray-200 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
              使用北商大 Google 帳號登入
            </span>
            
            {/* 箭頭圖標 */}
            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 功能特色 */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">高效能GPU</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-8 h-8 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">AI運算</p>
            </div>
          </div>

          {/* 底部說明 */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {/* 學校帳號說明 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
              <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">
                📚 專為資研所設計
              </p>
              <p className="text-blue-700 dark:text-blue-400 text-xs">
                請使用 @ntub.edu.tw 學校信箱登入
              </p>
            </div>
            
            {/* 隱私說明 */}
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-400 font-medium">🔒 隱私保護說明</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>本系統僅會取得並使用：</p>
                <div className="flex items-center justify-center space-x-4 text-xs">
                  <span className="flex items-center space-x-1">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span>頭像</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span>姓名</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span>電子郵件</span>
                  </span>
                </div>
                <p className="mt-2 text-gray-400 dark:text-gray-500">
                  不會存取其他個人資料或權限
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部狀態指示器 */}
        <div className="mt-8 flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">系統運行正常</span>
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