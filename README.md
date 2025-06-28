

> **Machine Booking System v2.0**  
> 基於 Next.js 14 和 Flask 的現代化設備預約平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black)](https://nextjs.org/)
[![Flask](https://img.shields.io/badge/Flask-Latest-blue)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docs.docker.com/compose/)

## 🚀 核心功能

### 👤 用戶端功能
- **🔐 Google OAuth 認證** - 整合 NextAuth.js，安全便捷登入
- **📅 智能預約系統** - 4小時時段制，即時衝突檢測
- **⏰ 台北時區支援** - 完整的 `Asia/Taipei` 時區處理
- **📱 響應式設計** - 支援手機、平板、桌面等多種設備
- **👤 個人資料管理** - 查看預約記錄、使用統計、個人設定
- **🔔 即時通知** - 系統公告、維護通知、預約提醒

### 🛠️ 管理員功能
- **🏭 機器管理** - 新增、編輯、停用設備，支援狀態管理
- **📊 預約管理** - 全域預約查看、強制取消、使用分析
- **👥 用戶管理** - 角色權限控制（user/manager/admin）
- **🔒 限制規則引擎** - 年級限制、使用頻率控制、冷卻期設定
- **📢 通知系統** - 多級別公告發布（低/中/高優先級）
- **📅 日曆總覽** - 月曆檢視，支援機器篩選和匿名化顯示
- **🔍 審計日誌** - 完整的操作記錄和數據變更追蹤

### 🔒 隱私與安全
- **🎭 匿名化顯示** - 預約者姓名格式化為「張O由」形式
- **🛡️ 雙重API架構** - 預約界面與管理界面資料分離
- **🔐 權限分級** - 基於角色的存取控制（RBAC）
- **📝 操作審計** - 所有關鍵操作記錄至系統日誌

### ⚡ 技術特色
- **🚀 高性能** - 資料庫索引優化、查詢性能調校
- **🔄 即時同步** - 預約狀態即時更新，避免衝突
- **🗄️ 資料完整性** - PostgreSQL 觸發器確保資料一致性
- **🧼 自動清理** - 過期資料自動歸檔，系統效能最佳化
- **📈 監控統計** - 內建系統統計視圖和分析函數

## 🛠️ 技術架構

### 🎨 前端技術棧
```yaml
Framework: Next.js 14.1.0 (App Router)
Language: TypeScript 5.3.3
Styling: Tailwind CSS 3.4.1 + 自定義主題
UI Components: 
  - Headless UI (@headlessui/react)
  - Heroicons (@heroicons/react)
  - Lucide React (icons)
State Management: Zustand 5.0.5
Authentication: NextAuth.js 4.24.5
Time Handling: 
  - date-fns 4.1.0
  - date-fns-tz 3.2.0
Validation: Zod 3.25.36
HTTP Client: Fetch API (原生)
Development: ESLint + TypeScript
```

### ⚙️ 後端技術棧
```yaml
Framework: Flask (Python 3.11)
Database: PostgreSQL 15
ORM: 原生 SQL 查詢 (psycopg2-binary)
Authentication: Google OAuth 2.0
Time Zone: pytz (Asia/Taipei)
API Design: RESTful API
CORS: Flask-CORS
Security: SQL 注入防護、CSRF 保護
```

### 🗄️ 資料庫設計
```yaml
Tables: 7 核心資料表
Views: 3 管理視圖
Functions: 5 自定義函數  
Triggers: 8 自動化觸發器
Indexes: 20+ 性能優化索引
Features:
  - 自動時間戳更新
  - 預約衝突檢測
  - 資料變更審計
  - 自動清理機制
```

### 🐳 容器化部署
```yaml
Orchestration: Docker Compose
Services:
  - Frontend: Next.js (Port 3000)
  - Backend: Flask (Port 5000)  
  - Database: PostgreSQL 15 (Port 5432)
Networks: 自定義網路隔離
Volumes: 
  - 資料庫持久化儲存
  - 應用程式代碼掛載
```

## 📁 專案結構

```bash
📦 booking/
├── 🎨 booking_fromtend/                    # Next.js 14 前端應用
│   ├── 📂 src/                             # 應用程式源碼
│   │   ├── 📄 app/                         # App Router 架構
│   │   │   ├── 🔐 admin/                   # 管理員控制台
│   │   │   │   └── page.tsx                # 管理儀表板
│   │   │   ├── 🌐 api/                     # Next.js API 路由
│   │   │   │   ├── analytics/              # 分析 API
│   │   │   │   ├── auth/[...nextauth]/     # NextAuth.js 認證
│   │   │   │   └── bookings/               # 預約相關 API
│   │   │   ├── 📅 bookings/                # 預約日曆頁面
│   │   │   │   └── page.tsx                # 日曆檢視組件
│   │   │   ├── 🔑 login/                   # 使用者登入
│   │   │   ├── 🏭 machine/[id]/            # 動態機器頁面
│   │   │   │   ├── page.tsx                # 機器詳情與預約
│   │   │   │   └── calendar.css            # 日曆樣式
│   │   │   ├── 👤 profile/                 # 用戶個人資料
│   │   │   ├── layout.tsx                  # 根佈局組件
│   │   │   ├── page.tsx                    # 首頁組件
│   │   │   └── globals.css                 # 全域樣式
│   │   ├── 🧩 components/                  # React 可重用組件
│   │   │   ├── BookingConfirmation.tsx     # 預約確認對話框
│   │   │   ├── CancelBookingConfirmation.tsx # 取消預約確認
│   │   │   ├── MachineCard.tsx             # 機器卡片組件
│   │   │   ├── Navbar.tsx                  # 導航列組件
│   │   │   ├── TimeSlotSelector.tsx        # 時段選擇器
│   │   │   ├── SystemNotifications.tsx     # 系統通知組件
│   │   │   └── ...                         # 其他UI組件
│   │   ├── 🪝 hooks/                       # 自定義 React Hooks
│   │   │   └── useNotifications.ts         # 通知系統Hook
│   │   ├── 📚 lib/                         # 工具函數庫
│   │   │   ├── auth.ts                     # 認證相關工具
│   │   │   ├── timezone.ts                 # 時區處理工具
│   │   │   ├── userRestrictions.ts         # 用戶限制邏輯
│   │   │   └── utils.ts                    # 通用工具函數
│   │   ├── 🌐 services/                    # API 服務層
│   │   │   └── api.ts                      # API 客戶端封裝
│   │   ├── 🗄️ store/                       # Zustand 狀態管理
│   │   │   ├── machineStore.ts             # 機器狀態管理
│   │   │   └── userStore.ts                # 用戶狀態管理
│   │   └── 📝 types/                       # TypeScript 類型定義
│   │       ├── index.ts                    # 主要類型定義
│   │       └── next-auth.d.ts              # NextAuth 類型擴展
│   ├── 📁 public/                          # 靜態資源
│   │   ├── favicon.ico                     # 網站圖標
│   │   └── site.webmanifest                # PWA 配置
│   ├── 📋 package.json                     # Node.js 專案配置
│   ├── 📋 tsconfig.json                    # TypeScript 編譯配置
│   ├── 🎨 tailwind.config.js               # Tailwind CSS 自定義配置
│   ├── 🐳 Dockerfile                       # 前端容器化配置
│   ├── 🐳 docker-compose.yml               # 前端服務編排
│   ├── ⚙️ next.config.js                   # Next.js 應用配置
│   └── 🔐 env.example                      # 環境變數範本
├── 🚀 booking_backend/                     # Flask 後端 API
│   ├── 📄 app.py                           # Flask 應用主程式 (4357 行)
│   ├── 🗄️ init.sql                         # PostgreSQL 初始化腳本 (584 行)
│   │                                       # 包含：資料表、觸發器、索引、視圖、函數
│   ├── 📋 requirements.txt                 # Python 依賴清單
│   │                                       # flask, flask-cors, psycopg2-binary, pytz
│   ├── 🐳 Dockerfile                       # 後端容器化配置
│   ├── 🐳 docker-compose.yml               # 完整系統編排（含資料庫）
│   ├── 🔐 .env_example                     # 後端環境變數範本
│   └── 📁 pgdata/                          # PostgreSQL 資料持久化目錄
├── 📖 README.md                            # 專案文檔（本檔案）
└── 🔒 .gitignore                           # Git 忽略規則配置
```

## 💻 系統需求

### 🐳 Docker 部署（推薦）
```yaml
系統需求:
  - Docker Engine: 20.10.0+
  - Docker Compose: 2.0.0+
  - 系統記憶體: 4GB+
  - 可用磁碟: 10GB+
  - 作業系統: Linux/macOS/Windows

性能建議:
  - CPU: 2核心以上
  - RAM: 8GB+ (推薦)
  - 磁碟: SSD (提升資料庫性能)
  - 網路: 穩定的網際網路連線
```

### 🛠️ 本地開發（可選）
```yaml
前端開發:
  - Node.js: 18.0+ (推薦 18.19.0)
  - npm: 9.0+ 或 yarn: 1.22+
  - TypeScript: 5.3+

後端開發:
  - Python: 3.11+ 
  - pip: 23.0+
  - PostgreSQL: 15+ (推薦)

開發工具:
  - VS Code + 相關插件
  - Git: 2.34+
  - Chrome/Firefox (開發者工具)
```

### 🔧 第三方服務
```yaml
必要服務:
  - Google OAuth 2.0 (認證)
    - Client ID & Secret
    - 授權回調 URL 設定

可選服務:
  - 監控系統 (Prometheus/Grafana)
  - 日誌收集 (ELK Stack)
  - 備份服務 (定期資料庫備份)
```

## 🚀 快速開始

### 1. 📥 專案下載

```bash
# 克隆儲存庫
git clone <repository-url>
cd booking

# 檢查專案結構
ls -la
```

### 2. 🔧 環境配置

#### 🔐 後端環境變數
```bash
cd booking_backend

# 複製環境變數範本
cp .env_example .env

# 編輯環境變數（必須設定）
nano .env
```

#### 🎨 前端環境變數
```bash
cd booking_fromtend

# 複製環境變數範本
cp env.example .env.local

# 編輯環境變數（必須設定）
nano .env.local
```

> ⚠️ **重要提醒**：請務必設定所有必要的環境變數，特別是資料庫密碼和 Google OAuth 金鑰

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

### 4. 🚀 服務部署

#### 🎯 方式一：完整容器化部署（推薦）
```bash
# 🚀 啟動後端服務（包含資料庫）
cd booking_backend
docker-compose up -d

# 📱 啟動前端服務
cd ../booking_fromtend  
docker-compose up -d

# 🔍 檢查服務狀態
docker-compose ps
```

#### 🛠️ 方式二：混合部署（開發模式）
```bash
# 🗄️ 僅啟動後端和資料庫
cd booking_backend
docker-compose up -d

# 💻 前端開發模式
cd ../booking_fromtend
npm install
npm run dev
```

#### 📊 服務監控
```bash
# 查看所有容器狀態
docker ps

# 查看服務日誌
cd booking_backend && docker-compose logs -f
cd booking_fromtend && docker-compose logs -f

# 資源使用監控
docker stats
```

### 5. 🌐 訪問系統

部署完成後，系統將在以下地址運行：

| 服務 | URL | 描述 |
|------|-----|------|
| 🎨 **前端應用** | http://localhost:3000 | 用戶界面 |
| 🔧 **後端 API** | http://localhost:5000 | RESTful API |
| 🗄️ **資料庫** | localhost:5432 | PostgreSQL |

> 🎉 **首次訪問**：請先到 http://localhost:3000/login 進行 Google OAuth 登入

## 📖 系統功能詳述

### 🎯 預約管理系統
```yaml
時段分割:
  - 模式: 4小時時段制
  - 分割: 6個時段/天 (00:00-04:00, 04:00-08:00, 08:00-12:00, 12:00-16:00, 16:00-20:00, 20:00-24:00)
  - 預約單位: 1個時段/次
  - 取消政策: 隨時可取消

預約狀態:
  - active: 有效預約
  - cancelled: 用戶取消
  - completed: 已完成使用
  - no_show: 未出席使用

衝突處理:
  - 即時衝突檢測
  - 自動防重複預約
  - 資料庫層級約束
```

### 🛡️ 雙重API架構
```yaml
預約API (/bookings/machine/{id}):
  用途: 用戶預約界面
  資料: 僅時段可用性
  隱私: 完全隱藏用戶身份
  回傳: user_display_name = ""

日曆API (/bookings/calendar-view): 
  用途: 管理日曆檢視
  資料: 匿名化用戶姓名
  隱私: 格式化為「張O由」
  回傳: user_email = "hidden"
```

### 📊 API 端點總覽
| 端點 | 方法 | 功能 | 認證 |
|------|------|------|------|
| `/machines` | GET | 機器清單 | ✅ |
| `/users/profile` | GET | 用戶資料 | ✅ |
| `/bookings/machine/{id}` | GET | 機器預約狀況 | ✅ |
| `/bookings/calendar-view` | GET | 日曆檢視 | ✅ |
| `/bookings` | POST | 建立預約 | ✅ |
| `/bookings/{id}` | DELETE | 取消預約 | ✅ |
| `/notifications` | GET | 系統通知 | ✅ |
| `/analytics/*` | GET | 使用分析 | 🔐 Admin |

### 🔒 限制規則引擎
```yaml
年份限制 (year_limit):
  規則: "允許年份清單"
  範例: "112,113,114" (民國年)
  
使用頻率 (usage_limit):
  規則: "次數,冷卻時數"  
  範例: "2,24" (24小時內最多2次)

郵箱限制 (email_pattern):
  規則: 正規表達式
  範例: "@ntub\.edu\.tw$" (僅限學校信箱)

時間限制 (time_limit):
  規則: 特定時間範圍
  範例: 週末限制、考試期間限制
```

### 📢 通知系統
```yaml
優先級分類:
  - 低: 一般公告
  - 中: 重要通知  
  - 高: 緊急訊息

通知分類:
  - general: 一般公告
  - maintenance: 維修通知
  - emergency: 緊急狀況
  - announcement: 官方公告

時間控制:
  - 立即生效
  - 定時發布
  - 自動過期
```

## 🔧 系統維護指南

### 🗄️ 資料庫維護
```sql
-- ⏰ 清理過期預約（自動標記狀態）
SELECT cleanup_expired_bookings();

-- 🧹 清理舊系統日誌（預設保留90天）
SELECT cleanup_old_logs(90);

-- 📊 更新資料庫統計資訊（提升查詢效能）
ANALYZE;

-- 🔍 檢查資料庫健康狀況
SELECT * FROM get_system_stats();

-- 📈 查看機器使用統計
SELECT * FROM machine_usage_stats;

-- 📢 檢查活躍通知
SELECT * FROM active_notifications;
```

### 📊 系統監控
```bash
# 🐳 Docker 容器監控
docker stats

# 📝 查看應用日誌
docker-compose logs -f --tail=100

# 🗄️ 資料庫連線檢查  
docker-compose exec db psql -U postgres -d booking_system -c "SELECT version();"

# 💾 檢查磁碟使用量
df -h

# 🔍 檢查系統資源
htop
```

### 🛠️ 故障排除
```yaml
常見問題:
  1. 容器無法啟動:
     - 檢查: docker-compose ps
     - 解決: docker-compose down && docker-compose up -d
     
  2. 資料庫連線失敗:
     - 檢查: 環境變數設定
     - 解決: 確認 .env 檔案正確性
     
  3. OAuth 認證失敗:
     - 檢查: Google Console 設定
     - 解決: 確認回調 URL 正確
     
  4. 前端無法存取後端:
     - 檢查: API_URL 環境變數
     - 解決: 確認服務網路互通
```

### 💾 備份與還原
```bash
# 📦 資料庫備份
cd booking_backend
docker-compose exec db pg_dump -U postgres booking_system > backup_$(date +%Y%m%d).sql

# 🔄 還原資料庫
docker-compose exec -T db psql -U postgres booking_system < backup_20241201.sql

# 📁 完整系統備份（含配置檔案）
tar -czf system_backup_$(date +%Y%m%d).tar.gz booking/

# 🔒 加密備份（建議用於正式環境）
gpg -c backup_$(date +%Y%m%d).sql
```

### ⚡ 效能優化
```yaml
資料庫優化:
  - 定期執行 VACUUM ANALYZE
  - 監控慢查詢日誌
  - 檢查索引使用效率
  
應用程式優化:
  - 定期清理容器映像
  - 監控記憶體使用量
  - 調整 Docker 資源限制
  
網路優化:
  - 使用 CDN（如需要）
  - 啟用 gzip 壓縮
  - 配置適當的快取策略
```

## 🔐 安全與權限

### 👥 用戶角色架構
```yaml
角色權限分級:
  user (一般用戶):
    - 查看機器清單
    - 預約可用時段
    - 管理個人預約
    - 查看個人資料
    
  manager (管理員):
    - 包含 user 權限
    - 管理機器狀態
    - 查看所有預約
    - 發布通知公告
    
  admin (超級管理員):
    - 包含 manager 權限
    - 用戶權限管理
    - 系統設定修改
    - 資料庫維護
```

### 🔑 Google OAuth 設定
```yaml
設定步驟:
  1. Google Cloud Console:
     - 建立新專案
     - 啟用 Google+ API
     - 建立 OAuth 2.0 憑證
     
  2. 授權設定:
     - 開發環境: http://localhost:3000/api/auth/callback/google
     - 正式環境: https://yourdomain.com/api/auth/callback/google
     
  3. 環境變數:
     - GOOGLE_CLIENT_ID: 你的客戶端ID
     - GOOGLE_CLIENT_SECRET: 你的客戶端密鑰
     - NEXTAUTH_SECRET: 隨機密鑰字串
```

## 👨‍💻 開發指南

### 🛠️ 開發環境設定
```bash
# 🔧 本地開發模式（推薦）
cd booking_backend
docker-compose up  # 查看即時日誌

# 🔄 程式碼修改後重啟
docker-compose restart backend

# 🧹 清理 Docker 資源
docker system prune -f
docker volume prune -f
```

### 📝 代碼規範
```yaml
前端標準:
  - Language: TypeScript 5.3+
  - Linting: ESLint + Next.js rules
  - Formatting: Prettier
  - UI: Tailwind CSS + 自定義主題
  - Testing: Jest + React Testing Library

後端標準:
  - Language: Python 3.11+
  - Style: PEP 8
  - Framework: Flask + Blueprint
  - Database: PostgreSQL 原生 SQL
  - Testing: pytest + fixtures

容器標準:
  - Multi-stage builds
  - 非 root 用戶執行
  - 健康檢查配置
  - 資源限制設定
```

### 🔄 Git 工作流程
```yaml
分支策略:
  - main: 穩定版本
  - develop: 開發分支
  - feature/*: 功能分支
  - hotfix/*: 緊急修復

提交規範:
  - feat: 新增功能
  - fix: 修復錯誤
  - docs: 文檔更新
  - style: 代碼格式
  - refactor: 重構代碼
  - perf: 性能優化
  - test: 測試相關
  - docker: 容器配置
```

### 🧪 測試策略
```bash
# 🔬 前端測試
cd booking_fromtend
npm run test
npm run test:coverage

# 🔬 後端測試
cd booking_backend
docker-compose exec backend python -m pytest

# 🔬 端到端測試
npm run test:e2e
```

## 🔧 疑難排解

### 🐳 Docker 常見問題
```yaml
容器啟動失敗:
  症狀: docker-compose up 失敗
  檢查: docker-compose logs [service_name]
  解決: 檢查環境變數、端口衝突、映像損毀
  
端口衝突:
  症狀: "port already in use"
  檢查: netstat -tulpn | grep :3000
  解決: 停止佔用端口的程序或修改 docker-compose.yml
  
資料庫連線失敗:
  症狀: 無法連接 PostgreSQL
  檢查: docker-compose ps db
  解決: 確認容器狀態、環境變數、網路連通性
  
前端建構錯誤:
  症狀: Next.js 建構失敗
  檢查: docker-compose logs frontend
  解決: 清除快取、重新建構映像
```

### 🛠️ 常用修復指令
```bash
# 🔄 完全重置環境
docker-compose down -v
docker system prune -a -f
docker-compose up -d

# 🗄️ 修復資料庫權限
sudo chown -R 999:999 booking_backend/pgdata

# 📦 清除 Node.js 快取
cd booking_fromtend
rm -rf node_modules package-lock.json
docker-compose build --no-cache

# 🔍 檢查服務健康狀態
docker-compose ps
docker stats --no-stream
```

### ⚡ 效能調優建議
```yaml
容器資源限制:
  - 前端: 記憶體 512MB，CPU 0.5核
  - 後端: 記憶體 1GB，CPU 1核  
  - 資料庫: 記憶體 2GB，CPU 1核

系統優化:
  - 定期清理 Docker 映像和容器
  - 監控磁碟空間使用量
  - 設定 PostgreSQL 參數調校
  - 啟用應用程式快取機制
```

## 📞 技術支援

### 🆘 獲取協助
```yaml
問題回報流程:
  1. 📖 查閱本文檔疑難排解章節
  2. 🔍 搜尋既有 Issues 是否有相似問題
  3. 📊 收集系統資訊和錯誤日誌
  4. 📝 建立詳細的問題報告
  5. 🏷️ 標記適當的標籤

必要資訊:
  - 作業系統版本
  - Docker/Docker Compose 版本
  - 錯誤訊息完整內容
  - 相關的 docker-compose logs
  - 重現問題的步驟
```

### 🤝 貢獻指南
歡迎提交 Pull Request 改善本專案！請遵循：
1. Fork 專案並建立功能分支
2. 遵循代碼規範和測試標準
3. 撰寫清楚的提交訊息
4. 更新相關文檔
5. 提交前確保所有測試通過

---

## 📚 專案資訊

**🏫 開發單位**: 興趣  
**🎯 專案目標**: 智能化設備預約管理平台  
**⚖️ 授權條款**: MIT License  
**📊 專案規模**: 15+ 資料表、50+ API 端點、4000+ 行程式碼  

**📈 系統版本**: v2.0  
**📅 最後更新**: 2025年06月  
**🛠️ 部署方式**: Docker Compose 容器化部署  

### 🏆 技術亮點
- ✅ 微服務架構設計
- ✅ 完整的 Docker 容器化
- ✅ PostgreSQL 高性能資料庫
- ✅ NextAuth.js 安全認證
- ✅ 響應式 UI 設計
- ✅ 即時衝突檢測
- ✅ 匿名化隱私保護
- ✅ 完整的審計日誌
 
