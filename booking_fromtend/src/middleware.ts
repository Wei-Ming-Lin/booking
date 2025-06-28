import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // 攔截直接訪問 next-auth 登入 API 的請求，重定向到自定義登入頁面
    if (req.nextUrl.pathname === '/api/auth/signin') {
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/';
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', callbackUrl);
      return NextResponse.redirect(loginUrl);
    }

    // 如果用戶已登入但訪問登入頁，重定向到首頁
    if (req.nextUrl.pathname === '/login' && req.nextauth.token) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // 允許訪問 next-auth API 路由（除了 signin）
        if (req.nextUrl.pathname.startsWith('/api/auth/') && req.nextUrl.pathname !== '/api/auth/signin') {
          return true;
        }
        
        // 登入頁面不需要驗證
        if (req.nextUrl.pathname === '/login') {
          return true;
        }
        // 其他頁面需要驗證
        return !!token;
      },
    },
    pages: {
      signIn: '/login', // 確保未登入用戶重定向到我們的自定義登入頁面
    },
  }
);

// 配置需要保護的路由
export const config = {
  matcher: [
    // 攔截 /api/auth/signin
    '/api/auth/signin',
    // 保護所有其他頁面（除了 API 路由、靜態檔案）
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 