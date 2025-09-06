import { NextResponse } from 'next/server';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  created_at: string;
}

// 模擬數據，實際應用中應從數據庫獲取
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'info',
    title: '系統維護通知',
    message: 'AI GPU 集群將於本週六 02:00-06:00 進行例行維護，期間服務將暫時中斷。',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'warning',
    title: 'RTX 4090 #3 效能警告',
    message: '檢測到 RTX 4090 #3 溫度偏高，建議避免長時間高負載作業。',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'error',
    title: 'A100 #2 故障報告',
    message: 'A100 #2 GPU 發生硬體故障，已安排技術人員進行檢修。',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET() {
  try {
    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 返回通知數據
    return NextResponse.json(mockNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, title, message } = body;

    // 創建新通知
    const newNotification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      created_at: new Date().toISOString(),
    };

    // 實際應用中應保存到數據庫
    mockNotifications.unshift(newNotification);

    return NextResponse.json(newNotification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
