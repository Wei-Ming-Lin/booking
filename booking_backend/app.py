from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import pytz
from urllib.parse import unquote
import traceback
import os
from dotenv import load_dotenv
app = Flask(__name__)
# 配置CORS，允許所有源和方法
CORS(app, supports_credentials=True, origins="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 台北時區設定
TAIPEI_TZ = pytz.timezone('Asia/Taipei')

def get_taipei_now():
    """獲取當前台北時間"""
    return datetime.now(TAIPEI_TZ)

def to_taipei_time(dt):
    """將datetime轉換為台北時間"""
    if dt.tzinfo is None:
        # 如果沒有時區資訊，假設為台北時間
        return TAIPEI_TZ.localize(dt)
    return dt.astimezone(TAIPEI_TZ)

def parse_time_slot(time_slot_str):
    """
    yyyy/mm/dd/hh 格式 → datetime物件（台北時區）
    """
    try:
        # 解析為台北時間
        parsed_dt = datetime.strptime(time_slot_str, "%Y/%m/%d/%H")
        return TAIPEI_TZ.localize(parsed_dt)
    except Exception:
        try:
            # 嘗試其他格式
            parsed_dt = datetime.strptime(time_slot_str, "%Y-%m-%d %H:%M:%S")
            return TAIPEI_TZ.localize(parsed_dt)
        except Exception:
            return None

def parse_frontend_datetime(datetime_str):
    """
    統一處理前端發送的時間格式
    前端的 datetime-local 輸入會產生類似 "2024-01-15T10:30" 的格式
    這是用戶在台北時區輸入的本地時間，需要正確處理為台北時區
    """
    if not datetime_str:
        return None
    
    try:
        # 檢查是否為前端 datetime-local 格式（無時區信息的本地時間）
        if 'T' in datetime_str and '+' not in datetime_str and 'Z' not in datetime_str:
            # 這是用戶輸入的台北本地時間，直接當作台北時間處理
            dt = datetime.fromisoformat(datetime_str)
            return TAIPEI_TZ.localize(dt)
        else:
            # 處理包含時區信息的格式
            dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
            return dt.astimezone(TAIPEI_TZ)
    except ValueError:
        # 如果解析失敗，回傳 None
        return None

def translate_level_to_db(level):
    """將中文等級轉換為資料庫英文等級"""
    level_map = {
        '低': 'low',
        '中': 'medium', 
        '高': 'high'
    }
    return level_map.get(level, level)

def translate_level_from_db(level):
    """將資料庫英文等級轉換為中文等級"""
    level_map = {
        'low': '低',
        'medium': '中',
        'high': '高'
    }
    return level_map.get(level, level)

# ======== 資料庫設定，請自行修改 ========
load_dotenv()
DB_CONFIG = {
    "dbname": os.environ.get("DB_NAME"),
    "user": os.environ.get("DB_USER"),
    "password": os.environ.get("DB_PASSWORD"),
    "host": os.environ.get("DB_HOST"),
    "port": int(os.environ.get("DB_PORT", 5432))  # 給 port 預設值
}

def get_db_conn():
    return psycopg2.connect(**DB_CONFIG)

# =========== 使用者API ===========

@app.route('/users', methods=['POST'])
def create_or_get_user():
    print("收到 POST /users 請求")
    """
    前端傳name, email。沒有就建立，有就回傳role
    """
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    if not name or not email:
        return jsonify({'error': 'Missing name or email'}), 400

    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # 查詢是否已存在
        cur.execute("SELECT id, role FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        print("查詢 user:", user)
        if user:
            # 已存在
            return jsonify({'role': user['role']}), 200
        # 新增
        cur.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING role",
            (name, email)
        )
        role = cur.fetchone()['role']
        conn.commit()
        print("Insert Success!")
        return jsonify({'role': role}), 201
    except Exception as e:
        print(e)
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/users/role', methods=['PUT'])
def update_user_role():
    """
    更新用戶角色（管理員功能）
    支持角色權限檢查：
    - manager可以修改user和manager角色
    - admin可以修改所有角色
    - admin角色不能被其他人修改
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        data = request.get_json()
        target_email = data.get('email')
        new_role = data.get('role')
        
        if not target_email or not new_role:
            return jsonify({'error': 'Missing email or role'}), 400
        
        if new_role not in ['user', 'manager', 'admin']:
            return jsonify({'error': 'Invalid role'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 解碼目標用戶email
        decoded_target_email = unquote(target_email)
        
        # 獲取目標用戶當前角色
        cur.execute("SELECT id, role FROM users WHERE email = %s", (decoded_target_email,))
        target_user = cur.fetchone()
        
        if not target_user:
            return jsonify({'error': 'Target user not found'}), 404
        
        current_target_role = target_user['role']
        
        # 角色權限檢查
        if admin_role == 'manager':
            # manager不能修改admin用戶
            if current_target_role == 'admin':
                return jsonify({'error': 'Managers cannot modify admin users'}), 403
            # manager不能設置用戶為admin
            if new_role == 'admin':
                return jsonify({'error': 'Managers cannot assign admin role'}), 403
        elif admin_role == 'admin':
            # admin可以修改所有角色
            pass
        else:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        # 更新角色
        cur.execute(
            "UPDATE users SET role = %s WHERE email = %s RETURNING role",
            (new_role, decoded_target_email)
        )
        
        updated_role = cur.fetchone()['role']
        conn.commit()
        
        logger.info(f"Admin {admin_email} updated user {decoded_target_email} role from {current_target_role} to {updated_role}")
        
        return jsonify({
            'role': updated_role,
            'message': f'User role updated successfully from {current_target_role} to {updated_role}'
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# =========== Booking API ===========

@app.route('/bookings', methods=['POST'])
def create_booking():
    """
    創建預約：傳送 user_email, machine_id, time_slot, created_at, status
    time_slot 必須為 4 小時區塊（0,4,8,12,16,20），預約前檢查有無重疊
    只檢查 status = 'active' 的預約，cancelled 的預約不影響新預約
    """
    try:
        data = request.get_json()
        user_email = data.get('user_email')
        machine_id = data.get('machine_id')
        time_slot_str = data.get('time_slot')
        created_at_str = data.get('created_at')
        status = data.get('status', 'active')  # 預設狀態為 'active'

        # 驗證必要欄位
        if not user_email or not machine_id or not time_slot_str or not created_at_str:
            return jsonify({
                'success': False,
                'error': '缺少必要資料',
                'error_type': 'missing_fields',
                'message': '請提供完整的預約資訊（用戶信箱、機器編號、時段、創建時間）',
                'details': {
                    'user_email': bool(user_email),
                    'machine_id': bool(machine_id),
                    'time_slot': bool(time_slot_str),
                    'created_at': bool(created_at_str)
                }
            }), 400

        # 解析時間
        time_slot = parse_time_slot(time_slot_str)
        if not time_slot:
            return jsonify({
                'success': False,
                'error': '時段格式錯誤',
                'error_type': 'invalid_time_format',
                'message': '時段格式必須為 YYYY/MM/DD/HH 或 YYYY-MM-DD HH:MM:SS',
                'provided_format': time_slot_str
            }), 400

        # 檢查預約時間不能是過去的時間
        current_taipei_time = get_taipei_now()
        if time_slot < current_taipei_time:
            return jsonify({
                'success': False,
                'error': '無法預約過去的時段',
                'error_type': 'past_time_slot',
                'message': f'您選擇的時段 {time_slot.strftime("%Y/%m/%d %H:%M")} 已經過去，請選擇未來的時段',
                'current_time': current_taipei_time.strftime("%Y/%m/%d %H:%M"),
                'selected_time': time_slot.strftime("%Y/%m/%d %H:%M")
            }), 400

        try:
            created_at = datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S")
            created_at = TAIPEI_TZ.localize(created_at)  # 設定為台北時區
        except Exception:
            return jsonify({
                'success': False,
                'error': '創建時間格式錯誤',
                'error_type': 'invalid_created_at_format',
                'message': '創建時間格式必須為 YYYY-MM-DD HH:MM:SS',
                'provided_format': created_at_str
            }), 400

        # 驗證時段必須為 4 小時區塊
        if time_slot.hour not in [0, 4, 8, 12, 16, 20]:
            valid_hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
            return jsonify({
                'success': False,
                'error': '無效的預約時段',
                'error_type': 'invalid_time_slot',
                'message': f'預約時段必須為4小時區塊的開始時間：{", ".join(valid_hours)}',
                'selected_hour': f'{time_slot.hour:02d}:00',
                'valid_hours': valid_hours
            }), 400

        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 先檢查機器是否存在且可用
        cur.execute("SELECT id, name, status, restriction_status FROM machines WHERE id = %s", (machine_id,))
        machine = cur.fetchone()
        
        if not machine:
            return jsonify({
                'success': False,
                'error': '機器不存在',
                'error_type': 'machine_not_found',
                'message': f'機器編號 {machine_id} 不存在，請檢查機器編號是否正確',
                'machine_id': machine_id
            }), 404
        
        # 檢查機器狀態 - 維護中的機器也應該可以正常使用
        if machine['status'] not in ['active', 'maintenance']:
            status_messages = {
                'limited': '限制使用',
                'inactive': '已停用'
            }
            status_msg = status_messages.get(machine['status'], machine['status'])
            return jsonify({
                'success': False,
                'error': '機器無法使用',
                'error_type': 'machine_unavailable',
                'message': f'機器「{machine["name"]}」目前{status_msg}，暫時無法預約',
                'machine_name': machine['name'],
                'machine_status': machine['status']
            }), 400
        
        # 檢查機器限制（特別是使用次數限制）
        is_allowed, restriction_reason = check_machine_restriction(user_email, machine_id)
        if not is_allowed:
            return jsonify({
                'success': False,
                'error': '機器使用受限',
                'error_type': 'machine_restricted',
                'message': f'您無法使用此機器：{restriction_reason}',
                'restriction_reason': restriction_reason,
                'machine_name': machine['name']
            }), 403
        
        # 檢查該時段是否有 'active' 狀態的預約
        cur.execute("""
            SELECT id, user_email FROM bookings
            WHERE machine_id = %s
            AND time_slot = %s
            AND status = 'active'
        """, (machine_id, time_slot.replace(tzinfo=None)))
        
        existing_active_booking = cur.fetchone()
        
        if existing_active_booking:
            # 隱藏其他用戶的email信息（只顯示部分）
            other_user_email = existing_active_booking['user_email']
            if other_user_email != user_email:
                # 只顯示前3個字符和@後面的域名
                email_parts = other_user_email.split('@')
                if len(email_parts) == 2:
                    masked_email = email_parts[0][:3] + '***@' + email_parts[1]
                else:
                    masked_email = '***'
            else:
                masked_email = '您'
            
            logger.info(f"Time slot conflict: Machine {machine_id}, Time {time_slot}, Existing active booking: {existing_active_booking}")
            return jsonify({
                'success': False,
                'error': '時段已被預約',
                'error_type': 'time_slot_occupied',
                'message': f'此時段已被{masked_email}預約',
                'time_slot': time_slot.strftime("%Y/%m/%d %H:%M"),
                'machine_name': machine['name'],
                'existing_booking_id': existing_active_booking['id']
            }), 409

        # 使用新的滾動窗口限制檢查
        logger.info(f"STARTING rolling window check for user {user_email}, machine {machine_id}, time_slot {time_slot}")
        
        rolling_window_check = check_rolling_window_limit(
            user_email, machine_id, time_slot, cur
        )
        
        logger.info(f"Rolling window check result: {rolling_window_check}")
        
        if not rolling_window_check['allowed']:
            logger.error(f"BLOCKING booking due to rolling window limit: {rolling_window_check['reason']}")
            
            limit_info = rolling_window_check.get('limit_info', {})
            window_size = limit_info.get('window_size', 0)
            max_bookings = limit_info.get('max_bookings', 0)
            violated_window_start = limit_info.get('violated_window_start', '')
            violated_window_end = limit_info.get('violated_window_end', '')
            bookings_in_window = limit_info.get('bookings_in_violated_window', 0)
            
            # 格式化時間顯示
            if violated_window_start and violated_window_end:
                try:
                    start_dt = datetime.fromisoformat(violated_window_start)
                    end_dt = datetime.fromisoformat(violated_window_end)
                    window_period = f"{start_dt.strftime('%m/%d %H:%M')} 至 {end_dt.strftime('%m/%d %H:%M')}"
                except:
                    window_period = "指定窗口期間"
            else:
                window_period = f"連續{window_size}個時段"
            
            return jsonify({
                'success': False,
                'error': '超過使用限制',
                'error_type': 'usage_limit_exceeded',
                'message': f'預約失敗：在{window_period}內已有{bookings_in_window}次預約，超過上限{max_bookings}次',
                'details': {
                    'window_size': window_size,
                    'max_bookings': max_bookings,
                    'current_bookings_in_window': bookings_in_window,
                    'violated_window_period': window_period,
                    'restriction_description': f'任意連續{window_size}個時段內，最多只能預約{max_bookings}次'
                },
                'machine_name': machine['name'],
                'limit_info': limit_info
            }), 403
        else:
            logger.info(f"Rolling window check PASSED, proceeding with booking")

        # 沒有衝突，嘗試創建新預約
        try:
            cur.execute("""
                INSERT INTO bookings (user_email, machine_id, time_slot, created_at, status)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (user_email, machine_id, time_slot.replace(tzinfo=None), created_at.replace(tzinfo=None), status))
            
            booking_result = cur.fetchone()
            if not booking_result:
                raise Exception("Failed to create booking - no ID returned")
            
            booking_id = booking_result['id']
            logger.info(f"Booking created with ID: {booking_id}")
            
            # 記錄使用情況 - 單獨的錯誤處理
            try:
                usage_record_id = record_machine_usage(user_email, machine_id, booking_id, time_slot, cur)
                logger.info(f"Usage record created with ID: {usage_record_id}")
            except Exception as usage_error:
                # 使用記錄創建失敗，但預約已創建，需要回滾
                logger.error(f"Failed to create usage record: {usage_error}")
                conn.rollback()
                raise Exception(f"Failed to record machine usage: {str(usage_error)}")
            
            conn.commit()
            
            logger.info(f"New booking created successfully: ID {booking_id}, User: {user_email}, Machine: {machine_id}, Time: {time_slot}")
            
            return jsonify({
                'success': True,
                'booking_id': booking_id, 
                'status': 'success',
                'message': f'預約成功！機器「{machine["name"]}」{time_slot.strftime("%Y/%m/%d %H:%M")}',
                'details': {
                    'machine_name': machine['name'],
                    'time_slot': time_slot.strftime("%Y/%m/%d %H:%M"),
                    'duration': '4小時',
                    'end_time': (time_slot + timedelta(hours=4)).strftime("%Y/%m/%d %H:%M")
                }
            }), 201
            
        except psycopg2.errors.UniqueViolation as ue:
            # 處理唯一約束衝突 - 可能是有cancelled的記錄
            logger.warning(f"Unique constraint violation: {ue}")
            conn.rollback()
            
            # 檢查是否有cancelled記錄可以重新激活
            cur.execute("""
                SELECT id FROM bookings
                WHERE machine_id = %s
                AND time_slot = %s
                AND status = 'cancelled'
                ORDER BY created_at DESC
                LIMIT 1
            """, (machine_id, time_slot.replace(tzinfo=None)))
            
            cancelled_booking = cur.fetchone()
            
            if cancelled_booking:
                # 重新激活cancelled記錄
                cur.execute("""
                    UPDATE bookings 
                    SET status = 'active', user_email = %s, created_at = %s, updated_at = %s
                    WHERE id = %s
                    RETURNING id
                """, (user_email, created_at.replace(tzinfo=None), created_at.replace(tzinfo=None), cancelled_booking['id']))
                
                booking_id = cur.fetchone()['id']
                conn.commit()
                
                logger.info(f"Reactivated cancelled booking: ID {booking_id}, User: {user_email}, Machine: {machine_id}, Time: {time_slot}")
                
                return jsonify({
                    'success': True,
                    'booking_id': booking_id, 
                    'status': 'success',
                    'message': f'預約成功！（重新激活）機器「{machine["name"]}」{time_slot.strftime("%Y/%m/%d %H:%M")}',
                    'details': {
                        'machine_name': machine['name'],
                        'time_slot': time_slot.strftime("%Y/%m/%d %H:%M"),
                        'duration': '4小時',
                        'end_time': (time_slot + timedelta(hours=4)).strftime("%Y/%m/%d %H:%M"),
                        'reactivated': True
                    }
                }), 201
            else:
                # 如果沒有cancelled記錄，說明真的有衝突
                return jsonify({
                    'success': False,
                    'error': '時段衝突',
                    'error_type': 'database_conflict',
                    'message': '此時段已被預約（資料庫衝突）',
                    'details': 'Database unique constraint violation'
                }), 409

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        if 'conn' in locals():
            conn.rollback()
        return jsonify({
            'success': False,
            'error': '資料庫錯誤',
            'error_type': 'database_error',
            'message': '系統暫時無法處理您的預約請求，請稍後再試',
            'details': str(e) if app.debug else '請聯繫系統管理員'
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            'success': False,
            'error': '系統錯誤',
            'error_type': 'internal_error',
            'message': '系統發生未預期的錯誤，請稍後再試或聯繫系統管理員',
            'details': str(e) if app.debug else '內部系統錯誤'
        }), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/bookings/<int:booking_id>', methods=['DELETE'])
def cancel_booking(booking_id):
    """
    取消預約 - 將狀態設為 'cancelled' 而不是刪除記錄
    需要用戶郵箱驗證確保只能取消自己的預約
    """
    try:
        data = request.get_json()
        user_email = data.get('user_email')
        
        if not user_email:
            return jsonify({
                'success': False,
                'error': '缺少用戶信箱',
                'error_type': 'missing_user_email',
                'message': '請提供用戶信箱以驗證取消權限'
            }), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查預約是否存在且屬於該用戶
        cur.execute("""
            SELECT 
                b.id, 
                b.user_email, 
                b.status, 
                b.time_slot,
                m.name as machine_name
            FROM bookings b
            JOIN machines m ON b.machine_id = m.id
            WHERE b.id = %s
        """, (booking_id,))
        
        booking = cur.fetchone()
        
        if not booking:
            return jsonify({
                'success': False,
                'error': '預約不存在',
                'error_type': 'booking_not_found',
                'message': f'找不到預約編號 {booking_id}，請檢查預約編號是否正確',
                'booking_id': booking_id
            }), 404
        
        # 檢查是否為用戶本人的預約
        if booking['user_email'] != user_email:
            return jsonify({
                'success': False,
                'error': '無權限取消此預約',
                'error_type': 'permission_denied',
                'message': '您只能取消自己的預約',
                'booking_id': booking_id
            }), 403
        
        # 檢查預約狀態
        if booking['status'] != 'active':
            status_messages = {
                'cancelled': '已取消',
                'completed': '已完成',
                'no_show': '已過期'
            }
            status_msg = status_messages.get(booking['status'], booking['status'])
            return jsonify({
                'success': False,
                'error': '預約無法取消',
                'error_type': 'invalid_status',
                'message': f'此預約狀態為「{status_msg}」，無法取消',
                'current_status': booking['status'],
                'booking_id': booking_id,
                'machine_name': booking['machine_name']
            }), 400
        
        # 檢查是否能在預約開始時間前取消
        time_slot = booking['time_slot']
        # 確保time_slot是台北時間
        if time_slot.tzinfo is None:
            time_slot = TAIPEI_TZ.localize(time_slot)
        else:
            time_slot = time_slot.astimezone(TAIPEI_TZ)
            
        now = get_taipei_now()  # 使用台北時間
        time_until_booking = time_slot - now
        hours_until_booking = time_until_booking.total_seconds() / 3600
        
        if time_slot <= now:
            return jsonify({
                'success': False,
                'error': '預約已開始或已過期',
                'error_type': 'booking_started',
                'message': f'預約時間 {time_slot.strftime("%Y/%m/%d %H:%M")} 已開始或已過期，無法取消',
                'booking_time': time_slot.strftime("%Y/%m/%d %H:%M"),
                'current_time': now.strftime("%Y/%m/%d %H:%M"),
                'machine_name': booking['machine_name']
            }), 400
        
        # 可選：如果需要提前取消時間限制（例如1小時前）
        # minimum_cancel_hours = 1  # 可以根據需求調整
        # if hours_until_booking < minimum_cancel_hours:
        #     return jsonify({
        #         'success': False,
        #         'error': '取消時間過晚',
        #         'error_type': 'too_late_to_cancel',
        #         'message': f'需要在預約開始前至少{minimum_cancel_hours}小時取消，目前距離預約開始僅剩{hours_until_booking:.1f}小時',
        #         'hours_until_booking': round(hours_until_booking, 1),
        #         'minimum_cancel_hours': minimum_cancel_hours,
        #         'booking_time': time_slot.strftime("%Y/%m/%d %H:%M")
        #     }), 400

        # 更新預約狀態為 'cancelled'
        cur.execute("""
            UPDATE bookings 
            SET status = 'cancelled', updated_at = %s
            WHERE id = %s
        """, (now.replace(tzinfo=None), booking_id))  # 移除時區信息存入資料庫
        
        conn.commit()
        
        logger.info(f"Booking cancelled: ID {booking_id}, User: {user_email}")
        
        return jsonify({
            'success': True,
            'status': 'success',
            'message': f'預約已成功取消！機器「{booking["machine_name"]}」{time_slot.strftime("%Y/%m/%d %H:%M")}',
            'details': {
                'booking_id': booking_id,
                'machine_name': booking['machine_name'],
                'cancelled_time_slot': time_slot.strftime("%Y/%m/%d %H:%M"),
                'cancelled_at': now.strftime("%Y/%m/%d %H:%M:%S"),
                'hours_before_booking': round(hours_until_booking, 1)
            }
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({
            'success': False,
            'error': '資料庫錯誤',
            'error_type': 'database_error',
            'message': '系統暫時無法處理您的取消請求，請稍後再試',
            'details': str(e) if app.debug else '請聯繫系統管理員'
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            'success': False,
            'error': '系統錯誤',
            'error_type': 'internal_error',
            'message': '系統發生未預期的錯誤，請稍後再試或聯繫系統管理員',
            'details': str(e) if app.debug else '內部系統錯誤'
        }), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/bookings/machine/<machine_id>', methods=['GET'])
def get_machine_bookings(machine_id):
    """
    獲取機器的預約時段
    只返回 'active' 狀態的預約用於時段顯示
    同時返回詳細的預約信息用於取消功能
    新增：分析當前用戶的連續預約情況和冷卻期狀態
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取所有 active 狀態的預約，同時查詢用戶姓名
        query = """
            SELECT b.id, b.user_email, b.time_slot, b.status, b.machine_id, b.created_at, u.name as user_name
            FROM bookings b
            LEFT JOIN users u ON b.user_email = u.email
            WHERE b.machine_id = %s AND b.status = 'active'
        """
        params = [machine_id]
        
        if start_date and end_date:
            query += " AND time_slot BETWEEN %s AND %s"
            params.extend([start_date, end_date])
        
        query += " ORDER BY time_slot"
        
        cur.execute(query, params)
        bookings = cur.fetchall()
        
        # 轉換為前端需要的格式
        booked_slots = []
        booking_details = []
        
        for booking in bookings:
            # 確保time_slot被視為台北時間
            time_slot_dt = booking['time_slot']
            if time_slot_dt.tzinfo is None:
                # 數據庫時間沒有時區信息，設為台北時區
                time_slot_dt = TAIPEI_TZ.localize(time_slot_dt)
            else:
                # 轉換為台北時區
                time_slot_dt = time_slot_dt.astimezone(TAIPEI_TZ)
            
            # 格式化時間段為 "YYYY-MM-DD-HH:MM" - 確保與前端格式一致
            time_slot_formatted = time_slot_dt.strftime('%Y-%m-%d-%H:%M')
            booked_slots.append(time_slot_formatted)
            
            # 預約介面不需要顯示用戶姓名，只返回空字符串
            user_display_name = ''
            
            booking_details.append({
                'id': str(booking['id']),
                'user_email': booking['user_email'],
                'user_display_name': user_display_name,  # 新增格式化的顯示名稱
                'time_slot': time_slot_formatted,
                'status': booking['status'],
                'machine_id': str(booking['machine_id']),
                'created_at': booking['created_at'].isoformat() if booking['created_at'] else None
            })
        
        # 從 session 或 request headers 獲取當前用戶郵箱
        current_user_email = request.headers.get('X-User-Email', '')
        
        # 清理和標準化用戶郵箱
        current_user_email = current_user_email.strip().lower() if current_user_email else ''
        
        logger.info(f"Retrieved {len(bookings)} active bookings for machine {machine_id}")
        logger.info(f"Current user email from header: '{current_user_email}'")
        
        # 額外的安全檢查：確保用戶郵箱不為空
        if not current_user_email:
            logger.warning("No user email provided in request headers")
            return jsonify({
                'bookedSlots': booked_slots,
                'bookingDetails': [],  # 不返回詳細信息
                'currentUserEmail': '',
                'error': 'User authentication required'
            }), 200
        
        # 分析當前用戶的連續預約情況
        cooldown_slots = []
        usage_info = {}
        
        # 處理預約詳情顯示，其他用戶顯示格式化姓名
        safe_booking_details = []
        for detail in booking_details:
            detail_copy = detail.copy()
            # 標準化預約用戶郵箱用於比較
            booking_user_email = (detail['user_email'] or '').strip().lower()
            
            # 如果不是自己的預約，隱藏用戶郵箱但顯示格式化姓名
            if booking_user_email != current_user_email:
                detail_copy['user_email'] = 'hidden'  # 隱藏其他用戶的郵箱
                # user_display_name 保持不變，顯示格式化的姓名
            
            safe_booking_details.append(detail_copy)
        
        # 分析當前用戶的滾動窗口使用情況（替代舊的連續預約分析）
        rolling_window_info = {}
        
        if current_user_email:
            # 先檢查機器的restriction_status
            cur.execute("SELECT restriction_status FROM machines WHERE id = %s", (machine_id,))
            machine = cur.fetchone()
            
            if machine and machine['restriction_status'] == 'limited':
                # 只有在限制狀態為"limited"時才查詢限制信息
                rolling_window_info = get_user_rolling_window_status(
                    current_user_email, machine_id, cur
                )
                logger.info(f"Rolling window status for user {current_user_email}: {rolling_window_info}")
            elif machine and machine['restriction_status'] == 'blocked':
                # 機器被阻止
                rolling_window_info = {
                    'has_limit': False,
                    'blocked': True,
                    'blocked_reason': '此機器目前被管理員完全封鎖'
                }
            else:
                # restriction_status為"none"或機器不存在，不應用限制
                rolling_window_info = {
                    'has_limit': False
                }
                logger.info(f"Machine {machine_id} has no restrictions or restriction_status is 'none'")
        
        return jsonify({
            'bookedSlots': booked_slots,
            'bookingDetails': safe_booking_details,
            'currentUserEmail': current_user_email,
            'cooldownSlots': [],  # 新滾動窗口機制不使用固定冷卻期
            'usageInfo': rolling_window_info  # 使用滾動窗口狀態信息
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/users/<user_email>/bookings', methods=['GET'])
def get_user_bookings(user_email):
    """
    獲取指定用戶的所有預約記錄
    """
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 首先檢查用戶是否存在
        cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
        user = cur.fetchone()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # 獲取預約記錄，按開始時間倒序排列
        cur.execute("""
            SELECT 
                b.id,
                b.machine_id,
                m.name as machine_name,
                m.description as machine_description,
                b.time_slot as start_time,
                (b.time_slot + INTERVAL '4 hours') as end_time,
                b.status,
                b.created_at,
                b.updated_at
            FROM bookings b
            JOIN machines m ON b.machine_id = m.id
            WHERE b.user_email = %s
            ORDER BY b.time_slot DESC
        """, (user_email,))
        
        bookings = cur.fetchall()
        
        # 轉換為前端需要的格式，確保時間是ISO字符串
        booking_list = []
        for booking in bookings:
            # 確保時間欄位是台北時間並轉換為ISO字符串
            start_time = booking['start_time']
            end_time = booking['end_time']
            
            # 處理時間轉換
            if start_time:
                if start_time.tzinfo is None:
                    start_time = TAIPEI_TZ.localize(start_time)
                else:
                    start_time = start_time.astimezone(TAIPEI_TZ)
                start_time_iso = start_time.isoformat()
            else:
                start_time_iso = None
                
            if end_time:
                if end_time.tzinfo is None:
                    end_time = TAIPEI_TZ.localize(end_time)
                else:
                    end_time = end_time.astimezone(TAIPEI_TZ)
                end_time_iso = end_time.isoformat()
            else:
                end_time_iso = None
            
            booking_list.append({
                'id': str(booking['id']),
                'machine_id': str(booking['machine_id']),
                'machine_name': booking['machine_name'],
                'machine_description': booking['machine_description'],
                'start_time': start_time_iso,
                'end_time': end_time_iso,
                'status': booking['status'],
                'created_at': booking['created_at'].isoformat() if booking['created_at'] else None,
                'updated_at': booking['updated_at'].isoformat() if booking['updated_at'] else None
            })
        
        return jsonify({
            'bookings': booking_list
        }), 200
        
    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error'}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()


@app.route('/bookings/calendar-view', methods=['GET'])
def get_calendar_view_bookings():
    """
    專門為日曆頁面提供的API
    返回格式化用戶姓名和完整預約資訊
    與預約介面的API分離，避免洩露敏感資訊
    """
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取查詢參數
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        machine_ids = request.args.getlist('machine_ids')  # 支援多個機器ID
        
        # 建構查詢條件
        query = """
            SELECT 
                b.id,
                b.machine_id,
                b.user_email,
                u.name as user_name,
                b.time_slot,
                b.status,
                b.created_at,
                m.name as machine_name
            FROM bookings b
            LEFT JOIN users u ON b.user_email = u.email
            LEFT JOIN machines m ON b.machine_id = m.id
            WHERE b.status = 'active'
        """
        params = []
        
        # 添加日期篩選
        if start_date and end_date:
            # 確保包含結束日期的所有時間 (到23:59:59)
            query += " AND DATE(b.time_slot) BETWEEN %s AND %s"
            params.extend([start_date, end_date])
        
        # 添加機器篩選
        if machine_ids:
            placeholders = ','.join(['%s'] * len(machine_ids))
            query += f" AND b.machine_id IN ({placeholders})"
            params.extend(machine_ids)
        
        query += " ORDER BY b.time_slot"
        
        cur.execute(query, params)
        bookings = cur.fetchall()
        
        # 格式化資料
        calendar_bookings = []
        for booking in bookings:
            # 處理時間格式
            time_slot_dt = booking['time_slot']
            if time_slot_dt.tzinfo is None:
                time_slot_dt = TAIPEI_TZ.localize(time_slot_dt)
            else:
                time_slot_dt = time_slot_dt.astimezone(TAIPEI_TZ)
            
            # 格式化用戶姓名以保護隱私
            raw_user_name = booking.get('user_name', '')
            if not raw_user_name or raw_user_name.strip() == '':
                # 從郵箱生成格式化姓名
                user_email = booking['user_email'] or ''
                if user_email:
                    email_username = user_email.split('@')[0]
                    if len(email_username) >= 2:
                        if len(email_username) == 2:
                            user_display_name = email_username[0] + 'O'
                        else:
                            user_display_name = email_username[0] + 'O' + email_username[-1]
                    else:
                        user_display_name = email_username + 'O'
                else:
                    user_display_name = '匿名用戶'
            else:
                user_display_name = format_user_name_for_display(raw_user_name)
            
            # 處理created_at時間
            created_at_iso = None
            if booking['created_at']:
                created_at_dt = booking['created_at']
                if created_at_dt.tzinfo is None:
                    created_at_dt = TAIPEI_TZ.localize(created_at_dt)
                else:
                    created_at_dt = created_at_dt.astimezone(TAIPEI_TZ)
                created_at_iso = created_at_dt.isoformat()
            
            calendar_bookings.append({
                'id': str(booking['id']),
                'machine_id': str(booking['machine_id']),
                'machine_name': booking['machine_name'],
                'user_email': 'hidden',  # 隱藏真實郵箱
                'user_display_name': user_display_name,  # 顯示格式化姓名
                'time_slot': time_slot_dt.strftime('%Y-%m-%d-%H:%M'),
                'status': booking['status'],
                'created_at': created_at_iso
            })
        
        logger.info(f"Retrieved {len(calendar_bookings)} calendar view bookings")
        return jsonify({
            'bookings': calendar_bookings,
            'total': len(calendar_bookings)
        }), 200
        
    except psycopg2.Error as e:
        logger.error(f"Database error in calendar view bookings: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error in calendar view bookings: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/users/<user_email>/bookings/monthly', methods=['GET'])
def get_user_monthly_bookings(user_email):
    """
    獲取指定用戶的月度預約記錄
    """
    try:
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        
        if not year or not month:
            return jsonify({'error': 'Year and month parameters are required'}), 400
        
        if month < 1 or month > 12:
            return jsonify({'error': 'Month must be between 1 and 12'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 首先檢查用戶是否存在
        cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
        user = cur.fetchone()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # 獲取指定月份的預約記錄
        cur.execute("""
            SELECT 
                b.id,
                b.machine_id,
                m.name as machine_name,
                m.description as machine_description,
                b.time_slot as start_time,
                (b.time_slot + INTERVAL '4 hours') as end_time,
                b.status,
                b.created_at,
                b.updated_at
            FROM bookings b
            JOIN machines m ON b.machine_id = m.id
            WHERE b.user_email = %s
            AND EXTRACT(YEAR FROM b.time_slot) = %s
            AND EXTRACT(MONTH FROM b.time_slot) = %s
            ORDER BY b.time_slot ASC
        """, (user_email, year, month))
        
        bookings = cur.fetchall()
        
        # 轉換為前端需要的格式，確保時間是ISO字符串
        booking_list = []
        for booking in bookings:
            # 確保時間欄位是台北時間並轉換為ISO字符串
            start_time = booking['start_time']
            end_time = booking['end_time']
            
            # 處理時間轉換
            if start_time:
                if start_time.tzinfo is None:
                    start_time = TAIPEI_TZ.localize(start_time)
                else:
                    start_time = start_time.astimezone(TAIPEI_TZ)
                start_time_iso = start_time.isoformat()
            else:
                start_time_iso = None
                
            if end_time:
                if end_time.tzinfo is None:
                    end_time = TAIPEI_TZ.localize(end_time)
                else:
                    end_time = end_time.astimezone(TAIPEI_TZ)
                end_time_iso = end_time.isoformat()
            else:
                end_time_iso = None
            
            booking_list.append({
                'id': str(booking['id']),
                'machine_id': str(booking['machine_id']),
                'machine_name': booking['machine_name'],
                'machine_description': booking['machine_description'],
                'start_time': start_time_iso,
                'end_time': end_time_iso,
                'status': booking['status'],
                'created_at': booking['created_at'].isoformat() if booking['created_at'] else None,
                'updated_at': booking['updated_at'].isoformat() if booking['updated_at'] else None
            })
        
        logger.info(f"User {user_email} retrieved monthly bookings for {year}-{month}: {len(booking_list)} bookings")
        
        return jsonify({
            'bookings': booking_list,
            'year': year,
            'month': month,
            'total_count': len(booking_list)
        }), 200
        
    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/bookings/<int:booking_id>', methods=['DELETE', 'OPTIONS'])
def admin_delete_booking(booking_id):
    """
    管理員刪除預約（完全刪除記錄）
    可以刪除任何用戶的預約，無論狀態如何
    需要manager或admin權限
    注意：這會完全刪除預約記錄和相關的使用記錄
    """
    if request.method == 'OPTIONS':
        # 處理CORS預檢請求
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Email')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        return response
    
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查預約是否存在並獲取詳細信息
        cur.execute("""
            SELECT 
                b.id, 
                b.user_email, 
                b.machine_id,
                b.time_slot,
                b.status,
                b.created_at,
                m.name as machine_name,
                u.name as user_name
            FROM bookings b
            JOIN machines m ON b.machine_id = m.id
            LEFT JOIN users u ON b.user_email = u.email
            WHERE b.id = %s
        """, (booking_id,))
        
        booking = cur.fetchone()
        
        if not booking:
            return jsonify({
                'error': 'Booking not found',
                'message': f'找不到預約編號 {booking_id}',
                'booking_id': booking_id
            }), 404
        
        # 記錄刪除前的詳細信息（用於日誌）
        booking_info = {
            'id': booking['id'],
            'user_email': booking['user_email'],
            'user_name': booking['user_name'],
            'machine_id': booking['machine_id'],
            'machine_name': booking['machine_name'],
            'time_slot': booking['time_slot'].isoformat() if booking['time_slot'] else None,
            'status': booking['status'],
            'created_at': booking['created_at'].isoformat() if booking['created_at'] else None
        }
        
        # 開始事務刪除
        # 1. 刪除相關的使用記錄
        cur.execute("DELETE FROM user_machine_usage WHERE booking_id = %s", (booking_id,))
        deleted_usage_records = cur.rowcount
        
        # 2. 刪除預約記錄本身
        cur.execute("DELETE FROM bookings WHERE id = %s", (booking_id,))
        
        if cur.rowcount == 0:
            # 這種情況理論上不應該發生，因為我們已經檢查過存在性
            return jsonify({
                'error': 'Failed to delete booking',
                'message': '刪除預約失敗，預約可能已被其他操作刪除'
            }), 400
        
        conn.commit()
        
        # 格式化時間用於日誌和響應
        time_slot_formatted = ''
        if booking['time_slot']:
            time_slot_dt = booking['time_slot']
            if time_slot_dt.tzinfo is None:
                time_slot_dt = TAIPEI_TZ.localize(time_slot_dt)
            else:
                time_slot_dt = time_slot_dt.astimezone(TAIPEI_TZ)
            time_slot_formatted = time_slot_dt.strftime("%Y/%m/%d %H:%M")
        
        logger.info(f"Admin {admin_email} deleted booking: ID {booking_id}")
        logger.info(f"  - User: {booking['user_name']} ({booking['user_email']})")
        logger.info(f"  - Machine: {booking['machine_name']} (ID: {booking['machine_id']})")
        logger.info(f"  - Time slot: {time_slot_formatted}")
        logger.info(f"  - Status: {booking['status']}")
        logger.info(f"  - Deleted {deleted_usage_records} usage records")
        
        return jsonify({
            'success': True,
            'message': f'預約已成功刪除',
            'details': {
                'booking_id': booking_id,
                'user_name': booking['user_name'],
                'user_email': booking['user_email'],
                'machine_name': booking['machine_name'],
                'time_slot': time_slot_formatted,
                'status': booking['status'],
                'deleted_usage_records': deleted_usage_records,
                'deleted_by': admin_email,
                'deleted_at': get_taipei_now().strftime("%Y/%m/%d %H:%M:%S")
            },
            'booking_info': booking_info
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        if 'conn' in locals():
            conn.rollback()
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# =========== 機器API ===========

@app.route('/machines', methods=['GET'])
def get_machines():
    """
    獲取所有機器列表
    如果請求者是管理員，返回包含限制信息的完整數據
    如果是一般用戶，根據限制規則過濾機器
    """
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查是否為管理員請求
        admin_email = request.headers.get('X-Admin-Email', '')
        is_admin, admin_role = verify_admin_permission(admin_email) if admin_email else (False, None)
        
        # 獲取用戶email（用於限制檢查）
        user_email = request.headers.get('X-User-Email', '')
        
        if is_admin:
            # 管理員請求：返回包含限制信息的完整數據
            cur.execute("""
                SELECT 
                    m.id,
                    m.name,
                    m.description,
                    m.status,
                    m.restriction_status,
                    m.created_at,
                    m.updated_at,
                    COUNT(mr.id) as restriction_count
                FROM machines m
                LEFT JOIN machine_restrictions mr ON m.id = mr.machine_id AND mr.is_active = true
                GROUP BY m.id, m.name, m.description, m.status, m.restriction_status, m.created_at, m.updated_at
                ORDER BY m.id
            """)
            
            machines = cur.fetchall()
            
            # 轉換為前端需要的格式（管理員版本）
            machine_list = []
            for machine in machines:
                machine_list.append({
                    'id': str(machine['id']),
                    'name': machine['name'],
                    'description': machine['description'],
                    'status': machine['status'],
                    'restriction_status': machine['restriction_status'],
                    'restriction_count': machine['restriction_count'],
                    'created_at': machine['created_at'].isoformat() if machine['created_at'] else None,
                    'updated_at': machine['updated_at'].isoformat() if machine['updated_at'] else None
                })
            
            logger.info(f"Admin {admin_email} retrieved {len(machine_list)} machines")
            
            return jsonify({
                'machines': machine_list,
                'total': len(machine_list),
                'admin_role': admin_role
            }), 200
        else:
            # 一般用戶請求：返回基本數據並包含限制資訊，不過濾機器
            cur.execute("""
                SELECT id, name, description, status, restriction_status 
                FROM machines 
                WHERE status IN ('active', 'maintenance')
                ORDER BY id
            """)
            
            machines = cur.fetchall()
            
            # 轉換為前端需要的格式並添加限制資訊
            machine_list = []
            for machine in machines:
                machine_id = machine['id']
                machine_data = {
                    'id': str(machine['id']),
                    'name': machine['name'],
                    'description': machine['description'],
                    'status': machine['status'],
                    'restriction_status': machine['restriction_status']
                }
                
                # 如果有用戶email，檢查限制並添加限制資訊
                if user_email:
                    is_allowed, restriction_reason = check_machine_restriction(user_email, machine_id)
                    machine_data['is_restricted'] = not is_allowed
                    machine_data['restriction_reason'] = restriction_reason
                    
                    if not is_allowed:
                        logger.info(f"User {user_email} has restriction on machine {machine_id}: {restriction_reason}")
                else:
                    machine_data['is_restricted'] = False
                    machine_data['restriction_reason'] = None
                
                machine_list.append(machine_data)
            
            logger.info(f"User {user_email} retrieved {len(machine_list)} machines (including restricted ones)")
            
            return jsonify(machine_list), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/machines/<int:machine_id>', methods=['PUT', 'OPTIONS'])
def handle_machine_update(machine_id):
    """
    處理機器更新的PUT請求和OPTIONS預檢請求
    """
    if request.method == 'OPTIONS':
        # 處理CORS預檢請求
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Email')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        return response
    elif request.method == 'PUT':
        return update_machine_simple(machine_id)

def update_machine_simple(machine_id):
    """
    更新機器信息（統一路由）
    需要管理員權限
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        status = data.get('status')
        restriction_status = data.get('restriction_status')
        
        # 驗證必要欄位
        if not name or not description:
            return jsonify({'error': 'Missing required fields: name, description'}), 400
        
        if status not in ['active', 'maintenance', 'limited']:
            return jsonify({'error': 'Invalid status. Must be one of: active, maintenance, limited'}), 400
            
        if restriction_status not in ['none', 'limited', 'blocked']:
            return jsonify({'error': 'Invalid restriction_status. Must be one of: none, limited, blocked'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查機器是否存在
        cur.execute("SELECT id FROM machines WHERE id = %s", (machine_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Machine not found'}), 404
        
        # 更新機器
        cur.execute("""
            UPDATE machines 
            SET name = %s, description = %s, status = %s, restriction_status = %s, updated_at = %s
            WHERE id = %s
        """, (
            name, 
            description, 
            status,
            restriction_status,
            get_taipei_now().replace(tzinfo=None),
            machine_id
        ))
        
        conn.commit()
        
        logger.info(f"Admin {admin_email} updated machine ID {machine_id}")
        
        return jsonify({
            'message': 'Machine updated successfully'
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/machines/<int:machine_id>/restrictions', methods=['GET', 'POST', 'OPTIONS'])
def handle_machine_restrictions(machine_id):
    """
    處理機器限制的GET和POST請求，以及OPTIONS預檢請求
    """
    if request.method == 'OPTIONS':
        # 處理CORS預檢請求
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Email')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        return response
    elif request.method == 'GET':
        return get_machine_restrictions_simple(machine_id)
    elif request.method == 'POST':
        return create_machine_restriction_simple(machine_id)

def get_machine_restrictions_simple(machine_id):
    """
    獲取機器的限制規則（統一路由）
    一般用戶也可以查看，不需要管理員權限
    """
    try:
        # 移除管理員權限檢查，讓一般用戶也能查看限制規則
        # admin_email = request.headers.get('X-Admin-Email', '')
        # is_authorized, admin_role = verify_admin_permission(admin_email)
        
        # if not is_authorized:
        #     return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取機器的限制規則（只顯示活動的和用戶需要知道的信息）
        cur.execute("""
            SELECT 
                id,
                restriction_type,
                restriction_rule,
                is_active,
                start_time,
                end_time,
                created_at,
                updated_at
            FROM machine_restrictions
            WHERE machine_id = %s AND is_active = true
            ORDER BY created_at DESC
        """, (machine_id,))
        
        restrictions = cur.fetchall()
        
        # 轉換為前端需要的格式，並確保描述使用新格式
        restriction_list = []
        for restriction in restrictions:
            restriction_data = {
                'id': str(restriction['id']),
                'restriction_type': restriction['restriction_type'],
                'restriction_rule': restriction['restriction_rule'],
                'is_active': restriction['is_active'],
                'start_time': restriction['start_time'].isoformat() if restriction['start_time'] else None,
                'end_time': restriction['end_time'].isoformat() if restriction['end_time'] else None,
                'created_at': restriction['created_at'].isoformat() if restriction['created_at'] else None,
                'updated_at': restriction['updated_at'].isoformat() if restriction['updated_at'] else None
            }
            
            # 解析並標準化描述格式
            try:
                import json
                rule = json.loads(restriction['restriction_rule'])
                
                if restriction['restriction_type'] == 'usage_limit' and rule.get('restriction_type') == 'rolling_window_limit':
                    window_size = rule.get('window_size', 30)
                    max_bookings = rule.get('max_bookings', 18)
                    total_hours = window_size * 4
                    
                    # 確保使用統一的新格式描述
                    standard_description = f"任意連續{window_size}個時段內，最多只能預約{max_bookings}次（窗口大小：{total_hours}小時）"
                    rule['description'] = standard_description
                    
                    # 更新restriction_rule為標準化版本
                    restriction_data['restriction_rule'] = json.dumps(rule, ensure_ascii=False)
                    restriction_data['parsed_description'] = standard_description
                    restriction_data['window_info'] = {
                        'window_size': window_size,
                        'max_bookings': max_bookings,
                        'total_hours': total_hours
                    }
                
            except (json.JSONDecodeError, KeyError):
                # 如果解析失敗，保持原始數據
                pass
            
            restriction_list.append(restriction_data)
        
        logger.info(f"User retrieved {len(restriction_list)} restrictions for machine {machine_id}")
        
        return jsonify({
            'restrictions': restriction_list,
            'total': len(restriction_list),
            'machine_id': str(machine_id)
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def create_machine_restriction_simple(machine_id):
    """
    為機器創建限制規則（統一路由）
    需要管理員權限
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        data = request.get_json()
        restriction_type = data.get('restriction_type')
        restriction_rule = data.get('restriction_rule')
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        
        # 驗證必要欄位
        if not restriction_type or not restriction_rule:
            return jsonify({'error': 'Missing required fields: restriction_type, restriction_rule'}), 400
        
        if not start_time_str or not end_time_str:
            return jsonify({'error': 'Missing required fields: start_time, end_time'}), 400
        
        if restriction_type not in ['year_limit', 'usage_limit']:
            return jsonify({'error': 'Invalid restriction_type. Must be one of: year_limit, usage_limit'}), 400
        
        # 解析時間
        start_time = None
        end_time = None
        
        if start_time_str:
            start_time = parse_frontend_datetime(start_time_str)
            if start_time is None:
                return jsonify({'error': 'Invalid start_time format'}), 400
        
        if end_time_str:
            end_time = parse_frontend_datetime(end_time_str)
            if end_time is None:
                return jsonify({'error': 'Invalid end_time format'}), 400
        
        # 驗證時間邏輯
        if start_time and end_time and start_time >= end_time:
            return jsonify({'error': 'start_time must be before end_time'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查機器是否存在
        cur.execute("SELECT id FROM machines WHERE id = %s", (machine_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Machine not found'}), 404
        
        # 創建限制規則
        cur.execute("""
            INSERT INTO machine_restrictions 
            (machine_id, restriction_type, restriction_rule, start_time, end_time, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (machine_id, restriction_type) 
            DO UPDATE SET 
                restriction_rule = EXCLUDED.restriction_rule,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                is_active = true,
                updated_at = %s
            RETURNING id
        """, (
            machine_id,
            restriction_type,
            restriction_rule,
            start_time.replace(tzinfo=None) if start_time else None,
            end_time.replace(tzinfo=None) if end_time else None,
            get_taipei_now().replace(tzinfo=None),
            get_taipei_now().replace(tzinfo=None)
        ))
        
        restriction_id = cur.fetchone()['id']
        conn.commit()
        
        logger.info(f"Admin {admin_email} created restriction ID {restriction_id} for machine {machine_id}")
        
        return jsonify({
            'id': str(restriction_id),
            'message': 'Machine restriction created successfully'
        }), 201

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/machines/<int:machine_id>/restrictions/<int:restriction_id>', methods=['DELETE', 'OPTIONS'])
def handle_machine_restriction_delete(machine_id, restriction_id):
    """
    處理機器限制的DELETE請求，以及OPTIONS預檢請求
    """
    if request.method == 'OPTIONS':
        # 處理CORS預檢請求
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Email')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        return response
    else:
        return delete_machine_restriction_simple(machine_id, restriction_id)

def delete_machine_restriction_simple(machine_id, restriction_id):
    """
    刪除機器限制規則（統一路由）
    需要管理員權限
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查限制規則是否存在
        cur.execute("SELECT id FROM machine_restrictions WHERE id = %s AND machine_id = %s", (restriction_id, machine_id))
        if not cur.fetchone():
            return jsonify({'error': 'Machine restriction not found'}), 404
        
        # 刪除限制規則
        cur.execute("DELETE FROM machine_restrictions WHERE id = %s", (restriction_id,))
        conn.commit()
        
        logger.info(f"Admin {admin_email} deleted restriction ID {restriction_id} for machine {machine_id}")
        
        return jsonify({
            'message': 'Machine restriction deleted successfully'
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# 新增：批量獲取所有機器限制的端點
@app.route('/machines/restrictions/all', methods=['GET', 'OPTIONS'])
def handle_all_machine_restrictions():
    """
    處理批量獲取所有機器限制的請求，以及OPTIONS預檢請求
    """
    if request.method == 'OPTIONS':
        # 處理CORS預檢請求
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,X-User-Email')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
    else:
        return get_all_machine_restrictions()

def get_all_machine_restrictions():
    """
    批量獲取所有機器的限制規則
    可以供一般用戶查看，不需要管理員權限
    """
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取所有機器的活動限制規則
        cur.execute("""
            SELECT 
                mr.machine_id,
                mr.id,
                mr.restriction_type,
                mr.restriction_rule,
                mr.is_active,
                mr.start_time,
                mr.end_time,
                mr.created_at,
                mr.updated_at
            FROM machine_restrictions mr
            INNER JOIN machines m ON mr.machine_id = m.id
            WHERE mr.is_active = true
            ORDER BY mr.machine_id, mr.created_at DESC
        """)
        
        all_restrictions = cur.fetchall()
        
        # 按機器ID分組限制規則
        restrictions_by_machine = {}
        
        for restriction in all_restrictions:
            machine_id = str(restriction['machine_id'])
            
            if machine_id not in restrictions_by_machine:
                restrictions_by_machine[machine_id] = []
            
            # 轉換為前端需要的格式
            restriction_data = {
                'id': str(restriction['id']),
                'restriction_type': restriction['restriction_type'],
                'restriction_rule': restriction['restriction_rule'],
                'is_active': restriction['is_active'],
                'start_time': restriction['start_time'].isoformat() if restriction['start_time'] else None,
                'end_time': restriction['end_time'].isoformat() if restriction['end_time'] else None,
                'created_at': restriction['created_at'].isoformat() if restriction['created_at'] else None,
                'updated_at': restriction['updated_at'].isoformat() if restriction['updated_at'] else None
            }
            
            # 解析並標準化描述格式（和單個機器限制API保持一致）
            try:
                import json
                rule = json.loads(restriction['restriction_rule'])
                
                if restriction['restriction_type'] == 'usage_limit' and rule.get('restriction_type') == 'rolling_window_limit':
                    window_size = rule.get('window_size', 30)
                    max_bookings = rule.get('max_bookings', 18)
                    total_hours = window_size * 4
                    
                    # 確保使用統一的新格式描述
                    standard_description = f"任意連續{window_size}個時段內，最多只能預約{max_bookings}次（窗口大小：{total_hours}小時）"
                    rule['description'] = standard_description
                    
                    # 更新restriction_rule為標準化版本
                    restriction_data['restriction_rule'] = json.dumps(rule, ensure_ascii=False)
                    restriction_data['parsed_description'] = standard_description
                    restriction_data['window_info'] = {
                        'window_size': window_size,
                        'max_bookings': max_bookings,
                        'total_hours': total_hours
                    }
                
            except (json.JSONDecodeError, KeyError):
                # 如果解析失敗，保持原始數據
                pass
            
            restrictions_by_machine[machine_id].append(restriction_data)
        
        # 計算統計資訊
        total_machines_with_restrictions = len(restrictions_by_machine)
        total_restrictions = len(all_restrictions)
        
        logger.info(f"Retrieved restrictions for {total_machines_with_restrictions} machines, total {total_restrictions} restrictions")
        
        return jsonify({
            'restrictions': restrictions_by_machine,
            'summary': {
                'total_machines_with_restrictions': total_machines_with_restrictions,
                'total_restrictions': total_restrictions,
                'machines_with_restrictions': list(restrictions_by_machine.keys())
            }
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# =========== 管理員 API ===========

def verify_admin_permission(admin_email):
    """
    驗證管理員權限
    返回：(is_authorized, role) 
    """
    if not admin_email:
        return False, None
    
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 解碼email（處理URL編碼）
        decoded_email = unquote(admin_email)
        
        cur.execute("SELECT role FROM users WHERE email = %s", (decoded_email,))
        user = cur.fetchone()
        
        if not user:
            logger.warning(f"Admin verification failed: user not found for email {decoded_email}")
            return False, None
        
        role = user['role']
        if role in ['manager', 'admin']:
            logger.info(f"Admin permission granted for {decoded_email} with role {role}")
            return True, role
        else:
            logger.warning(f"Admin permission denied for {decoded_email} with role {role}")
            return False, role
            
    except Exception as e:
        logger.error(f"Error verifying admin permission: {e}")
        return False, None
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/users', methods=['GET'])
def get_all_users():
    """
    管理員獲取所有用戶列表
    只有manager和admin角色可以訪問
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取所有用戶
        cur.execute("""
            SELECT id, name, email, role, created_at
            FROM users 
            ORDER BY created_at DESC
        """)
        
        users = cur.fetchall()
        
        # 轉換為前端需要的格式
        user_list = []
        for user in users:
            user_list.append({
                'id': str(user['id']),
                'name': user['name'],
                'email': user['email'],
                'role': user['role'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            })
        
        logger.info(f"Admin {admin_email} retrieved {len(user_list)} users")
        
        return jsonify({
            'users': user_list,
            'total': len(user_list),
            'admin_role': admin_role
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/bookings', methods=['GET'])
def get_all_bookings():
    """
    管理員獲取所有預約列表
    包含用戶姓名和機器信息
    只有manager和admin角色可以訪問
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取所有預約，包含用戶和機器信息
        cur.execute("""
            SELECT 
                b.id,
                b.user_email,
                u.name as user_name,
                b.machine_id,
                m.name as machine_name,
                m.description as machine_description,
                b.time_slot,
                b.status,
                b.created_at,
                b.updated_at
            FROM bookings b
            JOIN users u ON b.user_email = u.email
            JOIN machines m ON b.machine_id = m.id
            ORDER BY b.created_at DESC
        """)
        
        bookings = cur.fetchall()
        
        # 轉換為前端需要的格式
        booking_list = []
        for booking in bookings:
            # 確保time_slot被視為台北時間
            time_slot_dt = booking['time_slot']
            if time_slot_dt.tzinfo is None:
                time_slot_dt = TAIPEI_TZ.localize(time_slot_dt)
            else:
                time_slot_dt = time_slot_dt.astimezone(TAIPEI_TZ)
            
            # 計算結束時間（加4小時）
            end_time_dt = time_slot_dt + timedelta(hours=4)
            
            booking_list.append({
                'id': str(booking['id']),
                'user_email': booking['user_email'],
                'user_name': booking['user_name'],
                'machine_id': str(booking['machine_id']),
                'machine_name': booking['machine_name'],
                'machine_description': booking['machine_description'],
                'start_time': time_slot_dt.isoformat(),
                'end_time': end_time_dt.isoformat(),
                'status': booking['status'],
                'created_at': booking['created_at'].isoformat() if booking['created_at'] else None,
                'updated_at': booking['updated_at'].isoformat() if booking['updated_at'] else None
            })
        
        logger.info(f"Admin {admin_email} retrieved {len(booking_list)} bookings")
        
        return jsonify({
            'bookings': booking_list,
            'total': len(booking_list),
            'admin_role': admin_role
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/bookings/active', methods=['GET'])
def get_active_bookings():
    """
    管理員獲取有效預約列表
    只返回 'active' 狀態的預約，按時間順序排列
    包含用戶姓名和機器信息
    只有manager和admin角色可以訪問
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取所有有效預約，按時間順序排列
        cur.execute("""
            SELECT 
                b.id,
                b.user_email,
                u.name as user_name,
                b.machine_id,
                m.name as machine_name,
                m.description as machine_description,
                b.time_slot,
                b.status,
                b.created_at,
                b.updated_at
            FROM bookings b
            JOIN users u ON b.user_email = u.email
            JOIN machines m ON b.machine_id = m.id
            WHERE b.status = 'active'
            ORDER BY b.time_slot ASC
        """)
        
        bookings = cur.fetchall()
        
        # 轉換為前端需要的格式
        booking_list = []
        for booking in bookings:
            # 確保time_slot被視為台北時間
            time_slot_dt = booking['time_slot']
            if time_slot_dt.tzinfo is None:
                time_slot_dt = TAIPEI_TZ.localize(time_slot_dt)
            else:
                time_slot_dt = time_slot_dt.astimezone(TAIPEI_TZ)
            
            # 計算結束時間（加4小時）
            end_time_dt = time_slot_dt + timedelta(hours=4)
            
            booking_list.append({
                'id': str(booking['id']),
                'user_email': booking['user_email'],
                'user_name': booking['user_name'],
                'machine_id': str(booking['machine_id']),
                'machine_name': booking['machine_name'],
                'machine_description': booking['machine_description'],
                'start_time': time_slot_dt.isoformat(),
                'end_time': end_time_dt.isoformat(),
                'status': booking['status'],
                'created_at': booking['created_at'].isoformat() if booking['created_at'] else None,
                'updated_at': booking['updated_at'].isoformat() if booking['updated_at'] else None
            })
        
        logger.info(f"Admin {admin_email} retrieved {len(booking_list)} active bookings")
        
        return jsonify({
            'bookings': booking_list,
            'total': len(booking_list),
            'admin_role': admin_role
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/bookings/monthly', methods=['GET'])
def get_monthly_booking_stats():
    """
    管理員獲取指定月份的預約統計
    按日期分組，返回每日的預約統計信息
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        # 獲取年月參數
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        
        if not year or not month:
            now = get_taipei_now()
            year = year or now.year
            month = month or now.month
        
        # 計算月份的開始和結束日期
        from calendar import monthrange
        start_date = datetime(year, month, 1)
        days_in_month = monthrange(year, month)[1]
        end_date = datetime(year, month, days_in_month, 23, 59, 59)
        
        # 台北時區處理
        start_date = TAIPEI_TZ.localize(start_date)
        end_date = TAIPEI_TZ.localize(end_date)
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取該月份所有預約，按日期分組統計
        cur.execute("""
            SELECT 
                DATE(b.time_slot) as booking_date,
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN b.status = 'active' THEN 1 END) as active_bookings,
                COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                ARRAY_AGG(
                    JSON_BUILD_OBJECT(
                        'id', b.id,
                        'user_name', u.name,
                        'user_email', b.user_email,
                        'machine_name', m.name,
                        'machine_id', b.machine_id,
                        'time_slot', to_char(b.time_slot, 'HH24:MI'),
                        'status', b.status
                    ) ORDER BY b.time_slot
                ) as bookings
            FROM bookings b
            JOIN users u ON b.user_email = u.email
            JOIN machines m ON b.machine_id = m.id
            WHERE b.time_slot >= %s AND b.time_slot <= %s
            GROUP BY DATE(b.time_slot)
            ORDER BY booking_date
        """, (start_date.replace(tzinfo=None), end_date.replace(tzinfo=None)))
        
        booking_stats = cur.fetchall()
        
        # 轉換為前端需要的格式
        monthly_data = {}
        for stat in booking_stats:
            date_str = stat['booking_date'].strftime('%Y-%m-%d')
            monthly_data[date_str] = {
                'date': date_str,
                'total_bookings': stat['total_bookings'],
                'active_bookings': stat['active_bookings'],
                'cancelled_bookings': stat['cancelled_bookings'],
                'bookings': stat['bookings']
            }
        
        logger.info(f"Admin {admin_email} retrieved monthly booking stats for {year}-{month}")
        
        return jsonify({
            'year': year,
            'month': month,
            'daily_stats': monthly_data,
            'total_days_with_bookings': len(monthly_data)
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/notifications', methods=['GET'])
def get_all_notifications():
    """
    管理員獲取所有通知列表
    包含創建者信息
    只有manager和admin角色可以訪問
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取所有通知，包含創建者信息
        cur.execute("""
            SELECT 
                n.id,
                n.content,
                n.level,
                n.start_time,
                n.end_time,
                n.creator_id,
                u.name as creator_name,
                u.email as creator_email,
                n.created_at,
                n.updated_at
            FROM notifications n
            JOIN users u ON n.creator_id = u.id
            ORDER BY n.created_at DESC
        """)
        
        notifications = cur.fetchall()
        
        # 轉換為前端需要的格式
        notification_list = []
        for notification in notifications:
            notification_list.append({
                'id': str(notification['id']),
                'content': notification['content'],
                'level': notification['level'],  # 直接使用中文等級值
                'start_time': notification['start_time'].isoformat() if notification['start_time'] else None,
                'end_time': notification['end_time'].isoformat() if notification['end_time'] else None,
                'created_at': notification['created_at'].isoformat() if notification['created_at'] else None
            })
        
        logger.info(f"Admin {admin_email} retrieved {len(notification_list)} notifications")
        
        return jsonify({
            'notifications': notification_list,
            'total': len(notification_list),
            'admin_role': admin_role
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/notifications', methods=['POST'])
def create_notification():
    """
    創建新通知
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        data = request.get_json()
        content = data.get('content')
        level = data.get('level')
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        
        # 驗證必要欄位
        if not content or not level:
            return jsonify({'error': 'Missing required fields: content, level'}), 400
        
        if level not in ['低', '中', '高']:
            return jsonify({'error': 'Invalid level. Must be one of: 低, 中, 高'}), 400
        
        # 轉換等級為資料庫格式
        db_level = level  # 直接使用中文等級值
        
        # 解析時間
        start_time = None
        end_time = None
        
        if start_time_str:
            start_time = parse_frontend_datetime(start_time_str)
            if start_time is None:
                return jsonify({'error': 'Invalid start_time format'}), 400
        
        if end_time_str:
            end_time = parse_frontend_datetime(end_time_str)
            if end_time is None:
                return jsonify({'error': 'Invalid end_time format'}), 400
        
        # 驗證時間邏輯
        if start_time and end_time and start_time >= end_time:
            return jsonify({'error': 'start_time must be before end_time'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取創建者ID
        decoded_admin_email = unquote(admin_email)
        cur.execute("SELECT id FROM users WHERE email = %s", (decoded_admin_email,))
        admin_user = cur.fetchone()
        
        if not admin_user:
            return jsonify({'error': 'Admin user not found'}), 404
        
        creator_id = admin_user['id']
        
        # 創建通知
        cur.execute("""
            INSERT INTO notifications (content, level, start_time, end_time, creator_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            content, 
            db_level, 
            start_time.replace(tzinfo=None) if start_time else None,
            end_time.replace(tzinfo=None) if end_time else None,
            creator_id,
            get_taipei_now().replace(tzinfo=None)
        ))
        
        notification_id = cur.fetchone()['id']
        conn.commit()
        
        logger.info(f"Admin {admin_email} created notification ID {notification_id}")
        
        return jsonify({
            'id': str(notification_id),
            'message': 'Notification created successfully'
        }), 201

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/notifications/<int:notification_id>', methods=['PUT'])
def update_notification(notification_id):
    """
    更新通知
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        data = request.get_json()
        content = data.get('content')
        level = data.get('level')
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        
        # 驗證必要欄位
        if not content or not level:
            return jsonify({'error': 'Missing required fields: content, level'}), 400
        
        if level not in ['低', '中', '高']:
            return jsonify({'error': 'Invalid level. Must be one of: 低, 中, 高'}), 400
        
        # 轉換等級為資料庫格式
        db_level = level
        
        # 解析時間
        start_time = None
        end_time = None
        
        if start_time_str:
            start_time = parse_frontend_datetime(start_time_str)
            if start_time is None:
                return jsonify({'error': 'Invalid start_time format'}), 400
        
        if end_time_str:
            end_time = parse_frontend_datetime(end_time_str)
            if end_time is None:
                return jsonify({'error': 'Invalid end_time format'}), 400
        
        # 驗證時間邏輯
        if start_time and end_time and start_time >= end_time:
            return jsonify({'error': 'start_time must be before end_time'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查通知是否存在
        cur.execute("SELECT id FROM notifications WHERE id = %s", (notification_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Notification not found'}), 404
        
        # 更新通知
        cur.execute("""
            UPDATE notifications 
            SET content = %s, level = %s, start_time = %s, end_time = %s, updated_at = %s
            WHERE id = %s
        """, (
            content, 
            db_level, 
            start_time.replace(tzinfo=None) if start_time else None,
            end_time.replace(tzinfo=None) if end_time else None,
            get_taipei_now().replace(tzinfo=None),
            notification_id
        ))
        
        conn.commit()
        
        logger.info(f"Admin {admin_email} updated notification ID {notification_id}")
        
        return jsonify({
            'message': 'Notification updated successfully'
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    """
    刪除通知
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查通知是否存在
        cur.execute("SELECT id FROM notifications WHERE id = %s", (notification_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Notification not found'}), 404
        
        # 刪除通知
        cur.execute("DELETE FROM notifications WHERE id = %s", (notification_id,))
        conn.commit()
        
        logger.info(f"Admin {admin_email} deleted notification ID {notification_id}")
        
        return jsonify({
            'message': 'Notification deleted successfully'
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# =========== 公開通知 API ===========

@app.route('/notifications/active', methods=['GET'])
def get_active_notifications():
    """
    獲取當前有效的通知
    用於首頁顯示，不需要管理員權限
    只返回在有效時間範圍內的通知
    """
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        current_time = get_taipei_now().replace(tzinfo=None)
        
        # 獲取有效通知：
        # 1. 沒有時間限制的通知（start_time 和 end_time 都為 NULL）
        # 2. 在有效時間範圍內的通知
        cur.execute("""
            SELECT 
                id,
                content,
                level,
                start_time,
                end_time,
                created_at
            FROM notifications
            WHERE 
                (start_time IS NULL AND end_time IS NULL) 
                OR 
                (start_time IS NULL AND end_time >= %s)
                OR 
                (start_time <= %s AND end_time IS NULL)
                OR 
                (start_time <= %s AND end_time >= %s)
            ORDER BY 
                CASE level 
                    WHEN '高' THEN 1
                    WHEN '中' THEN 2
                    WHEN '低' THEN 3
                END,
                created_at DESC
        """, (current_time, current_time, current_time, current_time))
        
        notifications = cur.fetchall()
        
        # 轉換為前端需要的格式
        notification_list = []
        for notification in notifications:
            notification_list.append({
                'id': str(notification['id']),
                'content': notification['content'],
                'level': notification['level'],  # 直接使用中文等級值
                'start_time': notification['start_time'].isoformat() if notification['start_time'] else None,
                'end_time': notification['end_time'].isoformat() if notification['end_time'] else None,
                'created_at': notification['created_at'].isoformat() if notification['created_at'] else None
            })
        
        logger.info(f"Retrieved {len(notification_list)} active notifications")
        
        return jsonify({
            'notifications': notification_list,
            'total': len(notification_list)
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# =========== 機器管理 API ===========

@app.route('/admin/machines', methods=['GET'])
def get_all_machines_admin():
    """
    管理員獲取所有機器列表（包含限制信息）
    只有manager和admin角色可以訪問
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取所有機器及其限制信息
        cur.execute("""
            SELECT 
                m.id,
                m.name,
                m.description,
                m.status,
                m.restriction_status,
                m.created_at,
                m.updated_at,
                COUNT(mr.id) as restriction_count
            FROM machines m
            LEFT JOIN machine_restrictions mr ON m.id = mr.machine_id AND mr.is_active = true
            GROUP BY m.id, m.name, m.description, m.status, m.restriction_status, m.created_at, m.updated_at
            ORDER BY m.id
        """)
        
        machines = cur.fetchall()
        
        # 轉換為前端需要的格式
        machine_list = []
        for machine in machines:
            machine_list.append({
                'id': str(machine['id']),
                'name': machine['name'],
                'description': machine['description'],
                'status': machine['status'],
                'restriction_status': machine['restriction_status'],
                'restriction_count': machine['restriction_count'],
                'created_at': machine['created_at'].isoformat() if machine['created_at'] else None,
                'updated_at': machine['updated_at'].isoformat() if machine['updated_at'] else None
            })
        
        logger.info(f"Admin {admin_email} retrieved {len(machine_list)} machines")
        
        return jsonify({
            'machines': machine_list,
            'total': len(machine_list),
            'admin_role': admin_role
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/machines/<int:machine_id>', methods=['PUT'])
def update_machine(machine_id):
    """
    更新機器信息
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized:
            return jsonify({'error': 'Access denied. Manager or admin role required.'}), 403
        
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        status = data.get('status')
        restriction_status = data.get('restriction_status')
        
        # 驗證必要欄位
        if not name or not description:
            return jsonify({'error': 'Missing required fields: name, description'}), 400
        
        if status not in ['active', 'maintenance', 'limited']:
            return jsonify({'error': 'Invalid status. Must be one of: active, maintenance, limited'}), 400
            
        if restriction_status not in ['none', 'limited', 'blocked']:
            return jsonify({'error': 'Invalid restriction_status. Must be one of: none, limited, blocked'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查機器是否存在
        cur.execute("SELECT id FROM machines WHERE id = %s", (machine_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Machine not found'}), 404
        
        # 更新機器
        cur.execute("""
            UPDATE machines 
            SET name = %s, description = %s, status = %s, restriction_status = %s, updated_at = %s
            WHERE id = %s
        """, (
            name, 
            description, 
            status,
            restriction_status,
            get_taipei_now().replace(tzinfo=None),
            machine_id
        ))
        
        conn.commit()
        
        logger.info(f"Admin {admin_email} updated machine ID {machine_id}")
        
        return jsonify({
            'message': 'Machine updated successfully'
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/machines', methods=['POST'])
def create_machine():
    """
    創建新機器
    只有admin角色可以訪問
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized or admin_role != 'admin':
            return jsonify({'error': 'Access denied. Admin role required.'}), 403
        
        data = request.get_json()
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        status = data.get('status', 'active')
        restriction_status = data.get('restriction_status', 'none')
        
        # 驗證必要欄位
        if not name or not description:
            return jsonify({'error': 'Missing required fields: name, description'}), 400
        
        if status not in ['active', 'maintenance', 'limited']:
            return jsonify({'error': 'Invalid status. Must be one of: active, maintenance, limited'}), 400
            
        if restriction_status not in ['none', 'limited', 'blocked']:
            return jsonify({'error': 'Invalid restriction_status. Must be one of: none, limited, blocked'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查機器名稱是否已存在
        cur.execute("SELECT id FROM machines WHERE name = %s", (name,))
        if cur.fetchone():
            return jsonify({'error': 'Machine name already exists'}), 400
        
        # 創建新機器
        current_time = get_taipei_now().replace(tzinfo=None)
        cur.execute("""
            INSERT INTO machines (name, description, status, restriction_status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            name, 
            description, 
            status,
            restriction_status,
            current_time,
            current_time
        ))
        
        machine_id = cur.fetchone()['id']
        conn.commit()
        
        logger.info(f"Admin {admin_email} created new machine: {name} (ID: {machine_id})")
        
        return jsonify({
            'message': 'Machine created successfully',
            'machine_id': machine_id
        }), 201

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/admin/machines/<int:machine_id>', methods=['DELETE'])
def delete_machine(machine_id):
    """
    刪除機器
    只有admin角色可以訪問
    注意：這會刪除所有相關的預約和限制規則
    """
    try:
        # 從header獲取管理員email
        admin_email = request.headers.get('X-Admin-Email', '')
        is_authorized, admin_role = verify_admin_permission(admin_email)
        
        if not is_authorized or admin_role != 'admin':
            return jsonify({'error': 'Access denied. Admin role required.'}), 403
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查機器是否存在
        cur.execute("SELECT id, name FROM machines WHERE id = %s", (machine_id,))
        machine = cur.fetchone()
        if not machine:
            return jsonify({'error': 'Machine not found'}), 404
        
        machine_name = machine['name']
        
        # 檢查是否有進行中的預約
        current_time = get_taipei_now().replace(tzinfo=None)
        cur.execute("""
            SELECT COUNT(*) as active_bookings 
            FROM bookings 
            WHERE machine_id = %s 
            AND status = 'active' 
            AND (time_slot + INTERVAL '4 hours') > %s
        """, (machine_id, current_time))
        
        active_bookings = cur.fetchone()['active_bookings']
        if active_bookings > 0:
            return jsonify({
                'error': 'Cannot delete machine with active future bookings',
                'active_bookings': active_bookings
            }), 400
        
        # 開始事務刪除
        # 1. 刪除機器的限制規則
        cur.execute("DELETE FROM machine_restrictions WHERE machine_id = %s", (machine_id,))
        deleted_restrictions = cur.rowcount
        
        # 2. 刪除機器的使用記錄
        cur.execute("DELETE FROM user_machine_usage WHERE machine_id = %s", (machine_id,))
        deleted_usage_records = cur.rowcount
        
        # 3. 取消所有相關的預約（設為cancelled，不刪除以保留歷史記錄）
        cur.execute("""
            UPDATE bookings 
            SET status = 'cancelled', updated_at = %s
            WHERE machine_id = %s AND status = 'active'
        """, (current_time, machine_id))
        cancelled_bookings = cur.rowcount
        
        # 4. 最後刪除機器本身
        cur.execute("DELETE FROM machines WHERE id = %s", (machine_id,))
        
        conn.commit()
        
        logger.info(f"Admin {admin_email} deleted machine: {machine_name} (ID: {machine_id})")
        logger.info(f"  - Deleted {deleted_restrictions} restrictions")
        logger.info(f"  - Deleted {deleted_usage_records} usage records")
        logger.info(f"  - Cancelled {cancelled_bookings} bookings")
        
        return jsonify({
            'message': 'Machine deleted successfully',
            'machine_name': machine_name,
            'cancelled_bookings': cancelled_bookings,
            'deleted_restrictions': deleted_restrictions,
            'deleted_usage_records': deleted_usage_records
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def parse_email_year(email):
    """
    從email中解析民國年份
    假設email格式為：113xxxx@domain.com
    """
    try:
        # 提取email中的數字部分
        import re
        match = re.match(r'^(\d{3})', email)
        if match:
            year = int(match.group(1))
            return year
    except:
        pass
    return None

def check_machine_restriction(user_email, machine_id):
    """
    檢查用戶是否被限制使用指定機器
    返回：(is_allowed, restriction_reason)
    """
    try:
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 獲取機器的restriction_status
        cur.execute("SELECT restriction_status FROM machines WHERE id = %s", (machine_id,))
        machine = cur.fetchone()
        
        if not machine:
            return False, "機器不存在"
        
        # 如果機器沒有限制，直接允許
        if machine['restriction_status'] == 'none':
            return True, None
        
        # 如果機器完全封鎖，直接拒絕
        if machine['restriction_status'] == 'blocked':
            return False, "此機器目前暫停使用"
        
        # 如果機器有限制，檢查限制規則
        if machine['restriction_status'] == 'limited':
            current_time = get_taipei_now().replace(tzinfo=None)
            
            # 獲取生效中的限制規則
            cur.execute("""
                SELECT restriction_type, restriction_rule, start_time, end_time
                FROM machine_restrictions 
                WHERE machine_id = %s AND is_active = true
                AND (start_time IS NULL OR start_time <= %s)
                AND (end_time IS NULL OR end_time >= %s)
            """, (machine_id, current_time, current_time))
            
            restrictions = cur.fetchall()
            
            for restriction in restrictions:
                restriction_type = restriction['restriction_type']
                restriction_rule_str = restriction['restriction_rule']
                
                try:
                    import json
                    rule = json.loads(restriction_rule_str)
                except:
                    continue
                
                # 檢查年份限制
                if restriction_type == 'year_limit':
                    user_year = parse_email_year(user_email)
                    if user_year is None:
                        continue
                    
                    target_year = rule.get('target_year')
                    operator = rule.get('operator')
                    
                    if target_year and operator:
                        # 執行比較運算 - 修復邏輯使其與前端一致
                        user_is_restricted = False
                        restriction_message = ""
                        
                        if operator == 'gt' and user_year > target_year:
                            user_is_restricted = True
                            restriction_message = f"限制民國{target_year}年以後入學的用戶使用"
                        elif operator == 'gte' and user_year >= target_year:
                            user_is_restricted = True
                            restriction_message = f"限制民國{target_year}年以後入學的用戶使用"
                        elif operator == 'lt' and user_year < target_year:
                            user_is_restricted = True
                            restriction_message = f"限制民國{target_year}年以前入學的用戶使用"
                        elif operator == 'lte' and user_year <= target_year:
                            user_is_restricted = True
                            restriction_message = f"限制民國{target_year}年以前入學的用戶使用"
                        elif operator == 'eq' and user_year == target_year:
                            user_is_restricted = True
                            restriction_message = f"限制民國{target_year}年入學的用戶使用"
                        
                        # 如果用戶受到限制，返回拒絕
                        if user_is_restricted:
                            # 優先使用description，如果沒有則使用默認消息
                            description = rule.get('description', restriction_message)
                            return False, description
                
                # 檢查email格式限制
                elif restriction_type == 'email_pattern':
                    import re
                    pattern = rule.get('pattern', '')
                    if pattern:
                        # 將通配符轉換為正則表達式
                        regex_pattern = pattern.replace('*', '.*')
                        if not re.match(regex_pattern, user_email):
                            return False, f"限制Email格式: {pattern}"
                
                # 檢查使用次數限制
                elif restriction_type == 'usage_limit':
                    # 使用次數限制不阻止查看機器列表，只在預約時檢查
                    # 這裡返回允許，讓用戶可以進入機器頁面查看狀態
                    continue
        
        return True, None
        
    except Exception as e:
        logger.error(f"Error checking machine restriction: {e}")
        return True, None  # 出錯時默認允許，避免影響正常使用
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def check_usage_limit(user_email, machine_id, max_usages, cooldown_period_slots, cooldown_usages, cur):
    """
    檢查使用次數限制（基於連續時間段的冷卻機制）
    返回：{allowed: bool, reason: str, usage_info: dict}
    
    新機制：
    - 連續使用 max_usages 次後
    - 接下來的 cooldown_period_slots 個時間段為冷卻期，不能預約
    - 冷卻期過後重新開始計算連續次數
    """
    try:
        current_time = get_taipei_now().replace(tzinfo=None)
        
        # 獲取用戶在該機器的所有使用記錄，按時間排序
        cur.execute("""
            SELECT usage_time, is_cooldown_usage
            FROM user_machine_usage
            WHERE user_email = %s AND machine_id = %s
            ORDER BY usage_time ASC
        """, (user_email, machine_id))
        
        usage_records = cur.fetchall()
        
        if not usage_records:
            # 沒有使用記錄，可以使用
            return {
                'allowed': True,
                'reason': None,
                'usage_info': {
                    'consecutive_usage_count': 0,
                    'in_cooldown': False,
                    'cooldown_remaining_slots': 0
                }
            }
        
        def datetime_to_slot(dt):
            """將 datetime 轉換為時間段字符串"""
            return f"{dt.strftime('%Y-%m-%d')}-{dt.hour:02d}:00"
        
        def slot_to_datetime(slot_str):
            """將時間段字符串轉換為 datetime"""
            parts = slot_str.split('-')
            if len(parts) >= 4:
                # 格式: YYYY-MM-DD-HH:00
                year, month, day = parts[0], parts[1], parts[2]
                hour = int(parts[3].split(':')[0])
            else:
                # 舊格式處理
                date_part, time_part = slot_str.split('-', 1)
                year, month, day = date_part.split('-')
                hour = int(time_part.split(':')[0])
            return datetime(int(year), int(month), int(day), hour, 0, 0)
        
        def get_next_slot(slot_str):
            """獲取下一個時間段"""
            dt = slot_to_datetime(slot_str)
            next_dt = dt + timedelta(hours=4)
            return datetime_to_slot(next_dt)
        
        def get_previous_slot(slot_str):
            """獲取前一個時間段"""
            dt = slot_to_datetime(slot_str)
            prev_dt = dt - timedelta(hours=4)
            return datetime_to_slot(prev_dt)
        
        # 將使用記錄轉換為時間段列表
        usage_slots = [datetime_to_slot(record['usage_time']) for record in usage_records]
        usage_slots = sorted(set(usage_slots))  # 去重並排序
        
        if not usage_slots:
            return {
                'allowed': True,
                'reason': None,
                'usage_info': {
                    'consecutive_usage_count': 0,
                    'in_cooldown': False,
                    'cooldown_remaining_slots': 0
                }
            }
        
        # 找到所有的連續使用群組，並識別它們的冷卻期
        consecutive_groups = []
        current_group = []
        
        for i, slot in enumerate(usage_slots):
            if not current_group:
                current_group = [slot]
            else:
                # 檢查是否與前一個時間段連續
                prev_slot = get_previous_slot(slot)
                if prev_slot == current_group[-1]:
                    current_group.append(slot)
                else:
                    # 不連續，保存當前群組並開始新的群組
                    if len(current_group) > 0:
                        consecutive_groups.append(current_group)
                    current_group = [slot]
        
        # 添加最後一個群組
        if current_group:
            consecutive_groups.append(current_group)
        
        logger.info(f"Found consecutive groups: {consecutive_groups}")
        
        # 檢查每個群組是否觸發冷卻期，並計算冷卻期範圍
        def calculate_cooldown_slots(group_end_slot):
            """計算群組結束後的冷卻期時間段"""
            cooldown_start_slot = get_next_slot(group_end_slot)
            cooldown_slots = []
            
            current_cooldown_slot = cooldown_start_slot
            for i in range(cooldown_period_slots):
                cooldown_slots.append(current_cooldown_slot)
                current_cooldown_slot = get_next_slot(current_cooldown_slot)
            
            return cooldown_slots
        
        # 找到當前時間對應的時間段
        current_dt = current_time
        # 調整到下一個有效時間段
        if current_dt.hour not in [0, 4, 8, 12, 16, 20]:
            # 找到下一個有效小時
            valid_hours = [0, 4, 8, 12, 16, 20]
            next_valid_hour = None
            for hour in valid_hours:
                if hour > current_dt.hour:
                    next_valid_hour = hour
                    break
            
            if next_valid_hour is None:
                # 今天沒有更晚的時段，移到明天的第一個時段
                current_dt = current_dt.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            else:
                current_dt = current_dt.replace(hour=next_valid_hour, minute=0, second=0, microsecond=0)
        else:
            current_dt = current_dt.replace(minute=0, second=0, microsecond=0)
        
        current_slot = datetime_to_slot(current_dt)
        
        # 檢查當前時間是否在任何冷卻期內
        for group in consecutive_groups:
            if len(group) >= max_usages:
                group_end_slot = group[-1]
                cooldown_slots = calculate_cooldown_slots(group_end_slot)
                
                if current_slot in cooldown_slots:
                    # 在冷卻期內
                    try:
                        cooldown_index = cooldown_slots.index(current_slot)
                        remaining_slots = len(cooldown_slots) - cooldown_index
                    except ValueError:
                        remaining_slots = 0
                    
                    return {
                        'allowed': False,
                        'reason': f'已達到連續使用上限({max_usages}次)，目前處於冷卻期',
                        'usage_info': {
                            'consecutive_usage_count': len(group),
                            'in_cooldown': True,
                            'cooldown_remaining_slots': remaining_slots,
                            'cooldown_slots': cooldown_slots,
                            'current_slot': current_slot
                        }
                    }
        
        # 不在冷卻期內，計算當前的連續使用次數
        # 找到最新的、不會被冷卻期打斷的連續序列
        
        # 從最新時間段開始往前計算連續次數
        latest_slot = usage_slots[-1]
        consecutive_count = 0
        check_slot = latest_slot
        
        # 往前查找連續序列，但要排除已經完成冷卻的舊序列
        for slot in reversed(usage_slots):
            if slot == check_slot:
                consecutive_count += 1
                check_slot = get_previous_slot(check_slot)
            else:
                break
        
        # 檢查這個連續序列是否已經觸發過冷卻期並完成
        if consecutive_count >= max_usages:
            # 計算這個序列的冷卻期
            cooldown_slots = calculate_cooldown_slots(latest_slot)
            cooldown_end_slot = cooldown_slots[-1] if cooldown_slots else latest_slot
            
            # 如果當前時間已經超過冷卻期，說明可以重新開始計算
            if current_slot > cooldown_end_slot:
                # 冷卻期已結束，重新開始計算
                # 查找冷卻期結束後的新使用記錄
                post_cooldown_slots = []
                cooldown_end_dt = slot_to_datetime(cooldown_end_slot)
                
                for slot in usage_slots:
                    slot_dt = slot_to_datetime(slot)
                    if slot_dt > cooldown_end_dt:
                        post_cooldown_slots.append(slot)
                
                if post_cooldown_slots:
                    # 計算冷卻期後的連續使用次數
                    new_consecutive_count = 0
                    check_slot = post_cooldown_slots[-1]
                    
                    for slot in reversed(post_cooldown_slots):
                        if slot == check_slot:
                            new_consecutive_count += 1
                            check_slot = get_previous_slot(check_slot)
                        else:
                            break
                    
                    consecutive_count = new_consecutive_count
                    latest_slot = post_cooldown_slots[-1]  # 更新 latest_slot
                else:
                    consecutive_count = 0
        
        logger.info(f"User {user_email} consecutive usage count: {consecutive_count}")
        
        # 檢查是否達到新的使用上限
        if consecutive_count >= max_usages:
            # 計算當前序列的冷卻期
            current_sequence_end = latest_slot
            cooldown_slots = calculate_cooldown_slots(current_sequence_end)
            
            if current_slot in cooldown_slots:
                # 在新的冷卻期內
                try:
                    cooldown_index = cooldown_slots.index(current_slot)
                    remaining_slots = len(cooldown_slots) - cooldown_index
                except ValueError:
                    remaining_slots = 0
                
                return {
                    'allowed': False,
                    'reason': f'已達到連續使用上限({max_usages}次)，目前處於冷卻期',
                    'usage_info': {
                        'consecutive_usage_count': consecutive_count,
                        'in_cooldown': True,
                        'cooldown_remaining_slots': remaining_slots,
                        'cooldown_slots': cooldown_slots,
                        'current_slot': current_slot
                    }
                }
        
        # 未達到上限或已過冷卻期，可以使用
        return {
            'allowed': True,
            'reason': None,
            'usage_info': {
                'consecutive_usage_count': consecutive_count,
                'in_cooldown': False,
                'cooldown_remaining_slots': 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error in check_usage_limit: {e}")
        return {
            'allowed': True,
            'reason': None,
            'usage_info': {
                'consecutive_usage_count': 0,
                'in_cooldown': False,
                'error': str(e)
            }
        }

def record_machine_usage(user_email, machine_id, booking_id, usage_time, cur):
    """
    記錄用戶機器使用情況
    判斷是否為冷卻期使用並記錄
    """
    try:
        # 檢查是否為冷卻期使用
        is_cooldown_usage = determine_if_cooldown_usage(user_email, machine_id, cur)
        
        # 首先嘗試插入，如果衝突則更新
        cur.execute("""
            INSERT INTO user_machine_usage 
            (user_email, machine_id, booking_id, usage_time, usage_count, is_cooldown_usage)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_email, booking_id) 
            DO UPDATE SET 
                usage_time = EXCLUDED.usage_time,
                usage_count = EXCLUDED.usage_count,
                is_cooldown_usage = EXCLUDED.is_cooldown_usage,
                updated_at = CURRENT_TIMESTAMP
        """, (
            user_email, 
            machine_id, 
            booking_id, 
            usage_time.replace(tzinfo=None), 
            1,  # usage_count 默認為 1
            is_cooldown_usage
        ))
        
        # 檢查是否有行被影響
        if cur.rowcount == 0:
            raise Exception(f"No rows affected when creating usage record for booking {booking_id}")
        
        # 獲取剛才插入或更新的記錄ID
        cur.execute("""
            SELECT id FROM user_machine_usage 
            WHERE user_email = %s AND booking_id = %s
        """, (user_email, booking_id))
        
        result = cur.fetchone()
        if not result:
            raise Exception(f"Failed to retrieve usage record for booking {booking_id}")
        
        # 根據cursor類型處理結果
        if hasattr(result, 'get'):
            # RealDictCursor 結果
            usage_record_id = result.get('id')
            if usage_record_id is None:
                usage_record_id = result['id']  # 嘗試直接訪問
        else:
            # 普通 cursor 結果
            usage_record_id = result[0]
        
        if usage_record_id is None:
            raise Exception(f"Unable to get usage record ID for booking {booking_id}")
        
        logger.info(f"Usage recorded successfully: id={usage_record_id}, user={user_email}, machine={machine_id}, booking={booking_id}, cooldown={is_cooldown_usage}")
        
        return usage_record_id
        
    except Exception as e:
        logger.error(f"Error recording machine usage: {e}")
        import traceback
        traceback.print_exc()
        # 重新拋出異常，讓調用者知道記錄失敗
        raise Exception(f"Failed to record machine usage: {str(e)}")

def determine_if_cooldown_usage(user_email, machine_id, cur):
    """
    判斷當前使用是否為冷卻期使用
    基於新的連續時間段機制，冷卻期內完全禁止使用，所以該函數始終返回 False
    """
    try:
        # 在新的連續時間段機制下，冷卻期內完全禁止預約
        # 因此不會有冷卻期使用的概念，所有預約都是正常使用
        return False
        
    except Exception as e:
        logger.error(f"Error determining cooldown usage: {e}")
        return False

@app.route('/machines/<int:machine_id>/check-access', methods=['GET'])
def check_machine_access(machine_id):
    """
    檢查用戶是否可以訪問指定機器
    返回權限狀態和限制原因
    """
    try:
        user_email = request.headers.get('X-User-Email', '')
        
        if not user_email:
            return jsonify({'error': 'User email required'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查機器是否存在
        cur.execute("SELECT id, name, status FROM machines WHERE id = %s", (machine_id,))
        machine = cur.fetchone()
        
        if not machine:
            return jsonify({
                'allowed': False,
                'reason': '機器不存在'
            }), 404
        
        # 檢查機器狀態 - 維護中的機器也應該可以正常使用
        if machine['status'] not in ['active', 'maintenance']:
            status_messages = {
                'limited': '限制使用',
                'inactive': '已停用'
            }
            status_msg = status_messages.get(machine['status'], machine['status'])
            return jsonify({
                'allowed': False,
                'reason': f'機器目前{status_msg}'
            }), 200
        
        # 檢查限制規則
        is_allowed, restriction_reason = check_machine_restriction(user_email, machine_id)
        
        logger.info(f"Access check for user {user_email} on machine {machine_id}: {'allowed' if is_allowed else 'denied'}")
        
        return jsonify({
            'allowed': is_allowed,
            'reason': restriction_reason,
            'machine_name': machine['name']
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.route('/machines/<int:machine_id>/usage-status', methods=['GET'])
def get_machine_usage_status(machine_id):
    """
    獲取用戶對指定機器的使用狀態
    返回滾動窗口限制的使用情況
    """
    try:
        user_email = request.headers.get('X-User-Email', '')
        
        if not user_email:
            return jsonify({'error': 'User email required'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查機器是否存在
        cur.execute("SELECT id, name, status, restriction_status FROM machines WHERE id = %s", (machine_id,))
        machine = cur.fetchone()
        
        if not machine:
            return jsonify({'error': 'Machine not found'}), 404
        
        # 如果機器沒有限制，直接返回無限制狀態
        if machine['restriction_status'] == 'none':
            return jsonify({
                'has_usage_limit': False,
                'machine_name': machine['name'],
                'rolling_window': {
                    'has_limit': False
                }
            }), 200
        
        # 如果機器被完全阻止，返回阻止狀態
        if machine['restriction_status'] == 'blocked':
            return jsonify({
                'has_usage_limit': False,
                'machine_name': machine['name'],
                'blocked': True,
                'blocked_reason': '此機器目前被管理員完全封鎖',
                'rolling_window': {
                    'has_limit': False
                }
            }), 200
        
        # 獲取滾動窗口使用狀態
        rolling_window_status = get_user_rolling_window_status(user_email, machine_id, cur)
        
        if not rolling_window_status['has_limit']:
            # 沒有使用限制，返回正常狀態
            return jsonify({
                'has_usage_limit': False,
                'machine_name': machine['name'],
                'rolling_window': {
                    'has_limit': False
                }
            }), 200
        
        result = {
            'has_usage_limit': True,
            'machine_name': machine['name'],
            'rolling_window': rolling_window_status,
            # 為向後兼容保留的字段
            'max_usages': rolling_window_status['max_bookings'],
            'can_book': rolling_window_status['remaining_bookings'] > 0,
            'restriction_reason': f"滾動窗口限制：{rolling_window_status['window_size']}個時段內最多{rolling_window_status['max_bookings']}次" if rolling_window_status['remaining_bookings'] <= 0 else None
        }
        
        logger.info(f"Rolling window status check for user {user_email} on machine {machine_id}: {result}")
        
        return jsonify(result), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def analyze_user_consecutive_bookings(user_email, machine_id, cur):
    """
    分析用戶的連續預約情況，計算冷卻期狀態
    基於實際的預約記錄進行分析
    """
    try:
        # 獲取機器的使用次數限制規則
        current_time = get_taipei_now().replace(tzinfo=None)
        
        cur.execute("""
            SELECT restriction_rule
            FROM machine_restrictions 
            WHERE machine_id = %s AND restriction_type = 'usage_limit' AND is_active = true
            AND (start_time IS NULL OR start_time <= %s)
            AND (end_time IS NULL OR end_time >= %s)
            LIMIT 1
        """, (machine_id, current_time, current_time))
        
        restriction = cur.fetchone()
        
        if not restriction:
            # 沒有使用次數限制
            return {
                'has_usage_limit': False,
                'cooldown_slots': [],
                'usage_info': {
                    'consecutive_usage_count': 0,
                    'in_cooldown': False
                }
            }
        
        try:
            import json
            rule = json.loads(restriction['restriction_rule'])
            max_usages = rule.get('max_usages', 0)
            cooldown_period_hours = rule.get('cooldown_period_hours', 24)
        except:
            return {
                'has_usage_limit': False,
                'cooldown_slots': [],
                'usage_info': {
                    'consecutive_usage_count': 0,
                    'in_cooldown': False
                }
            }
        
        if max_usages <= 0:
            return {
                'has_usage_limit': False,
                'cooldown_slots': [],
                'usage_info': {
                    'consecutive_usage_count': 0,
                    'in_cooldown': False
                }
            }
        
        # 計算冷卻期時間段數
        cooldown_period_slots = max(1, cooldown_period_hours // 4)
        
        # 獲取用戶在該機器的所有 active 預約記錄
        cur.execute("""
            SELECT time_slot
            FROM bookings
            WHERE user_email = %s AND machine_id = %s AND status = 'active'
            ORDER BY time_slot ASC
        """, (user_email, machine_id))
        
        bookings = cur.fetchall()
        
        if not bookings:
            return {
                'has_usage_limit': True,
                'max_usages': max_usages,
                'cooldown_period_slots': cooldown_period_slots,
                'cooldown_slots': [],
                'usage_info': {
                    'consecutive_usage_count': 0,
                    'in_cooldown': False
                }
            }
        
        # 轉換為時間段字符串列表
        booking_slots = []
        for booking in bookings:
            time_slot_dt = booking['time_slot']
            if time_slot_dt.tzinfo is None:
                time_slot_dt = TAIPEI_TZ.localize(time_slot_dt)
            else:
                time_slot_dt = time_slot_dt.astimezone(TAIPEI_TZ)
            
            # 格式化為 "YYYY-MM-DD-HH:MM"
            slot_str = time_slot_dt.strftime('%Y-%m-%d-%H:%M')
            booking_slots.append(slot_str)
        
        # 分析連續預約群組
        consecutive_groups = find_consecutive_booking_groups(booking_slots)
        
        logger.info(f"User {user_email} booking slots: {booking_slots}")
        logger.info(f"Consecutive groups: {consecutive_groups}")
        
        # 檢查每個群組是否觸發冷卻期
        all_cooldown_slots = []
        current_consecutive_count = 0
        in_cooldown = False
        
        for group in consecutive_groups:
            if len(group) >= max_usages:
                # 這個群組觸發冷卻期
                group_end_slot = group[-1]
                cooldown_slots = calculate_cooldown_slots_from_booking(
                    group_end_slot, cooldown_period_slots
                )
                all_cooldown_slots.extend(cooldown_slots)
                
                # 檢查當前時間是否在這個冷卻期內
                current_slot = get_current_time_slot()
                if current_slot in cooldown_slots:
                    in_cooldown = True
            
            # 計算當前連續次數（最新的群組）
            if group == consecutive_groups[-1]:  # 最新的群組
                current_consecutive_count = len(group)
        
        # 去重冷卻期時間段
        unique_cooldown_slots = sorted(list(set(all_cooldown_slots)))
        
        return {
            'has_usage_limit': True,
            'max_usages': max_usages,
            'cooldown_period_slots': cooldown_period_slots,
            'cooldown_period_hours': cooldown_period_hours,  # 添加這個字段
            'cooldown_slots': unique_cooldown_slots,
            'usage_info': {
                'consecutive_usage_count': current_consecutive_count,
                'in_cooldown': in_cooldown,
                'consecutive_groups': consecutive_groups
            }
        }
        
    except Exception as e:
        logger.error(f"Error in analyze_user_consecutive_bookings: {e}")
        return {
            'has_usage_limit': False,
            'cooldown_slots': [],
            'usage_info': {
                'consecutive_usage_count': 0,
                'in_cooldown': False,
                'error': str(e)
            }
        }

def find_consecutive_booking_groups(booking_slots):
    """
    找到連續的預約群組
    例如：['2025-05-30-04:00', '2025-05-30-08:00', '2025-05-30-12:00', '2025-05-31-00:00']
    會被識別為一個連續群組
    """
    if not booking_slots:
        return []
    
    groups = []
    current_group = [booking_slots[0]]
    
    for i in range(1, len(booking_slots)):
        current_slot = booking_slots[i]
        prev_slot = booking_slots[i-1]
        
        # 檢查是否連續（下一個4小時時段）
        if is_consecutive_time_slot(prev_slot, current_slot):
            current_group.append(current_slot)
        else:
            # 不連續，保存當前群組並開始新的群組
            if current_group:
                groups.append(current_group)
            current_group = [current_slot]
    
    # 添加最後一個群組
    if current_group:
        groups.append(current_group)
    
    return groups

def is_consecutive_time_slot(slot1, slot2):
    """
    檢查兩個時間段是否連續
    slot1 和 slot2 格式：'YYYY-MM-DD-HH:MM'
    """
    try:
        # 解析時間段
        dt1 = datetime.strptime(slot1, '%Y-%m-%d-%H:%M')
        dt2 = datetime.strptime(slot2, '%Y-%m-%d-%H:%M')
        
        # 檢查是否相差4小時
        time_diff = dt2 - dt1
        return time_diff == timedelta(hours=4)
        
    except Exception as e:
        logger.error(f"Error checking consecutive time slots: {e}")
        return False

def calculate_cooldown_slots_from_booking(end_slot, cooldown_period_slots):
    """
    從預約結束時間段計算冷卻期時間段列表
    """
    try:
        # 解析結束時間段
        end_dt = datetime.strptime(end_slot, '%Y-%m-%d-%H:%M')
        
        # 冷卻期從下一個時間段開始
        cooldown_start = end_dt + timedelta(hours=4)
        
        cooldown_slots = []
        current_dt = cooldown_start
        
        for i in range(cooldown_period_slots):
            slot_str = current_dt.strftime('%Y-%m-%d-%H:%M')
            cooldown_slots.append(slot_str)
            current_dt += timedelta(hours=4)
        
        return cooldown_slots
        
    except Exception as e:
        logger.error(f"Error calculating cooldown slots: {e}")
        return []

def get_current_time_slot():
    """
    獲取當前時間對應的時間段
    調整到下一個有效時間段（0,4,8,12,16,20）
    """
    try:
        current_dt = get_taipei_now()
        
        # 調整到下一個有效時間段
        if current_dt.hour not in [0, 4, 8, 12, 16, 20]:
            # 找到下一個有效小時
            valid_hours = [0, 4, 8, 12, 16, 20]
            next_valid_hour = None
            for hour in valid_hours:
                if hour > current_dt.hour:
                    next_valid_hour = hour
                    break
            
            if next_valid_hour is None:
                # 今天沒有更晚的時段，移到明天的第一個時段
                current_dt = current_dt.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            else:
                current_dt = current_dt.replace(hour=next_valid_hour, minute=0, second=0, microsecond=0)
        else:
            current_dt = current_dt.replace(minute=0, second=0, microsecond=0)
        
        return current_dt.strftime('%Y-%m-%d-%H:%M')
        
    except Exception as e:
        logger.error(f"Error getting current time slot: {e}")
        return ""

# =========== Rolling Window Usage Limit Functions ===========

def check_rolling_window_limit(user_email, machine_id, target_time_slot, cur):
    """
    檢查滾動窗口使用限制
    新機制：在任意連續 N 個時段內，最多只能預約 M 次
    
    參數:
    - user_email: 用戶郵箱
    - machine_id: 機器ID
    - target_time_slot: 目標預約時段
    - cur: 數據庫游標
    
    返回:
    {
        'allowed': bool,
        'reason': str,
        'limit_info': {
            'window_size': int,
            'max_bookings': int,
            'current_bookings_in_window': int,
            'window_start': str,
            'window_end': str
        }
    }
    """
    try:
        # 首先檢查機器的restriction_status
        cur.execute("SELECT restriction_status FROM machines WHERE id = %s", (machine_id,))
        machine = cur.fetchone()
        
        if not machine:
            logger.error(f"check_rolling_window_limit: Machine {machine_id} not found")
            return {
                'allowed': False,
                'reason': '機器不存在',
                'limit_info': None
            }
        
        # 如果機器沒有限制，直接允許
        if machine['restriction_status'] == 'none':
            logger.info(f"check_rolling_window_limit: Machine {machine_id} has no restrictions (restriction_status='none')")
            return {
                'allowed': True,
                'reason': None,
                'limit_info': None
            }
        
        # 如果機器被完全阻止
        if machine['restriction_status'] == 'blocked':
            logger.info(f"check_rolling_window_limit: Machine {machine_id} is completely blocked")
            return {
                'allowed': False,
                'reason': '此機器目前被管理員完全封鎖',
                'limit_info': None
            }
        
        # 只有在restriction_status為'limited'時才檢查具體的限制規則
        if machine['restriction_status'] != 'limited':
            logger.info(f"check_rolling_window_limit: Machine {machine_id} restriction_status is '{machine['restriction_status']}', allowing booking")
            return {
                'allowed': True,
                'reason': None,
                'limit_info': None
            }
        
        # 獲取機器的滾動窗口限制規則
        current_time = get_taipei_now().replace(tzinfo=None)
        
        logger.info(f"check_rolling_window_limit: Checking for machine {machine_id}, user {user_email} (restriction_status='limited')")
        
        cur.execute("""
            SELECT restriction_rule
            FROM machine_restrictions 
            WHERE machine_id = %s AND restriction_type = 'usage_limit' AND is_active = true
            AND (start_time IS NULL OR start_time <= %s)
            AND (end_time IS NULL OR end_time >= %s)
            LIMIT 1
        """, (machine_id, current_time, current_time))
        
        restriction = cur.fetchone()
        
        if not restriction:
            logger.warning(f"check_rolling_window_limit: No restriction found for machine {machine_id} despite restriction_status='limited'")
            return {
                'allowed': True,
                'reason': None,
                'limit_info': None
            }
        
        logger.info(f"check_rolling_window_limit: Found restriction rule: {restriction['restriction_rule']}")
        
        try:
            import json
            rule = json.loads(restriction['restriction_rule'])
            
            # 添加詳細的日誌輸出
            logger.info(f"Parsed restriction rule: {rule}")
            
            # 只處理新的滾動窗口規則格式
            if rule.get('restriction_type') == 'rolling_window_limit':
                window_size = rule.get('window_size', 30)
                max_bookings = rule.get('max_bookings', 18)
                logger.info(f"Using rolling window format: window_size={window_size}, max_bookings={max_bookings}")
                
                # 確保描述使用統一格式
                total_hours = window_size * 4
                standard_description = f"任意連續{window_size}個時段內，最多只能預約{max_bookings}次（窗口大小：{total_hours}小時）"
                rule['description'] = standard_description
            else:
                # 不再支持舊格式，直接拒絕
                logger.error(f"Unsupported restriction format: {rule.get('restriction_type', 'unknown')}")
                return {
                    'allowed': False,
                    'reason': '系統限制格式錯誤，請聯繫管理員',
                    'limit_info': None
                }
                
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Invalid restriction rule format: {e}")
            return {
                'allowed': False,
                'reason': '系統限制規則格式錯誤，請聯繫管理員',
                'limit_info': None
            }
        
        # 確保目標時段是有效的4小時區塊
        if isinstance(target_time_slot, str):
            target_time_slot = datetime.fromisoformat(target_time_slot.replace('Z', '+00:00'))
            if target_time_slot.tzinfo:
                target_time_slot = target_time_slot.astimezone(TAIPEI_TZ).replace(tzinfo=None)
        elif target_time_slot.tzinfo:
            # 如果有時區信息，轉換為台北時間並移除時區信息
            target_time_slot = target_time_slot.astimezone(TAIPEI_TZ).replace(tzinfo=None)
        
        logger.info(f"Target time slot (normalized): {target_time_slot}")
        
        # 從當前時間開始，只獲取用戶未來的預約時段（用於檢查滾動窗口）
        current_taipei_time = get_taipei_now().replace(tzinfo=None)
        
        cur.execute("""
            SELECT time_slot
            FROM bookings
            WHERE user_email = %s 
            AND machine_id = %s 
            AND status = 'active'
            AND time_slot >= %s
            ORDER BY time_slot
        """, (user_email, machine_id, current_taipei_time))
        
        future_bookings = cur.fetchall()
        future_booking_slots = [booking['time_slot'] for booking in future_bookings]
        
        # 確保所有預約時段都是無時區的datetime對象
        normalized_booking_slots = []
        for slot in future_booking_slots:
            if slot.tzinfo:
                normalized_slot = slot.astimezone(TAIPEI_TZ).replace(tzinfo=None)
            else:
                normalized_slot = slot
            normalized_booking_slots.append(normalized_slot)
        
        # 將目標時段加入考慮（模擬新預約）
        all_booking_slots_with_new = normalized_booking_slots + [target_time_slot]
        all_booking_slots_with_new.sort()
        
        logger.info(f"Rolling window check for user {user_email}, machine {machine_id}")
        logger.info(f"Target slot: {target_time_slot}")
        logger.info(f"Existing future bookings: {len(normalized_booking_slots)}")
        logger.info(f"All future bookings (with new): {len(all_booking_slots_with_new)}")
        logger.info(f"Window size: {window_size}, Max bookings: {max_bookings}")
        logger.info(f"Current time: {current_taipei_time}")
        
        # 檢查所有可能的滾動窗口
        # 對於任意 window_size 個連續時段，預約數不能超過 max_bookings
        violations_found = 0
        
        for i in range(len(all_booking_slots_with_new)):
            slot = all_booking_slots_with_new[i]
            
            # 檢查以當前時段為起點的窗口
            window_start = slot
            window_end = slot + timedelta(hours=(window_size - 1) * 4)
            
            # 計算這個窗口內的預約數
            bookings_in_window = [
                s for s in all_booking_slots_with_new 
                if window_start <= s <= window_end
            ]
            
            logger.info(f"Window {i+1}: {window_start} to {window_end}, bookings: {len(bookings_in_window)}")
            
            if len(bookings_in_window) > max_bookings:
                violations_found += 1
                logger.error(f"VIOLATION #{violations_found}: Window {window_start} to {window_end} has {len(bookings_in_window)} bookings > {max_bookings}")
                logger.error(f"Bookings in this window: {[s.strftime('%m/%d %H:%M') for s in bookings_in_window]}")
                return {
                    'allowed': False,
                    'reason': f'超過滾動窗口使用限制：{window_start.strftime("%m/%d %H:%M")}到{window_end.strftime("%m/%d %H:%M")}窗口內有{len(bookings_in_window)}次預約，超過限制{max_bookings}次',
                    'limit_info': {
                        'window_size': window_size,
                        'max_bookings': max_bookings,
                        'violated_window_start': window_start.isoformat(),
                        'violated_window_end': window_end.isoformat(),
                        'bookings_in_violated_window': len(bookings_in_window),
                        'bookings_in_window': [s.isoformat() for s in bookings_in_window]
                    }
                }
            
            # 另外檢查以當前時段為終點的窗口
            window_end_alt = slot
            window_start_alt = slot - timedelta(hours=(window_size - 1) * 4)
            
            bookings_in_window_alt = [
                s for s in all_booking_slots_with_new 
                if window_start_alt <= s <= window_end_alt
            ]
            
            logger.info(f"Window {i+1} (reverse): {window_start_alt} to {window_end_alt}, bookings: {len(bookings_in_window_alt)}")
            
            if len(bookings_in_window_alt) > max_bookings:
                violations_found += 1
                logger.error(f"VIOLATION #{violations_found} (reverse): Window {window_start_alt} to {window_end_alt} has {len(bookings_in_window_alt)} bookings > {max_bookings}")
                logger.error(f"Bookings in this window: {[s.strftime('%m/%d %H:%M') for s in bookings_in_window_alt]}")
                return {
                    'allowed': False,
                    'reason': f'超過滾動窗口使用限制：{window_start_alt.strftime("%m/%d %H:%M")}到{window_end_alt.strftime("%m/%d %H:%M")}窗口內有{len(bookings_in_window_alt)}次預約，超過限制{max_bookings}次',
                    'limit_info': {
                        'window_size': window_size,
                        'max_bookings': max_bookings,
                        'violated_window_start': window_start_alt.isoformat(),
                        'violated_window_end': window_end_alt.isoformat(),
                        'bookings_in_violated_window': len(bookings_in_window_alt),
                        'bookings_in_window': [s.isoformat() for s in bookings_in_window_alt]
                    }
                }
        
        logger.info(f"Checked {len(all_booking_slots_with_new) * 2} windows, found {violations_found} violations")
        
        # 如果所有窗口都符合限制，允許預約
        logger.info(f"All rolling windows passed for user {user_email}")
        
        return {
            'allowed': True,
            'reason': None,
            'limit_info': {
                'window_size': window_size,
                'max_bookings': max_bookings,
                'total_bookings_after': len(all_booking_slots_with_new),
                'windows_checked': len(all_booking_slots_with_new) * 2 if all_booking_slots_with_new else 0,
                'current_future_bookings': len(normalized_booking_slots)
            }
        }
        
    except Exception as e:
        logger.error(f"CRITICAL ERROR in check_rolling_window_limit: {e}")
        import traceback
        traceback.print_exc()
        # 出錯時為了安全應該拒絕預約
        return {
            'allowed': False,
            'reason': f'系統檢查錯誤，為了安全暫時拒絕預約: {str(e)}',
            'limit_info': None,
            'error': str(e)
        }

def get_user_rolling_window_status(user_email, machine_id, cur):
    """
    獲取用戶在指定機器的滾動窗口使用狀態
    用於前端顯示當前限制情況
    """
    try:
        # 獲取機器的滾動窗口限制規則
        current_time = get_taipei_now().replace(tzinfo=None)
        
        cur.execute("""
            SELECT restriction_rule
            FROM machine_restrictions 
            WHERE machine_id = %s AND restriction_type = 'usage_limit' AND is_active = true
            AND (start_time IS NULL OR start_time <= %s)
            AND (end_time IS NULL OR end_time >= %s)
            LIMIT 1
        """, (machine_id, current_time, current_time))
        
        restriction = cur.fetchone()
        
        if not restriction:
            return {
                'has_limit': False,
                'window_size': 0,
                'max_bookings': 0,
                'current_usage': 0
            }
        
        try:
            import json
            rule = json.loads(restriction['restriction_rule'])
            
            # 添加詳細的日誌輸出
            logger.info(f"get_user_rolling_window_status - Parsed restriction rule: {rule}")
            
            # 只處理新的滾動窗口規則格式
            if rule.get('restriction_type') == 'rolling_window_limit':
                window_size = rule.get('window_size', 30)
                max_bookings = rule.get('max_bookings', 18)
                logger.info(f"get_user_rolling_window_status - Using rolling window format: window_size={window_size}, max_bookings={max_bookings}")
                
                # 確保描述使用統一格式
                total_hours = window_size * 4
                standard_description = f"任意連續{window_size}個時段內，最多只能預約{max_bookings}次（窗口大小：{total_hours}小時）"
            else:
                # 不再支持舊格式
                logger.error(f"get_user_rolling_window_status - Unsupported restriction format: {rule.get('restriction_type', 'unknown')}")
                return {
                    'has_limit': False,
                    'window_size': 0,
                    'max_bookings': 0,
                    'current_usage': 0,
                    'error': '限制格式不支持'
                }
                
        except (json.JSONDecodeError, KeyError):
            return {
                'has_limit': False,
                'window_size': 0,
                'max_bookings': 0,
                'current_usage': 0,
                'error': '限制規則解析錯誤'
            }
        
        # 計算當前滾動窗口（從現在時間開始往未來看）
        current_time_slot = current_time.replace(minute=0, second=0, microsecond=0)
        
        # 調整到最近的有效時段
        valid_hours = [0, 4, 8, 12, 16, 20]
        if current_time_slot.hour not in valid_hours:
            # 向上調整到下一個有效時段
            next_hour = None
            for hour in valid_hours:
                if hour > current_time_slot.hour:
                    next_hour = hour
                    break
            if next_hour is None:
                current_time_slot = current_time_slot.replace(hour=0) + timedelta(days=1)
            else:
                current_time_slot = current_time_slot.replace(hour=next_hour)
        
        # 計算窗口範圍（從當前時間開始，往未來看 window_size 個時段）
        window_start = current_time_slot
        window_end = current_time_slot + timedelta(hours=(window_size - 1) * 4)
        
        # 查詢窗口內的預約數量（只計算未來的預約）
        cur.execute("""
            SELECT COUNT(*) as booking_count
            FROM bookings
            WHERE user_email = %s 
            AND machine_id = %s 
            AND status = 'active'
            AND time_slot >= %s 
            AND time_slot <= %s
        """, (user_email, machine_id, window_start, window_end))
        
        result = cur.fetchone()
        current_usage = result['booking_count'] if result else 0
        
        return {
            'has_limit': True,
            'window_size': window_size,
            'max_bookings': max_bookings,
            'current_usage': current_usage,
            'remaining_bookings': max(0, max_bookings - current_usage),
            'window_start': window_start.isoformat(),
            'window_end': window_end.isoformat(),
            'usage_percentage': round((current_usage / max_bookings) * 100, 1) if max_bookings > 0 else 0,
            'description': standard_description
        }
        
    except Exception as e:
        logger.error(f"Error in get_user_rolling_window_status: {e}")
        return {
            'has_limit': False,
            'window_size': 0,
            'max_bookings': 0,
            'current_usage': 0,
            'error': str(e)
        }

@app.route('/machines/<int:machine_id>/restriction-check', methods=['GET'])
def check_machine_restriction_rules(machine_id):
    """
    檢查機器的限制規則和用戶的滾動窗口使用狀況
    返回詳細的限制信息和當前使用情況
    """
    try:
        user_email = request.headers.get('X-User-Email', '')
        
        if not user_email:
            return jsonify({'error': 'User email required'}), 400
        
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 檢查機器是否存在
        cur.execute("SELECT id, name, status, restriction_status FROM machines WHERE id = %s", (machine_id,))
        machine = cur.fetchone()
        
        if not machine:
            return jsonify({'error': 'Machine not found'}), 404
        
        # 如果機器沒有限制，直接返回空結果
        if machine['restriction_status'] == 'none':
            return jsonify({
                'machine_id': str(machine_id),
                'machine_name': machine['name'],
                'machine_status': machine['status'],
                'restriction_status': machine['restriction_status'],
                'user_email': user_email,
                'current_time': get_taipei_now().replace(tzinfo=None).isoformat(),
                'all_restrictions': [],
                'active_usage_restriction': None,
                'has_active_usage_limit': False,
                'total_restrictions': 0
            }), 200
        
        # 如果機器被完全阻止
        if machine['restriction_status'] == 'blocked':
            return jsonify({
                'machine_id': str(machine_id),
                'machine_name': machine['name'],
                'machine_status': machine['status'],
                'restriction_status': machine['restriction_status'],
                'user_email': user_email,
                'current_time': get_taipei_now().replace(tzinfo=None).isoformat(),
                'all_restrictions': [],
                'active_usage_restriction': None,
                'has_active_usage_limit': False,
                'total_restrictions': 0,
                'blocked': True,
                'blocked_reason': '此機器目前被管理員完全封鎖'
            }), 200
        
        current_time = get_taipei_now().replace(tzinfo=None)
        
        # 獲取所有限制規則
        cur.execute("""
            SELECT id, restriction_type, restriction_rule, is_active, start_time, end_time, created_at
            FROM machine_restrictions 
            WHERE machine_id = %s
            ORDER BY created_at DESC
        """, (machine_id,))
        
        all_restrictions = cur.fetchall()
        
        # 獲取當前生效的使用限制規則
        cur.execute("""
            SELECT restriction_rule
            FROM machine_restrictions 
            WHERE machine_id = %s AND restriction_type = 'usage_limit' AND is_active = true
            AND (start_time IS NULL OR start_time <= %s)
            AND (end_time IS NULL OR end_time >= %s)
            LIMIT 1
        """, (machine_id, current_time, current_time))
        
        active_usage_restriction = cur.fetchone()
        
        # 解析生效的限制規則
        rolling_window_info = None
        if active_usage_restriction:
            try:
                import json
                rule = json.loads(active_usage_restriction['restriction_rule'])
                
                if rule.get('restriction_type') == 'rolling_window_limit':
                    window_size = rule.get('window_size', 30)
                    max_bookings = rule.get('max_bookings', 18)
                    
                    # 獲取用戶當前的預約情況
                    cur.execute("""
                        SELECT time_slot
                        FROM bookings
                        WHERE user_email = %s 
                        AND machine_id = %s 
                        AND status = 'active'
                        ORDER BY time_slot
                    """, (user_email, machine_id))
                    
                    user_bookings = cur.fetchall()
                    booking_slots = []
                    
                    for booking in user_bookings:
                        time_slot_dt = booking['time_slot']
                        if time_slot_dt.tzinfo:
                            time_slot_dt = time_slot_dt.astimezone(TAIPEI_TZ).replace(tzinfo=None)
                        booking_slots.append(time_slot_dt.isoformat())
                    
                    # 分析當前最密集的窗口
                    if len(user_bookings) > 0:
                        max_window_usage = 0
                        max_window_start = None
                        max_window_end = None
                        
                        for booking in user_bookings:
                            window_start = booking['time_slot']
                            if window_start.tzinfo:
                                window_start = window_start.astimezone(TAIPEI_TZ).replace(tzinfo=None)
                            
                            window_end = window_start + timedelta(hours=(window_size - 1) * 4)
                            
                            # 計算這個窗口內的預約數
                            bookings_in_window = [
                                b for b in user_bookings 
                                if window_start <= (b['time_slot'].astimezone(TAIPEI_TZ).replace(tzinfo=None) if b['time_slot'].tzinfo else b['time_slot']) <= window_end
                            ]
                            
                            if len(bookings_in_window) > max_window_usage:
                                max_window_usage = len(bookings_in_window)
                                max_window_start = window_start
                                max_window_end = window_end
                    
                    rolling_window_info = {
                        'window_size': window_size,
                        'max_bookings': max_bookings,
                        'current_bookings_count': len(user_bookings),
                        'max_window_usage': max_window_usage if user_bookings else 0,
                        'max_window_start': max_window_start.isoformat() if max_window_start else None,
                        'max_window_end': max_window_end.isoformat() if max_window_end else None,
                        'remaining_capacity': max(0, max_bookings - (max_window_usage if user_bookings else 0)),
                        'is_at_limit': max_window_usage >= max_bookings if user_bookings else False,
                        'user_booking_slots': booking_slots,
                        'description': rule.get('description', f'任意連續{window_size}個時段內，最多只能預約{max_bookings}次')
                    }
                
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.error(f"Error parsing restriction rule: {e}")
        
        # 格式化所有限制規則
        formatted_restrictions = []
        for restriction in all_restrictions:
            formatted_restriction = {
                'id': str(restriction['id']),
                'restriction_type': restriction['restriction_type'],
                'is_active': restriction['is_active'],
                'start_time': restriction['start_time'].isoformat() if restriction['start_time'] else None,
                'end_time': restriction['end_time'].isoformat() if restriction['end_time'] else None,
                'created_at': restriction['created_at'].isoformat() if restriction['created_at'] else None
            }
            
            # 解析規則內容
            try:
                import json
                rule = json.loads(restriction['restriction_rule'])
                formatted_restriction['rule_details'] = rule
            except:
                formatted_restriction['rule_details'] = None
                formatted_restriction['raw_rule'] = restriction['restriction_rule']
            
            formatted_restrictions.append(formatted_restriction)
        
        logger.info(f"Restriction check for user {user_email} on machine {machine_id}")
        
        return jsonify({
            'machine_id': str(machine_id),
            'machine_name': machine['name'],
            'machine_status': machine['status'],
            'restriction_status': machine['restriction_status'],
            'user_email': user_email,
            'current_time': current_time.isoformat(),
            'all_restrictions': formatted_restrictions,
            'active_usage_restriction': rolling_window_info,
            'has_active_usage_limit': rolling_window_info is not None,
            'total_restrictions': len(all_restrictions)
        }), 200

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        return jsonify({'error': 'Database error', 'detail': str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# 在所有API響應中添加統一的緩存控制
def add_no_cache_headers(response):
    """為響應添加防緩存頭"""
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.headers['Last-Modified'] = 'Wed, 21 Oct 2015 07:28:00 GMT'
    return response

def standardize_restriction_description(rule):
    """標準化限制規則描述"""
    if rule.get('restriction_type') == 'rolling_window_limit':
        window_size = rule.get('window_size', 30)
        max_bookings = rule.get('max_bookings', 18)
        total_hours = window_size * 4
        
        # 確保使用統一的描述格式
        standard_description = f"任意連續{window_size}個時段內，最多只能預約{max_bookings}次（窗口大小：{total_hours}小時）"
        rule['description'] = standard_description
        
    return rule

# 修改 after_request 中間件以確保所有相關API都有防緩存頭
@app.after_request
def after_request(response):
    # 對所有包含機器限制信息的API響應添加防緩存頭
    cache_control_endpoints = [
        'get_machines', 
        'get_machine_bookings', 
        'check_machine_access',
        'get_machine_usage_status',
        'check_machine_restriction_rules',
        'get_all_machines_admin',
        'get_machine_restrictions_simple',
        'create_machine_restriction_simple',
        'get_all_machine_restrictions'  # 新增：批量獲取限制端點
    ]
    
    if request.endpoint in cache_control_endpoints:
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['Last-Modified'] = 'Wed, 21 Oct 2015 07:28:00 GMT'
    
    return response

def format_user_name_for_display(full_name):
    """
    將用戶姓名格式化為隱私保護格式
    例如: "張三由" -> "張O由", "李四" -> "李O", "王小明" -> "王O明"
    """
    if not full_name or len(full_name) < 1:
        return "匿名用戶"
    
    full_name = full_name.strip()
    
    if len(full_name) == 1:
        return full_name + "O"
    elif len(full_name) == 2:
        return full_name[0] + "O"
    elif len(full_name) == 3:
        return full_name[0] + "O" + full_name[2]
    else:
        # 對於超過3個字的姓名，保留第一個和最後一個字
        return full_name[0] + "O" + full_name[-1]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)