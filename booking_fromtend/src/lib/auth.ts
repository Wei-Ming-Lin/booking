import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { API_ENDPOINTS } from '@/config/api';

// 3個月的秒數
const THREE_MONTHS = 60 * 60 * 24 * 90;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: THREE_MONTHS, // 3個月
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login', // 錯誤也轉到登入頁
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          // 創建或獲取用戶
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/users/me`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: user.name,
              email: user.email,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create/get user');
          }

          const userData = await response.json();
          user.id = userData.id;

          return true;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // 如果是首次登入，user 物件會包含初始資訊
      if (user) {
        token.id = user.id;
        token.email = user.email || '';
        token.name = user.name || '';
        token.image = user.image;
      }
      
      // 如果是更新 session
      if (trigger === 'update' && session?.user) {
        token.id = session.user.id;
        token.email = session.user.email || '';
        token.name = session.user.name || '';
        token.image = session.user.image;
      }
      
      return token;
    },
    async session({ session, token }) {
      // 確保 session.user 包含所有需要的資訊
      session.user = {
        id: token.id as string,
        email: token.email as string,
        name: token.name as string,
        image: token.image as string | undefined,
      };
      
      return session;
    },
  },
}; 