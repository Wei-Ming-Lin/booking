import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// export const runtime = 'edge';
// 強制動態渲染
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 檢查用戶是否登入
    if (!session?.user?.email) {
      return NextResponse.json({ error: '需要登入' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const machineId = searchParams.get('machineId');

    // 構建查詢參數
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (machineId) queryParams.append('machineId', machineId);

    // 調用後端 API 獲取分析數據
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    const response = await fetch(`${apiUrl}/admin/bookings/analytics?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Email': session.user.email,
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json({ error: '需要管理員權限' }, { status: 403 });
      }
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('獲取預約分析數據失敗:', error);
    return NextResponse.json({ error: '獲取預約分析數據失敗' }, { status: 500 });
  }
} 