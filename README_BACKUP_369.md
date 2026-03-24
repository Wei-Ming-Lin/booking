
# 📱 GPU 預約系統

> **Machine Booking System v2.1**  
> 專為資研所設計的 AI GPU 資源預約平台  
> 基於 Next.js 14 和 Flask 的現代化全棧應用

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)](https://www.typescriptlang.org/)
[![Flask](https://img.shields.io/badge/Flask-Latest-green)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docs.docker.com/compose/)

## 🎯 專案概述

GPU 預約系統是一個專為學術研究環境設計的高效能運算資源管理平台。系統整合了現代化的Web技術棧，提供直觀的用戶介面和強大的管理功能，讓師生能夠輕鬆預約和管理 GPU 運算資源。

### 🌟 核心特色
- 🎓 **學術專用**：專為 @ntub.edu.tw 帳號設計，支援師生身份驗證
- 🚀 **現代化UI**：玻璃質感設計、深淺色模式、AI主題風格
- 📱 **全響應式**：完美適配手機、平板、桌面等多種設備
- 🔒 **隱私保護**：最小權限原則，僅取得頭像、姓名、電子郵件
- ⚡ **高性能**：資料庫優化、即時同步、智能快取

## 🚀 核心功能

### 🎨 前端使用者體驗
- **🌓 智能主題切換** - 根據系統設定自動切換深淺色模式
- **🎯 直觀預約介面** - 月曆檢視、時段選擇、即時衝突檢測
- **📊 個人儀表板** - 預約記錄、使用統計、狀態追蹤
- **🔔 系統通知** - 多級別公告（低/中/高），自動彈出提醒
- **📱 觸控優化** - 手機友善的觸控體驗，44px 最小點擊區域

### 👤 使用者功能
- **🔐 Google OAuth 認證** - 整合 NextAuth.js，@ntub.edu.tw 帳號專用
- **📅 智能預約系統** - 4小時時段制，台北時區支援，即時衝突檢測
- **👤 個人資料管理** - 預約記錄檢視、使用統計、取消預約功能
- **📱 移動端優化** - PWA 支援，離線查看，推送通知
- **🔍 預約搜尋篩選** - 按狀態、時間、機器篩選預約記錄

### 🛠️ 管理員功能
- **🏭 設備管理中心** - 機器新增、編輯、狀態管理（啟用/維護/停用）
- **📊 預約管理儀表板** - 全域預約檢視、月曆總覽、強制取消功能
- **👥 用戶權限管理** - 角色控制（user/manager/admin），權限分級
- **🔒 智能限制引擎** - 年級限制、使用頻率控制、冷卻期設定
- **📢 通知系統管理** - 多級別公告發布、定時通知、系統維護公告
- **📈 使用分析統計** - 設備利用率、用戶活躍度、預約趨勢分析

### 🔒 隱私與安全特色
- **🎭 智能匿名化** - 預約者姓名自動格式化為「張O由」形式
- **🛡️ 雙重API架構** - 用戶端與管理端資料完全分離
- **🔐 多層權限控制** - 基於角色的存取控制（RBAC）
- **📝 完整操作審計** - 所有關鍵操作記錄，可追蹤變更歷史
- **🚫 最小權限原則** - 僅取得必要的用戶資訊（頭像、姓名、電子郵件）

## 🎨 最新功能亮點

### 🌓 深淺色主題系統
- **自動主題檢測**：根據用戶系統設定自動切換
- **全組件支援**：所有介面元素完整支援深淺色模式
- **AI主題風格**：科技感電路板背景、GPU風格設計
- **無縫切換**：平滑過渡動畫，極佳用戶體驗

### 🎨 美化登入頁面
- **蘋果液態玻璃設計**：採用 iOS 風格的液態玻璃效果（Liquid Glass）
- **流動感透明度**：多層次動態透明效果，不是靜態毛玻璃
- **AI風格元素**：電路板線條、漂浮幾何圖形、GPU圖標
- **隱私保護**：明確說明僅取得頭像、姓名、電子郵件
- **無導航干擾**：登入頁面完全沒有導航欄，沉浸式體驗

### � 蘋果液態玻璃系統
- **動態流動效果**：背景元素具有液態流動動畫
- **深層景深感**：多層次透明效果，符合現代美學
- **智能光影變化**：隨內容和主題變化的動態視覺效果
- **觸控友善設計**：44px 最小點擊區域，符合 iOS 設計規範
- **蘋果字體系統**：Inter + SF Pro Display 優美字體組合

### �📊 系統通知優化
- **液態玻璃卡片**：每個通知使用液態玻璃效果呈現
- **網格化佈局**：每個通知佔25%寬度，自動響應式調整
- **智能擴展**：文字較多時自動佔用更大空間
- **深淺色適配**：完整支援深淺色模式的液態玻璃效果
- **優雅動畫**：懸停縮放、漸入動畫，提升互動體驗

### 📱 移動端優化
- **觸控友善**：44px最小點擊區域，符合iOS Human Interface Guidelines
- **手勢支援**：滑動、長按等手勢操作
- **性能優化**：懶加載、智能快取、減少重繪
- **蘋果美學**：液態玻璃效果在移動設備上的完美呈現
- **字體優化**：Inter + SF Pro Display 在各種螢幕上的最佳顯示效果

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

