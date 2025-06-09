-- ===============================================
-- 機器預約管理系統資料庫初始化腳本
-- NTUB IDS Equipment Booking System v2.0
-- 作者: 系統自動生成
-- 用途: 在新環境中快速建立完整的資料庫架構
-- ===============================================

-- 設置客戶端編碼和時區
SET client_encoding = 'UTF8';
SET timezone = 'Asia/Taipei';

-- ===============================================
-- 創建資料庫（如果需要）
-- ===============================================

-- 注意：以下語句需要在 PostgreSQL 命令行中以超級用戶身份執行
-- CREATE DATABASE booking_system 
--   WITH OWNER = postgres 
--   ENCODING = 'UTF8' 
--   LC_COLLATE = 'zh_TW.UTF-8' 
--   LC_CTYPE = 'zh_TW.UTF-8' 
--   TABLESPACE = pg_default;

-- ===============================================
-- 創建應用程序用戶（可選）
-- ===============================================

-- 注意：以下語句需要在 PostgreSQL 命令行中以超級用戶身份執行
-- CREATE USER booking_app WITH PASSWORD 'your_secure_password';
-- CREATE USER booking_readonly WITH PASSWORD 'your_readonly_password';

-- ===============================================
-- 創建資料表
-- ===============================================

-- 1. 用戶表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 機器表
CREATE TABLE IF NOT EXISTS machines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'limited')),
  restriction_status TEXT NOT NULL DEFAULT 'none' CHECK (restriction_status IN ('none', 'limited', 'blocked')),
  is_active BOOLEAN DEFAULT true,
  maintenance_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 預約表
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  time_slot TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'no_show')),
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 機器限制規則表
CREATE TABLE IF NOT EXISTS machine_restrictions (
  id SERIAL PRIMARY KEY,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('year_limit', 'email_pattern', 'usage_limit', 'time_limit', 'custom')),
  restriction_rule TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(machine_id, restriction_type),
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

-- 5. 用戶機器使用記錄表
CREATE TABLE IF NOT EXISTS user_machine_usage (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  usage_time TIMESTAMP NOT NULL,
  usage_count INTEGER DEFAULT 1,
  is_cooldown_usage BOOLEAN DEFAULT FALSE,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_email, booking_id)
);

-- 6. 系統通知表
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('低', '中', '高')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'maintenance', 'emergency', 'announcement')),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

-- 7. 系統日誌表（審計用，可選）
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  user_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- 創建觸發器函數
-- ===============================================

-- 自動更新 updated_at 欄位的函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 預約衝突檢查函數（只檢查 active 狀態的預約）
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND EXISTS (
        SELECT 1 FROM bookings
        WHERE machine_id = NEW.machine_id
        AND time_slot = NEW.time_slot
        AND status = 'active'
        AND id != COALESCE(NEW.id, -1)
    ) THEN
        RAISE EXCEPTION 'Active booking time conflict detected for machine % at time %', NEW.machine_id, NEW.time_slot;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 系統日誌記錄函數（可選）
CREATE OR REPLACE FUNCTION log_data_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO system_logs (action, table_name, record_id, old_values)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO system_logs (action, table_name, record_id, old_values, new_values)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO system_logs (action, table_name, record_id, new_values)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 創建觸發器
-- ===============================================

-- 自動更新 updated_at 欄位的觸發器
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
    BEFORE UPDATE ON machines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machine_restrictions_updated_at
    BEFORE UPDATE ON machine_restrictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_machine_usage_updated_at
    BEFORE UPDATE ON user_machine_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 預約衝突檢查觸發器
CREATE TRIGGER check_booking_conflict_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION check_booking_conflict();

-- 系統日誌觸發器（預設關閉，需要時可啟用）
-- CREATE TRIGGER log_users_changes
--     AFTER INSERT OR UPDATE OR DELETE ON users
--     FOR EACH ROW
--     EXECUTE FUNCTION log_data_changes();

-- CREATE TRIGGER log_bookings_changes
--     AFTER INSERT OR UPDATE OR DELETE ON bookings
--     FOR EACH ROW
--     EXECUTE FUNCTION log_data_changes();

-- CREATE TRIGGER log_machines_changes
--     AFTER INSERT OR UPDATE OR DELETE ON machines
--     FOR EACH ROW
--     EXECUTE FUNCTION log_data_changes();

-- ===============================================
-- 創建索引（性能優化）
-- ===============================================

-- 預約表索引
CREATE UNIQUE INDEX IF NOT EXISTS bookings_machine_id_time_slot_active_unique 
ON bookings (machine_id, time_slot) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_bookings_user_email ON bookings(user_email);
CREATE INDEX IF NOT EXISTS idx_bookings_machine_id ON bookings(machine_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot ON bookings(time_slot);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_email_status ON bookings(user_email, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON bookings(time_slot, status) WHERE status = 'active';

-- 用戶使用記錄索引
CREATE INDEX IF NOT EXISTS idx_user_machine_usage_user_machine 
ON user_machine_usage(user_email, machine_id);
CREATE INDEX IF NOT EXISTS idx_user_machine_usage_time 
ON user_machine_usage(usage_time);
CREATE INDEX IF NOT EXISTS idx_user_machine_usage_cooldown 
ON user_machine_usage(is_cooldown_usage);
CREATE INDEX IF NOT EXISTS idx_user_machine_usage_booking 
ON user_machine_usage(booking_id);

-- 機器限制索引
CREATE INDEX IF NOT EXISTS idx_machine_restrictions_machine_id 
ON machine_restrictions(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_restrictions_type 
ON machine_restrictions(restriction_type);
CREATE INDEX IF NOT EXISTS idx_machine_restrictions_active 
ON machine_restrictions(is_active);
CREATE INDEX IF NOT EXISTS idx_machine_restrictions_time_range 
ON machine_restrictions(start_time, end_time) WHERE start_time IS NOT NULL AND end_time IS NOT NULL;

-- 通知索引
CREATE INDEX IF NOT EXISTS idx_notifications_active 
ON notifications(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notifications_time_range 
ON notifications(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_notifications_level 
ON notifications(level);
CREATE INDEX IF NOT EXISTS idx_notifications_category 
ON notifications(category);

-- 用戶索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- 機器索引
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_restriction_status ON machines(restriction_status);
CREATE INDEX IF NOT EXISTS idx_machines_active ON machines(is_active) WHERE is_active = true;

-- 系統日誌索引
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_email ON system_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_table_record ON system_logs(table_name, record_id);

-- ===============================================
-- 創建視圖（便於查詢）
-- ===============================================

-- 管理員預約詳情視圖
CREATE OR REPLACE VIEW admin_booking_details AS
SELECT 
    b.id,
    b.user_email,
    u.name as user_name,
    u.role as user_role,
    b.machine_id,
    m.name as machine_name,
    m.description as machine_description,
    m.location as machine_location,
    m.status as machine_status,
    b.time_slot,
    b.time_slot + INTERVAL '4 hours' as end_time,
    b.status,
    b.notes,
    b.cancellation_reason,
    b.created_at,
    b.updated_at,
    CASE 
        WHEN b.time_slot < CURRENT_TIMESTAMP AND b.status = 'active' THEN 'expired'
        WHEN b.time_slot > CURRENT_TIMESTAMP AND b.status = 'active' THEN 'upcoming'
        ELSE b.status
    END as computed_status
FROM bookings b
LEFT JOIN users u ON b.user_email = u.email
JOIN machines m ON b.machine_id = m.id;

-- 活躍通知視圖
CREATE OR REPLACE VIEW active_notifications AS
SELECT 
    n.id,
    n.title,
    n.content,
    n.level,
    n.category,
    n.start_time,
    n.end_time,
    n.created_at,
    u.name as creator_name,
    u.email as creator_email
FROM notifications n
LEFT JOIN users u ON n.creator_id = u.id
WHERE n.is_active = true
AND (
    (n.start_time IS NULL AND n.end_time IS NULL) 
    OR 
    (n.start_time IS NULL AND n.end_time >= CURRENT_TIMESTAMP)
    OR 
    (n.start_time <= CURRENT_TIMESTAMP AND n.end_time IS NULL)
    OR 
    (n.start_time <= CURRENT_TIMESTAMP AND n.end_time >= CURRENT_TIMESTAMP)
)
ORDER BY 
    CASE n.level 
        WHEN '高' THEN 1
        WHEN '中' THEN 2
        WHEN '低' THEN 3
    END,
    n.created_at DESC;

-- 機器使用統計視圖
CREATE OR REPLACE VIEW machine_usage_stats AS
SELECT 
    m.id as machine_id,
    m.name as machine_name,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'active' THEN 1 END) as active_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(DISTINCT b.user_email) as unique_users,
    MIN(b.created_at) as first_booking,
    MAX(b.created_at) as latest_booking
FROM machines m
LEFT JOIN bookings b ON m.id = b.machine_id
WHERE m.is_active = true
GROUP BY m.id, m.name;

-- ===============================================
-- 創建實用函數
-- ===============================================

-- 清理過期預約函數
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- 將過期的 active 預約標記為 no_show
    UPDATE bookings 
    SET status = 'no_show', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active' 
    AND time_slot + INTERVAL '4 hours' < CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- 記錄清理操作
    INSERT INTO system_logs (action, table_name, new_values) 
    VALUES ('CLEANUP', 'bookings', jsonb_build_object('affected_rows', affected_rows, 'timestamp', CURRENT_TIMESTAMP));
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- 清理舊日誌函數
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    DELETE FROM system_logs 
    WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- 獲取系統統計資訊函數
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE(
    table_name TEXT,
    total_rows BIGINT,
    today_rows BIGINT,
    week_rows BIGINT,
    month_rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'users'::TEXT as table_name,
        COUNT(*) as total_rows,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as today_rows,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as week_rows,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days') as month_rows
    FROM users
    UNION ALL
    SELECT 
        'machines'::TEXT,
        COUNT(*),
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE),
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days'),
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days')
    FROM machines
    UNION ALL
    SELECT 
        'bookings'::TEXT,
        COUNT(*),
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE),
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days'),
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days')
    FROM bookings
    UNION ALL
    SELECT 
        'notifications'::TEXT,
        COUNT(*),
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE),
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days'),
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days')
    FROM notifications;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 設置權限（如果使用應用程序用戶）
-- ===============================================

-- 取消註釋以下語句來設置應用程序用戶權限
-- GRANT CONNECT ON DATABASE booking_system TO booking_app;
-- GRANT USAGE ON SCHEMA public TO booking_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO booking_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO booking_app;

-- 只讀用戶權限
-- GRANT CONNECT ON DATABASE booking_system TO booking_readonly;
-- GRANT USAGE ON SCHEMA public TO booking_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO booking_readonly;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO booking_readonly;

-- 為未來創建的表自動授權
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public 
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO booking_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public 
-- GRANT USAGE, SELECT ON SEQUENCES TO booking_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public 
-- GRANT SELECT ON TABLES TO booking_readonly;

-- ===============================================
-- 添加註釋說明
-- ===============================================

COMMENT ON DATABASE booking_system IS 'NTUB IDS 機器預約管理系統資料庫 v2.0';

COMMENT ON TABLE users IS '用戶表，存儲 Google 登入用戶信息和權限管理';
COMMENT ON COLUMN users.role IS '用戶角色：user(普通用戶), manager(管理員), admin(超級管理員)';
COMMENT ON COLUMN users.is_active IS '用戶是否啟用（軟刪除）';
COMMENT ON COLUMN users.last_login IS '最後登入時間';

COMMENT ON TABLE machines IS '機器資訊表，包含機器狀態和限制狀態';
COMMENT ON COLUMN machines.status IS '機器狀態：active(可使用), maintenance(維護中), limited(限制使用)';
COMMENT ON COLUMN machines.restriction_status IS '限制狀態：none(無限制), limited(部分限制), blocked(完全封鎖)';
COMMENT ON COLUMN machines.location IS '機器位置';
COMMENT ON COLUMN machines.is_active IS '機器是否啟用（軟刪除）';
COMMENT ON COLUMN machines.maintenance_notes IS '維護備註';

COMMENT ON TABLE bookings IS '預約表，使用 user_email 直接識別用戶，不依賴 users 表外鍵';
COMMENT ON COLUMN bookings.user_email IS '用戶郵箱地址，用於識別預約用戶';
COMMENT ON COLUMN bookings.time_slot IS '預約時間段，必須為 4 小時區塊 (0,4,8,12,16,20)';
COMMENT ON COLUMN bookings.status IS '預約狀態：active(活躍), cancelled(已取消), completed(已完成), no_show(未出席)';
COMMENT ON COLUMN bookings.notes IS '預約備註';
COMMENT ON COLUMN bookings.cancellation_reason IS '取消原因';

COMMENT ON TABLE machine_restrictions IS '機器限制規則表，支援多種限制類型';
COMMENT ON COLUMN machine_restrictions.restriction_type IS '限制類型：year_limit(年份限制), email_pattern(郵箱格式限制), usage_limit(使用次數限制), time_limit(時間限制), custom(自定義限制)';
COMMENT ON COLUMN machine_restrictions.restriction_rule IS 'JSON格式的限制規則詳情';
COMMENT ON COLUMN machine_restrictions.description IS '限制規則描述';
COMMENT ON COLUMN machine_restrictions.start_time IS '限制規則生效開始時間(可選)';
COMMENT ON COLUMN machine_restrictions.end_time IS '限制規則生效結束時間(可選)';

COMMENT ON TABLE user_machine_usage IS '用戶機器使用記錄表，用於滾動窗口限制功能和使用統計';
COMMENT ON COLUMN user_machine_usage.is_cooldown_usage IS '是否為冷卻期使用（目前版本不使用）';
COMMENT ON COLUMN user_machine_usage.usage_time IS '使用時間，對應預約的 time_slot';
COMMENT ON COLUMN user_machine_usage.duration_minutes IS '實際使用時長（分鐘）';

COMMENT ON TABLE notifications IS '系統通知表，支援分類和時間範圍控制';
COMMENT ON COLUMN notifications.level IS '通知級別：低, 中, 高';
COMMENT ON COLUMN notifications.category IS '通知分類：general(一般), maintenance(維護), emergency(緊急), announcement(公告)';
COMMENT ON COLUMN notifications.title IS '通知標題';
COMMENT ON COLUMN notifications.is_active IS '通知是否啟用';

COMMENT ON TABLE system_logs IS '系統日誌表，用於審計和追蹤數據變更（可選功能）';

COMMENT ON VIEW admin_booking_details IS '管理員查看預約詳情的視圖，包含用戶名稱和機器詳細信息';
COMMENT ON VIEW active_notifications IS '當前有效通知視圖，按優先級排序';
COMMENT ON VIEW machine_usage_stats IS '機器使用統計視圖，用於報表分析';

-- ===============================================
-- 完成訊息
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'NTUB IDS 機器預約系統資料庫初始化完成！';
    RAISE NOTICE '版本: v2.0';
    RAISE NOTICE '時區: %', current_setting('timezone');
    RAISE NOTICE '資料庫: %', current_database();
    RAISE NOTICE '===============================================';
    RAISE NOTICE '創建的資料表:';
    RAISE NOTICE '  - users (用戶管理)';
    RAISE NOTICE '  - machines (機器管理)';
    RAISE NOTICE '  - bookings (預約管理)';
    RAISE NOTICE '  - machine_restrictions (限制規則)';
    RAISE NOTICE '  - user_machine_usage (使用記錄)';
    RAISE NOTICE '  - notifications (系統通知)';
    RAISE NOTICE '  - system_logs (系統日誌)';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '重要提醒:';
    RAISE NOTICE '1. 請修改 backend_optimized.py 中的資料庫連線設定';
    RAISE NOTICE '2. 確保 PostgreSQL 服務正在運行';
    RAISE NOTICE '3. 如需啟用應用程序用戶權限，請取消註釋相關語句';
    RAISE NOTICE '4. 建議在生產環境中設置適當的備份策略';
    RAISE NOTICE '5. 滾動窗口限制功能已完整實現';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '系統特色功能:';
    RAISE NOTICE '• Google OAuth 登入整合';
    RAISE NOTICE '• 滾動窗口使用限制';
    RAISE NOTICE '• 維護模式支援';
    RAISE NOTICE '• 完整的管理員介面';
    RAISE NOTICE '• 系統通知管理';
    RAISE NOTICE '• 月度預約統計';
    RAISE NOTICE '===============================================';
END $$; 