import { z } from 'zod';

// 環境變數驗證架構
const envSchema = z.object({
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL 必須是有效的URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET 必須至少32個字符'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID 是必需的'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET 是必需的'),
  NEXT_PUBLIC_API_BASE_URL: z.string().url('API_BASE_URL 必須是有效的URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// 驗證環境變數
export function validateEnv() {
  try {
    const env = envSchema.parse({
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
    });

    return { success: true, data: env };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { 
        success: false, 
        error: `環境變數驗證失敗:\n${missingVars.join('\n')}` 
      };
    }
    return { success: false, error: '未知的環境變數驗證錯誤' };
  }
}

// 開發模式下顯示警告
if (process.env.NODE_ENV === 'development') {
  const result = validateEnv();
  if (!result.success) {
    console.error('⚠️ 環境變數配置錯誤:', result.error);
  } else {
    console.log('✅ 環境變數驗證通過');
  }
}
