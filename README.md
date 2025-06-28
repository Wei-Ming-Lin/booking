# 機器預約管理系統 (Machine Booking System)

一個基於 Next.js 和 Flask 的現代化機器預約管理系統，支援 Google OAuth 登入、即時刷新、台北時區顯示等功能。

## 🚀 功能特色

### 用戶功能
- **Google OAuth 登入** - 安全的身份驗證
- **機器預約** - 4小時時段預約，支援取消
- **即時更新** - 自動刷新，避免衝突
- **台北時區** - 所有時間顯示統一為 Asia/Taipei
- **響應式設計** - 支援手機、平板、桌面
- **個人資料管理** - 查看預約記錄和個人資訊

### 管理員功能
- **機器管理** - 新增、編輯、停用機器
- **預約管理** - 查看所有預約、強制取消
- **使用者管理** - 管理用戶權限
- **限制規則** - 設定使用限制（年份、使用次數等）
- **系統通知** - 發布重要公告和維護通知
- **日曆檢視** - 以月曆形式查看所有預約，支援機器篩選
- **隱私保護** - 預約者姓名匿名化顯示（如「張O由」）

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
- **UI Components**: Custom components with Headless UI
- **State Management**: Zustand
- **Authentication**: NextAuth.js with Google Provider
- **Time Handling**: date-fns, date-fns-tz for timezone management
- **Icons**: Heroicons, Lucide React

### 後端 (Backend)
- **Framework**: Flask (Python)
- **Database**: PostgreSQL with native SQL queries
- **Authentication**: Google OAuth integration
- **Time Zone**: pytz for Asia/Taipei handling
- **API**: RESTful API design
- **CORS**: Flask-CORS for cross-origin requests

### 部署 (Deployment)
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15 (Docker container)
- **Frontend Deployment**: Docker container
- **Backend Deployment**: Docker container
- **架構**: 微服務架構，前後端分離

## 📁 專案結構

```
booking/
├── booking_fromtend/             # Next.js 前端專案
│   ├── src/                      # 前端源碼
│   │   ├── app/                  # App Router 頁面
│   │   │   ├── admin/            # 管理員頁面
│   │   │   ├── api/              # API 路由
│   │   │   ├── bookings/         # 預約日曆頁面
│   │   │   ├── login/            # 登入頁面
│   │   │   ├── machine/          # 機器相關頁面
│   │   │   └── profile/          # 用戶資料頁面
│   │   ├── components/           # React 組件
│   │   ├── hooks/                # 自定義 Hooks
│   │   ├── lib/                  # 工具函數和配置
│   │   ├── services/             # API 服務
│   │   ├── store/                # 狀態管理 (Zustand)
│   │   └── types/                # TypeScript 類型定義
│   ├── public/                   # 靜態資源
│   ├── package.json              # Node.js 依賴
│   ├── tsconfig.json             # TypeScript 配置
│   ├── tailwind.config.js        # Tailwind CSS 配置
│   ├── Dockerfile                # 前端 Docker 配置
│   ├── docker-compose.yml        # 前端 Docker Compose 配置
│   └── env.example               # 環境變數範例
├── booking_backend/              # Flask 後端專案
│   ├── app.py                    # Flask 主程式
│   ├── init.sql                  # 數據庫初始化腳本
│   ├── requirements.txt          # Python 依賴
│   ├── Dockerfile                # 後端 Docker 配置
│   ├── docker-compose.yml        # 完整系統 Docker Compose 配置
│   ├── .env_example              # 環境變數範例
│   └── pgdata/                   # PostgreSQL 數據目錄
└── README.md                     # 專案說明 (本文件)
```

## 🚀 快速開始

### 1. 環境準備

確保已安裝以下軟體：
- Docker 20.0+
- Docker Compose 2.0+
- Git

#### 克隆專案
```bash
git clone <repository-url>
cd booking
```

### 2. 環境配置

#### 後端環境變數設置
```bash
cd booking_backend
# 複製環境變數範例檔案
cp .env_example .env

# 編輯 .env 檔案，設置資料庫密碼等
nano .env
```

#### 前端環境變數設置  
```bash
cd booking_fromtend
# 複製環境變數範例檔案
cp env.example .env

# 編輯 .env 檔案，設置 Google OAuth 等
nano .env
```

### 3. 環境變數詳細配置

#### 前端配置 (`booking_fromtend/.env`)
```env
# Next.js 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Google OAuth 配置
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# API 配置
API_URL=http://localhost:5000
```

#### 後端配置 (`booking_backend/.env`)
```env
# PostgreSQL 容器資訊
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=booking_system

# Flask 應用資料庫連接
DB_NAME=booking_system
DB_USER=postgres
DB_PASSWORD=your_strong_password
DB_HOST=db  # Docker Compose 服務名稱
DB_PORT=5432
```

### 4. 部署服務

#### 方式一：完整 Docker Compose 部署 (推薦)
```bash
# 啟動後端服務 (包含資料庫)
cd booking_backend
docker-compose up -d

# 啟動前端服務
cd ../booking_fromtend
docker-compose up -d
```

#### 方式二：混合部署 (開發模式)
```bash
# 僅啟動後端和資料庫
cd booking_backend
docker-compose up -d

# 前端使用開發模式
cd ../booking_fromtend
npm install
npm run dev
```

#### 查看服務狀態
```bash
# 查看後端服務
cd booking_backend
docker-compose ps

# 查看前端服務
cd ../booking_fromtend
docker-compose ps
```

系統將在以下地址運行：
- 🌐 前端應用: http://localhost:3000
- 🔧 後端 API: http://localhost:5000
- 🗄️ PostgreSQL: localhost:5432

## 📖 功能說明

### 預約系統
- **時段制**: 每天分為 6 個 4 小時時段 (00:00-04:00, 04:00-08:00, ...)
- **即時更新**: 自動刷新避免衝突
- **狀態管理**: active(活躍), cancelled(已取消), completed(已完成), no_show(未出席)
- **雙重API**: 預約介面（隱私保護）和日曆檢視（匿名化顯示）

### API 端點
- `GET /machines` - 取得機器清單
- `GET /bookings/machine/{id}` - 取得機器預約（僅時段資訊）
- `GET /bookings/calendar-view` - 取得日曆檢視預約（含匿名化姓名）
- `POST /bookings` - 建立預約
- `DELETE /bookings/{id}` - 取消預約

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
- 查看系統統計: 使用 `get_system_stats()` 函數
- 檢查活躍通知: 查詢 `active_notifications` 視圖
- 分析機器使用率: 查詢 `machine_usage_stats` 視圖

## 🐳 Docker 部署詳細說明

### 後端系統 (API + Database)
```bash
cd booking_backend
# 建構並啟動所有後端服務
docker-compose up -d

# 查看服務日誌
docker-compose logs -f

# 停止服務
docker-compose down
```

### 前端系統 (Next.js Application)
```bash
cd booking_fromtend
# 建構並啟動前端服務
docker-compose up -d

# 查看建構日誌
docker-compose logs -f app

# 重新建構映像
docker-compose build --no-cache
```

### 資料庫管理
```bash
# 進入 PostgreSQL 容器
cd booking_backend
docker-compose exec db psql -U postgres -d booking_system

# 備份資料庫
docker-compose exec db pg_dump -U postgres booking_system > backup.sql

# 還原資料庫
docker-compose exec -T db psql -U postgres booking_system < backup.sql
```

### 容器資源監控
```bash
# 查看容器狀態
docker ps
docker stats

# 查看容器詳細資訊
docker-compose ps
docker-compose top
```

## 🔐 權限管理

### 用戶角色
- **user**: 一般用戶，可預約機器
- **manager**: 管理員，可管理機器和預約
- **admin**: 超級管理員，擁有所有權限

### Google OAuth 設置
1. 在 [Google Cloud Console](https://console.cloud.google.com/) 創建專案
2. 啟用 Google+ API
3. 創建 OAuth 2.0 客戶端 ID
4. 設置授權重定向 URI: `http://localhost:3000/api/auth/callback/google`

## 🤝 開發指南

### 技術要求
- Docker 20.0+
- Docker Compose 2.0+
- Node.js 18+ (可選，用於本地開發)
- Python 3.8+ (可選，用於本地開發)
- PostgreSQL 12+ (透過 Docker 運行)

### Docker 開發工作流程
```bash
# 開發模式：即時重載
cd booking_backend
docker-compose up  # 不使用 -d 以查看即時日誌

# 修改程式碼後重新啟動特定服務
docker-compose restart backend

# 清理未使用的映像和容器
docker system prune -f
```

### 代碼風格
- 前端: TypeScript + ESLint + Prettier
- 後端: Python PEP 8
- 容器: Multi-stage builds for optimization

### 提交規範
- feat: 新功能
- fix: 錯誤修復
- docs: 文檔更新
- style: 代碼格式化
- refactor: 代碼重構
- docker: 容器相關變更

## 📄 授權

本專案採用 MIT 授權條款。

## 🔧 疑難排解

### Docker 常見問題

#### 容器無法啟動
```bash
# 檢查容器日誌
docker-compose logs [service_name]

# 檢查端口衝突
netstat -tulpn | grep :5000
netstat -tulpn | grep :3000
```

#### 資料庫連接問題
```bash
# 確認資料庫容器正在運行
docker-compose ps db

# 手動測試資料庫連接
docker-compose exec backend python -c "import psycopg2; print('DB OK')"
```

#### 前端建構失敗
```bash
# 清除 Node.js 緩存
cd booking_fromtend
docker-compose down
docker-compose build --no-cache
```

#### 權限問題
```bash
# 修復 pgdata 目錄權限
sudo chown -R 999:999 booking_backend/pgdata
```

### 效能調優
```bash
# 限制容器記憶體使用
# 在 docker-compose.yml 中添加：
# mem_limit: 512m
# mem_reservation: 256m
```

## 📞 支援

如有問題請：
1. 查看上方疑難排解部分
2. 檢查 Docker 和 Docker Compose 版本
3. 查看 Issues 中的常見問題
4. 創建新的 Issue 並附上相關日誌
5. 聯繫系統管理員

---

**系統版本**: v2.1  
**部署方式**: Docker Compose  
**最後更新**: 2024年12月  
**架構**: 微服務容器化部署 