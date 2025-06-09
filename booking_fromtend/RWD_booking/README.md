# 機器預約管理系統 (Machine Booking System)

一個基於 Next.js 和 Flask 的現代化機器預約管理系統，支援 Google OAuth 登入、即時刷新、台北時區顯示等功能。

## 🚀 功能特色

### 用戶功能
- **Google OAuth 登入** - 安全的身份驗證
- **機器預約** - 4小時時段預約，支援取消
- **即時更新** - 10分鐘自動刷新，避免衝突
- **台北時區** - 所有時間顯示統一為 Asia/Taipei
- **響應式設計** - 支援手機、平板、桌面
- **個人資料管理** - 查看預約記錄和個人資訊

### 管理員功能
- **機器管理** - 新增、編輯、停用機器
- **預約管理** - 查看所有預約、強制取消
- **使用者管理** - 管理用戶權限
- **限制規則** - 設定使用限制（年份、使用次數等）
- **系統通知** - 發布重要公告和維護通知
- **日曆檢視** - 以月曆形式查看所有預約

### 技術特色
- **衝突檢測** - 防止重複預約同一時段
- **軟刪除** - 支援預約取消而非直接刪除
- **性能優化** - 數據庫索引和查詢優化
- **審計日誌** - 系統操作記錄追蹤
- **自動清理** - 過期預約自動標記

## 🛠️ 技術架構

### 前端 (Frontend)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with shadcn/ui
- **State Management**: React hooks and context
- **Authentication**: NextAuth.js with Google Provider
- **Time Handling**: date-fns-tz for timezone management

### 後端 (Backend)
- **Framework**: Flask (Python)
- **Database**: PostgreSQL with native SQL queries
- **Authentication**: Google OAuth integration
- **Time Zone**: pytz for Asia/Taipei handling
- **API**: RESTful API design

### 數據庫 (Database)
- **Database**: PostgreSQL 12+
- **Schema**: Comprehensive table structure with constraints
- **Indexing**: Optimized for query performance
- **Triggers**: Automatic timestamp updates and conflict checks
- **Views**: Admin reporting and analytics

## 📁 專案結構

```
Booking/
├── src/                          # Next.js 前端源碼
│   ├── app/                      # App Router 頁面
│   ├── components/               # React 組件
│   ├── hooks/                    # 自定義 Hooks
│   ├── lib/                      # 工具函數和配置
│   ├── services/                 # API 服務
│   ├── store/                    # 狀態管理
│   └── types/                    # TypeScript 類型定義
├── database/                     # 數據庫相關檔案
│   ├── init.sql                  # 數據庫初始化腳本
│   ├── upgrade_database.sql      # 升級腳本
│   ├── cleanup_database.sql      # 清理腳本
│   └── DATABASE_SETUP.md         # 數據庫部署指南
├── docs/                         # 專案文檔
│   ├── MACHINE_MANAGEMENT_SYSTEM.md
│   ├── NOTIFICATION_SYSTEM.md
│   ├── ADMIN_CALENDAR_VIEW.md
│   └── ...
├── backend_optimized.py          # Flask 後端主程式
├── package.json                  # Node.js 依賴
└── README.md                     # 專案說明
```

## 🚀 快速開始

### 1. 環境準備

```bash
# 安裝 Node.js 依賴
npm install

# 安裝 Python 依賴
pip install flask flask-cors psycopg2-binary pytz
```

### 2. 數據庫設置

```bash
# 創建 PostgreSQL 數據庫
createdb booking_system

# 執行初始化腳本
psql -U postgres -d booking_system -f database/init.sql
```

詳細的數據庫設置請參考 [`database/DATABASE_SETUP.md`](database/DATABASE_SETUP.md)

### 3. 環境配置

創建 `.env.local` 檔案：

```env
# Google OAuth 配置
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# 後端 API 配置
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. 啟動服務

```bash
# 啟動前端 (Terminal 1)
npm run dev

# 啟動後端 (Terminal 2)
python backend_optimized.py
```

系統將在以下地址運行：
- 前端: http://localhost:3000
- 後端 API: http://localhost:5000

## 📖 功能說明

### 預約系統
- **時段制**: 每天分為 6 個 4 小時時段 (00:00-04:00, 04:00-08:00, ...)
- **即時更新**: 每 10 分鐘自動刷新避免衝突
- **狀態管理**: active(活躍), cancelled(已取消), completed(已完成), no_show(未出席)

### 限制規則
- **年份限制**: 限制特定入學年份的學生使用
- **使用次數限制**: 限制連續使用次數和冷卻期
- **郵箱格式限制**: 限制特定郵箱格式的用戶
- **時間限制**: 設定特定時間範圍的限制

### 通知系統
- **優先級**: 低、中、高三個等級
- **分類**: 一般、維修、緊急、公告
- **時間範圍**: 支援永久通知或指定時間範圍

## 🔧 維護指南

### 數據庫維護
```sql
-- 清理過期預約
SELECT cleanup_expired_bookings();

-- 清理舊日誌 (保留90天)
SELECT cleanup_old_logs(90);

-- 更新統計信息
ANALYZE;
```

### 系統監控
- 查看 `performance_summary` 視圖了解系統使用情況
- 檢查 `active_notifications` 視圖查看當前通知
- 使用 `machine_usage_stats` 分析機器使用率

## 📝 文檔

詳細文檔位於 `docs/` 目錄：

- [機器管理系統](docs/MACHINE_MANAGEMENT_SYSTEM.md)
- [通知系統](docs/NOTIFICATION_SYSTEM.md)
- [管理員日曆檢視](docs/ADMIN_CALENDAR_VIEW.md)
- [管理員功能](docs/ADMIN_MANAGEMENT_FEATURES.md)
- [數據庫設置指南](database/DATABASE_SETUP.md)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request 來改善這個專案。

## 📄 授權

本專案採用 MIT 授權條款。

## 📞 支援

如有問題請聯繫系統管理員或查看文檔目錄中的相關說明。 