import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

// export const runtime = "edge"; // ✅ 告訴 Next.js 這是 Edge API

export async function GET(req: NextRequest) {
  const token = await getToken({ req });

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ✅ 這裡可以取得使用者資訊，例如 email、name、sub（user id）
  const userEmail = token.email;

  // 🔁 你可以在這裡處理 booking 的分析邏輯，例如查資料庫等（如果有支援 edge）
  const fakeAnalytics = {
    user: userEmail,
    bookings: Math.floor(Math.random() * 10),
  };

  return new Response(JSON.stringify(fakeAnalytics), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
