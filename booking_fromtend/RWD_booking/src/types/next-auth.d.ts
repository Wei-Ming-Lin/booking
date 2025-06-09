import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
  }

  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  }
} 